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
exports.AgentStatus = exports.AgentType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var AgentType;
(function (AgentType) {
    AgentType["DEVELOPMENT"] = "DEVELOPMENT";
    AgentType["TEST"] = "TEST";
    AgentType["TDD"] = "TDD";
})(AgentType || (exports.AgentType = AgentType = {}));
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["IDLE"] = "IDLE";
    AgentStatus["RUNNING"] = "RUNNING";
    AgentStatus["COMPLETED"] = "COMPLETED";
    AgentStatus["FAILED"] = "FAILED";
    AgentStatus["STALLED"] = "STALLED";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
const AgentSchema = new mongoose_1.Schema({
    agentId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    type: {
        type: String,
        enum: Object.values(AgentType),
        required: true
    },
    status: {
        type: String,
        enum: Object.values(AgentStatus),
        default: AgentStatus.IDLE,
        index: true
    },
    currentTaskId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Task'
    },
    specId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Spec',
        index: true
    },
    processId: Number,
    workspacePath: String,
    developmentSessionId: String,
    cpuUsage: Number,
    memoryUsage: Number,
    lastHeartbeat: Date,
    terminatedAt: Date,
}, {
    timestamps: true
});
AgentSchema.index({ status: 1, type: 1 });
exports.default = mongoose_1.default.models.Agent || mongoose_1.default.model('Agent', AgentSchema);
