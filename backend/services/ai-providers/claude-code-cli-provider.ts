import { execFile, exec, spawn } from 'child_process';
import { promisify } from 'util';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { AIProvider, GeneratedSpec, GeneratedRequirements, GeneratedDesign, GeneratedTask, ProjectArchitecture } from './base-provider';
import { loggers } from '@/lib/logger';
import {
  parseSpecReference,
  shouldLoadSpecContext,
  loadSpecContext,
  formatSpecContextForAI,
} from '../spec-context-loader';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

/**
 * Claude Code CLI Provider
 * Uses the local Claude Code CLI installation
 */
export class ClaudeCodeCLIProvider implements AIProvider {
  private claudeCommand: string | null = null;

  constructor() {
    loggers.agent.info('Claude Code CLI provider initialized');
    this.findClaudeCommand();
  }

  /**
   * Find the claude command in PATH
   */
  private async findClaudeCommand(): Promise<void> {
    try {
      // Try to find claude in PATH
      const { stdout } = await execAsync('which claude');
      this.claudeCommand = stdout.trim();
      console.log('[CLI Provider] Found claude at:', this.claudeCommand);
    } catch (error) {
      // Fallback to known locations
      const fallbackPaths = [
        '/Users/overlord/.local/bin/claude',
        '/Users/overlord/.local/share/claude/versions/2.0.59',
      ];

      for (const path of fallbackPaths) {
        if (existsSync(path)) {
          this.claudeCommand = path;
          console.log('[CLI Provider] Using claude at:', this.claudeCommand);
          break;
        }
      }

      if (!this.claudeCommand) {
        console.error('[CLI Provider] Could not find claude command');
      }
    }
  }

