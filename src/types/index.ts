// Types definition for the application

// Status enum for processing pipeline stages
export type ProcessingStatus = 
  | 'idle' 
  | 'detecting'
  | 'detected'
  | 'processing'
  | 'success'
  | 'error';

// Metal color types supported by the app
export type MetalColor = 'yellow' | 'rose';

// Transformation direction
export type TransformDirection = {
  from: MetalColor;
  to: MetalColor;
};

// Image data interfaces
export interface ProcessedImageResult {
  originalImage: string;
  processedImage: string;
  detectedColor: MetalColor;
  transformedColor: MetalColor;
}