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
                <div key={idx} className="prose prose-sm dark:prose-invert max-w-none">
                  {paragraphs.map((para, pIdx) => {
                    // Wrap code-like identifiers with <code> tags
                    const parts = para.split(/(`[^`]+`)/g);
                    
                    return (
                      <p key={pIdx} className="mb-2">
                        {parts.map((part, partIdx) => {
                          if (part.startsWith('`') && part.endsWith('`')) {
                            // Already has backticks
                            const code = part.slice(1, -1);
                            return (
                              <code key={partIdx} className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded text-xs font-mono">
                                {code}
                              </code>
                            );
                          }
                          
                          // Auto-detect code identifiers and wrap them
                          const withCode = part.replace(
                            /\b([a-z][a-zA-Z0-9]*|[A-Z][a-zA-Z0-9]*|[a-z_][a-z0-9_]*)\b/g,
                            (match) => {
                              const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'all', 'each', 'every', 'some', 'any', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'this', 'that', 'these', 'those'];
                              if (commonWords.includes(match.toLowerCase())) return match;
                              if (/[A-Z]/.test(match) || /_/.test(match)) {
                                return `<code class="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded text-xs font-mono">${match}</code>`;
                              }
                              return match;
                            }
                          );
                          
                          return <span key={partIdx} dangerouslySetInnerHTML={{ __html: withCode }} />;
                        })}
                      </p>
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
