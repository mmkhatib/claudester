/**
 * Base interface for AI providers
 * This allows swapping between different AI services (Claude CLI, Anthropic API, OpenAI, etc.)
 */

export interface GeneratedSpec {
  title: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2';
}

export interface GeneratedRequirements {
  functional: string[];
  technical: string[];
  constraints: string[];
  acceptanceCriteria: string[];
}

export interface GeneratedDesign {
  architecture: string;
  dataModel: string;
  apiEndpoints?: string[];
  uiComponents?: string[];
}

export interface GeneratedTask {
  title: string;
  description: string;
  estimatedHours: number;
  dependencies: string[];
  acceptanceCriteria: string[];
}

export interface ProjectArchitecture {
  techStack: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    deployment?: string[];
  };
  patterns: string[];
  dataModel: string;
  conventions: {
    naming: string;
    fileStructure: string;
    codeStyle: string;
  };
}

export interface AIProvider {
  /**
   * Generate project-wide architecture
   */
  generateProjectArchitecture(
    projectName: string,
    projectDescription: string
  ): Promise<ProjectArchitecture>;

  /**
   * Generate specifications from a project description
   */
  generateSpecifications(
    projectName: string,
    projectDescription: string,
    architecture?: ProjectArchitecture,
    existingSpecs?: Array<{ name: string; description: string }>
  ): Promise<GeneratedSpec[]>;

  /**
   * Generate code based on a task description
   */
  generateCode(
    taskDescription: string,
    context?: string,
    workspacePath?: string,
    onProgress?: (data: { type: 'stdout' | 'stderr'; content: string }) => void
  ): Promise<string>;

  /**
   * Review code and provide suggestions
   */
  reviewCode(code: string, criteria?: string[]): Promise<string>;

  /**
   * Generate tests for code
   */
  generateTests(code: string, framework?: string): Promise<string>;

  /**
   * Analyze task and break down into steps
   */
  analyzeTask(
    taskDescription: string,
    acceptanceCriteria: string[]
  ): Promise<{
    analysis: string;
    steps: string[];
    estimatedComplexity: 'low' | 'medium' | 'high';
  }>;

  /**
   * Fix code based on error messages
   */
  fixCode(
    code: string,
    errorMessage: string,
    context?: string
  ): Promise<string>;

  /**
   * Generate requirements for a specification
   */
  generateRequirements(
    specName: string,
    specDescription: string,
    projectContext?: string,
    architecture?: ProjectArchitecture,
    relatedSpecs?: Array<{ id: string; name: string; description: string }>
  ): Promise<GeneratedRequirements>;

  /**
   * Generate design for a specification
   */
  generateDesign(
    specName: string,
    specDescription: string,
    requirements: GeneratedRequirements,
    projectContext?: string,
    architecture?: ProjectArchitecture,
    relatedSpecs?: Array<{ id: string; name: string; description: string; design?: any }>
  ): Promise<GeneratedDesign>;

  /**
   * Generate tasks for a specification
   */
  generateTasks(
    specName: string,
    specDescription: string,
    requirements: GeneratedRequirements,
    design: GeneratedDesign,
    architecture?: ProjectArchitecture,
    relatedSpecs?: Array<{ id: string; name: string; status: string }>
  ): Promise<GeneratedTask[]>;

  /**
   * Get provider information
   */
  getProviderInfo(): {
    name: string;
    model?: string;
  };
}
