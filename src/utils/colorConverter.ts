/**
 * colorConverter.ts - Advanced texture-preserving metal color transformation
 * Uses sophisticated color transfer techniques that maintain natural metal properties
 */

import { MetalColor } from '@/types';
import { rgbToLab, labToRgb } from './colorSpaceUtils';

// Color reference points for accurate transformation
interface ColorReference {
  source: { l: number, a: number, b: number };
  target: { l: number, a: number, b: number };
}

// Yellow gold to rose gold transformation references (in LAB color space)
const YELLOW_TO_ROSE_REFS: ColorReference[] = [
  // Bright highlights
  { 
    source: { l: 83, a: 10, b: 45 }, 
    target: { l: 80, a: 20, b: 25 } 
  },
  // Standard tone
  { 
    source: { l: 76, a: 7, b: 40 }, 
    target: { l: 70, a: 18, b: 22 } 
  },
  // Shadow areas
  { 
    source: { l: 65, a: 6, b: 35 }, 
    target: { l: 60, a: 16, b: 18 } 
  }
];

// Rose gold to yellow gold transformation references (in LAB color space)
const ROSE_TO_YELLOW_REFS: ColorReference[] = [
  // Bright highlights
  { 
    source: { l: 80, a: 20, b: 25 }, 
    target: { l: 83, a: 10, b: 45 } 
  },
  // Standard tone
  { 
    source: { l: 70, a: 18, b: 22 }, 
    target: { l: 76, a: 7, b: 40 } 
  },
  // Shadow areas
  { 
    source: { l: 60, a: 16, b: 18 }, 
    target: { l: 65, a: 6, b: 35 } 
  }
];

/**
 * Calculates distance between two LAB colors
 */
const labDistance = (lab1: { l: number, a: number, b: number }, lab2: { l: number, a: number, b: number }): number => {
  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );
};

/**
 * Performs weighted color interpolation in LAB space
 * Preserves texture by calculating a weighted transformation
 * based on nearest reference points
 */
const transformLabColor = (
  lab: { l: number, a: number, b: number },
  references: ColorReference[],
  reflectionStrength: number
): { l: number, a: number, b: number } => {
  // Calculate distances to each reference point
  const distances = references.map(ref => 
    labDistance(lab, ref.source)
  );
  
  const totalDistance = distances.reduce((sum, d) => sum + d, 0);
  
  if (totalDistance === 0) {
    // Direct match with a reference color
    return references[0].target;
  }
  
  // Calculate inverse-distance weights and weighted components
  const weights = distances.map(d => 1 / (d + 0.0001)); // Add small epsilon to avoid division by zero
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  
  // Calculate the weighted average target color
  let targetL = 0, targetA = 0, targetB = 0;
  
  for (let i = 0; i < references.length; i++) {
    const weight = weights[i] / weightSum;
    targetL += references[i].target.l * weight;
    targetA += references[i].target.a * weight;
    targetB += references[i].target.b * weight;
  }
  
  // Apply reflection preservation logic
  if (reflectionStrength > 0) {
    // Preserve more of original lightness for highlights/reflections
    const preservationFactor = reflectionStrength / 255;
    targetL = lab.l * preservationFactor + targetL * (1 - preservationFactor);
  }
  
  return { l: targetL, a: targetA, b: targetB };
};

/**
 * Transforms metal color while preserving texture, reflections, and natural appearance
 */
export const transformMetalColor = async (
  imageDataUrl: string,
  sourceColor: MetalColor,
  targetColor: MetalColor,
  metalMask: Uint8Array,
  reflectionMap: Uint8Array
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        // Create canvas for image processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Set canvas dimensions and draw image
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Select appropriate transformation references
        const colorRefs = sourceColor === 'yellow' && targetColor === 'rose' 
          ? YELLOW_TO_ROSE_REFS 
          : ROSE_TO_YELLOW_REFS;
        
        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
          const pixelIndex = i / 4;
          
          // Only transform pixels that are part of the metal
          if (metalMask[pixelIndex] > 0) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert to LAB
            const lab = rgbToLab(r, g, b);
            
            // Get reflection strength (used to preserve highlights)
            const reflectionStrength = reflectionMap[pixelIndex];
            
            // Apply texture-preserving transformation
            const transformedLab = transformLabColor(lab, colorRefs, reflectionStrength);
            
            // Convert back to RGB
            const transformedRgb = labToRgb(
              transformedLab.l, 
              transformedLab.a, 
              transformedLab.b
            );
            
            // Apply transformed color
            data[i] = transformedRgb.r;
            data[i + 1] = transformedRgb.g;
            data[i + 2] = transformedRgb.b;
          }
          // Non-metal pixels remain unchanged
        }
        
        // Put modified image data back to canvas
        ctx.putImageData(imageData, 0, 0);
        
        // Convert canvas to data URL
        const resultDataUrl = canvas.toDataURL('image/png');
        resolve(resultDataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      // Load the image
      img.src = imageDataUrl;
    } catch (error) {
      reject(error);
    }
  });
};