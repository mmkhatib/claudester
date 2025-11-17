import mongoose, { Schema, Document } from 'mongoose';

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED'
}

export enum TaskType {
  DEVELOPMENT = 'DEVELOPMENT',
  TEST = 'TEST',
  TDD = 'TDD'
}

export interface ITask extends Document {
  taskId: string;
  specId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: number;
  order: number;

  dependencies: mongoose.Types.ObjectId[];

  acceptanceCriteria: string[];
  files: string[];
  testRequirements?: string;

  estimatedHours?: number;
  actualHours?: number;
  testCoverage?: number;

  assignedAgentId?: mongoose.Types.ObjectId;
  output?: string;
  error?: string;

  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const TaskSchema = new Schema<ITask>({
  taskId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  specId: {
    type: Schema.Types.ObjectId,
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
    type: Schema.Types.ObjectId,
    ref: 'Task'
  }],

  acceptanceCriteria: [String],
  files: [String],
  testRequirements: String,

  estimatedHours: Number,
  actualHours: Number,
  testCoverage: Number,

  assignedAgentId: {
    type: Schema.Types.ObjectId,
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

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
