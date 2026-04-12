/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { kycRequests, users, auditLogs } = require('../../db/schema');
const { eq, and, asc, desc, count, sql, inArray } = require('drizzle-orm');
const { z } = require('zod');
const { publishEvent } = require('../../config/kafka.config');
const { getHostTrustProfile } = require('../../services/hostTrust.service');
const notificationController = require('../notification/notification.controller');
const emailService = require('../../services/email.service');

const ADMIN_DECISION_ACTIONS = ['KYC_APPROVED', 'KYC_REJECTED', 'KYC_FLAGGED'];

const DISPLAY_STATUS_BY_INTERNAL = {
    PENDING: 'PENDING',
    VERIFIED: 'APPROVED',
    REJECTED: 'REJECTED',
    FLAGGED: 'FLAGGED'
};

const INTERNAL_STATUS_BY_FILTER = {
    PENDING: 'PENDING',
    APPROVED: 'VERIFIED',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED',
    FLAGGED: 'FLAGGED',
    SUSPICIOUS: 'FLAGGED'
};

const toDisplayStatus = (status) => DISPLAY_STATUS_BY_INTERNAL[status] || status || 'PENDING';

const normalizeStatusFilter = (status) => {
    if (!status || status === 'ALL') return null;
    return INTERNAL_STATUS_BY_FILTER[String(status).toUpperCase()] || null;
};

const normalizeSortOrder = (sort) => String(sort || 'newest').toLowerCase() === 'oldest' ? asc(kycRequests.createdAt) : desc(kycRequests.createdAt);

const safeParseDetails = (details) => {
    if (!details) return {};
    try {
        return JSON.parse(details);
    } catch (error) {
        console.warn('Failed to parse audit details:', error.message);
        return { raw: details };
    }
};

const buildIdentityChecklist = (user, request, attemptCount) => {
    const fullName = user?.legalName || '';
    const identityReady = Boolean(
        fullName &&
        user?.phone &&
        user?.email &&
        user?.dateOfBirth &&
        user?.emailVerified &&
        user?.phoneVerified &&
        user?.billingAddress
    );

    const documentReady = Boolean(request?.documentType && request?.proofUrl);
    const faceReady = Boolean(request?.selfieUrl);
    const paymentReady = Boolean(user?.billingAddress);
    const riskReasons = [];

    if (!user?.emailVerified) riskReasons.push('Email not verified');
    if (!user?.phoneVerified) riskReasons.push('Phone not verified');
    if (!user?.billingAddress) riskReasons.push('Billing details missing');
    if (!user?.legalName) riskReasons.push('Legal name missing');
    if (!request?.proofUrl) riskReasons.push('Government ID image missing');
    if (!request?.selfieUrl) riskReasons.push('Selfie image missing');
    if (attemptCount > 1) riskReasons.push('Multiple review attempts');
    if (request?.status === 'FLAGGED') riskReasons.push('Manually flagged by admin');

    return {
        basicIdentity: identityReady,
        governmentId: documentReady,
        faceVerification: faceReady,
        paymentVerification: paymentReady,
        riskReasons
    };
};

const enrichKycRow = async (row) => {
    if (!row) return null;

    const auditTrail = await db.select({
        id: auditLogs.id,
        action: auditLogs.action,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        adminId: auditLogs.userId
    })
        .from(auditLogs)
        .where(and(
            eq(auditLogs.targetId, row.id),
            inArray(auditLogs.action, ADMIN_DECISION_ACTIONS)
        ))
        .orderBy(desc(auditLogs.createdAt));

    const previousAttempts = auditTrail.length;
    const checklist = buildIdentityChecklist(row.user, row, previousAttempts);
    const riskFlag = checklist.riskReasons.length > 0;

    return {
        ...row,
        displayStatus: toDisplayStatus(row.status),
        riskFlag,
        riskReasons: checklist.riskReasons,
        previousAttempts,
        checklist,
        auditTrail: auditTrail.map((entry) => ({
            id: entry.id,
            action: entry.action,
            createdAt: entry.createdAt,
            details: safeParseDetails(entry.details)
        })),
        documentPreview: {
            idNumberMasked: null,
            idName: null,
            documentType: row.documentType,
            proofUrl: row.proofUrl,
            selfieUrl: row.selfieUrl,
            rankProofUrl: row.rankProofUrl || null
        }
    };
};

