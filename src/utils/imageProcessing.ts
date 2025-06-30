// imageProcessing.ts - Utility functions for image processing and color transformation
// Enhanced version with improved metal detection and color transformation algorithms

import { MetalColor } from '@/types';

/**
 * Transforms the color of gold jewelry from yellow to rose or vice versa
 * using an enhanced algorithm that preserves texture and details
 */
export const transformMetalColor = async (
  imageDataUrl: string,
  targetColor: MetalColor
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create an image element to load the original image
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      // First detect dominant metal colors using pre-analysis
      const preAnalyzeMetalColors = (image: HTMLImageElement): {isYellowDominant: boolean, isRoseDominant: boolean} => {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        if (!tempCtx) {
          throw new Error('Could not get canvas context for pre-analysis');
        }
        
        // Use a downscaled version for faster analysis
        const scaleFactor = Math.min(1, 300 / Math.max(image.width, image.height));
        tempCanvas.width = image.width * scaleFactor;
        tempCanvas.height = image.height * scaleFactor;
        
        tempCtx.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);
        const sampleData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
        
        let yellowCount = 0;
        let roseCount = 0;
        let totalMetalPixels = 0;
        
        // Sample the image to detect dominant metal colors
        for (let i = 0; i < sampleData.length; i += 16) { // Sample every 4th pixel for speed
          const r = sampleData[i];
          const g = sampleData[i + 1];
          const b = sampleData[i + 2];
          
          const hsv = rgbToHsv(r, g, b);
          
          if (isGoldColor(hsv)) {
            totalMetalPixels++;
            
            // Check if pixel is yellow gold
            if (hsv.h >= 30 && hsv.h <= 55 && hsv.s >= 0.3) {
              yellowCount++;
            } 
            // Check if pixel is rose gold
            else if ((hsv.h >= 345 || hsv.h <= 20) || 
                    (hsv.h >= 15 && hsv.h <= 30 && hsv.s >= 0.4)) {
              roseCount++;
            }
          }
        }
        
        return {
          isYellowDominant: yellowCount > roseCount,
          isRoseDominant: roseCount > yellowCount
        };
      };

      img.onload = () => {
        try {
          // Pre-analyze the image to detect dominant metal colors
          const colorAnalysis = preAnalyzeMetalColors(img);
          
          // Create canvas to process the image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Set canvas dimensions to match image
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw the original image on canvas
          ctx.drawImage(img, 0, 0);
          
          // Get image data for processing
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Adaptive transformation based on pre-analysis
          const sourceIsTargetColor = 
            (targetColor === 'yellow' && colorAnalysis.isYellowDominant) ||
            (targetColor === 'rose' && colorAnalysis.isRoseDominant);
            
          // If the source is already mostly the target color, apply a more subtle transformation
          const transformIntensity = sourceIsTargetColor ? 0.5 : 1.0;
          
          // Process each pixel with the enhanced algorithm
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert RGB to HSV for better color manipulation
            const hsv = rgbToHsv(r, g, b);
            
            // Enhanced detection using our improved isGoldColor function
            if (isGoldColor(hsv)) {
              // Transform the gold color using our enhanced algorithm
              const newColor = transformGoldColor(r, g, b, targetColor);
              
              // Apply the new color with transformation intensity
              if (transformIntensity < 1.0) {
                // Blend between original and transformed color based on intensity
                data[i] = Math.round(r * (1 - transformIntensity) + newColor.r * transformIntensity);
                data[i + 1] = Math.round(g * (1 - transformIntensity) + newColor.g * transformIntensity);
                data[i + 2] = Math.round(b * (1 - transformIntensity) + newColor.b * transformIntensity);
              } else {
                // Full transformation
                data[i] = newColor.r;
                data[i + 1] = newColor.g;
                data[i + 2] = newColor.b;
              }
            }
            // Other pixels (diamonds, stones, background) remain unchanged
          }
          
          // Apply a subtle smoothing if the image is high resolution to reduce artifacts
          if (img.width > 1000 || img.height > 1000) {
            // Simple 3x3 box blur only for transformed pixels
            const tempData = new Uint8ClampedArray(data);
            const width = imageData.width;
            
            for (let y = 1; y < imageData.height - 1; y++) {
              for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                // Only smooth if this was a detected metal pixel
                const hsv = rgbToHsv(data[idx], data[idx + 1], data[idx + 2]);
                if (isGoldColor(hsv)) {
                  // Average with neighbors for a subtle smoothing effect
                  for (let c = 0; c < 3; c++) { // For R, G, B channels
                    let sum = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                      for (let dx = -1; dx <= 1; dx++) {
                        const neighborIdx = ((y + dy) * width + (x + dx)) * 4 + c;
                        sum += tempData[neighborIdx];
                      }
                    }
                    // Apply 70% original, 30% smoothed
                    data[idx + c] = Math.round(0.7 * data[idx + c] + 0.3 * (sum / 9));
                  }
                }
              }
            }
          }
          
          // Put the modified image data back on canvas
          ctx.putImageData(imageData, 0, 0);
          
          // Convert canvas to data URL
          const resultDataUrl = canvas.toDataURL('image/png');
          resolve(resultDataUrl);
        } catch (innerError) {
          console.error('Error during image processing:', innerError);
          reject(innerError);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      // Load the image
      img.src = imageDataUrl;
    } catch (error) {
      console.error('Error in transformMetalColor:', error);
      reject(error);
    }
  });
};

