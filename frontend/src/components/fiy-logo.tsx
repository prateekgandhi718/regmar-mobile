import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

type FiyLogoProps = {
  size?: number;
};

export function FiyLogo({ size = 32 }: FiyLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="fiyGradient" x1="10" y1="8" x2="90" y2="92" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#8BE59E" />
          <Stop offset="0.34" stopColor="#69A7FF" />
          <Stop offset="0.68" stopColor="#F57AA0" />
          <Stop offset="1" stopColor="#FF8A3D" />
        </LinearGradient>
      </Defs>
      <Path
        d="M50 85C32 69.5 11 51.5 11 30.5C11 18.9 20.2 10 31.7 10C40.1 10 47 13.9 50 20.2C53 13.9 59.9 10 68.3 10C79.8 10 89 18.9 89 30.5C89 51.5 68 69.5 50 85Z"
        stroke="url(#fiyGradient)"
        strokeWidth={7}
        strokeLinejoin="round"
      />
      <Path
        d="M58.4 37C57.1 33.7 53.8 31.6 50 31.6C45 31.6 40.8 35 40.8 39.8C40.8 45.3 45.4 47.4 50 48.9C54.6 50.4 59.2 52.2 59.2 57.8C59.2 62.7 54.8 66.1 49.8 66.1C45.6 66.1 42.1 63.8 40.6 60.1M50 28V69.8"
        stroke="#F7E26B"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
