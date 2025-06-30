/**
 * imageEnhancer.ts - Advanced image enhancement system using ESRGAN super-resolution
 */

// Import necessary types
import * as tf from '@tensorflow/tfjs';

// Cache for models to avoid reloading
let esrganModel: tf.LayersModel | null = null;

/**
 * Initialize ESRGAN model for super-resolution
 * Uses a lightweight version suitable for browser environment
 */
const initESRGANModel = async (): Promise<tf.LayersModel> => {
  if (esrganModel) return esrganModel;
  
  try {
    // Load the model from CDN (this is a lightweight version suitable for browsers)
    // In a production environment, you would host this model on your own server
    esrganModel = await tf.loadLayersModel(
      'https://tfhub.dev/captain-pool/esrgan-tf2/1',
      { fromTFHub: true }
    );
    return esrganModel;
  } catch (error) {
    console.error('Failed to load ESRGAN model:', error);
    throw new Error('Failed to initialize image enhancement model');
  }
};

/**
 * Post-process image to remove artifacts commonly found in color-transformed images
 */
const removeArtifacts = (imageData: ImageData): ImageData => {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data);
  
  // Simple 3x3 median filter to remove speckle artifacts
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Process if pixel appears to be an artifact
      if (isArtifact(data, idx, width)) {
        // Apply median filter for each RGB channel
        for (let c = 0; c < 3; c++) { // R, G, B channels
          const values = [];
          
          // Gather 3x3 neighborhood values
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const neighborIdx = ((y + dy) * width + (x + dx)) * 4 + c;
              values.push(data[neighborIdx]);
            }
          }
          
          // Sort values and pick median
          values.sort((a, b) => a - b);
          output[idx + c] = values[4]; // Middle value of 9 elements
        }
      }
    }
  }
  
  return new ImageData(output, width, height);
};

/**
 * Detect if a pixel is likely to be a post-processing artifact
 * Based on color variance with its neighbors
 */
const isArtifact = (data: Uint8ClampedArray, idx: number, width: number): boolean => {
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  
  // Calculate color variance with neighbors
  let variance = 0;
  let neighborCount = 0;
  
  // Check 4-connected neighbors
  const neighbors = [
    idx - width * 4, // above
    idx + width * 4, // below
    idx - 4,         // left
    idx + 4          // right
  ];
  
  for (const neighborIdx of neighbors) {
    if (neighborIdx >= 0 && neighborIdx < data.length) {
      const nr = data[neighborIdx];
      const ng = data[neighborIdx + 1];
      const nb = data[neighborIdx + 2];
      
      // Calculate color distance
      const colorDist = Math.sqrt(
        Math.pow(r - nr, 2) +
        Math.pow(g - ng, 2) +
        Math.pow(b - nb, 2)
      );
      
      variance += colorDist;
      neighborCount++;
    }
  }
  
  // Normalize variance and check if it exceeds threshold
  variance = neighborCount > 0 ? variance / neighborCount : 0;
  return variance > 40; // Threshold for artifact detection
};

/**
 * Apply super-resolution to improve image quality
 * Falls back to standard image enhancement if ESRGAN is unavailable
 */
const applySuperResolution = async (imageData: ImageData): Promise<ImageData> => {
  try {
    // Create a tensor from image data
    const tensor = tf.browser.fromPixels(imageData)
      .expandDims(0) // Add batch dimension
      .toFloat()
      .div(255); // Normalize to 0-1
    
    // Load model if needed
    const model = await initESRGANModel();
    
    // Apply super-resolution
    const result = model.predict(tensor) as tf.Tensor;
    
    // Remove batch dimension and scale back to 0-255
    const processedTensor = result
      .squeeze()
      .mul(255)
      .clipByValue(0, 255)
      .cast('int32');
    
    // Convert back to ImageData
    const [height, width] = processedTensor.shape;
    const buffer = await tf.browser.toPixels(processedTensor);
    
    return new ImageData(buffer, width, height);
  } catch (error) {
    console.warn('Super-resolution failed, falling back to standard enhancement:', error);
    return enhanceImageStandard(imageData);
  }
};

/**
 * Standard image enhancement when ESRGAN is unavailable
 * Uses conventional image processing techniques
 */
const enhanceImageStandard = (imageData: ImageData): ImageData => {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data.length);
  
  // Copy original data
  for (let i = 0; i < data.length; i++) {
    output[i] = data[i];
  }
  
  // Apply subtle sharpening
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      for (let c = 0; c < 3; c++) { // Process RGB channels
        const centerValue = data[idx + c];
        
        // Simple Laplacian filter for sharpening
        const sum =
          -data[((y - 1) * width + x) * 4 + c] + // top
          -data[(y * width + (x - 1)) * 4 + c] + // left
          4 * centerValue +                      // center (weighted)
          -data[(y * width + (x + 1)) * 4 + c] + // right
          -data[((y + 1) * width + x) * 4 + c]; // bottom
        
        // Apply controlled sharpening
        const sharpened = centerValue + (sum * 0.3); // 0.3 is the sharpening strength
        
        // Clamp values between 0-255
        output[idx + c] = Math.max(0, Math.min(255, Math.round(sharpened)));
      }
    }
  }
  
  return new ImageData(output, width, height);
};

/**
 * Enhance the image quality using cutting-edge techniques
 * Applies artifact removal and super-resolution to ensure professional results
 */
export const enhanceImage = async (imageDataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = async () => {
        // Create canvas for image processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Set canvas dimensions to match image
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Apply artifact removal
        imageData = removeArtifacts(imageData);
        
        try {
          // Apply super-resolution if available
          imageData = await applySuperResolution(imageData);
          
          // Create a new canvas with enhanced dimensions
          const enhancedCanvas = document.createElement('canvas');
          enhancedCanvas.width = imageData.width;
          enhancedCanvas.height = imageData.height;
          
          const enhancedCtx = enhancedCanvas.getContext('2d');
          if (!enhancedCtx) {
            throw new Error('Could not get enhanced canvas context');
          }
          
          // Apply the enhanced image data to canvas
          enhancedCtx.putImageData(imageData, 0, 0);
          
          // Convert to data URL
          const enhancedDataUrl = enhancedCanvas.toDataURL('image/png');
          resolve(enhancedDataUrl);
        } catch (error) {
          console.warn('Enhanced processing failed, falling back to basic:', error);
          
          // Put the artifact-free image back
          ctx.putImageData(imageData, 0, 0);
          
          // Return the basic enhanced result
          const basicEnhancedDataUrl = canvas.toDataURL('image/png');
          resolve(basicEnhancedDataUrl);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for enhancement'));
      };
      
      img.src = imageDataUrl;
    } catch (error) {
      reject(error);
    }
  });
};