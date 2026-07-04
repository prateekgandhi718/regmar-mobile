import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

type SetupHiIllustrationProps = {
  width?: number | string;
  height?: number | string;
};

export function SetupHiIllustration({ width = "100%", height = "100%" }: SetupHiIllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 500 500" fill="none">
      <Defs>
        <LinearGradient id="uGradient" x1="50" y1="120" x2="190" y2="340" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#A9C8FF" />
          <Stop offset="100%" stopColor="#7283FF" />
        </LinearGradient>

        <LinearGradient id="mGradient" x1="280" y1="80" x2="430" y2="280" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#82F2B7" />
          <Stop offset="100%" stopColor="#39D48B" />
        </LinearGradient>
      </Defs>

      <Path d="M70 430H180V395H250" stroke="#F4F4F5" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M300 395V355H420" stroke="#F4F4F5" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />

      <Path
        d="M50 185 Q55 130 70 130 Q72 210 130 210 Q188 210 190 130 Q205 130 210 185 Q220 330 130 330 Q40 330 50 185Z"
        fill="url(#uGradient)"
      />

      <Path d="M85 150 Q90 205 130 205 Q170 205 175 150" fill="none" stroke="#000" strokeWidth={42} strokeLinecap="round" />

      <Path d="M125 332L145 380L132 420" stroke="#F4F4F5" strokeWidth={4} strokeLinecap="round" />
      <Path d="M185 338L205 378L188 398" stroke="#F4F4F5" strokeWidth={4} strokeLinecap="round" />

      <Path
        d="M310 95 Q320 70 345 85 L380 120 L415 85 Q440 70 450 95 L445 255 Q445 285 420 285 Q400 285 385 255 L380 240 L375 255 Q360 285 340 285 Q315 285 315 255 Z"
        fill="url(#mGradient)"
      />

      <Path d="M365 285V395" stroke="#F4F4F5" strokeWidth={4} strokeLinecap="round" />
      <Path d="M395 285V395" stroke="#F4F4F5" strokeWidth={4} strokeLinecap="round" />

      <Path d="M200 260C250 215 285 195 315 180" stroke="#F4F4F5" strokeWidth={4} strokeLinecap="round" />
      <Path d="M315 180C305 188 302 198 305 208" stroke="#F4F4F5" strokeWidth={4} strokeLinecap="round" />
      <Path d="M445 220C455 245 455 270 448 285" stroke="#F4F4F5" strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}
