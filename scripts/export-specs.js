#!/usr/bin/env node

/**
 * Export spec data to workspace
 * Writes requirements, design, and tasks to .claudester/specs/
 */

const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/claudester';

async function exportSpecs() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const projects = db.collection('projects');
    const specs = db.collection('specs');
    const tasks = db.collection('tasks');
    
    // Get all projects
    const allProjects = await projects.find({}).toArray();
    
    for (const project of allProjects) {
      console.log(`\nExporting specs for project: ${project.name}`);
      console.log(`Workspace: ${project.workspacePath}`);
      
      if (!project.workspacePath || project.workspacePath.startsWith('browser-fs:')) {
        console.log('  ⚠️  Skipping - invalid workspace path');
        continue;
      }
      
      // Get all specs for this project
      const projectSpecs = await specs.find({ projectId: project._id }).toArray();
      console.log(`  Found ${projectSpecs.length} specs`);
      
      for (const spec of projectSpecs) {
        const specNum = String(spec.specNumber).padStart(3, '0');
        const specDir = path.join(project.workspacePath, '.claudester', 'specs', specNum);
        
        // Create spec directory
        await fs.mkdir(specDir, { recursive: true });
        
        // Write requirements
        if (spec.requirements) {
          const reqContent = `# Requirements: ${spec.title}

## Functional Requirements
${spec.requirements.functional?.map(r => `- ${r}`).join('\n') || 'None'}

## Technical Requirements
${spec.requirements.technical?.map(r => `- ${r}`).join('\n') || 'None'}

## Constraints
${spec.requirements.constraints?.map(r => `- ${r}`).join('\n') || 'None'}

## Acceptance Criteria
${spec.requirements.acceptanceCriteria?.map(r => `- ${r}`).join('\n') || 'None'}
`;
          await fs.writeFile(path.join(specDir, 'requirements.md'), reqContent);
        }
        
        // Write design
        if (spec.design) {
          const designContent = `# Design: ${spec.title}

## Architecture
${spec.design.architecture || 'Not specified'}

## Data Model
${spec.design.dataModel || 'Not specified'}

## API Endpoints
${spec.design.apiEndpoints?.map(e => `- ${e}`).join('\n') || 'None'}

## UI Components
${spec.design.uiComponents?.map(c => `- ${c}`).join('\n') || 'None'}
`;
          await fs.writeFile(path.join(specDir, 'design.md'), designContent);
        }
        
        // Write tasks
        const specTasks = await tasks.find({ specId: spec._id }).toArray();
        if (specTasks.length > 0) {
          const tasksContent = `# Tasks: ${spec.title}

${specTasks.map((t, i) => `## Task ${i + 1}: ${t.title}

**Description:** ${t.description}

**Type:** ${t.type || 'N/A'}
**Estimated Hours:** ${t.estimatedHours || 'N/A'}
**Status:** ${t.status}

**Acceptance Criteria:**
${t.acceptanceCriteria?.map(c => `- ${c}`).join('\n') || 'None'}

**Files:**
${t.files?.map(f => `- ${f}`).join('\n') || 'None'}

---
`).join('\n')}
`;
          await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent);
        }
        
        // Write metadata
        const metadata = {
          specId: spec._id.toString(),
          specNumber: spec.specNumber,
          title: spec.title,
          description: spec.description,
          currentPhase: spec.currentPhase,
          createdAt: spec.createdAt,
          updatedAt: spec.updatedAt,
        };
        await fs.writeFile(
          path.join(specDir, '.metadata.json'),
          JSON.stringify(metadata, null, 2)
        );
        
        console.log(`  ✓ Exported spec ${specNum}: ${spec.title}`);
      }
    }
    
    console.log(`\n✓ Export complete!`);
    
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

exportSpecs();