/**
 * Converts RGB color values to HSV (Hue, Saturation, Value)
 */
const rgbToHsv = (r: number, g: number, b: number): { h: number, s: number, v: number } => {
  // Normalize RGB values to 0-1
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;
  
  // Calculate hue (0-360)
  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = 60 * (((gNorm - bNorm) / delta) % 6);
    } else if (max === gNorm) {
      h = 60 * ((bNorm - rNorm) / delta + 2);
    } else {
      h = 60 * ((rNorm - gNorm) / delta + 4);
    }
  }
  if (h < 0) h += 360;
  
  // Calculate saturation (0-1)
  const s = max === 0 ? 0 : delta / max;
  
  // Value is the maximum component (0-1)
  const v = max;
  
  return { h, s, v };
};

/**
 * Converts HSV color values back to RGB
 */
const hsvToRgb = (h: number, s: number, v: number): { r: number, g: number, b: number } => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  
  let rTemp = 0, gTemp = 0, bTemp = 0;
  
  if (h >= 0 && h < 60) {
    rTemp = c; gTemp = x; bTemp = 0;
  } else if (h >= 60 && h < 120) {
    rTemp = x; gTemp = c; bTemp = 0;
  } else if (h >= 120 && h < 180) {
    rTemp = 0; gTemp = c; bTemp = x;
  } else if (h >= 180 && h < 240) {
    rTemp = 0; gTemp = x; bTemp = c;
  } else if (h >= 240 && h < 300) {
    rTemp = x; gTemp = 0; bTemp = c;
  } else {
    rTemp = c; gTemp = 0; bTemp = x;
  }
  
  // Convert back to 0-255 range
  const r = Math.round((rTemp + m) * 255);
  const g = Math.round((gTemp + m) * 255);
  const b = Math.round((bTemp + m) * 255);
  
  return { r, g, b };
};

/**
 * Determines if a color (in HSV) is likely to be gold (yellow or rose)
 * Enhanced version with better detection thresholds
 */
const isGoldColor = (hsv: { h: number, s: number, v: number }): boolean => {
  // Yellow gold: More precise orange-yellow colors with medium-high saturation and value
  const isYellowGold = (
    ((hsv.h >= 30 && hsv.h <= 55) && // More precise yellow-orange hue range
     hsv.s >= 0.3 && hsv.s <= 0.95 && // Wider saturation range for better detection
     hsv.v >= 0.4) // Lower threshold to catch darker yellow gold
  );
  
  // Rose gold: More precise pinkish colors with medium saturation and high value
  const isRoseGold = (
    (((hsv.h >= 345 || hsv.h <= 20) && // Expanded red-pink hue range
      hsv.s >= 0.25 && hsv.s <= 0.9 &&  // Wider saturation range
      hsv.v >= 0.4) || // Lower threshold to catch darker rose gold
    // Additional detection for copper-toned rose gold
     (hsv.h >= 15 && hsv.h <= 30 && 
      hsv.s >= 0.4 && 
      hsv.v >= 0.45))
  );
  
  // White gold detection (helpful to avoid modifying white gold elements)
  const isWhiteGold = (
    hsv.h >= 0 && hsv.h <= 360 && // Any hue
    hsv.s <= 0.15 && // Very low saturation
    hsv.v >= 0.75 // High brightness
  );
  
  return isYellowGold || isRoseGold || isWhiteGold;
};

