/**
 * GPU Detection Utility
 * Detects if the user's device can handle GPU-accelerated effects
 * Falls back to simpler rendering for low-end devices
 */

interface GPUCapabilities {
  hasGPU: boolean;
  isLowEnd: boolean;
  prefersReducedMotion: boolean;
  shouldUseSimpleEffects: boolean;
}

let cachedCapabilities: GPUCapabilities | null = null;

/**
 * Detect GPU capabilities and user preferences
 */
export function detectGPUCapabilities(): GPUCapabilities {
  // Return cached result if available
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  // Check for reduced motion preference
  const prefersReducedMotion = 
    typeof window !== 'undefined' && 
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Check for low-end device indicators
  const isLowEnd = detectLowEndDevice();

  // Try to detect GPU availability
  const hasGPU = detectGPUAvailability();

  // Determine if we should use simple effects
  const shouldUseSimpleEffects = prefersReducedMotion || isLowEnd || !hasGPU;

  cachedCapabilities = {
    hasGPU,
    isLowEnd,
    prefersReducedMotion,
    shouldUseSimpleEffects,
  };

  // Log for debugging (remove in production)
  if (import.meta.env.DEV) {
    console.log('[GPU Detection]', cachedCapabilities);
  }

  return cachedCapabilities;
}

/**
 * Detect if device is low-end based on various signals
 */
function detectLowEndDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Check device memory (if available)
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory && deviceMemory < 4) {
    return true;
  }

  // Check hardware concurrency (CPU cores)
  const hardwareConcurrency = navigator.hardwareConcurrency;
  if (hardwareConcurrency && hardwareConcurrency < 4) {
    return true;
  }

  // Check connection type for mobile data constraints
  const connection = (navigator as any).connection;
  if (connection) {
    const effectiveType = connection.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return true;
    }
    // Save data mode
    if (connection.saveData) {
      return true;
    }
  }

  return false;
}

/**
 * Detect if GPU is available and functional
 */
function detectGPUAvailability(): boolean {
  if (typeof window === 'undefined') {
    return true; // SSR - assume GPU is available
  }

  try {
    // Try WebGL detection
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return false;
    }

    // Check for software renderer (indicates no hardware GPU)
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const rendererLower = renderer?.toLowerCase() || '';
      
      // Software renderers indicate no GPU
      if (
        rendererLower.includes('swiftshader') ||
        rendererLower.includes('llvmpipe') ||
        rendererLower.includes('software') ||
        rendererLower.includes('microsoft basic render')
      ) {
        return false;
      }
    }

    return true;
  } catch {
    // If detection fails, assume GPU is available
    return true;
  }
}

/**
 * React hook for GPU capabilities
 */
export function useGPUCapabilities(): GPUCapabilities {
  return detectGPUCapabilities();
}

/**
 * Get CSS class names based on GPU capabilities
 */
export function getEffectClasses(options: {
  gpuClass: string;
  fallbackClass: string;
}): string {
  const { shouldUseSimpleEffects } = detectGPUCapabilities();
  return shouldUseSimpleEffects ? options.fallbackClass : options.gpuClass;
}
