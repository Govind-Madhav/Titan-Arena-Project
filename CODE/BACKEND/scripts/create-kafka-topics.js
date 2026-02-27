/**
 * Script to create all required Kafka topics for Titan Arena.
 * Run with: node scripts/create-kafka-topics.js
 */
require('dotenv').config();
const { Kafka } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

const TOPICS = [
    'match.completed',
    'match.scheduled',
    'tournament.created',
    'tournament.started',
    'tournament.ended',
    'tournament.live',
    'tournament.cancelled',
];

async function createTopics() {
    const kafka = new Kafka({
        clientId: 'titan-arena-admin',
        brokers: [KAFKA_BROKER],
    });

    const admin = kafka.admin();
    await admin.connect();
    console.log('✅ Kafka Admin: Connected');

    const existing = await admin.listTopics();
    const toCreate = TOPICS.filter(t => !existing.includes(t)).map(topic => ({
        topic,
        numPartitions: 1,
        replicationFactor: 1,
    }));

    if (toCreate.length === 0) {
        console.log('✅ All topics already exist:', TOPICS.join(', '));
    } else {
        await admin.createTopics({ topics: toCreate, waitForLeaders: true });
        console.log('✅ Created topics:', toCreate.map(t => t.topic).join(', '));
    }

    await admin.disconnect();
    console.log('🔒 Kafka Admin: Disconnected');
}

createTopics().catch(err => {
    console.error('❌ Failed to create topics:', err.message);
    process.exit(1);
});
