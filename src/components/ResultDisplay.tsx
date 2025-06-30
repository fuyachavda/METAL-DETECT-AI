import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { ProcessingStatus } from '@/types';

interface ResultDisplayProps {
  originalImage: string | null;
  processedImage: string | null;
  detectedColor: 'yellow' | 'rose' | null;
  status: ProcessingStatus;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  originalImage,
  processedImage,
  detectedColor,
  status,
}) => {
  const downloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = () => {
    if (processedImage) {
      const targetColor = detectedColor === 'yellow' ? 'rose' : 'yellow';
      downloadImage(processedImage, `jewelry-${targetColor}-gold.png`);
    }
  };

  if (status === 'error') {
    return (
      <Card className="mt-8 border-red-200">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-red-500 py-8">
            <AlertCircle className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-medium mb-2">Processing Error</h3>
            <p className="text-center text-muted-foreground">
              We encountered an error while processing your image. Please try again with a different image.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'processing' || status === 'detecting') {
    return (
      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <h3 className="text-xl font-medium mb-2">
              {status === 'detecting' ? 'Detecting Metal Color' : 'Transforming Color'}
            </h3>
            <p className="text-center text-muted-foreground">
              {status === 'detecting' 
                ? 'Our AI is analyzing your jewelry image to detect the metal color...'
                : 'Transforming your jewelry while preserving stones and details...'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!processedImage && status === 'detected') {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Ready for Transformation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <p className="text-center">
              Metal color detected. Click the transform button above to continue.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (originalImage && processedImage) {
    const targetColor = detectedColor === 'yellow' ? 'Rose' : 'Yellow';

    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Results: {detectedColor?.charAt(0).toUpperCase() + detectedColor?.slice(1)} Gold to {targetColor} Gold</span>
            <Button variant="outline" size="sm" onClick={handleDownload} className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Original Image</p>
              <div className="border rounded-lg overflow-hidden bg-black/5">
                <img 
                  src={originalImage} 
                  alt="Original" 
                  className="w-full h-auto object-contain max-h-[400px]" 
                />
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Transformed Image</p>
              <div className="border rounded-lg overflow-hidden bg-black/5">
                <img 
                  src={processedImage} 
                  alt="Transformed" 
                  className="w-full h-auto object-contain max-h-[400px]" 
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Transformation details:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Successfully converted {detectedColor} gold to {detectedColor === 'yellow' ? 'rose' : 'yellow'} gold</li>
              <li>Preserved all stones, diamonds, and other non-metal elements</li>
              <li>Maintained original image quality and details</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default ResultDisplay;