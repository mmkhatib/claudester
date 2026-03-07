import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '@/lib/env';
import { AIProvider, GeneratedSpec } from './base-provider';
import { loggers } from '@/lib/logger';
import { tools, executeTool } from './tools';
import {
  parseSpecReference,
  shouldLoadSpecContext,
  loadSpecContext,
  formatSpecContextForAI,
} from '../spec-context-loader';

/**
 * Anthropic API Provider
 * Uses the Anthropic API directly with API key
 */
export class AnthropicAPIProvider implements AIProvider {
  private client: Anthropic;
  private defaultModel: string = 'claude-3-5-sonnet-20241022';
  private defaultMaxTokens: number = 4096;

  constructor() {
    const env = getEnv();

    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });

    loggers.agent.info('Anthropic API provider initialized');
  }

  async generateSpecifications(
    projectName: string,
    projectDescription: string
  ): Promise<GeneratedSpec[]> {
    const systemPrompt = `You are a technical product manager and software architect. Analyze the given project description and generate detailed feature specifications.

For each specification, provide:
1. A clear, concise title
2. A detailed description of what needs to be built
3. Priority level (P0 for critical/MVP features, P1 for important features, P2 for nice-to-have features)

Output your response as a JSON array with this structure:
[
  {
    "title": "Feature name",
    "description": "Detailed description of what this feature should do, including key requirements and acceptance criteria",
    "priority": "P0" | "P1" | "P2"
  }
]

Be thorough but practical. Think through the project architecture, user flows, and technical requirements.`;

    let response;
    try {
      response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        thinking: {
          type: 'enabled',
          budget_tokens: 10000,
        },
        temperature: 1.0,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Project: ${projectName}\n\nDescription: ${projectDescription}\n\nGenerate comprehensive feature specifications for this project.`,
          },
        ],
      });
    } catch (error: any) {
      const errorMessage = this.formatAPIError(error);
      loggers.agent.error({ error, errorMessage }, 'Anthropic API error in generateSpecifications');
      throw new Error(errorMessage);
    }

    loggers.agent.debug(
      {
        stopReason: response.stop_reason,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      'Received spec generation response from Anthropic API'
    );

    // Extract the text content (skip thinking blocks)
    let textContent = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      }
    }

    // Try to parse JSON from the response
    try {
      // Extract JSON array from markdown code blocks if present
      const jsonMatch = textContent.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : textContent;

      const specs = JSON.parse(jsonString);

      if (!Array.isArray(specs)) {
        throw new Error('Response is not an array');
      }

      return specs;
    } catch (error) {
      loggers.agent.error({ error, textContent }, 'Failed to parse spec generation response');

      // Fallback: return a single spec with the full response
      return [
        {
          title: 'Generated Specifications',
          description: textContent,
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
    // Check if task description contains #spec: syntax
    let specContextPrompt = '';
    if (shouldLoadSpecContext(taskDescription) && workspacePath) {
      const specName = parseSpecReference(taskDescription);
      if (specName) {
        try {
          loggers.agent.info({ specName }, '[API Provider] Loading spec context for AI steering');
          const specContext = await loadSpecContext(workspacePath, specName);
          specContextPrompt = formatSpecContextForAI(specContext);
          loggers.agent.info('[API Provider] Spec context loaded successfully');
        } catch (error) {
          loggers.agent.warn({ error, specName }, '[API Provider] Failed to load spec context');
        }
      }
    }

    // Note: API provider doesn't support streaming progress like CLI,
    // but we accept the parameter for interface compatibility
    const systemPrompt = `You are an expert software developer. Generate clean, well-documented code based on the given task description. Follow best practices and write production-ready code.

You have access to tools for file operations:
- write_file: Create or overwrite files
- read_file: Read existing files
- list_directory: List directory contents

Use these tools to create the necessary code files in the workspace.${specContextPrompt ? `\n\n${specContextPrompt}` : ''}${context ? `\n\nAdditional context:\n${context}` : ''}`;

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: taskDescription,
      },
    ];

    let toolExecutionLog = '';
    let finalResponse = '';
    const maxIterations = 10; // Prevent infinite loops
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      let response;
      try {
        response = await this.client.messages.create({
          model: this.defaultModel,
          max_tokens: 8000,
          temperature: 1.0,
          system: systemPrompt,
          tools: tools as any,
          messages,
        });
      } catch (error: any) {
        // Handle API errors with user-friendly messages
        const errorMessage = this.formatAPIError(error);
        loggers.agent.error({ error, errorMessage }, 'Anthropic API error');
        throw new Error(errorMessage);
      }

      loggers.agent.debug(
        {
          stopReason: response.stop_reason,
          contentBlocks: response.content.length,
          iteration: iterations,
        },
        'Received response from Anthropic API'
      );

      // Check if we're done
      if (response.stop_reason === 'end_turn') {
        // Extract final text response
        for (const block of response.content) {
          if (block.type === 'text') {
            finalResponse += block.text;
          }
        }
        break;
      }

      // Check for tool use
      let hasToolUse = false;
      const toolResults: Anthropic.MessageParam['content'] = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          finalResponse += block.text;
        } else if (block.type === 'tool_use') {
          hasToolUse = true;
          const toolName = block.name;
          const toolInput = block.input;
          const toolUseId = block.id;

          loggers.agent.info(
            { toolName, toolInput, toolUseId },
            'Executing tool'
          );

          try {
            // Execute the tool
            const result = await executeTool(
              toolName,
              toolInput,
              workspacePath || process.cwd()
            );

            toolExecutionLog += `\n[Tool: ${toolName}]\n${result}\n`;

            // Add tool result to messages
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUseId,
              content: result,
            });

            loggers.agent.info(
              { toolName, result: result.substring(0, 100) },
              'Tool executed successfully'
            );
          } catch (error: any) {
            const errorMsg = `Error executing ${toolName}: ${error.message}`;
            toolExecutionLog += `\n[Tool Error: ${toolName}]\n${errorMsg}\n`;

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUseId,
              content: errorMsg,
              is_error: true,
            });

            loggers.agent.error({ error, toolName }, 'Tool execution failed');
          }
        }
      }

      if (!hasToolUse) {
        // No more tool use, we're done
        break;
      }

      // Add assistant's response and tool results to conversation
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      messages.push({
        role: 'user',
        content: toolResults,
      });
    }

    // Return combined response
    const fullResponse =
      finalResponse +
      (toolExecutionLog ? `\n\n--- Tool Execution Log ---${toolExecutionLog}` : '');

    return fullResponse;
  }

  async reviewCode(code: string, criteria?: string[]): Promise<string> {
    const systemPrompt = `You are an expert code reviewer. Analyze the provided code and suggest improvements. Focus on code quality, best practices, security, and performance.`;

    const criteriaText = criteria && criteria.length > 0
      ? `\n\nAcceptance criteria:\n${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      : '';

    try {
      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 4000,
        temperature: 1.0,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please review the following code:${criteriaText}\n\n\`\`\`\n${code}\n\`\`\``,
          },
        ],
      });

      const content = response.content[0];
      return content.type === 'text' ? content.text : '';
    } catch (error: any) {
      const errorMessage = this.formatAPIError(error);
      loggers.agent.error({ error, errorMessage }, 'Anthropic API error in reviewCode');
      throw new Error(errorMessage);
    }
  }

  async generateTests(code: string, framework: string = 'jest'): Promise<string> {
    const systemPrompt = `You are an expert at writing tests. Generate comprehensive unit tests for the provided code using ${framework}. Include edge cases and error scenarios.`;

    try {
      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 6000,
        temperature: 1.0,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Generate tests for this code:\n\n\`\`\`\n${code}\n\`\`\``,
          },
        ],
      });

      const content = response.content[0];
      return content.type === 'text' ? content.text : '';
    } catch (error: any) {
      const errorMessage = this.formatAPIError(error);
      loggers.agent.error({ error, errorMessage }, 'Anthropic API error in generateTests');
      throw new Error(errorMessage);
    }
  }

  async analyzeTask(
    taskDescription: string,
    acceptanceCriteria: string[]
  ): Promise<{
    analysis: string;
    steps: string[];
    estimatedComplexity: 'low' | 'medium' | 'high';
  }> {
    const systemPrompt = `You are a technical analyst. Analyze the given task and break it down into clear, actionable steps. Also estimate the complexity.`;

    const criteriaText = acceptanceCriteria.length > 0
      ? `\n\nAcceptance criteria:\n${acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      : '';

    try {
      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 3000,
        temperature: 1.0,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Analyze this task and provide:\n1. Overall analysis\n2. Step-by-step breakdown\n3. Complexity estimate (low/medium/high)\n\nTask: ${taskDescription}${criteriaText}`,
          },
        ],
      });

      const content = response.content[0];
      const textContent = content.type === 'text' ? content.text : '';

      // Extract complexity from response
      let estimatedComplexity: 'low' | 'medium' | 'high' = 'medium';
      if (textContent.toLowerCase().includes('complexity: low')) {
        estimatedComplexity = 'low';
      } else if (textContent.toLowerCase().includes('complexity: high')) {
        estimatedComplexity = 'high';
      }

      // Extract steps (simple heuristic)
      const stepMatches = textContent.match(/\d+\.\s+(.+)/g) || [];
      const steps = stepMatches.map((s) => s.replace(/^\d+\.\s+/, ''));

      return {
        analysis: textContent,
        steps,
        estimatedComplexity,
      };
    } catch (error: any) {
      const errorMessage = this.formatAPIError(error);
      loggers.agent.error({ error, errorMessage }, 'Anthropic API error in analyzeTask');
      throw new Error(errorMessage);
    }
  }

  async fixCode(
    code: string,
    errorMessage: string,
    context?: string
  ): Promise<string> {
    const systemPrompt = `You are an expert debugger. Fix the provided code based on the error message. Provide only the corrected code.`;

    const contextText = context ? `\n\nContext:\n${context}` : '';

    try {
      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 6000,
        temperature: 1.0,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Fix this code:\n\n\`\`\`\n${code}\n\`\`\`\n\nError:\n${errorMessage}${contextText}`,
          },
        ],
      });

      const content = response.content[0];
      return content.type === 'text' ? content.text : '';
    } catch (error: any) {
      const errorMessage = this.formatAPIError(error);
      loggers.agent.error({ error, errorMessage }, 'Anthropic API error in fixCode');
      throw new Error(errorMessage);
    }
  }

  getProviderInfo() {
    return {
      name: 'Anthropic API',
      model: this.defaultModel,
    };
  }

  /**
   * Format Anthropic API errors into user-friendly messages
   */
  private formatAPIError(error: any): string {
    // Handle Anthropic SDK errors with structured error objects
    if (error.status && error.error?.error) {
      const apiError = error.error.error;

      // Credit balance error
      if (apiError.message?.includes('credit balance')) {
        return `❌ Anthropic API Error: Your credit balance is too low. Please add credits at https://console.anthropic.com/settings/plans`;
      }

      // Generic API error message
      if (apiError.message) {
        return `❌ Anthropic API Error: ${apiError.message}`;
      }
    }

    // Handle HTTP status codes
    if (error.status === 401) {
      return '❌ Authentication Error: Invalid ANTHROPIC_API_KEY. Please check your environment configuration.';
    }

    if (error.status === 429) {
      return '❌ Rate Limit Error: Too many requests. Please try again in a few moments.';
    }

    if (error.status === 500 || error.status === 503) {
      return '❌ Anthropic Service Error: The API is temporarily unavailable. Please try again later.';
    }

    // Network/connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return '❌ Network Error: Unable to connect to Anthropic API. Please check your internet connection.';
    }

    // Generic fallback
    return `❌ AI Provider Error: ${error.message || 'Unknown error occurred. Please check logs for details.'}`;
  }
}
