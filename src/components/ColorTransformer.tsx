import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ProcessingStatus, MetalColor } from '@/types';
import { transformMetalColor } from '@/utils/imageProcessing';

interface ColorTransformerProps {
  originalImage: string;
  onProcessingComplete: (resultImage: string, detectedColor: 'yellow' | 'rose') => void;
  onProcessingError: () => void;
  setStatus: React.Dispatch<React.SetStateAction<ProcessingStatus>>;
}

const ColorTransformer: React.FC<ColorTransformerProps> = ({
  originalImage,
  onProcessingComplete,
  onProcessingError,
  setStatus
}) => {
  const [detectedColor, setDetectedColor] = useState<'yellow' | 'rose' | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);

  useEffect(() => {
    detectMetalColor();
  }, [originalImage]);

  const detectMetalColor = async () => {
    try {
      setIsDetecting(true);
      setStatus('detecting');
      
      // Process the image directly using the existing detectColor implementation
      const result = await detectColor(originalImage);
      
      setDetectedColor(result);
      setIsDetecting(false);
      setStatus('detected');
    } catch (error) {
      console.error('Error detecting metal color:', error);
      setIsDetecting(false);
      onProcessingError();
      setStatus('error');
    }
  };
  
  // Metal color detection using our enhanced algorithm
  const detectColor = async (imageData: string): Promise<MetalColor> => {
    try {
      // We'll use our own implementation directly
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      return new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            console.error('Could not get canvas context');
            resolve('yellow'); // Default fallback
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          let yellowScore = 0;
          let roseScore = 0;
          
          // Sample pixels for metal detection
          const sampleStep = Math.max(1, Math.floor(data.length / 40000)); // Adjust sample rate based on image size
          
          for (let i = 0; i < data.length; i += 4 * sampleStep) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert to HSV for better color analysis
            const hsv = rgbToHsv(r, g, b);
            
            // Yellow gold detection
            if (hsv.h >= 30 && hsv.h <= 55 && hsv.s >= 0.3 && hsv.v >= 0.4) {
              yellowScore += 1;
            }
            
            // Rose gold detection
            if ((hsv.h >= 345 || hsv.h <= 20) && hsv.s >= 0.25 && hsv.v >= 0.4) {
              roseScore += 1;
            }
            
            // Additional detection for copper-toned rose gold
            if (hsv.h >= 15 && hsv.h <= 30 && hsv.s >= 0.4 && hsv.v >= 0.45) {
              roseScore += 0.8;
            }
          }
          
          console.log(`Metal detection scores - Yellow: ${yellowScore}, Rose: ${roseScore}`);
          resolve(yellowScore > roseScore ? 'yellow' : 'rose');
        };
        
        img.onerror = () => {
          console.error('Image loading failed during color detection');
          resolve('yellow'); // Default fallback
        };
        
        img.src = imageData;
      });
    } catch (error) {
      console.error('Error in color detection, using fallback:', error);
      return 'yellow'; // Default fallback
    }
  };

  // Helper function to convert RGB to HSV
  const rgbToHsv = (r: number, g: number, b: number): { h: number, s: number, v: number } => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    let h = 0;
    if (delta !== 0) {
      if (max === r) {
        h = 60 * (((g - b) / delta) % 6);
      } else if (max === g) {
        h = 60 * ((b - r) / delta + 2);
      } else {
        h = 60 * ((r - g) / delta + 4);
      }
    }
    if (h < 0) h += 360;
    
    const s = max === 0 ? 0 : delta / max;
    const v = max;
    
    return { h, s, v };
  };

  const handleTransformClick = async () => {
    try {
      if (!detectedColor) return;
      
      setIsTransforming(true);
      setStatus('processing');
      
      // Call the transformation function
      const resultImage = await transformMetalColor(
        originalImage,
        detectedColor === 'yellow' ? 'rose' : 'yellow'
      );
      
      setIsTransforming(false);
      onProcessingComplete(resultImage, detectedColor);
    } catch (error) {
      console.error('Error transforming metal color:', error);
      setIsTransforming(false);
      onProcessingError();
      setStatus('error');
    }
  };

  // Additional implementation for metal detection was moved to the main detectMetalColor function

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metal Detection & Transformation</CardTitle>
      </CardHeader>
      <CardContent>
        {isDetecting ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
            <p className="text-sm text-muted-foreground">Analyzing metal color...</p>
          </div>
        ) : detectedColor ? (
          <div className="text-center py-4">
            <div className="mb-4">
              <div className="text-lg font-medium mb-1">Detected Metal Color</div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" 
                style={{ 
                  backgroundColor: detectedColor === 'yellow' ? '#fef3c7' : '#fecdd3',
                  color: detectedColor === 'yellow' ? '#92400e' : '#9d174d'
                }}
              >
                {detectedColor === 'yellow' ? 'Yellow Gold' : 'Rose Gold'}
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4 mb-4">
              <p className="text-sm">
                {detectedColor === 'yellow' 
                  ? "Your jewelry appears to be yellow gold. Click below to transform to rose gold."
                  : "Your jewelry appears to be rose gold. Click below to transform to yellow gold."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-6 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Unable to detect metal color</span>
          </div>
        )}
      </CardContent>
      {detectedColor && (
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleTransformClick} 
            disabled={isTransforming}
          >
            {isTransforming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Transform to ${detectedColor === 'yellow' ? 'Rose' : 'Yellow'} Gold`
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default ColorTransformer;