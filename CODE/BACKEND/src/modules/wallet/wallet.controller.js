const walletService = require('./wallet.service');

// Get wallet details
exports.getWallet = async (req, res) => {
    try {
        const wallet = await walletService.getWallet(req.user.id);
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found' });
        }
        res.json({ success: true, data: wallet });
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch wallet' });
    }
};

// Get transaction history
exports.getTransactions = async (req, res) => {
    try {
        const { limit, offset, type } = req.query;
        const result = await walletService.getTransactions(
            req.user.id,
            limit,
            offset,
            type
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
    }
};

// Request withdrawal
exports.requestWithdraw = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        const transaction = await walletService.requestWithdrawal(req.user.id, amount);
        res.json({ success: true, message: 'Withdrawal requested', data: transaction });
    } catch (error) {
        console.error('Withdraw request error:', error);
        res.status(400).json({ success: false, message: error.message || 'Withdrawal failed' });
    }
};

// Get all withdrawals (for user)
exports.getMyWithdrawals = async (req, res) => {
    try {
        const { limit, offset } = req.query;
        const result = await walletService.getTransactions(
            req.user.id,
            limit,
            offset,
            'DEBIT'
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get withdrawals error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch withdrawals' });
    }
};

exports.initDeposit = (req, res) => res.status(501).json({ message: 'Not implemented' });
exports.verifyDeposit = (req, res) => res.status(501).json({ message: 'Not implemented' });
