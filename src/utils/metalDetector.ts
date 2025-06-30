/**
 * metalDetector.ts - Advanced metal detection using LAB color space and ML-based classification
 */

import { MetalColor } from '@/types';
import { rgbToLab, createLabPalette } from './colorSpaceUtils';

// Reference LAB values for different gold types
const YELLOW_GOLD_LAB_REFS = [
  { l: 83, a: 10, b: 45 },  // Bright yellow gold
  { l: 76, a: 7, b: 40 },   // Standard yellow gold
  { l: 70, a: 6, b: 35 },   // Slightly darker yellow gold
];

const ROSE_GOLD_LAB_REFS = [
  { l: 75, a: 20, b: 25 },  // Bright rose gold
  { l: 68, a: 18, b: 20 },  // Standard rose gold
  { l: 60, a: 16, b: 18 },  // Darker rose gold
];

// Type definitions
interface LabColor { l: number; a: number; b: number }
interface Cluster { center: LabColor; points: Array<{lab: LabColor, index: number}> }
interface DetectionResult {
  detectedColor: MetalColor;
  metalMask: Uint8Array;
  reflectionMap: Uint8Array;
  labValues: LabColor[];
}

/**
 * K-means clustering implementation for LAB color space
 * Segments colors into k clusters based on LAB color similarity
 */
const kMeansLabClustering = (labColors: LabColor[], k: number, maxIterations = 10): Cluster[] => {
  // Initial cluster centers: select k colors spread throughout the data
  const step = Math.floor(labColors.length / k);
  const initialCenters: LabColor[] = [];
  
  for (let i = 0; i < k; i++) {
    initialCenters.push({...labColors[i * step]});
  }
  
  const clusters: Cluster[] = initialCenters.map(center => ({
    center,
    points: []
  }));
  
  // Helper: Calculate Euclidean distance in LAB space
  const labDistance = (color1: LabColor, color2: LabColor): number => {
    return Math.sqrt(
      Math.pow(color1.l - color2.l, 2) +
      Math.pow(color1.a - color2.a, 2) +
      Math.pow(color1.b - color2.b, 2)
    );
  };
  
  // Run k-means for specified iterations
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Reset cluster points
    clusters.forEach(cluster => cluster.points = []);
    
    // Assign each point to nearest cluster
    labColors.forEach((lab, index) => {
      let minDistance = Infinity;
      let nearestClusterIndex = 0;
      
      clusters.forEach((cluster, i) => {
        const distance = labDistance(lab, cluster.center);
        if (distance < minDistance) {
          minDistance = distance;
          nearestClusterIndex = i;
        }
      });
      
      clusters[nearestClusterIndex].points.push({ lab, index });
    });
    
    // Update cluster centers
    clusters.forEach(cluster => {
      if (cluster.points.length === 0) return;
      
      const newCenter = {
        l: 0,
        a: 0,
        b: 0
      };
      
      cluster.points.forEach(point => {
        newCenter.l += point.lab.l;
        newCenter.a += point.lab.a;
        newCenter.b += point.lab.b;
      });
      
      cluster.center = {
        l: newCenter.l / cluster.points.length,
        a: newCenter.a / cluster.points.length,
        b: newCenter.b / cluster.points.length
      };
    });
  }
  
  return clusters;
};

/**
 * Determines if a LAB color is likely to be gold
 * Used for filtering out non-metal colors in the image
 */
const isGoldColorLab = (lab: LabColor): boolean => {
  // Check if color is closer to any yellow gold reference
  const isYellowGold = YELLOW_GOLD_LAB_REFS.some(ref => {
    const distance = Math.sqrt(
      Math.pow(lab.l - ref.l, 2) + 
      Math.pow(lab.a - ref.a, 2) + 
      Math.pow(lab.b - ref.b, 2)
    );
    return distance < 25; // Distance threshold for yellow gold
  });
  
  // Check if color is closer to any rose gold reference
  const isRoseGold = ROSE_GOLD_LAB_REFS.some(ref => {
    const distance = Math.sqrt(
      Math.pow(lab.l - ref.l, 2) + 
      Math.pow(lab.a - ref.a, 2) + 
      Math.pow(lab.b - ref.b, 2)
    );
    return distance < 25; // Distance threshold for rose gold
  });
  
  return isYellowGold || isRoseGold;
};

/**
 * Classify cluster as yellow gold, rose gold, or non-metal based on LAB values
 */
