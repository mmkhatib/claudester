import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '@/lib/env';
import { loggers } from '@/lib/logger';

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

  constructor() {
    const env = getEnv();

    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });

    loggers.agent.info('Claude client initialized');
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
    const systemPrompt = `You are an expert software developer. Generate clean, well-documented code based on the given task description. Follow best practices and write production-ready code.

${context ? `Additional context:\n${context}` : ''}`;

    const response = await this.sendMessage({
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: taskDescription,
        },
      ],
      maxTokens: 8000,
    });

    return response.content;
  }

  /**
   * Review code and provide suggestions
   */
  async reviewCode(code: string, criteria?: string[]): Promise<string> {
    const systemPrompt = `You are an expert code reviewer. Analyze the provided code and suggest improvements. Focus on code quality, best practices, security, and performance.`;

    const criteriaText = criteria && criteria.length > 0
      ? `\n\nAcceptance criteria:\n${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      : '';

    const response = await this.sendMessage({
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Please review the following code:${criteriaText}\n\n\`\`\`\n${code}\n\`\`\``,
        },
      ],
      maxTokens: 4000,
    });

    return response.content;
  }

  /**
   * Generate tests for code
   */
  async generateTests(code: string, framework: string = 'jest'): Promise<string> {
    const systemPrompt = `You are an expert at writing tests. Generate comprehensive unit tests for the provided code using ${framework}. Include edge cases and error scenarios.`;

    const response = await this.sendMessage({
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate tests for this code:\n\n\`\`\`\n${code}\n\`\`\``,
        },
      ],
      maxTokens: 6000,
    });

    return response.content;
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
    const systemPrompt = `You are a technical analyst. Analyze the given task and break it down into clear, actionable steps. Also estimate the complexity.`;

    const criteriaText = acceptanceCriteria.length > 0
      ? `\n\nAcceptance criteria:\n${acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      : '';

    const response = await this.sendMessage({
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyze this task and provide:\n1. Overall analysis\n2. Step-by-step breakdown\n3. Complexity estimate (low/medium/high)\n\nTask: ${taskDescription}${criteriaText}`,
        },
      ],
      maxTokens: 3000,
    });

    // Simple parsing - in production, you might want structured output
    const content = response.content;

    // Extract complexity from response
    let estimatedComplexity: 'low' | 'medium' | 'high' = 'medium';
    if (content.toLowerCase().includes('complexity: low')) {
      estimatedComplexity = 'low';
    } else if (content.toLowerCase().includes('complexity: high')) {
      estimatedComplexity = 'high';
    }

    // Extract steps (simple heuristic)
    const stepMatches = content.match(/\d+\.\s+(.+)/g) || [];
    const steps = stepMatches.map((s) => s.replace(/^\d+\.\s+/, ''));

    return {
      analysis: content,
      steps,
      estimatedComplexity,
    };
  }

  /**
   * Fix code based on error messages
   */
  async fixCode(
    code: string,
    errorMessage: string,
    context?: string
  ): Promise<string> {
    const systemPrompt = `You are an expert debugger. Fix the provided code based on the error message. Provide only the corrected code.`;

    const contextText = context ? `\n\nContext:\n${context}` : '';

    const response = await this.sendMessage({
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Fix this code:\n\n\`\`\`\n${code}\n\`\`\`\n\nError:\n${errorMessage}${contextText}`,
        },
      ],
      maxTokens: 6000,
    });

    return response.content;
  }

  /**
   * Get model information
   */
  getModelInfo() {
    return {
      defaultModel: this.defaultModel,
      defaultMaxTokens: this.defaultMaxTokens,
    };
  }
}

// Singleton instance
export const claudeClient = new ClaudeClient();
