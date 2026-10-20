'use client';

import TextBlock, { type TextBlockHandlers, type TextBlockVariant } from './TextBlock';

interface ParagraphWidgetProps extends TextBlockHandlers {
  content: string;
  variant?: TextBlockVariant;
  onSave: (content: string) => void;
}

export default function ParagraphWidget(props: ParagraphWidgetProps) {
  return <TextBlock {...props} />;
}

/** Titres et liste à puces : le même bloc de texte avec une variante de mise en forme. */
export const Heading1Widget = (props: Omit<ParagraphWidgetProps, 'variant'>) => <TextBlock {...props} variant="heading1" />;
export const Heading2Widget = (props: Omit<ParagraphWidgetProps, 'variant'>) => <TextBlock {...props} variant="heading2" />;
export const Heading3Widget = (props: Omit<ParagraphWidgetProps, 'variant'>) => <TextBlock {...props} variant="heading3" />;
export const BulletWidget = (props: Omit<ParagraphWidgetProps, 'variant'>) => <TextBlock {...props} variant="list-item" />;
