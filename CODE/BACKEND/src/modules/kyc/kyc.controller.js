/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { kycRequests, users, auditLogs } = require('../../db/schema');
const { eq, and, desc, count, sql } = require('drizzle-orm');
const { z } = require('zod');

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

        res.json({
            success: true,
            data: {
                hostStatus: req.user.hostStatus,
                kyc: kyc ? {
                    status: kyc.status,
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
        const { status = 'PENDING', page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const conditions = [];
        if (status) conditions.push(eq(kycRequests.status, status));

        const [requests, totalResult] = await Promise.all([
            db.select({
                id: kycRequests.id,
                status: kycRequests.status,
                documentType: kycRequests.documentType,
                proofUrl: kycRequests.proofUrl,
                createdAt: kycRequests.createdAt,
                user: {
                    id: users.id,
                    email: users.email,
                    username: users.username,
                    hostStatus: users.hostStatus,
                    createdAt: users.createdAt
                }
            })
                .from(kycRequests)
                .innerJoin(users, eq(kycRequests.userId, users.id))
                .where(and(...conditions))
                .orderBy(desc(kycRequests.createdAt))
                .limit(take)
                .offset(skip),

            db.select({ count: count() })
                .from(kycRequests)
                .where(and(...conditions))
        ]);

        const total = totalResult[0]?.count || 0;

        res.json({
            success: true,
            data: requests,
            pagination: {
                page: parseInt(page),
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

// Admin: Approve KYC
exports.approveKYC = async (req, res) => {
    try {
        const { id } = req.params;

        const kycResult = await db.select().from(kycRequests).where(eq(kycRequests.id, id)).limit(1);
        if (!kycResult.length) {
            return res.status(404).json({ success: false, message: 'KYC request not found' });
        }
        const kyc = kycResult[0];

        await db.transaction(async (tx) => {
            await tx.update(kycRequests)
                .set({ status: 'VERIFIED' })
                .where(eq(kycRequests.id, id));

            await tx.update(users)
                .set({ hostStatus: 'VERIFIED' })
                .where(eq(users.id, kyc.userId));

            // Create audit log
            await tx.insert(auditLogs).values({
                adminId: req.user.id,
                userId: req.user.id, // AssignedBy logic implies current admin
                action: 'KYC_APPROVED',
                targetId: id, // entityId
                details: JSON.stringify({ userId: kyc.userId })
            });
        });

        res.json({
            success: true,
            message: 'KYC approved successfully'
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

        const kycResult = await db.select().from(kycRequests).where(eq(kycRequests.id, id)).limit(1);
        if (!kycResult.length) {
            return res.status(404).json({ success: false, message: 'KYC request not found' });
        }
        const kyc = kycResult[0];

        await db.transaction(async (tx) => {
            await tx.update(kycRequests)
                .set({
                    status: 'REJECTED',
                    adminNotes: reason
                })
                .where(eq(kycRequests.id, id));

            await tx.update(users)
                .set({ hostStatus: 'REJECTED' })
                .where(eq(users.id, kyc.userId));

            // Create audit log
            await tx.insert(auditLogs).values({
                adminId: req.user.id,
                userId: req.user.id,
                action: 'KYC_REJECTED',
                targetId: id,
                details: JSON.stringify({ userId: kyc.userId, reason })
            });
        });

        res.json({
            success: true,
            message: 'KYC rejected'
        });
    } catch (error) {
        console.error('Reject KYC error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject KYC'
        });
    }
};
