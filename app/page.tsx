import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <h1 className="text-xl font-bold">Claudester</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI-Powered Development Platform
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
          Transform business requirements into working software through autonomous, spec-driven development powered by Claude AI
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="primary" size="lg">
            Get Started
          </Button>
          <Button variant="outline" size="lg">
            Learn More
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Spec-Driven Development</CardTitle>
              <CardDescription>
                Four-phase methodology: Requirements → Design → Tasks → Implementation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Structured approach ensures clarity and alignment throughout the development lifecycle.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Multi-Agent Orchestration</CardTitle>
              <CardDescription>
                Parallel execution with dependency management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Coordinate multiple AI agents working simultaneously on different tasks.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Real-time Monitoring</CardTitle>
              <CardDescription>
                Track progress and agent performance live
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                WebSocket-based updates keep you informed of every step in the process.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Status */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Foundation Phase - In Progress</CardTitle>
            <CardDescription>Building the core infrastructure</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Project Initialization</span>
                <span className="text-sm text-green-600 dark:text-green-400">✓ Complete</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">MongoDB Setup</span>
                <span className="text-sm text-green-600 dark:text-green-400">✓ Complete</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Redis & Queue System</span>
                <span className="text-sm text-green-600 dark:text-green-400">✓ Complete</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Authentication (Clerk)</span>
                <span className="text-sm text-green-600 dark:text-green-400">✓ Complete</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API Routes & Error Handling</span>
                <span className="text-sm text-green-600 dark:text-green-400">✓ Complete</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Logging & Monitoring</span>
                <span className="text-sm text-green-600 dark:text-green-400">✓ Complete</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Base UI Components</span>
                <span className="text-sm text-blue-600 dark:text-blue-400">⟳ In Progress</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>Claudester Platform - Autonomous Spec-Driven Development</p>
        </div>
      </footer>
    </main>
  );
}
