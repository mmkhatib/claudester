'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code, FileCode, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebSocketValue } from '@/lib/websocket/hooks';
import { useEffect, useRef } from 'react';

interface CodeChange {
  file: string;
  content: string;
  language: string;
  cursorLine?: number;
  timestamp: string;
}

export function LiveCodePreview() {
  const codeChange = useWebSocketValue<CodeChange | null>('code:preview', {
    file: 'src/auth/register.ts',
    language: 'typescript',
    cursorLine: 12,
    timestamp: new Date().toISOString(),
    content: `import { hash } from 'bcrypt';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function registerUser(
  email: string,
  password: string,
  name: string
) {
  // Hash password
  const hashedPassword = await hash(password, 10);

  // Create user in database
  const [user] = await db.insert(users).values({
    email,
    password: hashedPassword,
    name,
    createdAt: new Date(),
  }).returning();

  return user;
}`,
  });

  const contentRef = useRef<HTMLPreElement>(null);

  // Auto-scroll to cursor line
  useEffect(() => {
    if (contentRef.current && codeChange?.cursorLine) {
      const lineHeight = 20; // approximate line height
      const scrollPosition = (codeChange.cursorLine - 5) * lineHeight;
      contentRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, [codeChange?.cursorLine]);

  if (!codeChange) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Code className="h-5 w-5" />
            <span>Live Code Preview</span>
          </CardTitle>
          <CardDescription>No active code changes</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const lines = codeChange.content.split('\n');

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Code className="h-5 w-5" />
              <span>Live Code Preview</span>
            </CardTitle>
            <CardDescription className="flex items-center space-x-2 mt-1">
              <FileCode className="h-3 w-3" />
              <span>{codeChange.file}</span>
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">{codeChange.language}</Badge>
            <Button variant="ghost" size="icon">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <pre
          ref={contentRef}
          className="h-full overflow-auto bg-zinc-950 text-zinc-100 p-4 text-sm font-mono"
        >
          <code>
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              const isCursorLine = lineNumber === codeChange.cursorLine;

              return (
                <div
                  key={index}
                  className={`flex ${
                    isCursorLine
                      ? 'bg-blue-900/30 border-l-2 border-blue-500'
                      : ''
                  }`}
                >
                  <span className="inline-block w-12 text-right pr-4 text-zinc-600 select-none flex-shrink-0">
                    {lineNumber}
                  </span>
                  <span className="flex-1">{line || ' '}</span>
                  {isCursorLine && (
                    <span className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1" />
                  )}
                </div>
              );
            })}
          </code>
        </pre>
      </CardContent>
    </Card>
  );
}
