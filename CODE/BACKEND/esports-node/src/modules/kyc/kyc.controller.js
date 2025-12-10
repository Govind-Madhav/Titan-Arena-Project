const prisma = require('../../config/prisma');
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
        const kyc = await prisma.$transaction(async (tx) => {
            const kycRequest = await tx.kYCRequest.upsert({
                where: { userId: req.user.id },
                create: {
                    userId: req.user.id,
                    ...data,
                    status: 'PENDING'
                },
                update: {
                    ...data,
                    status: 'PENDING',
                    adminNotes: null
                }
            });

            // Update user host status
            await tx.user.update({
                where: { id: req.user.id },
                data: { hostStatus: 'PENDING_REVIEW' }
            });

            return kycRequest;
        });

        res.status(201).json({
            success: true,
            message: 'KYC application submitted for review',
            data: kyc
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
        const kyc = await prisma.kYCRequest.findUnique({
            where: { userId: req.user.id }
        });

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

        const where = {};
        if (status) where.status = status;

        const [requests, total] = await Promise.all([
            prisma.kYCRequest.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            username: true,
                            hostStatus: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.kYCRequest.count({ where })
        ]);

        res.json({
            success: true,
            data: requests,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
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

        const kyc = await prisma.kYCRequest.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!kyc) {
            return res.status(404).json({
                success: false,
                message: 'KYC request not found'
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.kYCRequest.update({
                where: { id },
                data: { status: 'VERIFIED' }
            });

            await tx.user.update({
                where: { id: kyc.userId },
                data: { hostStatus: 'VERIFIED' }
            });

            // Create audit log
            await tx.auditLog.create({
                data: {
                    adminId: req.user.id,
                    action: 'KYC_APPROVED',
                    entity: 'kyc',
                    entityId: id,
                    meta: { userId: kyc.userId }
                }
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

        const kyc = await prisma.kYCRequest.findUnique({
            where: { id }
        });

        if (!kyc) {
            return res.status(404).json({
                success: false,
                message: 'KYC request not found'
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.kYCRequest.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    adminNotes: reason
                }
            });

            await tx.user.update({
                where: { id: kyc.userId },
                data: { hostStatus: 'REJECTED' }
            });

            // Create audit log
            await tx.auditLog.create({
                data: {
                    adminId: req.user.id,
                    action: 'KYC_REJECTED',
                    entity: 'kyc',
                    entityId: id,
                    meta: { userId: kyc.userId, reason }
                }
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
