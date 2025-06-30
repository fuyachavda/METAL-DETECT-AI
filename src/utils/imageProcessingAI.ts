// imageProcessingAI.ts - Advanced image processing for jewelry metal color transformation

import { MetalColor } from '@/types';

/**
 * Process a jewelry image and transform its metal colors
 */
export const processJewelryImage = async (
  imageDataUrl: string,
  targetColor: MetalColor
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create an image element to load the original image
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        // Create canvas to process the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
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
        
        // Process each pixel with advanced color transformation
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Convert to LAB color space for better color analysis
          const lab = rgbToLab(r, g, b);
          
          // Enhanced metal detection using LAB values
          if (isMetalInLab(lab)) {
            // Apply advanced texture-preserving transformation
            const newColor = transformGoldWithTexture(r, g, b, lab, targetColor);
            
            // Apply the new color
            data[i] = newColor.r;
            data[i + 1] = newColor.g;
            data[i + 2] = newColor.b;
          }
          // Other pixels (diamonds, stones, background) remain unchanged
        }
        
        // Apply a subtle enhancement filter for better output quality
        enhanceImageQuality(imageData);
        
        // Put the modified image data back on canvas
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

/**
 * Converts RGB to LAB color space for better color analysis
 * LAB is more perceptually uniform than RGB or HSV
 */
const rgbToLab = (r: number, g: number, b: number): {L: number, a: number, b: number} => {
  // Normalize RGB values to 0-1
  let rLinear = r / 255;
  let gLinear = g / 255;
  let bLinear = b / 255;
  
  // Apply gamma correction
  rLinear = rLinear > 0.04045 ? Math.pow((rLinear + 0.055) / 1.055, 2.4) : rLinear / 12.92;
  gLinear = gLinear > 0.04045 ? Math.pow((gLinear + 0.055) / 1.055, 2.4) : gLinear / 12.92;
  bLinear = bLinear > 0.04045 ? Math.pow((bLinear + 0.055) / 1.055, 2.4) : bLinear / 12.92;
  
  // Convert to XYZ color space
  const x = rLinear * 0.4124 + gLinear * 0.3576 + bLinear * 0.1805;
  const y = rLinear * 0.2126 + gLinear * 0.7152 + bLinear * 0.0722;
  const z = rLinear * 0.0193 + gLinear * 0.1192 + bLinear * 0.9505;
  
  // Convert XYZ to Lab
  const xr = x / 0.95047;
  const yr = y / 1.0;
  const zr = z / 1.08883;
  
  const fx = xr > 0.008856 ? Math.pow(xr, 1/3) : (7.787 * xr) + (16/116);
  const fy = yr > 0.008856 ? Math.pow(yr, 1/3) : (7.787 * yr) + (16/116);
  const fz = zr > 0.008856 ? Math.pow(zr, 1/3) : (7.787 * zr) + (16/116);
  
  const L = (116 * fy) - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  
  return {L, a, b};
};

/**
 * Convert LAB color back to RGB
 */
const labToRgb = (L: number, a: number, b: number): {r: number, g: number, b: number} => {
  // Lab to XYZ
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  
  const xr = fx > 0.206893 ? Math.pow(fx, 3) : (fx - 16/116) / 7.787;
  const yr = fy > 0.206893 ? Math.pow(fy, 3) : (fy - 16/116) / 7.787;
  const zr = fz > 0.206893 ? Math.pow(fz, 3) : (fz - 16/116) / 7.787;
  
  const x = xr * 0.95047;
  const y = yr * 1.0;
  const z = zr * 1.08883;
  
  // XYZ to RGB linear
  const rLinear = x * 3.2406 + y * -1.5372 + z * -0.4986;
  const gLinear = x * -0.9689 + y * 1.8758 + z * 0.0415;
  const bLinear = x * 0.0557 + y * -0.2040 + z * 1.0570;
  
  // Linear RGB to sRGB
  const r = Math.round(255 * (rLinear > 0.0031308 ? 1.055 * Math.pow(rLinear, 1/2.4) - 0.055 : 12.92 * rLinear));
  const g = Math.round(255 * (gLinear > 0.0031308 ? 1.055 * Math.pow(gLinear, 1/2.4) - 0.055 : 12.92 * gLinear));
  const b = Math.round(255 * (bLinear > 0.0031308 ? 1.055 * Math.pow(bLinear, 1/2.4) - 0.055 : 12.92 * bLinear));
  
  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b))
  };
};

