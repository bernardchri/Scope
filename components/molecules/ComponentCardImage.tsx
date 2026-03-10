import { ComponentImage, ComponentCategory } from '@/lib/types';
import { useImageLoader } from '@/lib/hooks/useImageLoader';
import { ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getCategoryLabel, getCategoryColor } from '@/lib/categoryHelpers';

interface ComponentCardImageProps {
  imageBase64?: string;
  images?: ComponentImage[];
  name: string;
  category: ComponentCategory;
  folderPath?: string;
  onClick: () => void;
}

export default function ComponentCardImage({ imageBase64, images, name, category, folderPath, onClick }: ComponentCardImageProps) {
  const { resolve } = useImageLoader(images || [], folderPath || '');
  const primaryImage = images?.find(img => img.isPrimary);
  const src = primaryImage ? resolve(primaryImage) : imageBase64;

  if (!src) {
    return (
      <div
        className="w-full h-48 bg-gray-100 cursor-pointer flex items-center justify-center relative"
        onClick={onClick}
      >
        <ImageIcon className="h-12 w-12 text-gray-400" />
        <Badge className={`absolute top-2 left-2 ${getCategoryColor(category)}`}>
          {getCategoryLabel(category)}
        </Badge>
      </div>
    );
  }

  return (
    <div
      className="w-full h-48 bg-gray-100 cursor-pointer relative"
      onClick={onClick}
    >
      <img
        src={src}
        alt={name}
        className="w-full h-full object-contain"
      />
      <Badge className={`absolute top-2 left-2 ${getCategoryColor(category)}`}>
        {getCategoryLabel(category)}
      </Badge>
      {images && images.length > 1 && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {images.length}
        </div>
      )}
    </div>
  );
}
