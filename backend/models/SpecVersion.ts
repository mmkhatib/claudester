import mongoose, { Schema, Document } from 'mongoose';

export interface ISpecVersion extends Document {
  specId: mongoose.Types.ObjectId;
  version: number;
  title: string;
  description?: string;
  priority: string;
  status: string;
  currentPhase: string;
  requirements?: any;
  design?: any;
  tasksDoc?: any;
  progress: number;
  estimatedHours?: number;
  actualHours?: number;
  requirementsApproved: boolean;
  designApproved: boolean;
  tasksApproved: boolean;
  changeDescription: string;
  changedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const SpecVersionSchema = new Schema<ISpecVersion>({
  specId: {
    type: Schema.Types.ObjectId,
    ref: 'Spec',
    required: true,
    index: true
  },
  version: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  priority: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  currentPhase: {
    type: String,
    required: true
  },
  requirements: Schema.Types.Mixed,
  design: Schema.Types.Mixed,
  tasksDoc: Schema.Types.Mixed,
  progress: {
    type: Number,
    default: 0
  },
  estimatedHours: Number,
  actualHours: Number,
  requirementsApproved: {
    type: Boolean,
    default: false
  },
  designApproved: {
    type: Boolean,
    default: false
  },
  tasksApproved: {
    type: Boolean,
    default: false
  },
  changeDescription: {
    type: String,
    required: true
  },
  changedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
}, {
  timestamps: true
});

// Compound index for spec versions
SpecVersionSchema.index({ specId: 1, version: -1 });

export default mongoose.models.SpecVersion || mongoose.model<ISpecVersion>('SpecVersion', SpecVersionSchema);
