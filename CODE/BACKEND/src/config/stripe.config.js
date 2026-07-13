/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 */

const Stripe = require('stripe');

let stripeInstance = null;

const getStripeInstance = () => {
    if (stripeInstance) return stripeInstance;

    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
        console.warn('⚠️ Stripe API Secret Key (STRIPE_SECRET_KEY) is missing in environment variables');
    }

    stripeInstance = new Stripe(apiKey || 'sk_test_mock_key_if_missing', {
        apiVersion: '2023-10-16',
    });

    return stripeInstance;
};

module.exports = {
    getStripeInstance
};
