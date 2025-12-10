const prisma = require('../../config/prisma');
const walletService = require('./wallet.service');
const { z } = require('zod');

// Get wallet balance
exports.getWallet = async (req, res) => {
    try {
        const wallet = await walletService.getWallet(req.user.id);

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: 'Wallet not found'
            });
        }

        res.json({
            success: true,
            data: {
                balance: wallet.balance,
                locked: wallet.locked,
                availableBalance: wallet.availableBalance
            }
        });
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch wallet'
        });
    }
};

// Get transaction history
exports.getTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 20, type } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = { userId: req.user.id };
        if (type) where.type = type;

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.transaction.count({ where })
        ]);

        res.json({
            success: true,
            data: transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions'
        });
    }
};

// Initialize deposit (placeholder for payment gateway)
exports.initDeposit = async (req, res) => {
    try {
        const schema = z.object({
            amount: z.number().int().positive().min(100, 'Minimum deposit is ₹1 (100 paise)')
        });

        const { amount } = schema.parse(req.body);

        // In production, create payment gateway order here
        // For now, return a mock order ID
        const orderId = `DEP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        res.json({
            success: true,
            message: 'Deposit initiated',
            data: {
                orderId,
                amount,
                currency: 'INR',
                // In production: gateway-specific fields like razorpay_order_id
            }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors
            });
        }
        console.error('Init deposit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate deposit'
        });
    }
};

// Verify deposit (placeholder - in production, verify with payment gateway)
exports.verifyDeposit = async (req, res) => {
    try {
        const schema = z.object({
            orderId: z.string(),
            amount: z.number().int().positive(),
            // In production: payment_id, signature for verification
        });

        const { orderId, amount } = schema.parse(req.body);

        // In production, verify payment with gateway here
        // For demo, we'll directly credit the wallet

        const result = await walletService.credit(
            req.user.id,
            amount,
            'DEPOSIT',
            `Deposit via order ${orderId}`,
            { orderId }
        );

        res.json({
            success: true,
            message: 'Deposit successful',
            data: {
                newBalance: result.wallet.balance,
                transaction: result.transaction
            }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors
            });
        }
        console.error('Verify deposit error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Deposit verification failed'
        });
    }
};

// Request withdrawal
exports.requestWithdraw = async (req, res) => {
    try {
        const schema = z.object({
            amount: z.number().int().positive(),
            bankDetails: z.object({
                accountNumber: z.string(),
                ifscCode: z.string(),
                accountHolderName: z.string()
            })
        });

        const { amount, bankDetails } = schema.parse(req.body);

        // Check KYC status
        const kyc = await prisma.kYCRequest.findUnique({
            where: { userId: req.user.id }
        });

        if (!kyc || kyc.status !== 'VERIFIED') {
            return res.status(403).json({
                success: false,
                message: 'KYC verification required for withdrawals'
            });
        }

        // Check balance
        const wallet = await walletService.getWallet(req.user.id);
        if (!wallet || wallet.availableBalance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance'
            });
        }

        // Create withdrawal request and lock amount
        const withdrawal = await prisma.$transaction(async (tx) => {
            // Lock the amount
            await walletService.lockAmount(req.user.id, amount, tx);

            // Create withdrawal request
            return tx.withdrawalRequest.create({
                data: {
                    userId: req.user.id,
                    amount,
                    bankDetails,
                    status: 'PENDING'
                }
            });
        });

        res.status(201).json({
            success: true,
            message: 'Withdrawal request submitted',
            data: withdrawal
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors
            });
        }
        console.error('Withdraw error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Withdrawal request failed'
        });
    }
};

// Get my withdrawals
exports.getMyWithdrawals = async (req, res) => {
    try {
        const withdrawals = await prisma.withdrawalRequest.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: withdrawals
        });
    } catch (error) {
        console.error('Get withdrawals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch withdrawals'
        });
    }
};
