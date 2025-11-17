"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
exports.disconnectDB = disconnectDB;
exports.isConnected = isConnected;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("./logger");
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/claudester';
if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
}
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}
async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10, // Connection pooling
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4, // Use IPv4
        };
        cached.promise = mongoose_1.default.connect(MONGODB_URI, opts)
            .then((mongoose) => {
            logger_1.loggers.db.info('MongoDB connected successfully');
            return mongoose;
        })
            .catch((error) => {
            logger_1.loggers.db.error({ error }, 'MongoDB connection error');
            cached.promise = null; // Reset promise on error
            throw error;
        });
    }
    try {
        cached.conn = await cached.promise;
    }
    catch (e) {
        cached.promise = null;
        throw e;
    }
    return cached.conn;
}
/**
 * Disconnect from MongoDB
 */
async function disconnectDB() {
    if (cached.conn) {
        await mongoose_1.default.disconnect();
        cached.conn = null;
        cached.promise = null;
        logger_1.loggers.db.info('MongoDB disconnected');
    }
}
/**
 * Check if MongoDB is connected
 */
function isConnected() {
    return mongoose_1.default.connection.readyState === 1;
}
exports.default = connectDB;
