// Mask utilities for integrating imask.js with Budibase components
import IMask from "imask";

// Preset mask patterns for common use cases
export const MASK_PRESETS = {
  none: null,
  phoneUS: "+0 (000) 000-0000",
  phoneIntl: "+0 (000) 000-0000",
  ssn: "000-00-0000",
  creditCard: "0000 0000 0000 0000",
  dateUS: "00/00/0000",
  zipCode: "00000",
  time12h: "00:00 AM",
  time24h: "00:00",
};

// Convert legacy mask format (999) 999-9999 to imask format
export function convertLegacyMask(legacyMask) {
  if (!legacyMask) return legacyMask;

  // Handle custom prefixes like [(555) 999-9999]
  if (legacyMask.startsWith("[")) {
    const endBracket = legacyMask.indexOf("]");
    if (endBracket !== -1) {
      const displayPrefix = legacyMask.substring(1, endBracket);
      const maskPart = legacyMask.substring(endBracket + 1);
      return `[${displayPrefix}]${convertPlaceholders(maskPart)}`;
    }
  }

  return convertPlaceholders(legacyMask);
}

// Convert placeholders: 9->0, A->A, *->*
function convertPlaceholders(mask) {
  if (!mask) return mask;
  return mask.replace(/9/g, "0");
}

// Create imask instance for a given mask pattern
export function createMaskInstance(maskPattern, options = {}) {
  if (!maskPattern) return null;

  const maskOptions =
    typeof maskPattern === "string"
      ? { mask: maskPattern, ...options }
      : { ...maskPattern, ...options };

  return IMask.createMask(maskOptions);
}

// Apply mask to raw value and get formatted result
export function applyMask(rawValue, maskPattern) {
  if (!maskPattern || !rawValue) return rawValue || "";

  const mask = createMaskInstance(maskPattern);
  mask.resolve(rawValue);
  return mask.value;
}

// Extract raw value from masked input
export function extractRawValue(maskedValue, maskPattern) {
  if (!maskPattern || !maskedValue) return maskedValue || "";

  const mask = createMaskInstance(maskPattern);
  mask.value = maskedValue;
  return mask.unmaskedValue;
}

// Check if mask is complete (no unfilled placeholders)
export function isMaskComplete(value, maskPattern) {
  if (!maskPattern || !value) return false;

  const mask = createMaskInstance(maskPattern);
  mask.value = value;
  return (
    mask.masked.length === mask.unmaskedValue.length &&
    mask.masked.indexOf(mask.blocks[0]?.placeholder || "*") === -1
  );
}

// Get the position of the next placeholder in the mask
export function getNextPlaceholderPosition(currentPos, maskPattern) {
  if (!maskPattern) return -1;

  const mask = createMaskInstance(maskPattern);
  // Find the next unfilled position
  for (let i = currentPos + 1; i < mask.lazy.length; i++) {
    if (mask.lazy[i] && mask.lazy[i] !== mask.blocks[0]?.placeholder) {
      // This is a better approximation - we need to track actual mask positions
      return i;
    }
  }
  return -1;
}

// Convert preset selection to actual mask pattern
export function getMaskFromPreset(preset) {
  return MASK_PRESETS[preset] || null;
}
