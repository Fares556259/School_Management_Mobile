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
import { GraduationCap, Sparkles } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface AppLaunchScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const AppLaunchScreen: React.FC<AppLaunchScreenProps> = ({
  onFinish,
  minDurationMs = 1300,
}) => {
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.4)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const exitFade = useRef(new Animated.Value(1)).current;

  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  const statusMessages = [
    'Initialisation de SnapSchool...',
    'Synchronisation sécurisée...',
    'Préparation de votre espace...',
  ];

  useEffect(() => {
    // 1. Entrance animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: minDurationMs - 150,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: false,
      }),
    ]).start();

    // 2. Continuous breathing glow loop
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1.25,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.15,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.45,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    glowLoop.start();

    // 3. Cycle micro-status captions
    const textInterval = setInterval(() => {
      setLoadingTextIndex((prev) => (prev + 1) % statusMessages.length);
    }, 450);

    // 4. Graceful exit
    const timer = setTimeout(() => {
      Animated.timing(exitFade, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        clearInterval(textInterval);
        glowLoop.stop();
        if (onFinish) onFinish();
      });
    }, minDurationMs);

    return () => {
      clearTimeout(timer);
      clearInterval(textInterval);
      glowLoop.stop();
    };
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['10%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: exitFade }]}>
      <StatusBar barStyle="light-content" backgroundColor="#060e1a" translucent />

      {/* Decorative ambient background glows */}
      <View style={styles.topOrb} />
      <View style={styles.bottomOrb} />

      {/* Center Hero Logo + Branding */}
      <View style={styles.centerContent}>
        {/* Pulsing Aura */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              transform: [{ scale: glowScale }],
              opacity: glowOpacity,
            },
          ]}
        />

        {/* Main Logo Card */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          <GraduationCap color="#ffffff" size={44} strokeWidth={2.4} />
        </Animated.View>

        {/* Brand Name */}
        <Animated.View style={[styles.brandWrapper, { opacity: contentFade }]}>
          <Text style={styles.brandTitle}>
            Snap<Text style={styles.brandAccent}>School</Text>
          </Text>

          <View style={styles.taglineBadge}>
            <Sparkles size={12} color="#60a5fa" />
            <Text style={styles.taglineText}>L'Éducation Connectée</Text>
          </View>
        </Animated.View>
      </View>

      {/* Modern Sleek Loading Bar + Status Message */}
      <Animated.View style={[styles.footerContent, { opacity: contentFade }]}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>

        <Text style={styles.statusText}>{statusMessages[loadingTextIndex]}</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060e1a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  topOrb: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#0055d420',
  },
  bottomOrb: {
    position: 'absolute',
    bottom: -120,
    left: -100,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#0284c715',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 44,
    backgroundColor: '#0055d4',
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: '#0055d4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: '#ffffff30',
  },
  brandWrapper: {
    alignItems: 'center',
    marginTop: 22,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.8,
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  brandAccent: {
    color: '#38bdf8',
  },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f2445',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#1e3a8a60',
  },
  taglineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#93c5fd',
    letterSpacing: 0.3,
  },
  footerContent: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  progressTrack: {
    width: Math.min(width * 0.55, 220),
    height: 4,
    borderRadius: 4,
    backgroundColor: '#1e293b',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.2,
  },
});
