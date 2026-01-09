import { useEffect } from 'react';
import useSchoolSettings from '../hooks/useSchoolSettings';

const ThemeController = () => {
  const { settings, loading } = useSchoolSettings();

  useEffect(() => {
    if (!loading && settings) {
      const root = document.documentElement;

      console.log('Applying theme colors:', settings);

      const hexToRgb = (hex) => {
        // Handle if already in RGB format (legacy data)
        if (/^[\d\s,]+$/.test(hex)) {
          // Convert comma-separated to space-separated
          return hex.replace(/,/g, '').replace(/\s+/g, ' ').trim();
        }

        // Convert HEX to RGB
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
          : null;
      };

      const applyColor = (varName, value) => {
        if (!value) return;
        const rgbChannels = hexToRgb(value);
        if (rgbChannels) {
          root.style.setProperty(varName, rgbChannels);
        }
      };

      // Apply colors to CSS variables
      applyColor('--color-primary', settings.primaryColor);
      applyColor('--color-secondary', settings.secondaryColor);
      applyColor('--color-accent', settings.accentColor);
    }
  }, [settings?.primaryColor, settings?.secondaryColor, settings?.accentColor, loading]);

  return null;
};

export default ThemeController;
