import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  Easing,
} from 'react-native';
import { Mic, AlertCircle, Sparkles, AudioLines } from 'lucide-react-native';

export type VoiceVisualizerState =
  | 'idle'
  | 'listening'
  | 'speaking'
  | 'processing'
  | 'error';

export interface VoiceVisualizerProps {
  /** Current state of the voice session */
  state: VoiceVisualizerState;
  /** Live normalized amplitude between 0.0 (silence) and 1.0 (loudest) */
  amplitude?: number;
  /** Diameter of the visualizer orb area in pixels (default: 200) */
  size?: number;
  /** Custom primary status label (e.g. "Hnia vous écoute...") */
  label?: string;
  /** Custom subtext / timer / hints (e.g. "00:04 • Parlez distinctement") */
  subtext?: string;
  /** Whether to show the bottom dynamic waveform bar strip (default: true) */
  showWaveform?: boolean;
  /** Number of bars in the waveform strip (default: 16) */
  waveformBarsCount?: number;
  /** Whether to show the label and subtext (default: true) */
  showLabel?: boolean;
  /** Optional click handler on the orb */
  onPress?: () => void;
  /** Optional custom container style */
  style?: StyleProp<ViewStyle>;
}

// Generate symmetric bell-curve weights for waveform bars so center bars react the most
function generateBellWeights(count: number): number[] {
  const weights: number[] = [];
  const mid = (count - 1) / 2;
  for (let i = 0; i < count; i++) {
    const dist = Math.abs(i - mid) / mid; // 0 at center, 1 at edges
    // Smooth cosine bell shape
    const weight = 0.35 + 0.65 * Math.cos((dist * Math.PI) / 2);
    weights.push(weight);
  }
  return weights;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  state,
  amplitude = 0,
  size = 200,
  label,
  subtext,
  showWaveform = true,
  waveformBarsCount = 18,
  showLabel = true,
  onPress,
  style,
}) => {
  // Clamped amplitude with noise gate
  const clampedAmp = Math.max(0, Math.min(1, amplitude));

  // Animated values
  const coreScale = useRef(new Animated.Value(1)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.25)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring3Scale = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const idlePulse = useRef(new Animated.Value(1)).current;

  // Waveform bars individual animations
  const barAnims = useRef<Animated.Value[]>(
    Array.from({ length: waveformBarsCount }, () => new Animated.Value(0.15))
  ).current;
  const bellWeights = useRef(generateBellWeights(waveformBarsCount)).current;

  // Continuous subtle idle breathing loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idlePulse, {
          toValue: 1.06,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(idlePulse, {
          toValue: 0.95,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [idlePulse]);

  // Continuous rotation for processing / thinking state
  useEffect(() => {
    if (state === 'processing') {
      const loop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => {
        loop.stop();
        rotateAnim.setValue(0);
      };
    } else {
      rotateAnim.setValue(0);
    }
  }, [state, rotateAnim]);

  // React smoothly to live amplitude changes
  useEffect(() => {
    if (state === 'speaking' || state === 'listening') {
      // Spring physics for natural organic bounce
      const springConfig = {
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      };

      // Multi-layer scale targets based on volume
      const targetCoreScale = 1.0 + clampedAmp * 0.32;
      const targetGlowScale = 1.05 + clampedAmp * 0.65;
      const targetGlowOpacity = 0.25 + clampedAmp * 0.55;
      const targetRing1 = 1.0 + clampedAmp * 0.68;
      const targetRing2 = 1.0 + clampedAmp * 0.46;
      const targetRing3 = 1.0 + clampedAmp * 0.28;

      Animated.parallel([
        Animated.spring(coreScale, { toValue: targetCoreScale, ...springConfig }),
        Animated.spring(glowScale, { toValue: targetGlowScale, ...springConfig }),
        Animated.spring(glowOpacity, { toValue: targetGlowOpacity, ...springConfig }),
        Animated.spring(ring1Scale, { toValue: targetRing1, ...springConfig }),
        Animated.spring(ring2Scale, { toValue: targetRing2, ...springConfig }),
        Animated.spring(ring3Scale, { toValue: targetRing3, ...springConfig }),
      ]).start();

      // Animate waveform bars
      const barAnimations = barAnims.map((anim, idx) => {
        const weight = bellWeights[idx] || 0.5;
        // Jitter factor for realistic audio bar spread
        const phaseJitter = 0.85 + 0.3 * Math.sin(idx * 1.3);
        const targetScale = Math.max(0.12, clampedAmp * weight * phaseJitter * 2.6);
        return Animated.spring(anim, {
          toValue: targetScale,
          friction: 7,
          tension: 110,
          useNativeDriver: true,
        });
      });
      Animated.parallel(barAnimations).start();
    } else if (state === 'idle') {
      // Return gracefully to rest
      Animated.parallel([
        Animated.spring(coreScale, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
        Animated.spring(glowScale, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
        Animated.spring(glowOpacity, { toValue: 0.18, friction: 8, tension: 50, useNativeDriver: true }),
        Animated.spring(ring1Scale, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
        Animated.spring(ring2Scale, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
        Animated.spring(ring3Scale, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
        ...barAnims.map((anim) =>
          Animated.spring(anim, { toValue: 0.12, friction: 8, tension: 50, useNativeDriver: true })
        ),
      ]).start();
    } else if (state === 'processing') {
      Animated.parallel([
        Animated.spring(coreScale, { toValue: 1.08, friction: 7, tension: 60, useNativeDriver: true }),
        Animated.spring(glowScale, { toValue: 1.25, friction: 7, tension: 60, useNativeDriver: true }),
        Animated.spring(glowOpacity, { toValue: 0.5, friction: 7, tension: 60, useNativeDriver: true }),
      ]).start();
    } else if (state === 'error') {
      Animated.parallel([
        Animated.spring(coreScale, { toValue: 0.94, friction: 9, tension: 70, useNativeDriver: true }),
        Animated.spring(glowScale, { toValue: 1.15, friction: 9, tension: 70, useNativeDriver: true }),
        Animated.spring(glowOpacity, { toValue: 0.45, friction: 9, tension: 70, useNativeDriver: true }),
      ]).start();
    }
  }, [
    clampedAmp,
    state,
    coreScale,
    glowScale,
    glowOpacity,
    ring1Scale,
    ring2Scale,
    ring3Scale,
    barAnims,
    bellWeights,
  ]);

  // Color schemes per state
  const colors = getColorScheme(state);

  // Spin rotation interpolation
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Default labels
  const currentLabel =
    label !== undefined
      ? label
      : state === 'speaking'
      ? 'Hnia vous écoute...'
      : state === 'listening'
      ? 'Parlez maintenant...'
      : state === 'processing'
      ? 'Hnia réfléchit...'
      : state === 'error'
      ? 'Erreur microphone'
      : 'Prêt à écouter';

  const currentSubtext =
    subtext !== undefined
      ? subtext
      : state === 'speaking'
      ? 'Voix détectée • Niveau direct'
      : state === 'listening'
      ? 'Microphone actif'
      : state === 'processing'
      ? 'Analyse et compréhension en cours'
      : state === 'error'
      ? 'Vérifiez les permissions ou réessayez'
      : 'Appuyez pour parler';

  return (
    <View style={[styles.container, style]}>
      {/* Visualizer Orb Container */}
      <TouchableOpacity
        activeOpacity={onPress ? 0.85 : 1}
        onPress={onPress}
        disabled={!onPress}
        style={[styles.visualizerArea, { width: size, height: size }]}
      >
        {/* Layer 1: Outermost Ambient Glow Aura */}
        <Animated.View
          style={[
            styles.ambientGlow,
            {
              width: size * 1.15,
              height: size * 1.15,
              borderRadius: (size * 1.15) / 2,
              backgroundColor: colors.glowColor,
              opacity: glowOpacity,
              transform: [{ scale: Animated.multiply(glowScale, idlePulse) }],
            },
          ]}
        />

        {/* Layer 2: Outer Harmonic Wave Ring */}
        <Animated.View
          style={[
            styles.waveRing,
            {
              width: size * 0.95,
              height: size * 0.95,
              borderRadius: (size * 0.95) / 2,
              borderColor: colors.ringColor1,
              transform: [{ scale: ring1Scale }],
            },
          ]}
        />

        {/* Layer 3: Mid Harmonic Wave Ring */}
        <Animated.View
          style={[
            styles.waveRing,
            {
              width: size * 0.78,
              height: size * 0.78,
              borderRadius: (size * 0.78) / 2,
              borderColor: colors.ringColor2,
              transform: [{ scale: ring2Scale }],
            },
          ]}
        />

        {/* Layer 4: Inner Harmonic Wave Ring */}
        <Animated.View
          style={[
            styles.waveRing,
            {
              width: size * 0.62,
              height: size * 0.62,
              borderRadius: (size * 0.62) / 2,
              borderColor: colors.ringColor3,
              transform: [{ scale: ring3Scale }],
            },
          ]}
        />

        {/* Processing Rotating Accent Track */}
        {state === 'processing' && (
          <Animated.View
            style={[
              styles.rotatingTrack,
              {
                width: size * 0.58,
                height: size * 0.58,
                borderRadius: (size * 0.58) / 2,
                borderColor: colors.coreColor,
                transform: [{ rotate: spin }],
              },
            ]}
          />
        )}

        {/* Layer 5: Luminous Core Orb */}
        <Animated.View
          style={[
            styles.coreOrb,
            {
              width: size * 0.44,
              height: size * 0.44,
              borderRadius: (size * 0.44) / 2,
              backgroundColor: colors.coreColor,
              shadowColor: colors.coreShadow,
              transform: [
                {
                  scale: Animated.multiply(coreScale, state === 'idle' ? idlePulse : new Animated.Value(1)),
                },
              ],
            },
          ]}
        >
          {/* Inner Specular Highlight */}
          <View style={styles.coreInnerHighlight} />

          {/* Icon Badge */}
          {state === 'processing' ? (
            <Sparkles size={24} color="#ffffff" strokeWidth={2.4} />
          ) : state === 'error' ? (
            <AlertCircle size={24} color="#ffffff" strokeWidth={2.4} />
          ) : state === 'speaking' ? (
            <AudioLines size={24} color="#ffffff" strokeWidth={2.4} />
          ) : (
            <Mic size={24} color="#ffffff" strokeWidth={2.4} />
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Dynamic Sound Waveform Bar Strip */}
      {showWaveform && (
        <View style={styles.waveformContainer}>
          {barAnims.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.waveformBar,
                {
                  backgroundColor: colors.barColor,
                  transform: [{ scaleY: anim }],
                },
              ]}
            />
          ))}
        </View>
      )}

      {/* Status Label & Subtext */}
      {showLabel && (
        <View style={styles.textContainer}>
          <Text style={[styles.primaryLabel, { color: colors.textColor }]}>
            {currentLabel}
          </Text>
          {Boolean(currentSubtext) && (
            <Text style={styles.subtext}>{currentSubtext}</Text>
          )}
        </View>
      )}
    </View>
  );
};

function getColorScheme(state: VoiceVisualizerState) {
  switch (state) {
    case 'speaking':
      return {
        glowColor: 'rgba(0, 102, 255, 0.32)',
        ringColor1: 'rgba(59, 130, 246, 0.45)',
        ringColor2: 'rgba(96, 165, 250, 0.65)',
        ringColor3: 'rgba(147, 197, 253, 0.85)',
        coreColor: '#0055d4',
        coreShadow: '#0055d4',
        barColor: '#0055d4',
        textColor: '#0f172a',
      };
    case 'listening':
      return {
        glowColor: 'rgba(14, 165, 233, 0.28)',
        ringColor1: 'rgba(56, 189, 248, 0.35)',
        ringColor2: 'rgba(125, 211, 252, 0.55)',
        ringColor3: 'rgba(186, 230, 253, 0.75)',
        coreColor: '#0284c7',
        coreShadow: '#0284c7',
        barColor: '#0284c7',
        textColor: '#0f172a',
      };
    case 'processing':
      return {
        glowColor: 'rgba(147, 51, 234, 0.35)',
        ringColor1: 'rgba(168, 85, 247, 0.4)',
        ringColor2: 'rgba(192, 132, 252, 0.6)',
        ringColor3: 'rgba(216, 180, 254, 0.8)',
        coreColor: '#7c3aed',
        coreShadow: '#7c3aed',
        barColor: '#7c3aed',
        textColor: '#4c1d95',
      };
    case 'error':
      return {
        glowColor: 'rgba(239, 68, 68, 0.3)',
        ringColor1: 'rgba(248, 113, 113, 0.35)',
        ringColor2: 'rgba(252, 165, 165, 0.55)',
        ringColor3: 'rgba(254, 202, 202, 0.75)',
        coreColor: '#dc2626',
        coreShadow: '#dc2626',
        barColor: '#dc2626',
        textColor: '#991b1b',
      };
    case 'idle':
    default:
      return {
        glowColor: 'rgba(100, 116, 139, 0.16)',
        ringColor1: 'rgba(148, 163, 184, 0.25)',
        ringColor2: 'rgba(203, 213, 225, 0.4)',
        ringColor3: 'rgba(226, 232, 240, 0.6)',
        coreColor: '#475569',
        coreShadow: '#475569',
        barColor: '#94a3b8',
        textColor: '#334155',
      };
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  visualizerArea: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
  },
  waveRing: {
    position: 'absolute',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  rotatingTrack: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  coreOrb: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  coreInnerHighlight: {
    position: 'absolute',
    top: 6,
    left: '25%',
    width: '50%',
    height: '25%',
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    marginTop: 18,
    gap: 4,
  },
  waveformBar: {
    width: 3.5,
    height: 30,
    borderRadius: 99,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
  },
  primaryLabel: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default VoiceVisualizer;
