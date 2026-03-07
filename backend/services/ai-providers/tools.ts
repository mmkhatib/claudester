import fs from 'fs/promises';
import path from 'path';

/**
 * Tool definitions for Claude API
 */
export const tools = [
  {
    name: 'write_file',
    description: 'Write content to a file. Creates the file and any necessary parent directories.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path (can be absolute or relative to workspace)',
        },
        content: {
          type: 'string',
          description: 'The content to write to the file',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path to read',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_directory',
    description: 'List files and directories in a given path',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The directory path to list',
        },
      },
      required: ['path'],
    },
  },
];

/**
 * Execute a tool call
 */
export async function executeTool(
  toolName: string,
  toolInput: any,
  workspacePath: string
): Promise<string> {
  try {
    switch (toolName) {
      case 'write_file': {
        const filePath = path.isAbsolute(toolInput.path)
          ? toolInput.path
          : path.join(workspacePath, toolInput.path);

        // Create directory if it doesn't exist
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        // Write the file
        await fs.writeFile(filePath, toolInput.content, 'utf-8');

        return `Successfully wrote ${toolInput.content.length} bytes to ${filePath}`;
      }

      case 'read_file': {
        const filePath = path.isAbsolute(toolInput.path)
          ? toolInput.path
          : path.join(workspacePath, toolInput.path);

        const content = await fs.readFile(filePath, 'utf-8');
        return content;
      }

      case 'list_directory': {
        const dirPath = path.isAbsolute(toolInput.path)
          ? toolInput.path
          : path.join(workspacePath, toolInput.path);

        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const list = entries.map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
        }));

        return JSON.stringify(list, null, 2);
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error: any) {
    return `Error executing ${toolName}: ${error.message}`;
  }
}
