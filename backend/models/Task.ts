import mongoose, { Schema, Document } from 'mongoose';

export enum TaskStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  CANCELLED = 'CANCELLED'
}

export enum TaskType {
  DEVELOPMENT = 'DEVELOPMENT',
  TEST = 'TEST',
  TDD = 'TDD',
  TESTING = 'TESTING',
  REVIEW = 'REVIEW',
  DOCUMENTATION = 'DOCUMENTATION',
  DEPLOYMENT = 'DEPLOYMENT'
}

export interface ITask extends Document {
  taskId: string;
  specId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  title: string;
  name: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: number;
  order: number;
  progress: number;

  dependencies: mongoose.Types.ObjectId[];

  acceptanceCriteria: string[];
  files: string[];
  testRequirements?: string;

  estimatedHours?: number;
  actualHours?: number;
  testCoverage?: number;

  assignedTo?: mongoose.Types.ObjectId;
  agentId?: mongoose.Types.ObjectId;
  assignedAgentId?: mongoose.Types.ObjectId;
  output?: string;
  result?: any;
  error?: string;

  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
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
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  title: {
    type: String,
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
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
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

  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  agentId: {
    type: Schema.Types.ObjectId,
    ref: 'Agent'
  },
  assignedAgentId: {
    type: Schema.Types.ObjectId,
    ref: 'Agent'
  },
  output: String,
  result: Schema.Types.Mixed,
  error: String,

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  startedAt: Date,
  completedAt: Date,
}, {
  timestamps: true
});

TaskSchema.index({ specId: 1, status: 1 });
TaskSchema.index({ specId: 1, order: 1 });

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
