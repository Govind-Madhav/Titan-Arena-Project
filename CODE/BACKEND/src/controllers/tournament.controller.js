/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

// Stubbed controller - pending Drizzle migration
const stubHandler = (req, res) => {
    res.status(501).json({
        success: false,
        message: 'This feature is currently under maintenance (Database Migration)'
    });
};

module.exports = {
    createTournament: stubHandler,
    getAllTournaments: stubHandler,
    getTournamentById: stubHandler,
    updateTournament: stubHandler,
    deleteTournament: stubHandler,
    joinTournament: stubHandler,
    leaveTournament: stubHandler,
    getParticipants: stubHandler,
    updateParticipantStatus: stubHandler,
    declareWinners: stubHandler,
    getWinners: stubHandler,
    getTournamentsByHost: stubHandler
};
