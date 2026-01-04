/**
 * Region and Sub-Region Configuration
 * 
 * 🔒 IMMUTABLE RULES (NEVER CHANGE):
 * 1. Region (1-6) is immutable and stored in UID
 * 2. Sub-region is mutable and operational
 * 3. Country NEVER decides region automatically
 * 4. Country may only suggest sub-region
 * 5. UID generation depends ONLY on region
 * 6. COUNTRY_TO_REGION is advisory, not authoritative
 */


// Valid region codes (use this everywhere)
const VALID_REGION_CODES = [1, 2, 3, 4, 5, 6];

// Primary Regions (UID-Level, Immutable)
const REGIONS = Object.freeze({
    ASIA: { code: 1, name: 'Asia' },
    EUROPE: { code: 2, name: 'Europe' },
    AFRICA: { code: 3, name: 'Africa' },
    NORTH_AMERICA: { code: 4, name: 'North America' },
    SOUTH_AMERICA: { code: 5, name: 'South America' },
    OCEANIA: { code: 6, name: 'Oceania' }
});


// Sub-Regions (Operational, Mutable)
// Note: countries array is for display/UI only. Use COUNTRY_TO_REGION for logic.
const SUB_REGIONS = Object.freeze({
    1: [ // Asia
        { code: 'AS-SA', name: 'South Asia', countries: ['IN', 'PK', 'BD', 'LK', 'NP'] },
        { code: 'AS-SEA', name: 'Southeast Asia', countries: ['SG', 'MY', 'ID', 'PH', 'TH', 'VN'] },
        { code: 'AS-EA', name: 'East Asia', countries: ['JP', 'KR', 'CN', 'TW'] },
        { code: 'AS-ME', name: 'Middle East', countries: ['AE', 'SA', 'QA', 'KW', 'OM'] },
        { code: 'AS-CA', name: 'Central Asia', countries: ['KZ', 'UZ', 'TM'] }
    ],
    2: [ // Europe
        { code: 'EU-W', name: 'Western Europe', countries: ['GB', 'FR', 'DE', 'NL', 'BE'] },
        { code: 'EU-E', name: 'Eastern Europe', countries: ['PL', 'RU', 'UA', 'CZ'] },
        { code: 'EU-N', name: 'Nordics', countries: ['SE', 'NO', 'DK', 'FI'] },
        { code: 'EU-S', name: 'Southern Europe', countries: ['ES', 'IT', 'PT', 'GR'] }
    ],
    3: [ // Africa
        { code: 'AF-N', name: 'North Africa', countries: ['EG', 'MA', 'TN', 'DZ'] },
        { code: 'AF-W', name: 'West Africa', countries: ['NG', 'GH', 'SN'] },
        { code: 'AF-E', name: 'East Africa', countries: ['KE', 'TZ', 'UG', 'ET'] },
        { code: 'AF-S', name: 'Southern Africa', countries: ['ZA', 'BW', 'ZW'] }
    ],
    4: [ // North America
        { code: 'NA-E', name: 'NA East', countries: ['US', 'CA'] },
        { code: 'NA-W', name: 'NA West', countries: ['US', 'CA'] },
        { code: 'NA-C', name: 'Central', countries: ['MX', 'GT', 'CR'] }
    ],
    5: [ // South America
        { code: 'SA-BR', name: 'Brazil', countries: ['BR'] },
        { code: 'SA-AN', name: 'Andean', countries: ['CO', 'PE', 'EC', 'BO'] },
        { code: 'SA-SC', name: 'Southern Cone', countries: ['AR', 'CL', 'UY'] }
    ],
    6: [ // Oceania
        { code: 'OC-AE', name: 'Australia East', countries: ['AU'] },
        { code: 'OC-AW', name: 'Australia West', countries: ['AU'] },
        { code: 'OC-NZ', name: 'New Zealand', countries: ['NZ'] }
    ]
});


