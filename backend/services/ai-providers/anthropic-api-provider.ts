import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '@/lib/env';
import { AIProvider, GeneratedSpec } from './base-provider';
import { loggers } from '@/lib/logger';

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

    const response = await this.client.messages.create({
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

  async generateCode(taskDescription: string, context?: string): Promise<string> {
    const systemPrompt = `You are an expert software developer. Generate clean, well-documented code based on the given task description. Follow best practices and write production-ready code.\n\n${context ? `Additional context:\n${context}` : ''}`;

    const response = await this.client.messages.create({
      model: this.defaultModel,
      max_tokens: 8000,
      temperature: 1.0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: taskDescription,
        },
      ],
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  }

  async reviewCode(code: string, criteria?: string[]): Promise<string> {
    const systemPrompt = `You are an expert code reviewer. Analyze the provided code and suggest improvements. Focus on code quality, best practices, security, and performance.`;

    const criteriaText = criteria && criteria.length > 0
      ? `\n\nAcceptance criteria:\n${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      : '';

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
  }

  async generateTests(code: string, framework: string = 'jest'): Promise<string> {
    const systemPrompt = `You are an expert at writing tests. Generate comprehensive unit tests for the provided code using ${framework}. Include edge cases and error scenarios.`;

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
  }

  async fixCode(
    code: string,
    errorMessage: string,
    context?: string
  ): Promise<string> {
    const systemPrompt = `You are an expert debugger. Fix the provided code based on the error message. Provide only the corrected code.`;

    const contextText = context ? `\n\nContext:\n${context}` : '';

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
  }

  getProviderInfo() {
    return {
      name: 'Anthropic API',
      model: this.defaultModel,
    };
  }
}
