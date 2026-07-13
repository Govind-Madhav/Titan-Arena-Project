/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 */

const http = require('http');

/**
 * Check if IP is private/local
 */
const isPrivateIp = (ip) => {
    if (!ip) return true;
    const cleanIp = ip.trim();
    return (
        cleanIp === '::1' ||
        cleanIp === '127.0.0.1' ||
        cleanIp.startsWith('192.168.') ||
        cleanIp.startsWith('10.') ||
        cleanIp.startsWith('172.16.') ||
        cleanIp.startsWith('fe80:')
    );
};

/**
 * Fetch country code from ip-api.com
 * @param {string} ip 
 * @returns {Promise<string>} country code (ISO 3166-1 alpha-2, e.g. "US", "IN")
 */
const detectCountryByIp = (ip) => {
    return new Promise((resolve) => {
        const defaultCountry = process.env.DEFAULT_GEOIP_COUNTRY || 'IN';

        if (isPrivateIp(ip)) {
            // Local fallback
            console.log(`🌐 GeoIP: Private/Local IP detected (${ip}). Defaulting to '${defaultCountry}'.`);
            return resolve(defaultCountry);
        }

        const url = `http://ip-api.com/json/${ip}?fields=status,countryCode`;

        const request = http.get(url, { timeout: 3000 }, (res) => {
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    if (parsedData.status === 'success' && parsedData.countryCode) {
                        return resolve(parsedData.countryCode.toUpperCase());
                    }
                } catch (e) {
                    console.error('GeoIP parse error:', e.message);
                }
                resolve(defaultCountry); // Fallback
            });
        });

        request.on('error', (err) => {
            console.error('GeoIP request error:', err.message);
            resolve(defaultCountry); // Fallback
        });

        request.on('timeout', () => {
            request.destroy();
            console.warn('GeoIP request timed out');
            resolve(defaultCountry); // Fallback
        });
    });
};

module.exports = {
    detectCountryByIp
};