// Country to Region/Sub-Region Mapping
// SINGLE SOURCE OF TRUTH for country-based suggestions
const COUNTRY_TO_REGION = Object.freeze({
    // Asia - South Asia
    'IN': { region: 1, subRegion: 'AS-SA', name: 'India' },
    'PK': { region: 1, subRegion: 'AS-SA', name: 'Pakistan' },
    'BD': { region: 1, subRegion: 'AS-SA', name: 'Bangladesh' },
    'LK': { region: 1, subRegion: 'AS-SA', name: 'Sri Lanka' },
    'NP': { region: 1, subRegion: 'AS-SA', name: 'Nepal' },

    // Asia - Southeast Asia
    'SG': { region: 1, subRegion: 'AS-SEA', name: 'Singapore' },
    'MY': { region: 1, subRegion: 'AS-SEA', name: 'Malaysia' },
    'ID': { region: 1, subRegion: 'AS-SEA', name: 'Indonesia' },
    'PH': { region: 1, subRegion: 'AS-SEA', name: 'Philippines' },
    'TH': { region: 1, subRegion: 'AS-SEA', name: 'Thailand' },
    'VN': { region: 1, subRegion: 'AS-SEA', name: 'Vietnam' },

    // Asia - East Asia
    'JP': { region: 1, subRegion: 'AS-EA', name: 'Japan' },
    'KR': { region: 1, subRegion: 'AS-EA', name: 'South Korea' },
    'CN': { region: 1, subRegion: 'AS-EA', name: 'China' },
    'TW': { region: 1, subRegion: 'AS-EA', name: 'Taiwan' },

    // Asia - Middle East
    'AE': { region: 1, subRegion: 'AS-ME', name: 'UAE' },
    'SA': { region: 1, subRegion: 'AS-ME', name: 'Saudi Arabia' },
    'QA': { region: 1, subRegion: 'AS-ME', name: 'Qatar' },
    'KW': { region: 1, subRegion: 'AS-ME', name: 'Kuwait' },
    'OM': { region: 1, subRegion: 'AS-ME', name: 'Oman' },

    // Europe - Western
    'GB': { region: 2, subRegion: 'EU-W', name: 'United Kingdom' },
    'FR': { region: 2, subRegion: 'EU-W', name: 'France' },
    'DE': { region: 2, subRegion: 'EU-W', name: 'Germany' },
    'NL': { region: 2, subRegion: 'EU-W', name: 'Netherlands' },
    'BE': { region: 2, subRegion: 'EU-W', name: 'Belgium' },

    // Europe - Eastern
    'PL': { region: 2, subRegion: 'EU-E', name: 'Poland' },
    'RU': { region: 2, subRegion: 'EU-E', name: 'Russia' },
    'UA': { region: 2, subRegion: 'EU-E', name: 'Ukraine' },
    'CZ': { region: 2, subRegion: 'EU-E', name: 'Czech Republic' },

    // Europe - Nordics
    'SE': { region: 2, subRegion: 'EU-N', name: 'Sweden' },
    'NO': { region: 2, subRegion: 'EU-N', name: 'Norway' },
    'DK': { region: 2, subRegion: 'EU-N', name: 'Denmark' },
    'FI': { region: 2, subRegion: 'EU-N', name: 'Finland' },

    // Europe - Southern
    'ES': { region: 2, subRegion: 'EU-S', name: 'Spain' },
    'IT': { region: 2, subRegion: 'EU-S', name: 'Italy' },
    'PT': { region: 2, subRegion: 'EU-S', name: 'Portugal' },
    'GR': { region: 2, subRegion: 'EU-S', name: 'Greece' },

    // Africa
    'EG': { region: 3, subRegion: 'AF-N', name: 'Egypt' },
    'MA': { region: 3, subRegion: 'AF-N', name: 'Morocco' },
    'NG': { region: 3, subRegion: 'AF-W', name: 'Nigeria' },
    'ZA': { region: 3, subRegion: 'AF-S', name: 'South Africa' },

    // North America
    'US': { region: 4, subRegion: 'NA-E', name: 'United States' },
    'CA': { region: 4, subRegion: 'NA-E', name: 'Canada' },
    'MX': { region: 4, subRegion: 'NA-C', name: 'Mexico' },

    // South America
    'BR': { region: 5, subRegion: 'SA-BR', name: 'Brazil' },
    'AR': { region: 5, subRegion: 'SA-SC', name: 'Argentina' },
    'CL': { region: 5, subRegion: 'SA-SC', name: 'Chile' },
    'CO': { region: 5, subRegion: 'SA-AN', name: 'Colombia' },
    'PE': { region: 5, subRegion: 'SA-AN', name: 'Peru' },

    // Oceania
    'AU': { region: 6, subRegion: 'OC-AE', name: 'Australia' },
    'NZ': { region: 6, subRegion: 'OC-NZ', name: 'New Zealand' }
});

/**
 * Get region and sub-region suggestion for a country code
 * CRITICAL: Returns null if country not found (NO DEFAULTS)
 * This is advisory only - user must explicitly select region
 */
function getRegionForCountry(countryCode) {
    return COUNTRY_TO_REGION[countryCode] || null;
}

/**
 * Get all sub-regions for a region
 */
function getSubRegionsForRegion(regionCode) {
    return SUB_REGIONS[regionCode] || [];
}

/**
 * Validate if a sub-region belongs to a region
 */
function validateSubRegion(regionCode, subRegionCode) {
    const subRegions = SUB_REGIONS[regionCode] || [];
    return subRegions.some(sr => sr.code === subRegionCode);
}

/**
 * Get region name
 */
function getRegionName(regionCode) {
    const region = Object.values(REGIONS).find(r => r.code === regionCode);
    return region ? region.name : 'Unknown';
}

/**
 * Get region code for a sub-region code (reverse lookup)
 * Useful for validation and admin tools
 */
function getRegionForSubRegion(subRegionCode) {
    for (const [region, subs] of Object.entries(SUB_REGIONS)) {
        if (subs.some(sr => sr.code === subRegionCode)) {
            return Number(region);
        }
    }
    return null;
}

module.exports = {
    VALID_REGION_CODES,
    REGIONS,
    SUB_REGIONS,
    COUNTRY_TO_REGION,
    getRegionForCountry,
    getSubRegionsForRegion,
    validateSubRegion,
    getRegionName,
    getRegionForSubRegion
};
