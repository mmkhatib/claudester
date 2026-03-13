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
            {progress.map((msg, idx) => (
              <div key={idx} className="prose prose-sm dark:prose-invert max-w-none">
                {msg.includes('```') || msg.includes('##') || msg.includes('**') ? (
                  // Render as markdown if it contains markdown syntax
                  <ReactMarkdown
                    components={{
                      code: ({ node, inline, ...props }) => (
                        inline ? 
                          <code className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded text-xs" {...props} /> :
                          <code className="block bg-zinc-900 text-zinc-100 p-3 rounded text-xs font-mono overflow-x-auto" {...props} />
                      ),
                    }}
                  >
                    {msg}
                  </ReactMarkdown>
                ) : (
                  // Render as preformatted text to preserve formatting
                  <pre className="whitespace-pre-wrap font-mono text-xs bg-zinc-50 dark:bg-zinc-900 p-3 rounded border border-zinc-200 dark:border-zinc-800">
                    {msg}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
