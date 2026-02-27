/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * Kafka configuration — KafkaJS client, producer, and consumer factory.
 * Gracefully disabled when KAFKA_BROKER env var is not set.
 */

const { Kafka, logLevel } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || null;
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'titan-arena-backend';

let kafka = null;
let producer = null;
let kafkaEnabled = false;

if (KAFKA_BROKER) {
    kafka = new Kafka({
        clientId: KAFKA_CLIENT_ID,
        brokers: [KAFKA_BROKER],
        logLevel: logLevel.WARN,
        retry: {
            initialRetryTime: 300,
            retries: 5
        }
    });
    kafkaEnabled = true;
    console.log(`✅ Kafka: Configured — broker: ${KAFKA_BROKER}`);
} else {
    console.warn('⚠️  Kafka: KAFKA_BROKER not set — event publishing disabled (local dev mode)');
}

/**
 * Connect and return the singleton producer.
 * Safe to call multiple times — connects only once.
 */
const getProducer = async () => {
    if (!kafkaEnabled) return null;
    if (!producer) {
        producer = kafka.producer();
        await producer.connect();
        console.log('✅ Kafka Producer: Connected');
    }
    return producer;
};

/**
 * Publish a message to a Kafka topic.
 * Silently no-ops if Kafka is disabled.
 * @param {string} topic
 * @param {object} payload - Will be JSON-serialized as the message value
 */
const publishEvent = async (topic, payload) => {
    if (!kafkaEnabled) return;
    try {
        const prod = await getProducer();
        await prod.send({
            topic,
            messages: [{ value: JSON.stringify(payload) }]
        });
        console.log(`📤 Kafka: Published to [${topic}]`, payload);
    } catch (err) {
        // Non-fatal: log but don't crash the main request
        console.error(`❌ Kafka publish error [${topic}]:`, err.message);
    }
};

/**
 * Create a new consumer for a given group ID.
 * Returns null if Kafka is disabled.
 * @param {string} groupId
 */
const createConsumer = (groupId) => {
    if (!kafkaEnabled) return null;
    return kafka.consumer({ groupId });
};

/**
 * Disconnect the producer — call during graceful shutdown.
 */
const disconnectProducer = async () => {
    if (producer) {
        await producer.disconnect();
        console.log('🔒 Kafka Producer: Disconnected');
    }
};

module.exports = {
    kafkaEnabled,
    publishEvent,
    createConsumer,
    disconnectProducer
};