/**
 * Transforms gold color from one type to another with enhanced color mapping
 * and texture preservation
 */
const transformGoldColor = (
  r: number, 
  g: number, 
  b: number,
  targetColor: 'yellow' | 'rose'
): { r: number, g: number, b: number } => {
  // Convert to HSV color space for better color manipulation
  const hsv = rgbToHsv(r, g, b);
  
  // Calculate initial luminance to preserve lighting effects
  const initialLuminance = 0.299 * r + 0.587 * g + 0.114 * b;
  
  // Detect current metal type based on color properties
  const isCurrentlyYellow = 
    (hsv.h >= 30 && hsv.h <= 60) || 
    (hsv.s >= 0.3 && hsv.s <= 0.95 && hsv.v >= 0.6);
  const isCurrentlyRose = 
    (hsv.h >= 345 || hsv.h <= 20) || 
    (hsv.h >= 15 && hsv.h <= 30 && hsv.s >= 0.4);
  
  // Calculate transformation intensity based on how "gold-like" the pixel is
  // This helps preserve texture and detailing
  const goldConfidence = Math.min(hsv.s * 1.5, 1.0) * Math.min(hsv.v * 1.2, 1.0);
  
  if (targetColor === 'yellow') {
    // Transform to yellow gold with adaptive color mapping
    
    // Adjust hue based on current color - different adjustment for rose gold vs other colors
    if (isCurrentlyRose) {
      // More dramatic shift from rose to yellow
      hsv.h = 45 + (Math.random() * 5 - 2.5); // Add slight variation for natural look
    } else {
      // Smaller adjustment for pixels already yellowish
      hsv.h = hsv.h * 0.2 + 36; // Weight towards yellow gold (45) but preserve some original character
    }
    
    // Enhanced saturation with texture preservation
    hsv.s = hsv.s * (0.7 + 0.3 * goldConfidence) + 0.1;
    hsv.s = Math.max(0.3, Math.min(0.95, hsv.s));
    
    // Adaptive value/brightness based on original pixel luminance
    hsv.v = hsv.v * 0.85 + 0.15;
    hsv.v = Math.max(0.5, Math.min(0.95, hsv.v));
  } else {
    // Transform to rose gold with adaptive color mapping
    
    // Adjust hue based on current color - different adjustment for yellow gold vs other colors
    if (isCurrentlyYellow) {
      // More dramatic shift from yellow to rose
      hsv.h = 5 + (Math.random() * 5 - 2.5); // Add slight variation
    } else {
      // Target reddish-copper tone with some variation
      hsv.h = (hsv.h > 180) ? 358 : Math.max(0, Math.min(15, hsv.h));
    }
    
    // Enhanced saturation with texture preservation for rose gold's distinctive look
    hsv.s = hsv.s * (0.8 + 0.2 * goldConfidence);
    hsv.s = Math.max(0.25, Math.min(0.85, hsv.s));
    
    // Slightly darker for rose gold's richer look
    hsv.v = hsv.v * 0.9 + 0.05;
    hsv.v = Math.max(0.4, Math.min(0.9, hsv.v));
  }
  
  // Convert back to RGB
  const newColor = hsvToRgb(hsv.h, hsv.s, hsv.v);
  
  // Fine-tune to preserve original lighting and reflections
  const newLuminance = 0.299 * newColor.r + 0.587 * newColor.g + 0.114 * newColor.b;
  const luminanceRatio = initialLuminance / Math.max(1, newLuminance);
  
  // Apply luminance correction (capped to avoid extreme adjustments)
  const luminanceFactor = Math.max(0.7, Math.min(1.3, luminanceRatio));
  
  return {
    r: Math.min(255, Math.max(0, Math.round(newColor.r * luminanceFactor))),
    g: Math.min(255, Math.max(0, Math.round(newColor.g * luminanceFactor))),
    b: Math.min(255, Math.max(0, Math.round(newColor.b * luminanceFactor)))
  };
};