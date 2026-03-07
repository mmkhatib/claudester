#!/usr/bin/env npx tsx

/**
 * Cleanup Stuck Tasks Script
 *
 * Finds tasks stuck in IN_PROGRESS with zombie agents and resets them to PENDING
 */

import { connectDB } from '../lib/mongodb';
import { Task, Agent } from '../backend/models';

async function cleanupStuckTasks() {
  try {
    await connectDB();
    console.log('Connected to database\n');

    // Find all IN_PROGRESS tasks
    const inProgressTasks = await Task.find({ status: 'IN_PROGRESS' });
    console.log(`Found ${inProgressTasks.length} tasks in IN_PROGRESS state\n`);

    let resetCount = 0;
    let agentsCleanedUp = 0;

    for (const task of inProgressTasks) {
      // Find agents for this task
      const agents = await Agent.find({ currentTaskId: task._id });

      let isStuck = false;

      for (const agent of agents) {
        // Agent is stuck if it's marked as RUNNING but has no output or has errors
        if (agent.status === 'RUNNING' && (!agent.output || agent.output.length === 0 || agent.error)) {
          console.log(`Found stuck agent: ${agent.agentId}`);
          console.log(`  Task: ${task.title}`);
          console.log(`  Agent created: ${agent.createdAt}`);
          console.log(`  Error: ${agent.error || 'None'}`);

          // Mark agent as FAILED
          agent.status = 'FAILED';
          agent.error = agent.error || 'Agent stuck with no output - cleaned up by script';
          await agent.save();

          isStuck = true;
          agentsCleanedUp++;
        }
      }

      if (isStuck) {
        // Reset task to PENDING
        console.log(`  Resetting task "${task.title}" to PENDING\n`);

        task.status = 'PENDING';
        task.startedAt = undefined;
        task.completedAt = undefined;

        await task.save();
        resetCount++;
      }
    }

    console.log('\n=== CLEANUP SUMMARY ===');
    console.log(`Tasks reset to PENDING: ${resetCount}`);
    console.log(`Agents marked as FAILED: ${agentsCleanedUp}`);
    console.log('\nYou can now retry these tasks from the UI.');

    process.exit(0);
  } catch (error: any) {
    console.error('Error during cleanup:', error.message);
    process.exit(1);
  }
}

cleanupStuckTasks();
