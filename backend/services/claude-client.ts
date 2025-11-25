import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '@/lib/env';
import { loggers } from '@/lib/logger';
import { AIProvider } from './ai-providers/base-provider';
import { ClaudeCodeCLIProvider } from './ai-providers/claude-code-cli-provider';
import { AnthropicAPIProvider } from './ai-providers/anthropic-api-provider';

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

    // Initialize Anthropic client (for backwards compatibility with sendMessage)
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });

    // Initialize the AI provider based on environment variable
    const aiProvider = process.env.AI_PROVIDER || 'claude-code-cli';

    switch (aiProvider) {
      case 'claude-code-cli':
        this.provider = new ClaudeCodeCLIProvider();
        loggers.agent.info('Using Claude Code CLI provider');
        break;
      case 'anthropic-api':
        this.provider = new AnthropicAPIProvider();
        loggers.agent.info('Using Anthropic API provider');
        break;
      default:
        loggers.agent.warn({ provider: aiProvider }, 'Unknown AI provider, defaulting to Claude Code CLI');
        this.provider = new ClaudeCodeCLIProvider();
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
  async generateCode(taskDescription: string, context?: string): Promise<string> {
    return this.provider.generateCode(taskDescription, context);
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
   * Generate specifications from a project description using extended thinking
   */
  async generateSpecifications(
    projectName: string,
    projectDescription: string
  ): Promise<Array<{
    title: string;
    description: string;
    priority: 'P0' | 'P1' | 'P2';
  }>> {
    return this.provider.generateSpecifications(projectName, projectDescription);
  }

  /**
   * Generate requirements for a specification
   */
  async generateRequirements(
    specName: string,
    specDescription: string,
    projectContext?: string
  ) {
    return this.provider.generateRequirements(specName, specDescription, projectContext);
  }

  /**
   * Generate design for a specification
   */
  async generateDesign(
    specName: string,
    specDescription: string,
    requirements: any,
    projectContext?: string
  ) {
    return this.provider.generateDesign(specName, specDescription, requirements, projectContext);
  }

  /**
   * Generate tasks for a specification
   */
  async generateTasks(
    specName: string,
    specDescription: string,
    requirements: any,
    design: any
  ) {
    return this.provider.generateTasks(specName, specDescription, requirements, design);
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
