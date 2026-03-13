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
              // Preserve newlines after markdown headers, collapse other single newlines
              const normalizedMsg = msg
                .replace(/^(#{1,6}\s+.+)$/gm, '$1\n\n') // Add double newline after headers
                .replace(/([^\n#])\n([^\n#])/g, '$1 $2'); // Collapse single newlines (except after headers)
              
              return (
                <div key={idx}>
                  <ReactMarkdown
                    components={{
                      code: ({ node, inline, ...props }) => (
                        inline ? 
                          <code className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 rounded text-xs font-mono whitespace-nowrap" {...props} /> :
                          <code className="block bg-zinc-900 text-zinc-100 p-3 rounded text-sm font-mono overflow-x-auto my-2" {...props} />
                      ),
                      p: ({ node, ...props }) => <p className="my-2" {...props} />,
                      h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-2 mb-1" {...props} />,
                    }}
                  >
                    {normalizedMsg}
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
