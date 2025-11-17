import mongoose, { Schema, Document } from 'mongoose';

export enum Priority {
  P0 = 'P0',
  P1 = 'P1',
  P2 = 'P2'
}

export enum SpecStatus {
  ACTIVE = 'ACTIVE',
  COMPLETE = 'COMPLETE',
  BLOCKED = 'BLOCKED',
  ON_HOLD = 'ON_HOLD'
}

export enum Phase {
  REQUIREMENTS = 'REQUIREMENTS',
  DESIGN = 'DESIGN',
  TASKS = 'TASKS',
  IMPLEMENTATION = 'IMPLEMENTATION'
}

export interface ISpec extends Document {
  specNumber: number;
  name: string;
  description: string;
  priority: Priority;
  status: SpecStatus;
  currentPhase: Phase;
  projectId: mongoose.Types.ObjectId;

  requirements?: any;
  design?: any;
  tasksDoc?: any;

  requirementsApproved: boolean;
  requirementsApprovedAt?: Date;
  designApproved: boolean;
  designApprovedAt?: Date;
  tasksApproved: boolean;
  tasksApprovedAt?: Date;

  progress: number;
  estimatedHours?: number;
  actualHours?: number;

  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const SpecSchema = new Schema<ISpec>({
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
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },

  requirements: Schema.Types.Mixed,
  design: Schema.Types.Mixed,
  tasksDoc: Schema.Types.Mixed,

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

export default mongoose.models.Spec || mongoose.model<ISpec>('Spec', SpecSchema);
