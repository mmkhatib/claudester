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
exports.TaskType = exports.TaskStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "PENDING";
    TaskStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TaskStatus["COMPLETED"] = "COMPLETED";
    TaskStatus["FAILED"] = "FAILED";
    TaskStatus["BLOCKED"] = "BLOCKED";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var TaskType;
(function (TaskType) {
    TaskType["DEVELOPMENT"] = "DEVELOPMENT";
    TaskType["TEST"] = "TEST";
    TaskType["TDD"] = "TDD";
})(TaskType || (exports.TaskType = TaskType = {}));
const TaskSchema = new mongoose_1.Schema({
    taskId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    specId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Spec',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: Object.values(TaskType),
        required: true
    },
    status: {
        type: String,
        enum: Object.values(TaskStatus),
        default: TaskStatus.PENDING,
        index: true
    },
    priority: {
        type: Number,
        required: true,
        default: 2
    },
    order: {
        type: Number,
        required: true
    },
    dependencies: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Task'
        }],
    acceptanceCriteria: [String],
    files: [String],
    testRequirements: String,
    estimatedHours: Number,
    actualHours: Number,
    testCoverage: Number,
    assignedAgentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Agent'
    },
    output: String,
    error: String,
    completedAt: Date,
}, {
    timestamps: true
});
TaskSchema.index({ specId: 1, status: 1 });
TaskSchema.index({ specId: 1, order: 1 });
exports.default = mongoose_1.default.models.Task || mongoose_1.default.model('Task', TaskSchema);
