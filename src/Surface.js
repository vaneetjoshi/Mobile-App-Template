import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const points = (angle) => {
  const radians = (angle * Math.PI) / 180;
  const x = Math.sin(radians);
  const y = -Math.cos(radians);
  return { start: { x: 0.5 - x / 2, y: 0.5 - y / 2 }, end: { x: 0.5 + x / 2, y: 0.5 + y / 2 } };
};

export default function Surface({ color, gradient, style, children }) {
  if (!gradient) return <View style={[{ backgroundColor: color }, style]}>{children}</View>;

  return (
    <LinearGradient colors={gradient.colors} locations={gradient.locations} {...points(gradient.angle)} style={style}>
      {children}
    </LinearGradient>
  );
}
