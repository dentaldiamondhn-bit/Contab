'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, Trash2, Loader2 } from 'lucide-react';

interface LocationPhotoUploaderProps {
  imageUrl: string;
  tenantId: string;
  companyId: string;
  locationId?: string;
  onImageUrlChange: (url: string) => void;
}

export default function LocationPhotoUploader({
  imageUrl,
  tenantId,
  companyId,
  locationId,
  onImageUrlChange,
}: LocationPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenantId', tenantId);
      if (locationId) formData.append('locationId', locationId);

      const res = await fetch(`/api/companies/${companyId}/inventory/locations/image`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al subir la imagen');
      }

      const data = await res.json();
      onImageUrlChange(data.imageUrl as string);
    } catch (error: any) {
      alert(error.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!imageUrl) return;

    setUploading(true);
    try {
      const params = new URLSearchParams();
      const path = imageUrl.split('/object/public/product-photos/')[1];
      if (path) params.set('path', path);
      if (locationId) params.set('locationId', locationId);

      const res = await fetch(`/api/companies/${companyId}/inventory/locations/image?${params.toString()}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al eliminar la imagen');
      }

      onImageUrlChange('');
    } catch (error: any) {
      alert(error.message || 'Error al eliminar la imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-start gap-4">
      <div className="w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
        {imageUrl ? (
          <img src={imageUrl} alt="Ubicación" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus className="w-8 h-8 text-gray-400" />
        )}
      </div>
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4" />
            )}
            {imageUrl ? 'Cambiar foto' : 'Subir foto'}
          </Button>
          {imageUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={handleRemove}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              Quitar
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-500">JPG, PNG, GIF o WebP. Máximo 5MB.</p>
      </div>
    </div>
  );
}