import { spawn } from 'child_process';
import { AIProvider, GeneratedSpec, GeneratedRequirements, GeneratedDesign, GeneratedTask, ProjectArchitecture } from './base-provider';
import { loggers } from '@/lib/logger';

/**
 * Claude Code CLI Provider
 * Uses the local Claude Code CLI installation
 */
export class ClaudeCodeCLIProvider implements AIProvider {
  private readonly claudeCommand = 'claude';

  constructor() {
    loggers.agent.info('Claude Code CLI provider initialized');
  }

  /**
   * Execute Claude CLI command and get response
   */
  private async executeClaude(prompt: string, options: {
    jsonSchema?: object;
    tools?: string;
    timeout?: number;
  } = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Build command - escape the prompt for shell
        const escapedPrompt = prompt.replace(/'/g, "'\\''");

        // Build the full command
        let cmd = `claude --print`;

        // Add JSON schema if provided
        if (options.jsonSchema) {
          const escapedSchema = JSON.stringify(options.jsonSchema).replace(/'/g, "'\\''");
          cmd += ` --json-schema '${escapedSchema}' --output-format json`;
        }

        cmd += ` '${escapedPrompt}'`;

        console.log('[CLI Provider] Executing claude via shell...');

        // Create environment without ANTHROPIC_API_KEY to avoid conflicts
        // Claude CLI should use subscription auth, not API key
        const env = { ...process.env };
        delete env.ANTHROPIC_API_KEY;

        // Run through shell for proper TTY handling
        // Change to parent directory to avoid .env file interference
        const claudeProcess = spawn('/bin/sh', ['-c', cmd], {
          env,
          cwd: '/Users/overlord',  // Run from parent directory to avoid .env file
          stdio: ['pipe', 'pipe', 'pipe']  // Use pipe for stdin to avoid TTY issues
        });

        // Close stdin immediately so Claude doesn't wait for input
        claudeProcess.stdin.end();

        let stdout = '';
        let stderr = '';
        let lastProgressLog = Date.now();

        // Collect stdout
        claudeProcess.stdout.on('data', (data) => {
          stdout += data.toString();

          // Log progress every 30 seconds
          const now = Date.now();
          if (now - lastProgressLog > 30000) {
            console.log('[CLI Provider] Still processing... (received', stdout.length, 'bytes so far)');
            lastProgressLog = now;
          }
        });

        // Collect stderr
        claudeProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        // Handle process completion
        claudeProcess.on('close', (code) => {
          console.log('[CLI Provider] Process exited with code:', code);
          console.log('[CLI Provider] stdout length:', stdout.length);
          console.log('[CLI Provider] stderr length:', stderr.length);

          if (code !== 0 && code !== null) {
            console.error('[CLI Provider] stderr:', stderr);
            reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
          } else {
            if (stderr) {
              console.warn('[CLI Provider] stderr:', stderr);
            }
            if (stdout.length === 0) {
              console.warn('[CLI Provider] WARNING: Claude returned empty output');
            } else {
              console.log('[CLI Provider] Got response, first 200 chars:', stdout.substring(0, 200));
            }
            resolve(stdout.trim());
          }
        });

        // Handle process errors
        claudeProcess.on('error', (error) => {
          console.error('[CLI Provider] Process error:', error);
          reject(new Error(`Failed to spawn Claude CLI: ${error.message}`));
        });

        // Set timeout (default 10 minutes for spec generation, 3 minutes for other tasks)
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
    existingSpecs?: Array<{ name: string; description: string }>
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
    // Try without JSON schema first to see if that's causing the issue
    const response = await this.executeClaude(prompt, {
      // jsonSchema,
      timeout: 600000 // 10 minutes for spec generation with thinking
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

  async generateCode(taskDescription: string, context?: string): Promise<string> {
    // For code generation, we need to use interactive mode with tools, not --print
    // This allows Claude to actually create files
    return new Promise((resolve, reject) => {
      try {
        const contextText = context ? `${context}\n\n` : '';
        const prompt = `${contextText}Please implement the task. Write all code to files.`;

        // Build command with tools enabled for file writing
        const cmd = `claude --tools '' '${prompt.replace(/'/g, "'\\''")}'`;

        console.log('[CLI Provider] Executing claude with file writing tools...');

        // Create environment without ANTHROPIC_API_KEY
        const env = { ...process.env };
        delete env.ANTHROPIC_API_KEY;

        // Extract workspace path from context
        const workspaceMatch = context?.match(/Workspace:\s*(.+)/);
        const workspacePath = workspaceMatch ? workspaceMatch[1].trim() : '/Users/overlord';

        console.log('[CLI Provider] Using workspace:', workspacePath);

        // Run Claude in the workspace directory so files are created there
        const claudeProcess = spawn('/bin/sh', ['-c', cmd], {
          env,
          cwd: workspacePath,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        // Close stdin immediately
        claudeProcess.stdin.end();

        let stdout = '';
        let stderr = '';

        claudeProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        claudeProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        claudeProcess.on('close', (code) => {
          console.log('[CLI Provider] Code generation completed with code:', code);
          console.log('[CLI Provider] Files should be written to:', workspacePath);

          if (code !== 0 && code !== null) {
            console.error('[CLI Provider] stderr:', stderr);
            reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
          } else {
            resolve(stdout.trim() || 'Code generated successfully. Check workspace directory for files.');
          }
        });

        claudeProcess.on('error', (error) => {
          console.error('[CLI Provider] Process error:', error);
          reject(new Error(`Failed to spawn Claude CLI: ${error.message}`));
        });

        // Set 5 minute timeout for code generation
        const timeout = setTimeout(() => {
          claudeProcess.kill();
          reject(new Error('Claude CLI timeout after 5 minutes'));
        }, 300000);

        claudeProcess.on('close', () => {
          clearTimeout(timeout);
        });

      } catch (error: any) {
        console.error('[CLI Provider] Error:', error.message);
        reject(new Error(`Claude CLI error: ${error.message}`));
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
    projectContext?: string
  ): Promise<GeneratedRequirements> {
    const contextText = projectContext ? `\n\nProject Context:\n${projectContext}` : '';
    const prompt = `You are a technical requirements analyst. Generate comprehensive requirements for the following feature specification.

Specification: ${specName}

Description: ${specDescription}${contextText}

Generate detailed requirements in the following categories:
1. Functional Requirements - What the feature must do
2. Technical Requirements - Technology stack, architecture decisions, performance needs
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
    const response = await this.executeClaude(prompt, { timeout: 300000 });

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
    projectContext?: string
  ): Promise<GeneratedDesign> {
    const contextText = projectContext ? `\n\nProject Context:\n${projectContext}` : '';
    const prompt = `You are a software architect. Design the technical architecture for the following feature.

Specification: ${specName}

Description: ${specDescription}

Requirements:
- Functional: ${requirements.functional.join(', ')}
- Technical: ${requirements.technical.join(', ')}${contextText}

Generate a technical design including:
1. Architecture - High-level architectural approach and patterns
2. Data Model - Database schema, data structures
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
    const response = await this.executeClaude(prompt, { timeout: 300000 });

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
    design: GeneratedDesign
  ): Promise<GeneratedTask[]> {
    const prompt = `You are a technical project manager. Break down the following feature into implementation tasks.

Specification: ${specName}

Description: ${specDescription}

Architecture: ${design.architecture}

Requirements: ${requirements.functional.join(', ')}

Generate a list of concrete, actionable tasks for implementing this feature. Each task should be:
- Small enough to complete in 1-8 hours
- Clearly defined with specific deliverables
- Include acceptance criteria
- Identify dependencies

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
    const response = await this.executeClaude(prompt, { timeout: 300000 });

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
