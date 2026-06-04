import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { markSplashDone } from '../../utils/splashGate';

const { width, height } = Dimensions.get('window');

// ── colours ────────────────────────────────────────────────────────────────
const NAVY  = '#0A1730';
const NAVY2 = '#0C2143';
const LIME  = '#9BE24A';
const BALL  = '#D8323A';

// ── layout constants ────────────────────────────────────────────────────────
const HERO_H = height * 0.70;
const S      = width / 390;
const DX     = 212 * S;
const DY     = 188 * (HERO_H / 618);

// ── feature tiles ──────────────────────────────────────────────────────────
type MCIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const FEATURES: { icon: MCIcon; label: string }[] = [
  { icon: 'calendar-check-outline', label: 'BOOK TURF'  },
  { icon: 'cricket',                label: 'PLAY MATCH' },
  { icon: 'account-group-outline',  label: 'BUILD TEAM' },
  { icon: 'trophy-outline',         label: 'SCORE BIG'  },
];

// ── feather strips (transparent → navy over bottom 120 px of hero) ─────────
const FEATHER = [0.0, 0.08, 0.20, 0.38, 0.58, 0.76, 0.90, 1.0];

// ─────────────────────────────────────────────────────────────────────────────
export default function SplashScreen() {
  // ── animated values ────────────────────────────────────────────────────
  const heroSc    = useRef(new Animated.Value(1.00)).current;
  const flareOp   = useRef(new Animated.Value(0)).current;
  const flarePls  = useRef(new Animated.Value(0.85)).current;
  const ballProg  = useRef(new Animated.Value(0)).current;
  const sparkProg = useRef(new Animated.Value(0)).current;
  const speedProg = useRef(new Animated.Value(0)).current;
  // per-feature opacity for stagger
  const feat0Op   = useRef(new Animated.Value(0)).current;
  const feat1Op   = useRef(new Animated.Value(0)).current;
  const feat2Op   = useRef(new Animated.Value(0)).current;
  const feat3Op   = useRef(new Animated.Value(0)).current;
  const featY     = useRef(new Animated.Value(24)).current;
  const dotsOp    = useRef(new Animated.Value(0)).current;
  const shineX    = useRef(new Animated.Value(-width * 0.7)).current;

  const featOps = [feat0Op, feat1Op, feat2Op, feat3Op];

  // ── derived animated nodes (created once) ──────────────────────────────
  const flareLR  = useRef(Animated.multiply(flareOp, flarePls)).current;
  const flareCOp = useRef(
    flareOp.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] })
  ).current;

  // ball
  const ballTX = useRef(
    ballProg.interpolate({ inputRange: [0, 1], outputRange: [0, DX] })
  ).current;
  const ballTY = useRef(
    ballProg.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, -DY * 0.25, -DY] })
  ).current;
  const ballOp = useRef(
    ballProg.interpolate({
      inputRange: [0, 0.05, 0.36, 0.43],
      outputRange: [0, 1, 1, 0],
      extrapolate: 'clamp',
    })
  ).current;

  // spark
  const spkOp = useRef(
    sparkProg.interpolate({
      inputRange: [0, 0.10, 0.14, 0.24, 1],
      outputRange: [0, 0.95, 0.95, 0, 0],
      extrapolate: 'clamp',
    })
  ).current;
  const spkSc = useRef(
    sparkProg.interpolate({
      inputRange: [0, 0.10, 0.24],
      outputRange: [0.2, 1, 1.6],
      extrapolate: 'clamp',
    })
  ).current;

  // speed lines
  const spdTX = useRef(
    speedProg.interpolate({
      inputRange: [0, 0.10, 0.28, 1],
      outputRange: [-160 * S, -160 * S, 80 * S, 80 * S],
    })
  ).current;
  const spdOp = useRef(
    speedProg.interpolate({
      inputRange: [0, 0.10, 0.15, 0.28, 1],
      outputRange: [0, 0, 0.85, 0, 0],
      extrapolate: 'clamp',
    })
  ).current;

  // ── animation sequences ────────────────────────────────────────────────
  useEffect(() => {
    // subtle Ken Burns: 1.00 → 1.07 → 1.00, 16 s per cycle
    Animated.loop(
      Animated.sequence([
        Animated.timing(heroSc, { toValue: 1.07, duration: 8000, useNativeDriver: true }),
        Animated.timing(heroSc, { toValue: 1.00, duration: 8000, useNativeDriver: true }),
      ])
    ).start();

    // floodlight flares — appear then pulse gently
    Animated.sequence([
      Animated.delay(1500),
      Animated.timing(flareOp, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ]).start(() =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(flarePls, { toValue: 1.12, duration: 2500, useNativeDriver: true }),
          Animated.timing(flarePls, { toValue: 0.85, duration: 2500, useNativeDriver: true }),
        ])
      ).start()
    );

    // cricket ball flick — first fire at 2 500 ms, loops every ~6 s
    let ballTimer: ReturnType<typeof setTimeout>;
    const fireBall = () => {
      ballProg.setValue(0);
      sparkProg.setValue(0);
      speedProg.setValue(0);
      Animated.parallel([
        Animated.timing(ballProg,  { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(100),
          Animated.timing(sparkProg, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
        Animated.timing(speedProg, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]).start(() => { ballTimer = setTimeout(fireBall, 4000); });
    };
    ballTimer = setTimeout(fireBall, 2500);

    // critical path: delay 1400 + features ~760 ms + hold 3800 ms ≈ 6 000 ms
    Animated.sequence([
      Animated.delay(1400),
      Animated.parallel([
        Animated.stagger(120, featOps.map(op =>
          Animated.timing(op, { toValue: 1, duration: 400, useNativeDriver: true })
        )),
        Animated.timing(featY,  { toValue: 0, duration: 700, useNativeDriver: true }),
        Animated.timing(dotsOp, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
      ]),
      Animated.delay(3800),
    ]).start(() => {
      markSplashDone();
      // shine sweep — cosmetic only, post-handoff
      const doShine = () => {
        shineX.setValue(-width * 0.7);
        Animated.timing(shineX, { toValue: width * 0.7, duration: 1200, useNativeDriver: true })
          .start(() => setTimeout(doShine, 4800));
      };
      doShine();
    });

    return () => clearTimeout(ballTimer);
  }, []);

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* ── HERO (70 % of screen) ─────────────────────────────────────── */}
      <View style={s.hero}>

        {/* key-art image with Ken Burns zoom */}
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: heroSc }] }]}>
          <Image
            source={require('../../../assets/cricket-hero.jpg')}
            style={{ width, height: HERO_H }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* floodlight lens flares — small, low-opacity, positioned over stadium lights */}
        <Animated.View style={[s.flL, { opacity: flareLR }]} />
        <Animated.View style={[s.flR, { opacity: flareLR }]} />
        <Animated.View style={[s.flC, { opacity: flareCOp }]} />

        {/* speed lines trailing the flick */}
        <Animated.View style={[s.spdWrap, { opacity: spdOp, transform: [{ translateX: spdTX }] }]}>
          <View style={[s.spdLine, { width: 108 * S, top: 0 }]} />
          <View style={[s.spdLine, { width: 138 * S, top: 14 * S }]} />
          <View style={[s.spdLine, { width: 94  * S, top: 28 * S }]} />
        </Animated.View>

        {/* contact spark at the bat */}
        <Animated.View style={[s.spark, { opacity: spkOp, transform: [{ scale: spkSc }] }]} />

        {/* cricket ball six — originates at bat tip ~71 % x, ~52 % y */}
        <Animated.View style={[s.sixWrap, {
          opacity: ballOp,
          transform: [{ translateX: ballTX }, { translateY: ballTY }],
        }]}>
          <View style={s.sixTrail} />
          <View style={s.sixBall} />
        </Animated.View>

        {/* feather gradient — transparent → navy over bottom 120 px */}
        {FEATHER.map((alpha, i) => (
          <View
            key={i}
            style={[s.featherStrip, {
              bottom: (FEATHER.length - 1 - i) * 15,
              backgroundColor: `rgba(10,23,48,${alpha})`,
            }]}
          />
        ))}

        {/* shine sweep across hero */}
        <Animated.View
          pointerEvents="none"
          style={[s.shine, { transform: [{ translateX: shineX }] }]}
        />
      </View>

      {/* ── FEATURE PANEL (remaining 30 %) ───────────────────────────── */}
      <View style={s.panel}>
        <Animated.View style={[s.feats, { transform: [{ translateY: featY }] }]}>
          {FEATURES.map((f, i) => (
            <Animated.View
              key={i}
              style={[s.feat, i < FEATURES.length - 1 && s.featSep, { opacity: featOps[i] }]}
            >
              <View style={s.iconGlow}>
                <MaterialCommunityIcons name={f.icon} size={30 * S} color={LIME} />
              </View>
              <Text style={s.featLabel}>{f.label}</Text>
            </Animated.View>
          ))}
        </Animated.View>

        <Animated.View style={[s.dots, { opacity: dotsOp }]}>
          <View style={[s.dot, s.dotActive]} />
          <View style={s.dot} />
          <View style={s.dot} />
        </Animated.View>
      </View>
    </View>
  );
}

// ── styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  hero: { height: HERO_H, overflow: 'hidden', backgroundColor: NAVY },

  // ── flares — small & subtle (blend-mode "screen" approximated via low opacity) ──
  flL: {
    position: 'absolute',
    left: width * 0.04, top: HERO_H * 0.55,
    width: 38 * S, height: 38 * S, borderRadius: 19 * S,
    backgroundColor: 'rgba(255,255,230,0.38)',
  },
  flR: {
    position: 'absolute',
    right: width * 0.03, top: HERO_H * 0.55,
    width: 42 * S, height: 42 * S, borderRadius: 21 * S,
    backgroundColor: 'rgba(255,255,230,0.38)',
  },
  flC: {
    position: 'absolute',
    left: width / 2 - 26 * S, top: HERO_H * 0.58,
    width: 52 * S, height: 52 * S, borderRadius: 26 * S,
    backgroundColor: 'rgba(255,255,230,0.18)',
  },

  // ── speed lines ──────────────────────────────────────────────────────────
  spdWrap: {
    position: 'absolute',
    left: width * 0.60, top: HERO_H * 0.49,
    width: 150 * S, height: 46 * S,
    transform: [{ rotate: '-20deg' }],
  },
  spdLine: {
    position: 'absolute', left: 0,
    height: 5 * S, borderRadius: 4 * S,
    backgroundColor: '#b6f25a',
  },

  // ── spark ────────────────────────────────────────────────────────────────
  spark: {
    position: 'absolute',
    left: width * 0.71 - 26 * S, top: HERO_H * 0.52 - 26 * S,
    width: 52 * S, height: 52 * S, borderRadius: 26 * S,
    backgroundColor: LIME,
  },

  // ── ball ─────────────────────────────────────────────────────────────────
  sixWrap:  { position: 'absolute', left: width * 0.71, top: HERO_H * 0.52 },
  sixBall:  { width: 20 * S, height: 20 * S, borderRadius: 10 * S, backgroundColor: BALL },
  sixTrail: {
    position: 'absolute', right: 11 * S, top: 7 * S,
    width: 80 * S, height: 6 * S, borderRadius: 3 * S,
    backgroundColor: 'rgba(255,120,120,0.70)',
  },

  // ── feather gradient strips (bottom ~120 px) ─────────────────────────────
  featherStrip: {
    position: 'absolute', left: 0, right: 0,
    height: 16,
  },

  // ── shine sweep ──────────────────────────────────────────────────────────
  shine: {
    position: 'absolute',
    top: HERO_H * 0.24,
    left: 0,
    width: width * 1.6,
    height: HERO_H * 0.13,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ rotate: '5deg' }],
  },

  // ── panel ────────────────────────────────────────────────────────────────
  panel: { flex: 1, backgroundColor: NAVY2, paddingTop: 28 },

  feats:   { flexDirection: 'row', paddingHorizontal: 8 },
  feat:    { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 4 },
  featSep: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(155,226,74,0.25)',
  },

  // ── icon glow ────────────────────────────────────────────────────────────
  iconGlow: {
    shadowColor: LIME,
    shadowOpacity: 0.75,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },

  featLabel: {
    fontSize: 11 * S,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#EAF2FF',
    textAlign: 'center',
  },

  // ── page dots ────────────────────────────────────────────────────────────
  dots:      { flexDirection: 'row', justifyContent: 'center', gap: 9, marginTop: 20 },
  dot:       { width: 9 * S, height: 9 * S, borderRadius: 5 * S, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { backgroundColor: LIME },
});
