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
            {progress.map((msg, idx) => (
              <div key={idx}>
                <ReactMarkdown
                  components={{
                    code: ({ node, inline, ...props }) => (
                      inline ? 
                        <code className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded" {...props} /> :
                        <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded" {...props} />
                    ),
                  }}
                >
                  {msg}
                </ReactMarkdown>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