const loadKycRecord = async (id) => {
    const [row] = await db.select({
        id: kycRequests.id,
        status: kycRequests.status,
        documentType: kycRequests.documentType,
        proofUrl: kycRequests.proofUrl,
        selfieUrl: kycRequests.selfieUrl,
        rankProofUrl: kycRequests.rankProofUrl,
        adminNotes: kycRequests.adminNotes,
        createdAt: kycRequests.createdAt,
        updatedAt: kycRequests.updatedAt,
        user: {
            id: users.id,
            username: users.username,
            email: users.email,
            legalName: users.legalName,
            dateOfBirth: users.dateOfBirth,
            phone: users.phone,
            phoneVerified: users.phoneVerified,
            emailVerified: users.emailVerified,
            countryCode: users.countryCode,
            state: users.state,
            city: users.city,
            billingAddress: users.billingAddress,
            registrationCompleted: users.registrationCompleted,
            hostStatus: users.hostStatus,
            avatarUrl: users.avatarUrl,
            role: users.role,
            createdAt: users.createdAt
        }
    })
        .from(kycRequests)
        .innerJoin(users, eq(kycRequests.userId, users.id))
        .where(eq(kycRequests.id, id))
        .limit(1);

    return enrichKycRow(row);
};

// Apply for host verification
exports.applyForHost = async (req, res) => {
    try {
        const schema = z.object({
            documentType: z.enum(['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE']),
            proofUrl: z.string().url('Invalid document URL'),
            selfieUrl: z.string().url('Invalid selfie URL'),
            rankProofUrl: z.string().url().optional()
        });

        const data = schema.parse(req.body);

        // Check if already verified
        if (req.user.hostStatus === 'VERIFIED') {
            return res.status(400).json({
                success: false,
                message: 'You are already a verified host'
            });
        }

        // Upsert KYC request
        await db.transaction(async (tx) => {
            // MySQL Insert on Duplicate Update
            await tx.insert(kycRequests).values({
                userId: req.user.id,
                ...data,
                status: 'PENDING',
                adminNotes: null // Clear notes on re-submission
            }).onDuplicateKeyUpdate({
                set: {
                    ...data,
                    status: 'PENDING',
                    adminNotes: null
                }
            });

            // Update user host status
            await tx.update(users)
                .set({ hostStatus: 'PENDING_REVIEW' })
                .where(eq(users.id, req.user.id));
        });

        res.status(201).json({
            success: true,
            message: 'KYC application submitted for review'
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors
            });
        }
        console.error('Apply host error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit application'
        });
    }
};

// Get host status
exports.getHostStatus = async (req, res) => {
    try {
        const result = await db.select()
            .from(kycRequests)
            .where(eq(kycRequests.userId, req.user.id))
            .limit(1);

        const kyc = result[0];
        const hostTrust = await getHostTrustProfile(req.user);

        res.json({
            success: true,
            data: {
                hostStatus: req.user.hostStatus,
                hostTrust,
                kyc: kyc ? {
                    status: kyc.status,
                    displayStatus: toDisplayStatus(kyc.status),
                    documentType: kyc.documentType,
                    adminNotes: kyc.adminNotes,
                    submittedAt: kyc.createdAt,
                    updatedAt: kyc.updatedAt
                } : null
            }
        });
    } catch (error) {
        console.error('Get host status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch status'
        });
    }
};

