/**
 * colorSpaceUtils.ts - Utilities for color space conversions
 * Includes RGB to LAB and LAB to RGB transformations for accurate color manipulation
 */

/**
 * Convert RGB to XYZ color space
 * This is an intermediate step for RGB to LAB conversion
 */
export const rgbToXyz = (r: number, g: number, b: number): { x: number, y: number, z: number } => {
  // Normalize RGB values
  let rNorm = r / 255;
  let gNorm = g / 255;
  let bNorm = b / 255;
  
  // Apply gamma correction (sRGB to linear RGB)
  const applyGamma = (value: number): number => {
    return value > 0.04045
      ? Math.pow((value + 0.055) / 1.055, 2.4)
      : value / 12.92;
  };
  
  rNorm = applyGamma(rNorm);
  gNorm = applyGamma(gNorm);
  bNorm = applyGamma(bNorm);
  
  // Scale to D65 illuminant
  rNorm *= 100;
  gNorm *= 100;
  bNorm *= 100;
  
  // Apply transformation matrix
  const x = rNorm * 0.4124 + gNorm * 0.3576 + bNorm * 0.1805;
  const y = rNorm * 0.2126 + gNorm * 0.7152 + bNorm * 0.0722;
  const z = rNorm * 0.0193 + gNorm * 0.1192 + bNorm * 0.9505;
  
  return { x, y, z };
};

/**
 * Convert XYZ to LAB color space
 */
export const xyzToLab = (x: number, y: number, z: number): { l: number, a: number, b: number } => {
  // D65 reference white point
  const xRef = 95.047;
  const yRef = 100.0;
  const zRef = 108.883;
  
  // Normalize by reference white point
  let xNorm = x / xRef;
  let yNorm = y / yRef;
  let zNorm = z / zRef;
  
  // Apply cube root transformation
  const applyTransform = (value: number): number => {
    return value > 0.008856
      ? Math.pow(value, 1/3)
      : (7.787 * value) + (16 / 116);
  };
  
  xNorm = applyTransform(xNorm);
  yNorm = applyTransform(yNorm);
  zNorm = applyTransform(zNorm);
  
  // Calculate LAB components
  const l = (116 * yNorm) - 16;
  const a = 500 * (xNorm - yNorm);
  const b = 200 * (yNorm - zNorm);
  
  return { l, a, b };
};

/**
 * Convert RGB to LAB color space directly
 * LAB is perceptually uniform and better for color transformations
 */
export const rgbToLab = (r: number, g: number, b: number): { l: number, a: number, b: number } => {
  const xyz = rgbToXyz(r, g, b);
  return xyzToLab(xyz.x, xyz.y, xyz.z);
};

/**
 * Convert LAB to XYZ color space
 * This is an intermediate step for LAB to RGB conversion
 */
export const labToXyz = (l: number, a: number, b: number): { x: number, y: number, z: number } => {
  // D65 reference white point
  const xRef = 95.047;
  const yRef = 100.0;
  const zRef = 108.883;
  
  // Calculate intermediate values
  let y = (l + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;
  
  // Apply inverse cube root transformation
  const applyInverseTransform = (value: number): number => {
    const pow3 = Math.pow(value, 3);
    return pow3 > 0.008856
      ? pow3
      : (value - 16 / 116) / 7.787;
  };
  
  x = xRef * applyInverseTransform(x);
  y = yRef * applyInverseTransform(y);
  z = zRef * applyInverseTransform(z);
  
  return { x, y, z };
};

/**
 * Convert XYZ to RGB color space
 */
export const xyzToRgb = (x: number, y: number, z: number): { r: number, g: number, b: number } => {
  // Normalize XYZ values
  x /= 100;
  y /= 100;
  z /= 100;
  
  // Apply transformation matrix
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let b = x * 0.0557 + y * -0.2040 + z * 1.0570;
  
  // Apply gamma correction (linear RGB to sRGB)
  const applyGamma = (value: number): number => {
    return value > 0.0031308
      ? 1.055 * Math.pow(value, 1/2.4) - 0.055
      : 12.92 * value;
  };
  
  r = applyGamma(r);
  g = applyGamma(g);
  b = applyGamma(b);
  
  // Clamp values to 0-1 range
  r = Math.max(0, Math.min(1, r));
  g = Math.max(0, Math.min(1, g));
  b = Math.max(0, Math.min(1, b));
  
  // Scale back to 0-255 and round to integers
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
};

/**
 * Convert LAB to RGB color space directly
 * Used to transform colors back into the RGB space for canvas rendering
 */
export const labToRgb = (l: number, a: number, b: number): { r: number, g: number, b: number } => {
  const xyz = labToXyz(l, a, b);
  return xyzToRgb(xyz.x, xyz.y, xyz.z);
};

/**
 * Creates a reference palette of LAB colors for a given metal type
 * Useful for visualization and debugging
 */
export const createLabPalette = (metalType: 'yellow' | 'rose'): { l: number, a: number, b: number }[] => {
  const palette: { l: number, a: number, b: number }[] = [];
  
  if (metalType === 'yellow') {
    // Yellow gold reference palette
    palette.push({ l: 83, a: 10, b: 45 });  // Bright yellow gold
    palette.push({ l: 76, a: 7, b: 40 });   // Standard yellow gold
    palette.push({ l: 70, a: 6, b: 35 });   // Slightly darker yellow gold
    palette.push({ l: 65, a: 5, b: 33 });   // Shadow areas in yellow gold
    palette.push({ l: 90, a: 8, b: 48 });   // Highlight areas in yellow gold
  } else {
    // Rose gold reference palette
    palette.push({ l: 75, a: 20, b: 25 });  // Bright rose gold
    palette.push({ l: 68, a: 18, b: 20 });  // Standard rose gold
    palette.push({ l: 60, a: 16, b: 18 });  // Darker rose gold
    palette.push({ l: 55, a: 15, b: 17 });  // Shadow areas in rose gold
    palette.push({ l: 82, a: 22, b: 28 });  // Highlight areas in rose gold
  }
  
  return palette;
};