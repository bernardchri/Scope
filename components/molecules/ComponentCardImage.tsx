interface ComponentCardImageProps {
  imageBase64?: string;
  name: string;
  onClick: () => void;
}

export default function ComponentCardImage({ imageBase64, name, onClick }: ComponentCardImageProps) {
  if (!imageBase64) return null;

  return (
    <div 
      className="w-full h-48 bg-gray-100 cursor-pointer"
      onClick={onClick}
    >
      <img
        src={imageBase64}
        alt={name}
        className="w-full h-full object-contain"
      />
    </div>
  );
}