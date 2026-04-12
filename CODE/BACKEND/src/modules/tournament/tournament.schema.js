/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 */

const { z } = require('zod');

// Strict ISO 8601 Regex with Timezone Offset or Z
const isoWithTimezoneRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2}))$/;

// Schema for creating a tournament
const createTournamentSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters").max(255),
    game: z.string().min(1, "Game is required"),
    description: z.string().optional(),
    type: z.enum(['SOLO', 'DUO', 'SQUAD']).default('SOLO'),
    format: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN']).default('SINGLE_ELIMINATION'),
    startTime: z.string().regex(isoWithTimezoneRegex, {
        message: "Start time must be a valid ISO 8601 string with timezone offset (e.g., 2024-10-25T14:30:00+05:30)"
    }),
    registrationEnd: z.string().regex(isoWithTimezoneRegex, {
        message: "Registration end must be a valid ISO 8601 string with timezone offset"
    }).optional(),
    entryFee: z.number().min(0, "Entry fee cannot be negative"),
    prizePool: z.number().min(0, "Prize pool cannot be negative").default(0),
    minTeamsRequired: z.number().min(2, "Min teams must be at least 2").default(2),
    maxParticipants: z.number().min(2, "Max participants must be at least 2").default(100),
    rules: z.string().optional(),
    bannerUrl: z.string().optional(),
    streamUrl: z.string().url().optional(),
    streamScope: z.enum(['MATCH', 'TOURNAMENT']).optional(),
    streamIsLive: z.boolean().optional(),
});

// Schema for updating a tournament
const updateTournamentSchema = createTournamentSchema.partial();

// Schema for participant status updates
const updateParticipantStatusSchema = z.object({
    status: z.enum(['CONFIRMED', 'REJECTED'])
});

module.exports = {
    createTournamentSchema,
    updateTournamentSchema,
    updateParticipantStatusSchema
};