  /**
   * Execute Claude CLI command and get response
   */
  private async executeClaude(prompt: string, options: {
    jsonSchema?: object;
    tools?: string;
    timeout?: number;
    onProgress?: (text: string) => void;
  } = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Build command - escape the prompt for shell
        const escapedPrompt = prompt.replace(/'/g, "'\\''");

        // Build the full command with streaming
        let cmd = `claude -p '${escapedPrompt}' --output-format stream-json --verbose --include-partial-messages`;

        console.log('[CLI Provider] Executing claude with streaming...');

        // Create environment without ANTHROPIC_API_KEY to avoid conflicts
        const env = { ...process.env };
        delete env.ANTHROPIC_API_KEY;

        // Run through shell
        const claudeProcess = spawn('/bin/sh', ['-c', cmd], {
          env,
          cwd: '/Users/overlord',
          stdio: ['pipe', 'pipe', 'pipe']
        });

        claudeProcess.stdin.end();

        let fullResponse = '';
        let rawOutput = '';
        let stderr = '';

        // Process streaming JSON output
        claudeProcess.stdout.on('data', (data) => {
          const chunk = data.toString();
          rawOutput += chunk;
          
          // Split by newlines to process each JSON event
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              const event = JSON.parse(line);
              
              // Extract text deltas from stream events
              if (event.type === 'stream_event' && 
                  event.event?.delta?.type === 'text_delta' && 
                  event.event?.delta?.text) {
                const text = event.event.delta.text;
                fullResponse += text;
                
                // Call progress callback if provided
                if (options.onProgress) {
                  console.log('[CLI Provider] Streaming text:', text.substring(0, 50));
                  options.onProgress(text);
                }
              }
              
              // Log thinking events
              if (event.type === 'stream_event' && 
                  event.event?.type === 'thinking') {
                console.log('[CLI Provider] Thinking:', event.event.thinking?.substring(0, 100));
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete lines
            }
          }
        });

        claudeProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        claudeProcess.on('close', (code) => {
          console.log('[CLI Provider] Process exited with code:', code);
          console.log('[CLI Provider] Full response length:', fullResponse.length);

          if (code !== 0 && code !== null) {
            console.error('[CLI Provider] stderr:', stderr);
            reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
          } else {
            if (fullResponse.length === 0) {
              console.warn('[CLI Provider] WARNING: No text extracted from stream');
              console.log('[CLI Provider] Raw output:', rawOutput.substring(0, 500));
            }
            resolve(fullResponse.trim());
          }
        });

        claudeProcess.on('error', (error) => {
          console.error('[CLI Provider] Process error:', error);
          reject(new Error(`Failed to spawn Claude CLI: ${error.message}`));
        });

        // Set timeout
        const timeoutMs = options.timeout || 180000;
        const timeoutMinutes = Math.round(timeoutMs / 60000);

        const timeout = setTimeout(() => {
          claudeProcess.kill();
          reject(new Error(`Claude CLI timeout after ${timeoutMinutes} minutes`));
        }, timeoutMs);

        // Clear timeout when process completes
        claudeProcess.on('close', () => {
          clearTimeout(timeout);
        });

      } catch (error: any) {
        console.error('[CLI Provider] Error:', error.message);
        reject(new Error(`Claude CLI error: ${error.message}`));
      }
    });
  }

  async generateProjectArchitecture(
    projectName: string,
    projectDescription: string
  ): Promise<ProjectArchitecture> {
    const prompt = `You are a senior software architect. Analyze this project and create a comprehensive architecture document that will guide all feature development.

Project: ${projectName}

Description: ${projectDescription}

Generate a project-wide architecture including:

1. **Tech Stack**
   - Frontend framework and key libraries
   - Backend framework (if needed)
   - Database technology
   - Deployment strategy

2. **Architectural Patterns**
   - Overall architecture style (MVC, Component-based, Event-driven, etc.)
   - State management approach
   - Data flow patterns

3. **Shared Data Models**
   - Core entities that multiple features will use
   - Common data structures
   - API contracts (if applicable)

4. **Code Conventions**
   - Naming conventions (files, variables, functions)
   - File/folder structure
   - Code style guidelines

Output as JSON with this structure:
{
  "techStack": {
    "frontend": ["Technology 1", "Technology 2", ...],
    "backend": ["Technology 1", ...] or [],
    "database": ["Technology 1", ...] or [],
    "deployment": ["Strategy 1", ...]
  },
  "patterns": ["Pattern 1", "Pattern 2", ...],
  "dataModel": "Detailed description of core shared entities and data structures",
  "conventions": {
    "naming": "Description of naming conventions for files, variables, functions, classes...",
    "fileStructure": "Description of folder/file organization...",
    "codeStyle": "Description of code style guidelines..."
  }
}`;

    console.log('[CLI Provider] Generating project architecture...');
    const response = await this.executeClaude(prompt, { timeout: 300000 });

    try {
      let architecture;
      try {
        architecture = JSON.parse(response);
      } catch (e) {
        const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          architecture = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('No JSON found in response');
        }
      }

      console.log('[CLI Provider] Successfully generated project architecture');
      return architecture;
    } catch (error) {
      console.error('[CLI Provider] Failed to parse architecture:', error);
      // Return minimal fallback architecture
      return {
        techStack: {
          frontend: ['JavaScript'],
          backend: [],
          database: [],
          deployment: ['Static hosting'],
        },
        patterns: ['Component-based'],
        dataModel: projectDescription,
        conventions: {
          naming: 'camelCase for variables, PascalCase for classes',
          fileStructure: 'Feature-based organization',
          codeStyle: 'Modern ES6+',
        },
      };
    }
  }

  async generateSpecifications(
    projectName: string,
    projectDescription: string,
    architecture?: ProjectArchitecture,
    existingSpecs?: Array<{ name: string; description: string }>,
    onProgress?: (text: string) => void
  ): Promise<GeneratedSpec[]> {
    const architectureText = architecture ? `

ARCHITECTURE CONSTRAINTS:
- Tech Stack:
  Frontend: ${architecture.techStack.frontend?.join(', ') || 'Not specified'}
  Backend: ${architecture.techStack.backend?.join(', ') || 'None'}
  Database: ${architecture.techStack.database?.join(', ') || 'None'}
  Deployment: ${architecture.techStack.deployment?.join(', ') || 'Not specified'}
- Patterns: ${architecture.patterns.join(', ')}
- Data Model: ${architecture.dataModel}
- Conventions:
  Naming: ${architecture.conventions.naming}
  File Structure: ${architecture.conventions.fileStructure}
` : '';

    const existingSpecsText = existingSpecs && existingSpecs.length > 0 ? `

EXISTING SPECS (don't duplicate):
${existingSpecs.map(s => `- ${s.name}: ${s.description}`).join('\n')}
` : '';

    const prompt = `You are a technical product manager and software architect. Generate feature specifications for this project.

Project: ${projectName}

Description: ${projectDescription}${architectureText}${existingSpecsText}

Generate NEW specifications that:
1. ${architecture ? `Use the defined tech stack: ${architecture.techStack.frontend?.join(', ')}` : 'Consider appropriate technology choices'}
2. ${architecture ? `Follow the established patterns: ${architecture.patterns.join(', ')}` : 'Use appropriate design patterns'}
3. ${existingSpecs ? 'Build upon and reference existing specs where appropriate' : 'Consider feature interconnections'}
4. ${architecture ? `Follow the conventions: ${architecture.conventions.naming}` : 'Use consistent naming'}
5. Avoid duplicating existing functionality

For each specification, provide:
1. A clear, concise title
2. A detailed description of what needs to be built
3. Priority level (P0 for critical/MVP features, P1 for important features, P2 for nice-to-have features)

Output as JSON array with this structure:
[
  {
    "title": "Feature name",
    "description": "Detailed description following the established architecture and integrating with existing features where needed",
    "priority": "P0" | "P1" | "P2"
  }
]

Be thorough but practical. Think through feature dependencies and integration points.`;

    const jsonSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['P0', 'P1', 'P2'] },
        },
        required: ['title', 'description', 'priority'],
      },
    };

    console.log('[CLI Provider] Starting spec generation with 10 minute timeout...');
    const response = await this.executeClaude(prompt, {
      timeout: 600000, // 10 minutes for spec generation with thinking
      onProgress: onProgress // Pass through progress callback
    });

    console.log('[CLI Provider] Response received, length:', response.length);
    console.log('[CLI Provider] Response preview:', response.substring(0, 500));

    // Try to extract JSON from response (might be wrapped in markdown)
    try {
      // Try to parse as direct JSON first
      let specs;
      try {
        specs = JSON.parse(response);
      } catch (e) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (jsonMatch) {
          specs = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('No JSON found in response');
        }
      }

      if (!Array.isArray(specs)) {
        console.error('[CLI Provider] Response is not an array, got:', typeof specs);
        throw new Error('Response is not an array');
      }

      console.log('[CLI Provider] Successfully parsed', specs.length, 'specs');
      loggers.agent.info({ count: specs.length }, 'Generated specifications from CLI');
      return specs;
    } catch (error) {
      console.error('[CLI Provider] Failed to parse response:', error);
      console.error('[CLI Provider] Raw response:', response.substring(0, 1000));
      loggers.agent.error({ error, responsePreview: response.substring(0, 500) }, 'Failed to parse CLI response');

      // Fallback: return a single spec with the full response
      return [
        {
          title: 'Generated Specifications',
          description: response,
          priority: 'P1',
        },
      ];
    }
  }

  async generateCode(
    taskDescription: string,
    context?: string,
    workspacePath?: string,
    onProgress?: (data: { type: 'stdout' | 'stderr'; content: string }) => void
  ): Promise<string> {
    // Ensure claude command is found
    if (!this.claudeCommand) {
      await this.findClaudeCommand();
      if (!this.claudeCommand) {
        throw new Error('Claude CLI not found. Please ensure Claude Code is installed and accessible in PATH.');
      }
    }

    return new Promise(async (resolve, reject) => {
      try {
        // Check if task description contains #spec: syntax
        let specContextPrompt = '';
        if (shouldLoadSpecContext(taskDescription) && workspacePath) {
          const specName = parseSpecReference(taskDescription);
          if (specName) {
            try {
              console.log('[CLI Provider] Loading spec context for:', specName);
              const specContext = await loadSpecContext(workspacePath, specName);
              specContextPrompt = formatSpecContextForAI(specContext);
              console.log('[CLI Provider] Spec context loaded successfully');
            } catch (error) {
              console.warn('[CLI Provider] Failed to load spec context:', error);
              // Continue without spec context
            }
          }
        }

        const contextText = context ? `${context}\n\n` : '';
        const prompt = `${specContextPrompt}${contextText}Task: ${taskDescription}\n\nPlease implement this task by writing the necessary code files.`;

        console.log('[CLI Provider] Executing claude with file writing tools...');

        // Create environment forcing subscription auth (not API)
        // Set ANTHROPIC_API_KEY to empty to force Claude to use local subscription
        const env = { ...process.env };
        delete env.ANTHROPIC_API_KEY; // Remove API key to force subscription mode

        // Ensure PATH includes common locations
        if (!env.PATH?.includes('/Users/overlord/.local/bin')) {
          env.PATH = `/Users/overlord/.local/bin:${env.PATH || ''}`;
        }

        // Extract workspace path from context or use provided workspace
        const workspaceMatch = context?.match(/Workspace:\s*(.+)/);
        const workspace = workspacePath || (workspaceMatch ? workspaceMatch[1].trim() : '/Users/overlord/workspace/projects');

        console.log('[CLI Provider] Using workspace:', workspace);

        // Create workspace directory if it doesn't exist
        if (!existsSync(workspace)) {
          console.log('[CLI Provider] Creating workspace directory:', workspace);
          mkdirSync(workspace, { recursive: true });
        }

        // Build arguments for claude CLI
        const args = [
          '--dangerously-skip-permissions',
          '--add-dir', workspace,
          '--tools', 'Write,Read,Edit,Bash,Glob',
          '--max-turns', '20',
          prompt
        ];

        console.log('[CLI Provider] Running claude with tools enabled in workspace:', workspace);

        // Use spawn for real-time streaming output
        const claudeProcess = spawn(this.claudeCommand, args, {
          env,
          cwd: workspace,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        // Close stdin immediately
        claudeProcess.stdin.end();

        let stdout = '';
        let stderr = '';
        let lastProgressLog = Date.now();

        // Collect and stream stdout in real-time
        claudeProcess.stdout.on('data', (data) => {
          const content = data.toString();
          stdout += content;
          
          console.log('[CLI Provider] stdout chunk:', content.substring(0, 200));

          // Send progress update
          if (onProgress) {
            console.log('[CLI Provider] Calling onProgress with stdout');
            onProgress({ type: 'stdout', content });
          }

          // Log progress every 10 seconds
          const now = Date.now();
          if (now - lastProgressLog > 10000) {
            console.log('[CLI Provider] Progress update - received', stdout.length, 'bytes so far');
            lastProgressLog = now;
          }
        });

        // Collect and stream stderr in real-time
        claudeProcess.stderr.on('data', (data) => {
          const content = data.toString();
          stderr += content;

          // Send progress update
          if (onProgress) {
            onProgress({ type: 'stderr', content });
          }

          // Log stderr immediately
          console.warn('[CLI Provider] stderr:', content.trim());
        });

        // Handle process completion
        claudeProcess.on('close', (code) => {
          console.log('[CLI Provider] Process exited with code:', code);
          console.log('[CLI Provider] stdout length:', stdout.length);
          console.log('[CLI Provider] stderr length:', stderr.length);

          if (code !== 0 && code !== null) {
            console.error('[CLI Provider] Process failed with code:', code);
            reject(new Error(`Claude CLI exited with code ${code}${stderr ? ': ' + stderr : ''}`));
          } else {
            console.log('[CLI Provider] Code generation completed successfully');
            resolve(stdout.trim() || 'Code generated successfully. Check workspace directory for files.');
          }
        });

        // Handle process errors
        claudeProcess.on('error', (error) => {
          console.error('[CLI Provider] Process error:', error);

          if ((error as any).code === 'ENOENT') {
            reject(new Error(`Claude CLI not found at ${this.claudeCommand}. Please ensure Claude Code is installed.`));
          } else {
            reject(new Error(`Failed to spawn Claude CLI: ${error.message}`));
          }
        });

        // Set timeout (10 minutes for complex tasks)
        const timeout = setTimeout(() => {
          console.warn('[CLI Provider] Timeout reached, killing process');
          claudeProcess.kill('SIGTERM');
          reject(new Error('Claude CLI timeout after 10 minutes'));
        }, 600000);

        // Clear timeout when process completes
        claudeProcess.on('close', () => {
          clearTimeout(timeout);
        });

      } catch (error: any) {
        console.error('[CLI Provider] Setup error:', error);
        reject(new Error(`Claude CLI setup error: ${error.message}`));
      }
    });
  }

  async reviewCode(code: string, criteria?: string[]): Promise<string> {
    const criteriaText = criteria && criteria.length > 0
      ? `\n\nAcceptance criteria:\n${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      : '';

    const prompt = `You are an expert code reviewer. Analyze the provided code and suggest improvements. Focus on code quality, best practices, security, and performance.${criteriaText}\n\nPlease review the following code:\n\`\`\`\n${code}\n\`\`\``;

    return await this.executeClaude(prompt);
  }

  async generateTests(code: string, framework: string = 'jest'): Promise<string> {
    const prompt = `You are an expert at writing tests. Generate comprehensive unit tests for the provided code using ${framework}. Include edge cases and error scenarios.\n\nGenerate tests for this code:\n\`\`\`\n${code}\n\`\`\``;

    return await this.executeClaude(prompt);
  }

  async analyzeTask(
    taskDescription: string,
    acceptanceCriteria: string[]
  ): Promise<{
    analysis: string;
    steps: string[];
    estimatedComplexity: 'low' | 'medium' | 'high';
  }> {
    const criteriaText = acceptanceCriteria.length > 0
      ? `\n\nAcceptance criteria:\n${acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      : '';

    const prompt = `You are a technical analyst. Analyze the given task and break it down into clear, actionable steps. Also estimate the complexity.

Provide:
1. Overall analysis
2. Step-by-step breakdown
3. Complexity estimate (low/medium/high)

Task: ${taskDescription}${criteriaText}`;

    const response = await this.executeClaude(prompt);

    // Simple parsing
    let estimatedComplexity: 'low' | 'medium' | 'high' = 'medium';
    if (response.toLowerCase().includes('complexity: low')) {
      estimatedComplexity = 'low';
    } else if (response.toLowerCase().includes('complexity: high')) {
      estimatedComplexity = 'high';
    }

    const stepMatches = response.match(/\d+\.\s+(.+)/g) || [];
    const steps = stepMatches.map((s) => s.replace(/^\d+\.\s+/, ''));

    return {
      analysis: response,
      steps,
      estimatedComplexity,
    };
  }

  async fixCode(
    code: string,
    errorMessage: string,
    context?: string
  ): Promise<string> {
    const contextText = context ? `\n\nContext:\n${context}` : '';
    const prompt = `You are an expert debugger. Fix the provided code based on the error message. Provide only the corrected code.\n\nFix this code:\n\`\`\`\n${code}\n\`\`\`\n\nError:\n${errorMessage}${contextText}`;

    return await this.executeClaude(prompt);
  }

  async generateRequirements(
    specName: string,
    specDescription: string,
    projectContext?: string,
    architecture?: ProjectArchitecture,
    relatedSpecs?: Array<{ id: string; name: string; description: string }>,
    onProgress?: (text: string) => void
  ): Promise<GeneratedRequirements> {
    const contextText = projectContext ? `\n\nProject Context:\n${projectContext}` : '';
    
    const architectureText = architecture ? `

ARCHITECTURE:
- Tech Stack: ${architecture.techStack.frontend?.join(', ')} ${architecture.techStack.backend?.join(', ')}
- Patterns: ${architecture.patterns.join(', ')}
- Data Model: ${architecture.dataModel}
- Conventions: ${architecture.conventions.naming}` : '';

    const relatedText = relatedSpecs && relatedSpecs.length > 0 ? `

RELATED SPECS (consider integration):
${relatedSpecs.map(s => `- ${s.name}: ${s.description}`).join('\n')}` : '';

    const prompt = `You are a technical requirements analyst. Generate comprehensive requirements for the following feature specification.

Specification: ${specName}

Description: ${specDescription}${contextText}${architectureText}${relatedText}

Generate detailed requirements in the following categories:
1. Functional Requirements - What the feature must do
2. Technical Requirements - Technology stack, architecture decisions, performance needs${architecture ? ' (must use: ' + architecture.techStack.frontend?.join(', ') + ')' : ''}
3. Constraints - Limitations, dependencies, compatibility requirements
4. Acceptance Criteria - Testable conditions that must be met

Output as JSON with this structure:
{
  "functional": ["requirement 1", "requirement 2", ...],
  "technical": ["requirement 1", "requirement 2", ...],
  "constraints": ["constraint 1", "constraint 2", ...],
  "acceptanceCriteria": ["criterion 1", "criterion 2", ...]
}`;

    console.log('[CLI Provider] Generating requirements...');
    const response = await this.executeClaude(prompt, { 
      timeout: 300000,
      onProgress: onProgress
    });

    try {
      let requirements;
      try {
        requirements = JSON.parse(response);
      } catch (e) {
        const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          requirements = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('No JSON found in response');
        }
      }

      console.log('[CLI Provider] Successfully generated requirements');
      return requirements;
    } catch (error) {
      console.error('[CLI Provider] Failed to parse requirements:', error);
      return {
        functional: [specDescription],
        technical: [],
        constraints: [],
        acceptanceCriteria: [],
      };
    }
  }

  async generateDesign(
    specName: string,
    specDescription: string,
    requirements: GeneratedRequirements,
    projectContext?: string,
    architecture?: ProjectArchitecture,
    relatedSpecs?: Array<{ id: string; name: string; description: string; design?: any }>,
    onProgress?: (text: string) => void
  ): Promise<GeneratedDesign> {
    const contextText = projectContext ? `\n\nProject Context:\n${projectContext}` : '';
    
    const architectureText = architecture ? `

ARCHITECTURE:
- Tech Stack: ${architecture.techStack.frontend?.join(', ')} ${architecture.techStack.backend?.join(', ')}
- Patterns: ${architecture.patterns.join(', ')}
- Data Model: ${architecture.dataModel}
- File Structure: ${architecture.conventions.fileStructure}` : '';

    const relatedText = relatedSpecs && relatedSpecs.length > 0 ? `

RELATED SPECS (ensure integration):
${relatedSpecs.map(s => `- ${s.name}: ${s.description}${s.design ? '\n  Design: ' + JSON.stringify(s.design).substring(0, 200) : ''}`).join('\n')}` : '';

    const prompt = `You are a software architect. Design the technical architecture for the following feature.

Specification: ${specName}

Description: ${specDescription}

Requirements:
- Functional: ${requirements.functional.join(', ')}
- Technical: ${requirements.technical.join(', ')}${contextText}${architectureText}${relatedText}

Generate a technical design including:
1. Architecture - High-level architectural approach and patterns${architecture ? ' (must follow: ' + architecture.patterns.join(', ') + ')' : ''}
2. Data Model - Database schema, data structures${architecture && architecture.dataModel ? ' (extend: ' + architecture.dataModel.substring(0, 100) + ')' : ''}
3. API Endpoints - REST/GraphQL endpoints needed (if applicable)
4. UI Components - React/UI components needed (if applicable)

Output as JSON with this structure:
{
  "architecture": "description of architecture",
  "dataModel": "description of data model",
  "apiEndpoints": ["endpoint 1", "endpoint 2", ...],
  "uiComponents": ["component 1", "component 2", ...]
}`;

    console.log('[CLI Provider] Generating design...');
    const response = await this.executeClaude(prompt, { 
      timeout: 300000,
      onProgress: onProgress
    });

    try {
      let design;
      try {
        design = JSON.parse(response);
      } catch (e) {
        const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          design = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('No JSON found in response');
        }
      }

      console.log('[CLI Provider] Successfully generated design');
      return design;
    } catch (error) {
      console.error('[CLI Provider] Failed to parse design:', error);
      return {
        architecture: response.substring(0, 1000),
        dataModel: '',
        apiEndpoints: [],
        uiComponents: [],
      };
    }
  }

  async generateTasks(
    specName: string,
    specDescription: string,
    requirements: GeneratedRequirements,
    design: GeneratedDesign,
    architecture?: ProjectArchitecture,
    relatedSpecs?: Array<{ id: string; name: string; status: string }>,
    onProgress?: (text: string) => void
  ): Promise<GeneratedTask[]> {
    const architectureText = architecture ? `

ARCHITECTURE:
- File Structure: ${architecture.conventions.fileStructure}
- Naming: ${architecture.conventions.naming}
- Code Style: ${architecture.conventions.codeStyle}` : '';

    const relatedText = relatedSpecs && relatedSpecs.length > 0 ? `

RELATED SPECS (check dependencies):
${relatedSpecs.map(s => `- ${s.name} (${s.status})`).join('\n')}` : '';

    const prompt = `You are a technical project manager. Break down the following feature into implementation tasks.

Specification: ${specName}

Description: ${specDescription}

Architecture: ${design.architecture}

Requirements: ${requirements.functional.join(', ')}${architectureText}${relatedText}

Generate a list of concrete, actionable tasks for implementing this feature. Each task should be:
- Small enough to complete in 1-8 hours
- Clearly defined with specific deliverables
- Include acceptance criteria
- Identify dependencies${architecture ? '\n- Follow file structure: ' + architecture.conventions.fileStructure : ''}

Output as JSON array with this structure:
[
  {
    "title": "Task name",
    "description": "What needs to be done",
    "estimatedHours": 4,
    "dependencies": ["other task titles that must be completed first"],
    "acceptanceCriteria": ["criterion 1", "criterion 2"]
  }
]`;

    console.log('[CLI Provider] Generating tasks...');
    const response = await this.executeClaude(prompt, { 
      timeout: 300000,
      onProgress: onProgress
    });

    try {
      let tasks;
      try {
        tasks = JSON.parse(response);
      } catch (e) {
        const jsonMatch = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (jsonMatch) {
          tasks = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('No JSON found in response');
        }
      }

      if (!Array.isArray(tasks)) {
        throw new Error('Response is not an array');
      }

      console.log('[CLI Provider] Successfully generated', tasks.length, 'tasks');
      return tasks;
    } catch (error) {
      console.error('[CLI Provider] Failed to parse tasks:', error);
      return [
        {
          title: specName,
          description: specDescription,
          estimatedHours: 8,
          dependencies: [],
          acceptanceCriteria: requirements.acceptanceCriteria,
        },
      ];
    }
  }

  getProviderInfo() {
    return {
      name: 'Claude Code CLI',
      model: 'Local Claude Code installation',
    };
  }
}