// Admin: List KYC requests
exports.listKYCRequests = async (req, res) => {
    try {
        const { status = 'ALL', country, sort = 'newest', page = 1, limit = 20, search } = req.query;
        const { risk } = req.query;
        const skip = (Number.parseInt(page, 10) - 1) * Number.parseInt(limit, 10);
        const take = Number.parseInt(limit, 10);

        const conditions = [];
        const normalizedStatus = normalizeStatusFilter(status);
        if (normalizedStatus) conditions.push(eq(kycRequests.status, normalizedStatus));
        if (country && country !== 'ALL') conditions.push(eq(users.countryCode, country));
        if (search) {
            const term = `%${search}%`;
            conditions.push(sql`(
                ${users.id} ILIKE ${term} OR
                ${users.username} ILIKE ${term} OR
                ${users.email} ILIKE ${term} OR
                ${users.legalName} ILIKE ${term} OR
                ${users.phone} ILIKE ${term}
            )`);
        }
        if (risk === 'true') {
            conditions.push(sql`(
                ${users.emailVerified} = false OR
                ${users.phoneVerified} = false OR
                ${users.billingAddress} IS NULL OR
                ${kycRequests.status} = 'FLAGGED'
            )`);
        }
        if (risk === 'false') {
            conditions.push(sql`(
                ${users.emailVerified} = true AND
                ${users.phoneVerified} = true AND
                ${users.billingAddress} IS NOT NULL AND
                ${kycRequests.status} <> 'FLAGGED'
            )`);
        }

        const whereClause = conditions.length ? and(...conditions) : undefined;
        const orderByClause = normalizeSortOrder(sort);

        const [requests, totalResult] = await Promise.all([
            db.select({
                id: kycRequests.id,
                status: kycRequests.status,
                documentType: kycRequests.documentType,
                proofUrl: kycRequests.proofUrl,
                selfieUrl: kycRequests.selfieUrl,
                rankProofUrl: kycRequests.rankProofUrl,
                adminNotes: kycRequests.adminNotes,
                createdAt: kycRequests.createdAt,
                user: {
                    id: users.id,
                    email: users.email,
                    username: users.username,
                    legalName: users.legalName,
                    phone: users.phone,
                    phoneVerified: users.phoneVerified,
                    emailVerified: users.emailVerified,
                    countryCode: users.countryCode,
                    dateOfBirth: users.dateOfBirth,
                    billingAddress: users.billingAddress,
                    hostStatus: users.hostStatus,
                    registrationCompleted: users.registrationCompleted,
                    createdAt: users.createdAt
                }
            })
                .from(kycRequests)
                .innerJoin(users, eq(kycRequests.userId, users.id))
                .where(whereClause)
                .orderBy(orderByClause)
                .limit(take)
                .offset(skip),

            db.select({ count: count() })
                .from(kycRequests)
                .innerJoin(users, eq(kycRequests.userId, users.id))
                .where(whereClause)
        ]);

        const total = totalResult[0]?.count || 0;
        const enriched = await Promise.all(requests.map((request) => enrichKycRow(request)));

        res.json({
            success: true,
            data: enriched,
            pagination: {
                page: Number.parseInt(page, 10),
                limit: take,
                total,
                totalPages: Math.ceil(total / take)
            }
        });
    } catch (error) {
        console.error('List KYC error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch KYC requests'
        });
    }
};

// Admin: KYC detail
exports.getKYCRequestById = async (req, res) => {
    try {
        const detail = await loadKycRecord(req.params.id);

        if (!detail) {
            return res.status(404).json({ success: false, message: 'KYC request not found' });
        }

        const hostTrust = await getHostTrustProfile(detail.user);

        res.json({
            success: true,
            data: {
                ...detail,
                hostTrust,
                decisionRules: {
                    approve: [
                        'Name matches the ID document',
                        'Face roughly matches the selfie',
                        'No duplicate pattern is detected',
                        'ID looks real and readable'
                    ],
                    reject: [
                        'Blurry or fake ID',
                        'Name mismatch',
                        'Multiple account suspicion',
                        'Random or unrelated images'
                    ],
                    suspicious: [
                        'Same face appears on multiple accounts',
                        'Same device or IP is being reused across accounts',
                        'Too many retries or suspicious resubmissions'
                    ]
                }
            }
        });
    } catch (error) {
        console.error('Get KYC detail error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch KYC request' });
    }
};

const sendKycOutcome = async ({ user, decision, reason }) => {
    if (!user?.email) return;

    const username = user.username || user.legalName || 'Titan Warrior';
    let subject;
    let title;
    let message;

    if (decision === 'APPROVED') {
        subject = 'KYC Approved';
        title = 'KYC Approved ✅';
        message = 'Your KYC has been approved. Host access is now available according to your trust level.';
    } else if (decision === 'REJECTED') {
        subject = 'KYC Rejected';
        title = 'KYC Rejected ❌';
        message = 'Your KYC was rejected.';
        if (reason) {
            message += ` Reason: ${reason}`;
        }
    } else {
        subject = 'KYC Flagged for Manual Review';
        title = 'KYC Flagged ⚠️';
        message = 'Your account has been flagged for manual review.';
        if (reason) {
            message += ` Reason: ${reason}`;
        }
    }

    await Promise.allSettled([
        notificationController.send(
            user.id,
            subject,
            message,
            decision === 'APPROVED' ? 'SUCCESS' : 'WARNING'
        ),
        emailService.sendKycDecision({
            to: user.email,
            username,
            decision,
            reason,
            title
        })
    ]);
};

