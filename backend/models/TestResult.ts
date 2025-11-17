import mongoose, { Schema, Document } from 'mongoose';

export enum TestStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

export interface ITestResult extends Document {
  taskId: mongoose.Types.ObjectId;
  specId: mongoose.Types.ObjectId;
  suite: string;
  name: string;
  status: TestStatus;
  duration?: number;
  error?: string;
  coverage?: number;
  createdAt: Date;
}

const TestResultSchema = new Schema<ITestResult>({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },
  specId: {
    type: Schema.Types.ObjectId,
    ref: 'Spec',
    required: true,
    index: true
  },
  suite: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(TestStatus),
    required: true,
    index: true
  },
  duration: Number,
  error: String,
  coverage: Number,
}, {
  timestamps: true
});

TestResultSchema.index({ taskId: 1, status: 1 });
TestResultSchema.index({ specId: 1, status: 1 });

export default mongoose.models.TestResult || mongoose.model<ITestResult>('TestResult', TestResultSchema);
