'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  FolderKanban,
  Settings,
  Key,
  Rocket,
  Sparkles
} from 'lucide-react';

type Step = 'welcome' | 'project' | 'config' | 'apikeys' | 'review';

interface ProjectData {
  name: string;
  description: string;
  techStack: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  anthropicApiKey: string;
  mongodbUri: string;
  redisHost: string;
  redisPort: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [projectData, setProjectData] = useState<ProjectData>({
    name: '',
    description: '',
    techStack: [],
    priority: 'MEDIUM',
    anthropicApiKey: '',
    mongodbUri: 'mongodb://localhost:27017/claudester',
    redisHost: 'localhost',
    redisPort: '6379',
  });

  const steps: { id: Step; title: string; icon: any }[] = [
    { id: 'welcome', title: 'Welcome', icon: Sparkles },
    { id: 'project', title: 'Project Details', icon: FolderKanban },
    { id: 'config', title: 'Configuration', icon: Settings },
    { id: 'apikeys', title: 'API Keys', icon: Key },
    { id: 'review', title: 'Review & Start', icon: Rocket },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleFinish = async () => {
    // Here you would typically save the project and redirect
    // For now, we'll just redirect to dashboard
    console.log('Project data:', projectData);
    router.push('/dashboard');
  };

  const toggleTechStack = (tech: string) => {
    setProjectData(prev => ({
      ...prev,
      techStack: prev.techStack.includes(tech)
        ? prev.techStack.filter(t => t !== tech)
        : [...prev.techStack, tech]
    }));
  };

  const techOptions = [
    'Next.js',
    'React',
    'TypeScript',
    'Node.js',
    'MongoDB',
    'PostgreSQL',
    'Redis',
    'Tailwind CSS',
    'Python',
    'FastAPI',
    'Express',
    'NestJS',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <h1 className="text-xl font-bold">Claudester</h1>
            <Badge variant="secondary" className="ml-2">Setup Wizard</Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        isCompleted
                          ? 'bg-green-600 text-white'
                          : isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : isCompleted
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 transition-colors ${
                        index < currentStepIndex
                          ? 'bg-green-600'
                          : 'bg-zinc-200 dark:bg-zinc-800'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              {/* Welcome Step */}
              {currentStep === 'welcome' && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <Sparkles className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Welcome to Claudester!</h2>
                  <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
                    Let's set up your first AI-powered development project. This wizard will guide you through
                    creating a project, configuring your environment, and starting autonomous development.
                  </p>
                  <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                      <h3 className="font-semibold mb-2">Step 1</h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Define your project</p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900">
                      <h3 className="font-semibold mb-2">Step 2</h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Configure settings</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                      <h3 className="font-semibold mb-2">Step 3</h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Start building!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Project Details Step */}
              {currentStep === 'project' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Project Details</h2>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Tell us about your project. What are you building?
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="project-name">Project Name *</Label>
                      <Input
                        id="project-name"
                        placeholder="e.g., E-commerce Platform, Task Manager App"
                        value={projectData.name}
                        onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="project-description">Project Description *</Label>
                      <Textarea
                        id="project-description"
                        placeholder="Describe what you want to build. Be as detailed as possible - this helps our AI agents understand your requirements better."
                        rows={6}
                        value={projectData.description}
                        onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                      />
                      <p className="text-xs text-zinc-500">
                        Tip: Include features, user roles, and any specific requirements
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Priority Level</Label>
                      <div className="flex gap-3">
                        {(['HIGH', 'MEDIUM', 'LOW'] as const).map((priority) => (
                          <button
                            key={priority}
                            onClick={() => setProjectData({ ...projectData, priority })}
                            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                              projectData.priority === priority
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            <span className="font-medium">{priority}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Configuration Step */}
              {currentStep === 'config' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Technology Stack</h2>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Select the technologies you want to use in your project
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Technologies</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {techOptions.map((tech) => (
                          <button
                            key={tech}
                            onClick={() => toggleTechStack(tech)}
                            className={`px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                              projectData.techStack.includes(tech)
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            {tech}
                          </button>
                        ))}
                      </div>
                      {projectData.techStack.length > 0 && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                          Selected: {projectData.techStack.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* API Keys Step */}
              {currentStep === 'apikeys' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">API Keys & Services</h2>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Configure your API keys and database connections
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="anthropic-key">Anthropic API Key *</Label>
                      <Input
                        id="anthropic-key"
                        type="password"
                        placeholder="sk-ant-..."
                        value={projectData.anthropicApiKey}
                        onChange={(e) => setProjectData({ ...projectData, anthropicApiKey: e.target.value })}
                      />
                      <p className="text-xs text-zinc-500">
                        Required for AI-powered code generation. Get your key at{' '}
                        <a
                          href="https://console.anthropic.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          console.anthropic.com
                        </a>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mongodb-uri">MongoDB URI</Label>
                      <Input
                        id="mongodb-uri"
                        placeholder="mongodb://localhost:27017/claudester"
                        value={projectData.mongodbUri}
                        onChange={(e) => setProjectData({ ...projectData, mongodbUri: e.target.value })}
                      />
                      <p className="text-xs text-zinc-500">
                        Optional: Leave default for local development
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="redis-host">Redis Host</Label>
                        <Input
                          id="redis-host"
                          placeholder="localhost"
                          value={projectData.redisHost}
                          onChange={(e) => setProjectData({ ...projectData, redisHost: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="redis-port">Redis Port</Label>
                        <Input
                          id="redis-port"
                          placeholder="6379"
                          value={projectData.redisPort}
                          onChange={(e) => setProjectData({ ...projectData, redisPort: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>💡 Tip:</strong> You can skip the database configuration for now and use demo mode
                        to explore the platform without setting up external services.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Review Step */}
              {currentStep === 'review' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Review & Start</h2>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Review your configuration and start building!
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Project Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-xs text-zinc-500">Name</Label>
                          <p className="font-medium">{projectData.name || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">Description</Label>
                          <p className="text-sm">{projectData.description || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">Priority</Label>
                          <Badge variant={projectData.priority === 'HIGH' ? 'destructive' : 'secondary'}>
                            {projectData.priority}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Technology Stack</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {projectData.techStack.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {projectData.techStack.map((tech) => (
                              <Badge key={tech} variant="secondary">{tech}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-500">No technologies selected</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Configuration</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-zinc-500">Anthropic API Key</Label>
                          <Badge variant={projectData.anthropicApiKey ? 'default' : 'secondary'}>
                            {projectData.anthropicApiKey ? 'Configured' : 'Not set'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-zinc-500">MongoDB</Label>
                          <Badge variant="secondary">Configured</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-zinc-500">Redis</Label>
                          <Badge variant="secondary">Configured</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                      <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                        🚀 Ready to Start!
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Your project is configured and ready to go. Click "Start Building" to create your project
                        and begin autonomous development with AI agents.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep !== 'review' ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinish} variant="primary">
                <Rocket className="h-4 w-4 mr-2" />
                Start Building
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