const classifyCluster = (cluster: Cluster): { type: MetalColor | 'non-metal', confidence: number } => {
  const { center } = cluster;
  
  // Calculate distances to reference gold colors
  let minYellowDist = Infinity;
  YELLOW_GOLD_LAB_REFS.forEach(ref => {
    const dist = Math.sqrt(
      Math.pow(center.l - ref.l, 2) + 
      Math.pow(center.a - ref.a, 2) + 
      Math.pow(center.b - ref.b, 2)
    );
    minYellowDist = Math.min(minYellowDist, dist);
  });
  
  let minRoseDist = Infinity;
  ROSE_GOLD_LAB_REFS.forEach(ref => {
    const dist = Math.sqrt(
      Math.pow(center.l - ref.l, 2) + 
      Math.pow(center.a - ref.a, 2) + 
      Math.pow(center.b - ref.b, 2)
    );
    minRoseDist = Math.min(minRoseDist, dist);
  });
  
  // If both distances are large, it's likely not metal
  if (minYellowDist > 30 && minRoseDist > 30) {
    return { type: 'non-metal', confidence: 0.9 };
  }
  
  // Calculate confidence based on distance ratio
  const totalDist = minYellowDist + minRoseDist;
  const confidence = 1 - (Math.min(minYellowDist, minRoseDist) / totalDist);
  
  return {
    type: minYellowDist < minRoseDist ? 'yellow' : 'rose',
    confidence
  };
};

/**
 * Detect reflections/highlights in the image
 * Used to preserve shine during color transformation
 */
const detectReflections = (
  imageData: Uint8ClampedArray, 
  width: number, 
  height: number,
  metalMask: Uint8Array
): Uint8Array => {
  const reflectionMap = new Uint8Array(width * height);
  
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const idx = (i * width + j) * 4;
      const pixelIndex = i * width + j;
      
      // Only process metal pixels
      if (metalMask[pixelIndex] > 0) {
        const r = imageData[idx];
        const g = imageData[idx + 1];
        const b = imageData[idx + 2];
        
        // Convert to grayscale luminance
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Highlight detection
        if (luminance > 200) {
          reflectionMap[pixelIndex] = 255; // Strong highlight
        } else if (luminance > 170) {
          reflectionMap[pixelIndex] = 200; // Medium highlight
        } else if (luminance > 140) {
          reflectionMap[pixelIndex] = 150; // Subtle highlight
        } else {
          reflectionMap[pixelIndex] = 0; // No highlight
        }
      }
    }
  }
  
  return reflectionMap;
};

/**
 * Main function to detect metal type (yellow gold vs rose gold)
 * Uses LAB color space clustering and ML-based classification
 */
export const detectMetalType = async (imageDataUrl: string): Promise<DetectionResult> => {
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
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data, width, height } = imageData;
        
        // Convert RGB to LAB color space
        const labColors: LabColor[] = [];
        const pixelIndices: number[] = [];
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Convert RGB to LAB
          const lab = rgbToLab(r, g, b);
          labColors.push(lab);
          pixelIndices.push(i / 4);
        }
        
        // Apply k-means clustering in LAB space (k=6 for typical jewelry scenes)
        const clusters = kMeansLabClustering(labColors, 6);
        
        // Classify each cluster as yellow gold, rose gold, or non-metal
        const classifiedClusters = clusters.map(cluster => ({
          ...cluster,
          classification: classifyCluster(cluster)
        }));
        
        // Find dominant metal clusters
        const metalClusters = classifiedClusters
          .filter(c => c.classification.type !== 'non-metal' && c.classification.confidence > 0.5)
          .sort((a, b) => b.points.length - a.points.length);
        
        if (metalClusters.length === 0) {
          reject(new Error('No metal detected in the image'));
          return;
        }
        
        // Determine the most likely metal type from the largest metal cluster
        const dominantCluster = metalClusters[0];
        const detectedColor = dominantCluster.classification.type as MetalColor;
        
        // Create metal mask and reflection map
        const metalMask = new Uint8Array(width * height);
        
        // Mark all metal pixels in the mask
        metalClusters.forEach(cluster => {
          cluster.points.forEach(point => {
            metalMask[point.index] = 255;
          });
        });
        
        // Detect reflections within metal areas
        const reflectionMap = detectReflections(data, width, height, metalMask);
        
        resolve({
          detectedColor,
          metalMask,
          reflectionMap,
          labValues: dominantCluster.points.map(p => p.lab)
        });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageDataUrl;
    } catch (error) {
      reject(error);
    }
  });
};