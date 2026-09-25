import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Easing,
} from 'react-native';
import { GraduationCap } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface AppLaunchScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const AppLaunchScreen: React.FC<AppLaunchScreenProps> = ({
  onFinish,
  minDurationMs = 1400,
}) => {
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.35)).current;
  const exitFade = useRef(new Animated.Value(1)).current;

  // Wave dots animation
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  const statusMessages = [
    'Chargement de votre espace...',
    'Synchronisation sécurisée...',
    'Bienvenue sur SnapSchool',
  ];

  useEffect(() => {
    // 1. Entrance animation (gentle spring)
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 45,
        friction: 6.5,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 450,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Continuous breathing halo behind logo
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1.28,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.12,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.35,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    glowLoop.start();

    // 3. Elegant bouncing dots wave loop
    const createDotLoop = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -6,
            duration: 320,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 320,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(400 - delay),
        ])
      );
    };

    const dot1Loop = createDotLoop(dot1Anim, 0);
    const dot2Loop = createDotLoop(dot2Anim, 120);
    const dot3Loop = createDotLoop(dot3Anim, 240);

    dot1Loop.start();
    dot2Loop.start();
    dot3Loop.start();

    // 4. Subtle status text cycle
    const textInterval = setInterval(() => {
      setLoadingTextIndex((prev) => (prev + 1) % statusMessages.length);
    }, 450);

    // 5. Clean exit
    const timer = setTimeout(() => {
      Animated.timing(exitFade, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        clearInterval(textInterval);
        glowLoop.stop();
        dot1Loop.stop();
        dot2Loop.stop();
        dot3Loop.stop();
        if (onFinish) onFinish();
      });
    }, minDurationMs);

    return () => {
      clearTimeout(timer);
      clearInterval(textInterval);
      glowLoop.stop();
      dot1Loop.stop();
      dot2Loop.stop();
      dot3Loop.stop();
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: exitFade }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent />

      {/* Subtle, luxurious ambient background gradients */}
      <View style={styles.topOrb} />
      <View style={styles.bottomOrb} />

      {/* Center Hero Logo + Branding */}
      <View style={styles.centerContent}>
        {/* Breathing Halo behind the logo */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              transform: [{ scale: glowScale }],
              opacity: glowOpacity,
            },
          ]}
        />

        {/* Premium Logo Card */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          <GraduationCap color="#ffffff" size={48} strokeWidth={2.4} />
        </Animated.View>

        {/* Brand Name */}
        <Animated.View style={[styles.brandWrapper, { opacity: contentFade }]}>
          <Text style={styles.brandTitle}>
            Snap<Text style={styles.brandAccent}>School</Text>
          </Text>

          <View style={styles.taglineBadge}>
            <Text style={styles.taglineText}>L'Éducation Connectée</Text>
          </View>
        </Animated.View>
      </View>

      {/* Refined Minimalist Dot Loader + Status Message */}
      <Animated.View style={[styles.footerContent, { opacity: contentFade }]}>
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot1Anim }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot2Anim }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot3Anim }] }]} />
        </View>

        <Text style={styles.statusText}>{statusMessages[loadingTextIndex]}</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  topOrb: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#0055d40a',
  },
  bottomOrb: {
    position: 'absolute',
    bottom: -140,
    left: -120,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: '#0284c708',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 48,
    backgroundColor: '#0055d420',
  },
  logoContainer: {
    width: 104,
    height: 104,
    borderRadius: 32,
    backgroundColor: '#0055d4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: '#ffffff50',
  },
  brandWrapper: {
    alignItems: 'center',
    marginTop: 22,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.9,
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  brandAccent: {
    color: '#0055d4',
  },
  taglineBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  taglineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0055d4',
    letterSpacing: 0.3,
  },
  footerContent: {
    position: 'absolute',
    bottom: 54,
    width: '100%',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    height: 18,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0055d4',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.2,
  },
});
