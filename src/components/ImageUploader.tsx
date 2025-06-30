import React, { useState, useRef } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ImageUploaderProps {
  onImageSelected: (image: string) => void;
  onReset: () => void;
  disabled: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, onReset, disabled }) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleFiles = (file: File) => {
    setError(null);
    
    // Check if the file is an image
    if (!file.type.match('image.*')) {
      setError('Please upload an image file (PNG, JPG, JPEG, etc.)');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      onImageSelected(result);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setPreview(null);
    setError(null);
    onReset();
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Upload Jewelry Image</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Upload a high-quality image of your jewelry. Best results are achieved with front-facing, clear photos against a neutral background.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onDragEnter={handleDrag}
          onSubmit={(e) => e.preventDefault()}
          className="w-full"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
            disabled={disabled}
          />
          
          {!preview ? (
            <div
              className={`
                flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 transition-all
                ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400 hover:bg-blue-50'}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={disabled ? undefined : handleButtonClick}
            >
              <Upload className="w-10 h-10 mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 mb-1">Drag and drop your image here</p>
              <p className="text-xs text-gray-400">PNG, JPG, JPEG (max 10MB)</p>
            </div>
          ) : (
            <div className="relative">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full rounded-lg object-contain max-h-[400px]" 
              />
            </div>
          )}
          
          {error && (
            <div className="mt-4 text-sm text-red-500 flex items-center">
              <Info className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
        </form>
      </CardContent>
      {preview && (
        <CardFooter className="flex justify-end">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={disabled}
            className="flex items-center"
          >
            <X className="w-4 h-4 mr-2" />
            Remove Image
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default ImageUploader;