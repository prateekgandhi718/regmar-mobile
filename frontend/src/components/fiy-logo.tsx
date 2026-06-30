import Svg, { Ellipse, Path } from "react-native-svg";

type FiyLogoProps = {
  size?: number;
  color?: string;
};

export function FiyLogo({ size = 32, color = "#0a0a0a" }: FiyLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Ellipse cx="50" cy="52" rx="18" ry="16" stroke={color} strokeWidth="7" />
      <Path d="M50 12V90" stroke={color} strokeWidth="7" strokeLinecap="round" />
    </Svg>
  );
}
