import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description: string;
  ownerId: mongoose.Types.ObjectId;
  teamMembers: mongoose.Types.ObjectId[];
  workspacePath?: string; // Where generated code should be saved
  // Project-wide architecture for consistency
  architecture?: {
    techStack?: {
      frontend?: string[];
      backend?: string[];
      database?: string[];
      deployment?: string[];
    };
    patterns?: string[]; // e.g., ["MVC", "Event-driven", "Microservices"]
    dataModel?: string; // Shared data models across features
    conventions?: {
      naming?: string;
      fileStructure?: string;
      codeStyle?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  teamMembers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  workspacePath: {
    type: String,
    // Default will be set programmatically based on project name
  },
  architecture: {
    techStack: {
      frontend: [String],
      backend: [String],
      database: [String],
      deployment: [String],
    },
    patterns: [String],
    dataModel: String,
    conventions: {
      naming: String,
      fileStructure: String,
      codeStyle: String,
    },
  },
}, {
  timestamps: true
});

ProjectSchema.index({ name: 1, ownerId: 1 });

export default mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);
