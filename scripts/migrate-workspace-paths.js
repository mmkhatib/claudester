#!/usr/bin/env node

/**
 * Migration script to fix virtual workspace paths
 * Converts browser-fs: paths to real filesystem paths
 */

const { MongoClient } = require('mongodb');
const path = require('path');
const os = require('os');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/claudester';

async function migrate() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const projects = db.collection('projects');
    
    // Find all projects with browser-fs: workspace paths
    const virtualProjects = await projects.find({
      workspacePath: { $regex: /^browser-fs:/ }
    }).toArray();
    
    console.log(`Found ${virtualProjects.length} projects with virtual workspace paths`);
    
    for (const project of virtualProjects) {
      // Extract project name from virtual path
      const virtualPath = project.workspacePath;
      const projectSlug = project.name.toLowerCase().replace(/\s+/g, '-');
      
      // Create real workspace path
      const realPath = path.join(os.homedir(), 'workspace', 'projects', projectSlug);
      
      console.log(`\nUpdating project: ${project.name}`);
      console.log(`  Old path: ${virtualPath}`);
      console.log(`  New path: ${realPath}`);
      
      // Update the project
      await projects.updateOne(
        { _id: project._id },
        { $set: { workspacePath: realPath } }
      );
      
      console.log(`  ✓ Updated`);
    }
    
    console.log(`\n✓ Migration complete! Updated ${virtualProjects.length} projects`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrate();