// Admin: Approve KYC
exports.approveKYC = async (req, res) => {
    try {
        const { id } = req.params;

        const detail = await loadKycRecord(id);
        if (!detail) {
            return res.status(404).json({ success: false, message: 'KYC request not found' });
        }

        await db.transaction(async (tx) => {
            await tx.update(kycRequests)
                .set({ status: 'VERIFIED' })
                .where(eq(kycRequests.id, id));

            await tx.update(users)
                .set({ hostStatus: 'VERIFIED', role: 'HOST' })
                .where(eq(users.id, detail.user.id));

            // Create audit log
            await tx.insert(auditLogs).values({
                adminId: req.user.id,
                userId: req.user.id, // AssignedBy logic implies current admin
                action: 'KYC_APPROVED',
                targetId: id, // entityId
                details: JSON.stringify({ userId: detail.user.id })
            });
        });

        // 🔔 KAFKA: Publish kyc.approved event
        await publishEvent('kyc.approved', {
            eventType: 'KYC_APPROVED',
            userId: detail.user.id,
            kycId: id,
            approvedBy: req.user.id,
            timestamp: new Date().toISOString()
        });

        await sendKycOutcome({ user: detail.user, decision: 'APPROVED' });

        res.json({
            success: true,
            message: 'KYC approved successfully',
            data: {
                status: 'VERIFIED',
                displayStatus: 'APPROVED'
            }
        });
    } catch (error) {
        console.error('Approve KYC error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve KYC'
        });
    }
};

// Admin: Reject KYC
exports.rejectKYC = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const detail = await loadKycRecord(id);
        if (!detail) {
            return res.status(404).json({ success: false, message: 'KYC request not found' });
        }

        await db.transaction(async (tx) => {
            await tx.update(kycRequests)
                .set({
                    status: 'REJECTED',
                    adminNotes: reason
                })
                .where(eq(kycRequests.id, id));

            await tx.update(users)
                .set({ hostStatus: 'REJECTED' })
                .where(eq(users.id, detail.user.id));

            // Create audit log
            await tx.insert(auditLogs).values({
                adminId: req.user.id,
                userId: req.user.id,
                action: 'KYC_REJECTED',
                targetId: id,
                details: JSON.stringify({ userId: detail.user.id, reason })
            });
        });

        // 🔔 KAFKA: Publish kyc.rejected event
        await publishEvent('kyc.rejected', {
            eventType: 'KYC_REJECTED',
            userId: detail.user.id,
            kycId: id,
            reason,
            rejectedBy: req.user.id,
            timestamp: new Date().toISOString()
        });

        await sendKycOutcome({ user: detail.user, decision: 'REJECTED', reason });

        res.json({
            success: true,
            message: 'KYC rejected',
            data: {
                status: 'REJECTED',
                displayStatus: 'REJECTED'
            }
        });
    } catch (error) {
        console.error('Reject KYC error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject KYC'
        });
    }
};

// Admin: Flag KYC as suspicious
exports.flagKYCAsSuspicious = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Suspicious reason is required'
            });
        }

        const detail = await loadKycRecord(id);
        if (!detail) {
            return res.status(404).json({ success: false, message: 'KYC request not found' });
        }

        await db.transaction(async (tx) => {
            await tx.update(kycRequests)
                .set({
                    status: 'FLAGGED',
                    adminNotes: reason
                })
                .where(eq(kycRequests.id, id));

            await tx.update(users)
                .set({ hostStatus: 'SUSPENDED' })
                .where(eq(users.id, detail.user.id));

            await tx.insert(auditLogs).values({
                adminId: req.user.id,
                userId: req.user.id,
                action: 'KYC_FLAGGED',
                targetId: id,
                details: JSON.stringify({ userId: detail.user.id, reason })
            });
        });

        await publishEvent('kyc.flagged', {
            eventType: 'KYC_FLAGGED',
            userId: detail.user.id,
            kycId: id,
            reason,
            flaggedBy: req.user.id,
            timestamp: new Date().toISOString()
        });

        await sendKycOutcome({ user: detail.user, decision: 'FLAGGED', reason });

        res.json({
            success: true,
            message: 'KYC marked as suspicious',
            data: {
                status: 'FLAGGED',
                displayStatus: 'FLAGGED'
            }
        });
    } catch (error) {
        console.error('Flag KYC suspicious error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to flag KYC'
        });
    }
};
