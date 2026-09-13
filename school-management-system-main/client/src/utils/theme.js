
/**
 * Utility to convert HEX color to RGB object
 * @param {string} hex - Hex color code (e.g. #0f766e)
 * @returns {object|null} - {r, g, b} or null
 */
export const hexToRgb = (hex) => {
  if (!hex) return null;

  // Expand shorthand (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    }
    : null;
};

/**
 * Validates a color string, ensuring it's a valid HEX code.
 * @param {string} color - The color string to validate
 * @param {string} fallback - The fallback color to return if invalid
 * @returns {string} - The valid color or the fallback
 */
export const validateColor = (color, fallback) => {
  if (!color || typeof color !== 'string') return fallback;

  // Check for valid HEX (e.g., #FFF, #000000)
  if (/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
    return color;
  }

  // If it's NOT a valid hex, we reject it to avoid "white/transparent" UI issues.
  // This handles the legacy "15 118 110" format by simply rejecting it.
  return fallback;
};
