'use client';

import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ProgressModalProps {
  open: boolean;
  title: string;
  description?: string;
  progress?: string[];
  onDismiss?: () => void;
}

export function ProgressModal({
  open,
  title,
  description,
  progress = [],
  onDismiss,
}: ProgressModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [progress]);

  return (
    <Dialog open={open} onOpenChange={onDismiss}>
      <DialogContent showCloseButton={true} className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {progress.length > 0 && (
          <div ref={scrollRef} className="mt-4 max-h-[70vh] overflow-y-auto">
            {progress.map((msg, idx) => {
              // Replace single newlines with spaces, keep double newlines as paragraph breaks
              const normalizedMsg = msg.replace(/([^\n])\n([^\n])/g, '$1 $2');
              
              // Split by double newlines for paragraphs
              const paragraphs = normalizedMsg.split('\n\n');
              
              return (
                <div key={idx} className="text-sm text-zinc-300 leading-relaxed">
                  {paragraphs.map((para, pIdx) => {
                    // Only wrap file paths and specific patterns as code
                    const withCode = para
                      // File paths
                      .replace(/([\/\w\-\.]+\.(ts|tsx|js|jsx|json|md|css|html))/g, '<code class="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 rounded text-xs font-mono">$1</code>')
                      // camelCase/PascalCase function names followed by ()
                      .replace(/\b([a-z][a-zA-Z0-9]*|[A-Z][a-zA-Z0-9]*)\(\)/g, '<code class="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 rounded text-xs font-mono">$1()</code>')
                      // Type annotations like ExportedTask[], Map<string, string>
                      .replace(/\b([A-Z][a-zA-Z0-9]*(?:\[\]|<[^>]+>)?)\b/g, '<code class="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 rounded text-xs font-mono">$1</code>');
                    
                    return (
                      <p key={pIdx} className="mb-3" dangerouslySetInnerHTML={{ __html: withCode }} />
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