/**
 * Enhanced metal detection using LAB color space
 * More accurate than HSV for gold detection
 */
const isMetalInLab = (lab: {L: number, a: number, b: number}): boolean => {
  // Yellow gold detection in LAB
  // High L (brightness), positive b (yellow), slightly positive a
  const isYellowGold = (
    lab.L > 65 && lab.L < 95 && // Bright
    lab.b > 15 && lab.b < 45 && // Yellow
    lab.a > -5 && lab.a < 25    // Slightly red/green
  );
  
  // Rose gold detection in LAB
  // Medium L, positive a (red), positive b
  const isRoseGold = (
    lab.L > 55 && lab.L < 85 && // Medium-bright
    lab.a > 10 && lab.a < 40 && // Red
    lab.b > 5 && lab.b < 35     // Slightly yellow
  );
  
  // White gold detection
  const isWhiteGold = (
    lab.L > 75 && lab.L < 98 && // Very bright
    Math.abs(lab.a) < 5 &&     // Neutral a
    Math.abs(lab.b) < 10       // Slightly yellow/blue
  );
  
  return isYellowGold || isRoseGold || isWhiteGold;
};

/**
 * Advanced texture-preserving color transformation
 * Preserves the original texture details while changing the color
 */
const transformGoldWithTexture = (
  r: number,
  g: number,
  b: number,
  lab: {L: number, a: number, b: number},
  targetColor: MetalColor
): {r: number, g: number, b: number} => {
  // Calculate luminance as measure of texture
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const normalizedLuminance = luminance / 255;
  
  // Calculate texture deviation from average (gives texture details)
  const textureDeviation = lab.L - 75; // 75 is approximate average L for gold
  
  // New LAB values based on target color
  let newL, newA, newB;
  
  if (targetColor === 'yellow') {
    // Yellow gold LAB profile
    newL = 85 + textureDeviation * 0.7; // Preserve some texture
    newA = 5;  // Slight red
    newB = 35; // Strong yellow
  } else {
    // Rose gold LAB profile
    newL = 75 + textureDeviation * 0.7; // Preserve some texture
    newA = 25; // Strong red
    newB = 20; // Moderate yellow
  }
  
  // Ensure values stay in reasonable bounds
  newL = Math.max(50, Math.min(95, newL));
  
  // Convert back to RGB
  return labToRgb(newL, newA, newB);
};

/**
 * Enhance image quality by applying subtle image processing techniques
 * This improves the final output quality
 */
const enhanceImageQuality = (imageData: ImageData): void => {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // Apply a subtle unsharp mask for better details
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Skip transparent pixels
      if (data[idx + 3] < 128) continue;
      
      // For each RGB channel
      for (let c = 0; c < 3; c++) {
        // Get current pixel value
        const center = data[idx + c];
        
        // Get surrounding pixels (simple 3x3 kernel)
        const top = data[idx - width * 4 + c];
        const bottom = data[idx + width * 4 + c];
        const left = data[idx - 4 + c];
        const right = data[idx + 4 + c];
        
        // Calculate blur value (average of surrounding pixels)
        const blur = (top + bottom + left + right) / 4;
        
        // Calculate sharpening (center - blur)
        const sharpen = center - blur;
        
        // Apply subtle sharpening effect (unsharp mask)
        data[idx + c] = Math.max(0, Math.min(255, center + sharpen * 0.5));
      }
    }
  }
};