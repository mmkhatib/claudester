import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
}

export async function getGitChanges(workspacePath: string): Promise<FileChange[]> {
  try {
    const { stdout } = await execAsync('git status --porcelain', {
      cwd: workspacePath,
    });

    const changes: FileChange[] = [];
    const lines = stdout.trim().split('\n').filter(line => line);

    for (const line of lines) {
      const status = line.substring(0, 2).trim();
      const path = line.substring(3);

      if (status === 'A' || status === '??') {
        changes.push({ path, type: 'added' });
      } else if (status === 'M') {
        changes.push({ path, type: 'modified' });
      } else if (status === 'D') {
        changes.push({ path, type: 'deleted' });
      }
    }

    return changes;
  } catch (error) {
    console.error('Error getting git changes:', error);
    return [];
  }
}
