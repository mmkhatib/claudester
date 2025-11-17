import { connectDB } from '@/lib/mongodb';
import { Spec, SpecVersion } from '@/backend/models';
import { loggers } from '@/lib/logger';
import { publishActivityLog } from '@/lib/pubsub';
import { EventType } from '@/backend/models';
import type { Types } from 'mongoose';

class SpecVersioning {
  /**
   * Create a new version snapshot of a spec
   */
  async createVersion(
    specId: string,
    changeDescription: string,
    changedBy: string
  ): Promise<number> {
    await connectDB();

    const spec = await Spec.findById(specId);
    if (!spec) {
      throw new Error(`Spec ${specId} not found`);
    }

    // Get latest version number
    const latestVersion = await SpecVersion.findOne({ specId })
      .sort({ version: -1 })
      .select('version');

    const newVersion = latestVersion ? latestVersion.version + 1 : 1;

    // Create version snapshot
    await SpecVersion.create({
      specId,
      version: newVersion,
      title: spec.title,
      description: spec.description,
      priority: spec.priority,
      status: spec.status,
      currentPhase: spec.currentPhase,
      requirements: spec.requirements,
      design: spec.design,
      tasksDoc: spec.tasksDoc,
      progress: spec.progress,
      estimatedHours: spec.estimatedHours,
      actualHours: spec.actualHours,
      requirementsApproved: spec.requirementsApproved,
      designApproved: spec.designApproved,
      tasksApproved: spec.tasksApproved,
      changeDescription,
      changedBy,
    });

    loggers.agent.info(
      {
        specId,
        version: newVersion,
        changeDescription,
      },
      'Created spec version'
    );

    await publishActivityLog({
      eventType: EventType.SPEC_UPDATED,
      specId,
      message: `Version ${newVersion} created: ${changeDescription}`,
      metadata: {
        version: newVersion,
        changeDescription,
      },
    });

    return newVersion;
  }

  /**
   * Get all versions for a spec
   */
  async getVersions(specId: string): Promise<any[]> {
    await connectDB();

    const versions = await SpecVersion.find({ specId })
      .sort({ version: -1 })
      .populate('changedBy', 'name email')
      .lean();

    return versions;
  }

  /**
   * Get a specific version
   */
  async getVersion(specId: string, version: number): Promise<any | null> {
    await connectDB();

    const specVersion = await SpecVersion.findOne({ specId, version })
      .populate('changedBy', 'name email')
      .lean();

    return specVersion;
  }

  /**
   * Restore spec to a specific version
   */
  async restoreVersion(
    specId: string,
    version: number,
    restoredBy: string
  ): Promise<void> {
    await connectDB();

    // Get the version to restore
    const versionToRestore = await SpecVersion.findOne({ specId, version });
    if (!versionToRestore) {
      throw new Error(`Version ${version} not found for spec ${specId}`);
    }

    // Get current spec
    const spec = await Spec.findById(specId);
    if (!spec) {
      throw new Error(`Spec ${specId} not found`);
    }

    // Create a version of current state before restoring
    await this.createVersion(
      specId,
      `Before restore to version ${version}`,
      restoredBy
    );

    // Restore spec from version
    spec.title = versionToRestore.title;
    spec.description = versionToRestore.description;
    spec.priority = versionToRestore.priority as any;
    spec.status = versionToRestore.status as any;
    spec.currentPhase = versionToRestore.currentPhase as any;
    spec.requirements = versionToRestore.requirements;
    spec.design = versionToRestore.design;
    spec.tasksDoc = versionToRestore.tasksDoc;
    spec.progress = versionToRestore.progress;
    spec.estimatedHours = versionToRestore.estimatedHours;
    spec.actualHours = versionToRestore.actualHours;
    spec.requirementsApproved = versionToRestore.requirementsApproved;
    spec.designApproved = versionToRestore.designApproved;
    spec.tasksApproved = versionToRestore.tasksApproved;

    await spec.save();

    // Create new version for the restore
    await this.createVersion(
      specId,
      `Restored to version ${version}`,
      restoredBy
    );

    loggers.agent.info(
      {
        specId,
        version,
        restoredBy,
      },
      'Restored spec to version'
    );

    await publishActivityLog({
      eventType: EventType.SPEC_UPDATED,
      specId,
      message: `Spec restored to version ${version}`,
      metadata: {
        restoredToVersion: version,
        restoredBy,
      },
    });
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    specId: string,
    version1: number,
    version2: number
  ): Promise<any> {
    await connectDB();

    const [v1, v2] = await Promise.all([
      SpecVersion.findOne({ specId, version: version1 }).lean(),
      SpecVersion.findOne({ specId, version: version2 }).lean(),
    ]);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    // Compare fields
    const differences: any = {};
    const fieldsToCompare = [
      'title',
      'description',
      'priority',
      'status',
      'currentPhase',
      'requirements',
      'design',
      'tasksDoc',
      'progress',
    ];

    fieldsToCompare.forEach((field) => {
      const val1 = (v1 as any)[field];
      const val2 = (v2 as any)[field];

      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        differences[field] = {
          [version1]: val1,
          [version2]: val2,
        };
      }
    });

    return {
      version1: {
        version: (v1 as any).version,
        createdAt: (v1 as any).createdAt,
        changeDescription: (v1 as any).changeDescription,
      },
      version2: {
        version: (v2 as any).version,
        createdAt: (v2 as any).createdAt,
        changeDescription: (v2 as any).changeDescription,
      },
      differences,
    };
  }

  /**
   * Get version history summary
   */
  async getVersionHistory(specId: string): Promise<any> {
    await connectDB();

    const versions = await SpecVersion.find({ specId })
      .sort({ version: -1 })
      .select('version changeDescription changedBy createdAt')
      .populate('changedBy', 'name email')
      .lean();

    const totalVersions = versions.length;
    const latestVersion = versions[0];

    return {
      totalVersions,
      latestVersion,
      versions,
    };
  }

  /**
   * Auto-create version on significant changes
   */
  async autoVersion(
    specId: string,
    changedFields: string[],
    changedBy: string
  ): Promise<number | null> {
    // Determine if changes are significant enough for auto-versioning
    const significantFields = [
      'requirements',
      'design',
      'tasksDoc',
      'currentPhase',
      'status',
    ];

    const hasSignificantChanges = changedFields.some((field) =>
      significantFields.includes(field)
    );

    if (!hasSignificantChanges) {
      return null;
    }

    const changeDescription = `Auto-version: ${changedFields.join(', ')} updated`;

    return await this.createVersion(specId, changeDescription, changedBy);
  }
}

// Singleton instance
export const specVersioning = new SpecVersioning();
