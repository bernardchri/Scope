'use client';

import TextBlock, { type TextBlockVariant } from './TextBlock';

interface ParagraphWidgetProps {
  content: string;
  variant?: TextBlockVariant;
  onSave: (content: string) => void;
  autoFocus?: boolean;
  onSlashCommand?: (caretRect: DOMRect, textBefore: string, textAfter: string) => void;
  onDelete?: () => void;
  onSplit?: (textBefore: string, textAfter: string) => void;
}

export default function ParagraphWidget(props: ParagraphWidgetProps) {
  return <TextBlock {...props} />;
}
