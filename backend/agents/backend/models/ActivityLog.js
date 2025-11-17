"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var EventType;
(function (EventType) {
    EventType["SPEC_CREATED"] = "SPEC_CREATED";
    EventType["SPEC_UPDATED"] = "SPEC_UPDATED";
    EventType["SPEC_APPROVED"] = "SPEC_APPROVED";
    EventType["TASK_CREATED"] = "TASK_CREATED";
    EventType["TASK_UPDATED"] = "TASK_UPDATED";
    EventType["TASK_STARTED"] = "TASK_STARTED";
    EventType["TASK_COMPLETED"] = "TASK_COMPLETED";
    EventType["TASK_FAILED"] = "TASK_FAILED";
    EventType["AGENT_STARTED"] = "AGENT_STARTED";
    EventType["AGENT_COMPLETED"] = "AGENT_COMPLETED";
    EventType["AGENT_FAILED"] = "AGENT_FAILED";
    EventType["COMMENT_ADDED"] = "COMMENT_ADDED";
    EventType["TEST_PASSED"] = "TEST_PASSED";
    EventType["TEST_FAILED"] = "TEST_FAILED";
})(EventType || (exports.EventType = EventType = {}));
const ActivityLogSchema = new mongoose_1.Schema({
    eventType: {
        type: String,
        enum: Object.values(EventType),
        required: true,
        index: true
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    specId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Spec',
        index: true
    },
    taskId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Task'
    },
    agentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Agent'
    },
    message: {
        type: String,
        required: true
    },
    metadata: mongoose_1.Schema.Types.Mixed,
}, {
    timestamps: true
});
ActivityLogSchema.index({ specId: 1, createdAt: -1 });
ActivityLogSchema.index({ eventType: 1, createdAt: -1 });
exports.default = mongoose_1.default.models.ActivityLog || mongoose_1.default.model('ActivityLog', ActivityLogSchema);
