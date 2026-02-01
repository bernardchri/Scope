const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1 MB

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  base64?: string;
}

export async function convertImageToBase64(file: File): Promise<ImageValidationResult> {
  // Vérifier la taille
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `L'image est trop grande (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum : 1 MB`
    };
  }

  // Vérifier le type
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'Le fichier doit être une image'
    };
  }

  // Convertir en base64
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve({
        valid: true,
        base64: reader.result as string
      });
    };
    
    reader.onerror = () => {
      resolve({
        valid: false,
        error: 'Erreur lors de la lecture du fichier'
      });
    };
    
    reader.readAsDataURL(file);
  });
}

export function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.src = base64;
  });
}