import mongoose, { Schema, Document } from 'mongoose';

export enum AgentType {
  DEVELOPMENT = 'DEVELOPMENT',
  TEST = 'TEST',
  TDD = 'TDD'
}

export enum AgentStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  STALLED = 'STALLED'
}

export interface IAgent extends Document {
  agentId: string;
  type: AgentType;
  status: AgentStatus;
  currentTaskId?: mongoose.Types.ObjectId;
  specId?: mongoose.Types.ObjectId;

  processId?: number;
  workspacePath?: string;
  developmentSessionId?: string;

  cpuUsage?: number;
  memoryUsage?: number;
  lastHeartbeat?: Date;

  createdAt: Date;
  updatedAt: Date;
  terminatedAt?: Date;
}

const AgentSchema = new Schema<IAgent>({
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
    type: Schema.Types.ObjectId,
    ref: 'Task'
  },
  specId: {
    type: Schema.Types.ObjectId,
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

export default mongoose.models.Agent || mongoose.model<IAgent>('Agent', AgentSchema);
