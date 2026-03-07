import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '@/lib/env';
import { loggers } from '@/lib/logger';
import { AIProvider } from './ai-providers/base-provider';
import { AnthropicAPIProvider } from './ai-providers/anthropic-api-provider';
import { ClaudeCodeCLIProvider } from './ai-providers/claude-code-cli-provider';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeRequest {
  messages: ClaudeMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface ClaudeResponse {
  content: string;
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

class ClaudeClient {
  private client: Anthropic;
  private defaultModel: string = 'claude-3-5-sonnet-20241022';
  private defaultMaxTokens: number = 4096;
  private provider: AIProvider;

  constructor() {
    const env = getEnv();

    // Initialize the AI provider based on environment variable
    const aiProvider = env.AI_PROVIDER;

    switch (aiProvider) {
      case 'anthropic-api':
        this.provider = new AnthropicAPIProvider();
        // Initialize Anthropic client for API provider
        this.client = new Anthropic({
          apiKey: env.ANTHROPIC_API_KEY || '',
        });
        loggers.agent.info('Using Anthropic API provider');
        break;
      case 'claude-code-cli':
        this.provider = new ClaudeCodeCLIProvider();
        // No need to initialize Anthropic client for CLI provider
        this.client = null as any; // Set to null, not used by CLI provider
        loggers.agent.info('Using Claude Code CLI provider');
        break;
      default:
        // Default to Claude Code CLI
        loggers.agent.warn({ provider: aiProvider }, 'Unknown AI provider, defaulting to Claude Code CLI');
        this.provider = new ClaudeCodeCLIProvider();
        this.client = null as any;
    }

    loggers.agent.info({ provider: this.provider.getProviderInfo() }, 'Claude client initialized');
  }

  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(request: ClaudeRequest): Promise<ClaudeResponse> {
    const {
      messages,
      system,
      maxTokens = this.defaultMaxTokens,
      temperature = 1.0,
      model = this.defaultModel,
    } = request;

    loggers.agent.debug(
      {
        model,
        messageCount: messages.length,
        maxTokens,
      },
      'Sending message to Claude'
    );

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages,
      });

      const content = response.content[0];
      const textContent = content.type === 'text' ? content.text : '';

      loggers.agent.debug(
        {
          stopReason: response.stop_reason,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        'Received response from Claude'
      );

      return {
        content: textContent,
        stopReason: response.stop_reason || 'unknown',
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      loggers.agent.error({ error }, 'Failed to send message to Claude');
      throw error;
    }
  }

  /**
   * Stream a message from Claude (for real-time responses)
   */
  async *streamMessage(request: ClaudeRequest): AsyncGenerator<string> {
    const {
      messages,
      system,
      maxTokens = this.defaultMaxTokens,
      temperature = 1.0,
      model = this.defaultModel,
    } = request;

    loggers.agent.debug(
      {
        model,
        messageCount: messages.length,
        maxTokens,
      },
      'Streaming message from Claude'
    );

    try {
      const stream = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages,
        stream: true,
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield event.delta.text;
        }
      }

      loggers.agent.debug('Streaming complete');
    } catch (error) {
      loggers.agent.error({ error }, 'Failed to stream message from Claude');
      throw error;
    }
  }

  /**
   * Generate code based on a task description
   */
  async generateCode(
    taskDescription: string,
    context?: string,
    workspacePath?: string,
    onProgress?: (data: { type: 'stdout' | 'stderr'; content: string }) => void
  ): Promise<string> {
    return this.provider.generateCode(taskDescription, context, workspacePath, onProgress);
  }

  /**
   * Review code and provide suggestions
   */
  async reviewCode(code: string, criteria?: string[]): Promise<string> {
    return this.provider.reviewCode(code, criteria);
  }

  /**
   * Generate tests for code
   */
  async generateTests(code: string, framework: string = 'jest'): Promise<string> {
    return this.provider.generateTests(code, framework);
  }

  /**
   * Analyze task requirements and break down into steps
   */
  async analyzeTask(
    taskDescription: string,
    acceptanceCriteria: string[]
  ): Promise<{
    analysis: string;
    steps: string[];
    estimatedComplexity: 'low' | 'medium' | 'high';
  }> {
    return this.provider.analyzeTask(taskDescription, acceptanceCriteria);
  }

  /**
   * Fix code based on error messages
   */
  async fixCode(
    code: string,
    errorMessage: string,
    context?: string
  ): Promise<string> {
    return this.provider.fixCode(code, errorMessage, context);
  }

  /**
   * Generate project-wide architecture
   */
  async generateProjectArchitecture(
    projectName: string,
    projectDescription: string
  ): Promise<any> {
    return this.provider.generateProjectArchitecture(projectName, projectDescription);
  }

  /**
   * Generate specifications from a project description using extended thinking
   */
  async generateSpecifications(
    projectName: string,
    projectDescription: string,
    architecture?: any,
    existingSpecs?: Array<{ name: string; description: string }>
  ): Promise<Array<{
    title: string;
    description: string;
    priority: 'P0' | 'P1' | 'P2';
  }>> {
    return this.provider.generateSpecifications(projectName, projectDescription, architecture, existingSpecs);
  }

  /**
   * Generate requirements for a specification
   */
  async generateRequirements(
    specName: string,
    specDescription: string,
    projectContext?: string,
    architecture?: any,
    relatedSpecs?: Array<{ id: string; name: string; description: string }>
  ) {
    return this.provider.generateRequirements(specName, specDescription, projectContext, architecture, relatedSpecs);
  }

  /**
   * Generate design for a specification
   */
  async generateDesign(
    specName: string,
    specDescription: string,
    requirements: any,
    projectContext?: string,
    architecture?: any,
    relatedSpecs?: Array<{ id: string; name: string; description: string; design?: any }>
  ) {
    return this.provider.generateDesign(specName, specDescription, requirements, projectContext, architecture, relatedSpecs);
  }

  /**
   * Generate tasks for a specification
   */
  async generateTasks(
    specName: string,
    specDescription: string,
    requirements: any,
    design: any,
    architecture?: any,
    relatedSpecs?: Array<{ id: string; name: string; status: string }>
  ) {
    return this.provider.generateTasks(specName, specDescription, requirements, design, architecture, relatedSpecs);
  }

  /**
   * Get model information
   */
  getModelInfo() {
    return {
      defaultModel: this.defaultModel,
      defaultMaxTokens: this.defaultMaxTokens,
      provider: this.provider.getProviderInfo(),
    };
  }
}

// Singleton instance
export const claudeClient = new ClaudeClient();
