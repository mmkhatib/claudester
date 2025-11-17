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
exports.Phase = exports.SpecStatus = exports.Priority = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var Priority;
(function (Priority) {
    Priority["P0"] = "P0";
    Priority["P1"] = "P1";
    Priority["P2"] = "P2";
})(Priority || (exports.Priority = Priority = {}));
var SpecStatus;
(function (SpecStatus) {
    SpecStatus["ACTIVE"] = "ACTIVE";
    SpecStatus["COMPLETE"] = "COMPLETE";
    SpecStatus["BLOCKED"] = "BLOCKED";
    SpecStatus["ON_HOLD"] = "ON_HOLD";
})(SpecStatus || (exports.SpecStatus = SpecStatus = {}));
var Phase;
(function (Phase) {
    Phase["REQUIREMENTS"] = "REQUIREMENTS";
    Phase["DESIGN"] = "DESIGN";
    Phase["TASKS"] = "TASKS";
    Phase["IMPLEMENTATION"] = "IMPLEMENTATION";
})(Phase || (exports.Phase = Phase = {}));
const SpecSchema = new mongoose_1.Schema({
    specNumber: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: Object.values(Priority),
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: Object.values(SpecStatus),
        default: SpecStatus.ACTIVE,
        index: true
    },
    currentPhase: {
        type: String,
        enum: Object.values(Phase),
        default: Phase.REQUIREMENTS
    },
    projectId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    requirements: mongoose_1.Schema.Types.Mixed,
    design: mongoose_1.Schema.Types.Mixed,
    tasksDoc: mongoose_1.Schema.Types.Mixed,
    requirementsApproved: {
        type: Boolean,
        default: false
    },
    requirementsApprovedAt: Date,
    designApproved: {
        type: Boolean,
        default: false
    },
    designApprovedAt: Date,
    tasksApproved: {
        type: Boolean,
        default: false
    },
    tasksApprovedAt: Date,
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    estimatedHours: Number,
    actualHours: Number,
    completedAt: Date,
}, {
    timestamps: true
});
SpecSchema.index({ projectId: 1, specNumber: 1 }, { unique: true });
SpecSchema.index({ status: 1, currentPhase: 1 });
exports.default = mongoose_1.default.models.Spec || mongoose_1.default.model('Spec', SpecSchema);
