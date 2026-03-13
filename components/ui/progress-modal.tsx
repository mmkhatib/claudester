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
          <div ref={scrollRef} className="mt-4 max-h-[70vh] overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
            {progress.map((msg, idx) => {
              // Replace single newlines with spaces, keep double newlines as paragraph breaks
              const normalizedMsg = msg.replace(/([^\n])\n([^\n])/g, '$1 $2');
              
              // Auto-wrap code-like identifiers (camelCase, PascalCase, snake_case) with backticks
              const formattedMsg = normalizedMsg.replace(
                /\b([a-z][a-zA-Z0-9]*|[A-Z][a-zA-Z0-9]*|[a-z_][a-z0-9_]*)\b(?![`])/g,
                (match) => {
                  // Don't wrap common words, only code-like identifiers
                  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'all', 'each', 'every', 'some', 'any', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very'];
                  if (commonWords.includes(match.toLowerCase())) return match;
                  // Wrap if it looks like code (has camelCase, PascalCase, or underscores)
                  if (/[A-Z]/.test(match) || /_/.test(match) || /^[a-z]+[A-Z]/.test(match)) {
                    return `\`${match}\``;
                  }
                  return match;
                }
              );
              
              return (
                <div key={idx}>
                  <ReactMarkdown
                    components={{
                      code: ({ node, inline, ...props }) => (
                        inline ? 
                          <code className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded text-xs font-mono" {...props} /> :
                          <code className="block bg-zinc-900 text-zinc-100 p-3 rounded text-sm font-mono overflow-x-auto" {...props} />
                      ),
                    }}
                  >
                    {formattedMsg}
                  </ReactMarkdown>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
