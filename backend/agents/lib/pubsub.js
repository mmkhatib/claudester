"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Channel = void 0;
exports.publishSpecUpdate = publishSpecUpdate;
exports.publishTaskUpdate = publishTaskUpdate;
exports.publishAgentUpdate = publishAgentUpdate;
exports.publishTestResult = publishTestResult;
exports.publishActivityLog = publishActivityLog;
exports.publishSystemAlert = publishSystemAlert;
exports.subscribe = subscribe;
exports.subscribeToSpecUpdates = subscribeToSpecUpdates;
exports.subscribeToTaskUpdates = subscribeToTaskUpdates;
exports.subscribeToAgentUpdates = subscribeToAgentUpdates;
exports.subscribeToTestResults = subscribeToTestResults;
exports.subscribeToActivityLog = subscribeToActivityLog;
exports.subscribeToSystemAlerts = subscribeToSystemAlerts;
exports.unsubscribeAll = unsubscribeAll;
const redis_1 = require("./redis");
const logger_1 = require("./logger");
// PubSub channels
var Channel;
(function (Channel) {
    Channel["SPEC_UPDATES"] = "spec:updates";
    Channel["TASK_UPDATES"] = "task:updates";
    Channel["AGENT_UPDATES"] = "agent:updates";
    Channel["TEST_RESULTS"] = "test:results";
    Channel["ACTIVITY_LOG"] = "activity:log";
    Channel["SYSTEM_ALERTS"] = "system:alerts";
})(Channel || (exports.Channel = Channel = {}));
// Publish functions
async function publishSpecUpdate(message) {
    const fullMessage = {
        type: 'SPEC_UPDATE',
        ...message,
        timestamp: new Date(),
    };
    await redis_1.redisPub.publish(Channel.SPEC_UPDATES, JSON.stringify(fullMessage));
}
async function publishTaskUpdate(message) {
    const fullMessage = {
        type: 'TASK_UPDATE',
        ...message,
        timestamp: new Date(),
    };
    await redis_1.redisPub.publish(Channel.TASK_UPDATES, JSON.stringify(fullMessage));
}
async function publishAgentUpdate(message) {
    const fullMessage = {
        type: 'AGENT_UPDATE',
        ...message,
        timestamp: new Date(),
    };
    await redis_1.redisPub.publish(Channel.AGENT_UPDATES, JSON.stringify(fullMessage));
}
async function publishTestResult(message) {
    const fullMessage = {
        type: 'TEST_RESULT',
        ...message,
        timestamp: new Date(),
    };
    await redis_1.redisPub.publish(Channel.TEST_RESULTS, JSON.stringify(fullMessage));
}
async function publishActivityLog(message) {
    const fullMessage = {
        type: 'ACTIVITY_LOG',
        ...message,
        timestamp: new Date(),
    };
    await redis_1.redisPub.publish(Channel.ACTIVITY_LOG, JSON.stringify(fullMessage));
}
async function publishSystemAlert(message) {
    const fullMessage = {
        type: 'SYSTEM_ALERT',
        ...message,
        timestamp: new Date(),
    };
    await redis_1.redisPub.publish(Channel.SYSTEM_ALERTS, JSON.stringify(fullMessage));
}
const subscribers = new Map();
function subscribe(channel, handler) {
    // Initialize subscriber set for this channel
    if (!subscribers.has(channel)) {
        subscribers.set(channel, new Set());
        // Subscribe to Redis channel
        redis_1.redisSub.subscribe(channel, (err) => {
            if (err) {
                logger_1.loggers.redis.error({ channel, error: err }, 'Failed to subscribe to channel');
            }
            else {
                logger_1.loggers.redis.debug({ channel }, 'Subscribed to channel');
            }
        });
    }
    // Add handler
    const handlers = subscribers.get(channel);
    handlers.add(handler);
    // Return unsubscribe function
    return () => {
        handlers.delete(handler);
        // If no more handlers, unsubscribe from Redis
        if (handlers.size === 0) {
            subscribers.delete(channel);
            redis_1.redisSub.unsubscribe(channel);
            logger_1.loggers.redis.debug({ channel }, 'Unsubscribed from channel');
        }
    };
}
// Handle incoming messages
redis_1.redisSub.on('message', async (channel, message) => {
    const handlers = subscribers.get(channel);
    if (!handlers || handlers.size === 0) {
        return;
    }
    try {
        const parsedMessage = JSON.parse(message);
        // Call all handlers
        await Promise.all(Array.from(handlers).map(handler => Promise.resolve(handler(parsedMessage))));
    }
    catch (error) {
        logger_1.loggers.redis.error({ channel, error }, 'Error processing message');
    }
});
// Typed subscription helpers
function subscribeToSpecUpdates(handler) {
    return subscribe(Channel.SPEC_UPDATES, handler);
}
function subscribeToTaskUpdates(handler) {
    return subscribe(Channel.TASK_UPDATES, handler);
}
function subscribeToAgentUpdates(handler) {
    return subscribe(Channel.AGENT_UPDATES, handler);
}
function subscribeToTestResults(handler) {
    return subscribe(Channel.TEST_RESULTS, handler);
}
function subscribeToActivityLog(handler) {
    return subscribe(Channel.ACTIVITY_LOG, handler);
}
function subscribeToSystemAlerts(handler) {
    return subscribe(Channel.SYSTEM_ALERTS, handler);
}
// Cleanup
async function unsubscribeAll() {
    const channels = Array.from(subscribers.keys());
    if (channels.length > 0) {
        await redis_1.redisSub.unsubscribe(...channels);
        subscribers.clear();
        logger_1.loggers.redis.info('Unsubscribed from all channels');
    }
}
