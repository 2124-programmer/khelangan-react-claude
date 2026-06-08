import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Polygon, Circle, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

/**
 * Score-Adda "Ball Orbit" loader.
 * The SA logo stays fixed in the centre while a cricket ball orbits around it.
 *
 * Install (if not already present):
 *   npx expo install react-native-svg react-native-reanimated
 * Reanimated also needs its babel plugin (must be the LAST entry) in babel.config.js:
 *   plugins: ['react-native-reanimated/plugin']
 *
 * Usage:
 *   <BallOrbitLoader />
 *   <BallOrbitLoader size={160} speed={1100} />
 *   // On a light background, pass a dark logo colour:
 *   <BallOrbitLoader logoColor="#0A1730" />
 */

const GREEN = '#8CC63F';
const RED = '#E5392E';

type Props = {
  /** Overall diameter in px (default 120). */
  size?: number;
  /** Milliseconds per full orbit (lower = faster, default 1400). */
  speed?: number;
  /** Colour of the S + speed streaks. Use white on dark, navy on light. */
  logoColor?: string;
  /** Colour of the A. */
  accentColor?: string;
  /** Colour of the orbiting ball. */
  ballColor?: string;
};

/** Static SA mark (no ball). Background-independent: the A's counter is a true cut-out. */
function Logo({
  size,
  logoColor,
  accentColor,
}: {
  size: number;
  logoColor: string;
  accentColor: string;
}) {
  const w = size;
  const h = size * (100 / 160);
  return (
    <Svg width={w} height={h} viewBox="0 0 160 100">
      {/* speed streaks */}
      <Rect x={2} y={46} width={30} height={5} rx={2.5} fill={logoColor} />
      <Rect x={0} y={57} width={40} height={5} rx={2.5} fill={logoColor} />
      <Polygon points="40,54 53,59.5 40,65" fill={logoColor} />
      <Rect x={6} y={68} width={24} height={5} rx={2.5} fill={logoColor} />
      {/* S */}
      <SvgText
        x={56}
        y={86}
        fontSize={80}
        fontWeight="bold"
        textAnchor="middle"
        fill={logoColor}
      >
        S
      </SvgText>
      {/* A — outer triangle with an inner triangular hole (evenodd) so it works on any bg */}
      <Path
        d="M120,16 L156,90 L86,90 Z M120,50 L106,90 L134,90 Z"
        fill={accentColor}
        fillRule="evenodd"
      />
    </Svg>
  );
}

/** Cricket ball with a seam. */
function Ball({ size, ballColor }: { size: number; ballColor: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Circle cx={14} cy={14} r={13} fill={ballColor} />
      <Path d="M3 9 q11 7 22 0" fill="none" stroke="#fff" strokeWidth={1.4} />
      <Path d="M3 19 q11 -7 22 0" fill="none" stroke="#fff" strokeWidth={1.4} />
    </Svg>
  );
}

export default function BallOrbitLoader({
  size = 120,
  speed = 1400,
  logoColor = '#ffffff',
  accentColor = GREEN,
  ballColor = RED,
}: Props) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: speed, easing: Easing.linear }),
      -1,
      false,
    );
    // reset on speed change
    return () => {
      rotation.value = 0;
    };
  }, [speed, rotation]);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const ballSize = Math.round(size * 0.2);
  const logoSize = Math.round(size * 0.74);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <Logo size={logoSize} logoColor={logoColor} accentColor={accentColor} />

      {/* Rotating layer fills the box; its centre is the orbit pivot.
          The ball sits at the top edge, so rotating the layer orbits it. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, orbitStyle]}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: size / 2 - ballSize / 2,
          }}
        >
          <Ball size={ballSize} ballColor={ballColor} />
        </View>
      </Animated.View>
    </View>
  );
}
