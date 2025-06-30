import { useState } from 'react';
import ImageUploader from '@/components/ImageUploader';
import ColorTransformer from '@/components/ColorTransformer';
import ResultDisplay from '@/components/ResultDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProcessingStatus } from '@/types';

export default function JewelryColorChanger() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [detectedColor, setDetectedColor] = useState<'yellow' | 'rose' | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');

  const handleImageProcessed = (resultImage: string, color: 'yellow' | 'rose') => {
    setProcessedImage(resultImage);
    setDetectedColor(color);
    setStatus('success');
  };

  const handleProcessingError = () => {
    setStatus('error');
  };

  const handleReset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setDetectedColor(null);
    setStatus('idle');
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent mb-4">
            Jewelry Metal Color Changer
          </h1>
          <p className="text-xl text-muted-foreground">
            Instantly transform yellow gold to rose gold and vice versa while preserving stones and details
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>Our AI technology analyzes and transforms your jewelry images</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl mb-2">1</div>
                <h3 className="text-lg font-medium mb-1">Upload Image</h3>
                <p className="text-muted-foreground text-sm">Upload a high-quality image of your jewelry</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl mb-2">2</div>
                <h3 className="text-lg font-medium mb-1">AI Detection</h3>
                <p className="text-muted-foreground text-sm">Our AI detects if your jewelry is yellow or rose gold</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl mb-2">3</div>
                <h3 className="text-lg font-medium mb-1">Smart Transformation</h3>
                <p className="text-muted-foreground text-sm">Transform colors while preserving stones and details</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ImageUploader 
            onImageSelected={setOriginalImage} 
            onReset={handleReset} 
            disabled={status === 'processing'}
          />
          
          {originalImage && (
            <ColorTransformer
              originalImage={originalImage}
              onProcessingComplete={handleImageProcessed}
              onProcessingError={handleProcessingError}
              setStatus={setStatus}
            />
          )}
        </div>

        {(originalImage || processedImage) && (
          <ResultDisplay
            originalImage={originalImage}
            processedImage={processedImage}
            detectedColor={detectedColor}
            status={status}
          />
        )}
      </div>
    </div>
  );
}