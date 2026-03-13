'use client';

import { MessageSquare } from 'lucide-react';
import TextBlock from './TextBlock';

interface CommentWidgetProps {
  content: string;
  onSave: (content: string) => void;
  autoFocus?: boolean;
  onSlashCommand?: (caretRect: DOMRect, textBefore: string, textAfter: string) => void;
  onDelete?: () => void;
  onSplit?: (textBefore: string, textAfter: string) => void;
}

export default function CommentWidget(props: CommentWidgetProps) {
  return (
    <div className="relative border border-muted-foreground/30 bg-muted/50 rounded-lg pl-9 pr-3 py-3 pt-6">
      <MessageSquare className="absolute top-3 left-3 h-4 w-4 text-muted-foreground/60" />
      <div className="text-muted-foreground">
        <TextBlock {...props} />
      </div>
    </div>
  );
}
