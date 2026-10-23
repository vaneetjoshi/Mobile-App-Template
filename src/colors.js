const luminance = (hex) => {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift) => {
    const c = ((value >> shift) & 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
};

export const isLight = (hex) => luminance(hex) > 0.5;

export const tint = (hex, alpha) => `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;

export const topColor = (solid, gradient) => {
  if (!gradient) return solid;
  const down = -Math.cos((gradient.angle * Math.PI) / 180);
  if (down > 0.3) return gradient.colors[0];
  if (down < -0.3) return gradient.colors[gradient.colors.length - 1];
  return solid;
};
