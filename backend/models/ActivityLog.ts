import mongoose, { Schema, Document } from 'mongoose';

export enum EventType {
  SPEC_CREATED = 'SPEC_CREATED',
  SPEC_UPDATED = 'SPEC_UPDATED',
  SPEC_APPROVED = 'SPEC_APPROVED',
  TASK_CREATED = 'TASK_CREATED',
  TASK_STARTED = 'TASK_STARTED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  TASK_FAILED = 'TASK_FAILED',
  AGENT_STARTED = 'AGENT_STARTED',
  AGENT_COMPLETED = 'AGENT_COMPLETED',
  AGENT_FAILED = 'AGENT_FAILED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  TEST_PASSED = 'TEST_PASSED',
  TEST_FAILED = 'TEST_FAILED'
}

export interface IActivityLog extends Document {
  eventType: EventType;
  userId?: mongoose.Types.ObjectId;
  specId?: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  agentId?: mongoose.Types.ObjectId;
  message: string;
  metadata?: any;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>({
  eventType: {
    type: String,
    enum: Object.values(EventType),
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  specId: {
    type: Schema.Types.ObjectId,
    ref: 'Spec',
    index: true
  },
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task'
  },
  agentId: {
    type: Schema.Types.ObjectId,
    ref: 'Agent'
  },
  message: {
    type: String,
    required: true
  },
  metadata: Schema.Types.Mixed,
}, {
  timestamps: true
});

ActivityLogSchema.index({ specId: 1, createdAt: -1 });
ActivityLogSchema.index({ eventType: 1, createdAt: -1 });

export default mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
