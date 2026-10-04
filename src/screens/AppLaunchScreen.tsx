import React, { useEffect, useRef } from 'react';
import { View, Animated, StatusBar, StyleSheet, Easing } from 'react-native';
import { GraduationCap } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface AppLaunchScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
  isReady?: boolean;
  onExit?: () => void;
}

export const AppLaunchScreen = ({ onFinish, minDurationMs = 1100, isReady = false, onExit }: AppLaunchScreenProps) => {
  const { language } = useLanguage();
  const reducedMotion = useReducedMotion();
  const logo = useRef(new Animated.Value(0)).current;
  const snap = useRef(new Animated.Value(0)).current;
  const school = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(1)).current;
  const finishRef = useRef(onFinish);
  const exitRef = useRef(onExit);
  const finished = useRef(false);
  const exited = useRef(false);
  useEffect(() => { finishRef.current = onFinish; exitRef.current = onExit; }, [onFinish, onExit]);

  useEffect(() => {
    if (reducedMotion === null) return;
    const values = [logo, snap, school];
    const complete = () => {
      if (!finished.current) { finished.current = true; finishRef.current?.(); }
    };
    if (reducedMotion) {
      values.forEach(value => value.setValue(1));
      complete();
      return;
    }
    const animation = Animated.parallel([
      Animated.timing(logo, { toValue: 1, duration: 520, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(snap, { toValue: 1, duration: 350, delay: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(school, { toValue: 1, duration: 350, delay: 470, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    animation.start();
    const timer = setTimeout(complete, Math.max(850, minDurationMs));
    return () => { clearTimeout(timer); animation.stop(); };
  }, [logo, snap, school, reducedMotion, minDurationMs]);

  useEffect(() => {
    if (!isReady || reducedMotion === null) return;
    const animation = Animated.timing(exit, { toValue: 0, duration: reducedMotion ? 0 : 220, easing: Easing.out(Easing.ease), useNativeDriver: true });
    animation.start(({ finished: done }) => {
      if (done && !exited.current) { exited.current = true; exitRef.current?.(); }
    });
    return () => animation.stop();
  }, [isReady, reducedMotion, exit]);

  const reveal = (value: Animated.Value) => ({ opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }] });
  const tagline = { ar: 'مدرستك، وكلّنا متواصلون.', fr: 'Votre école. Tous connectés.', en: 'Your school. All connected.' }[language];
  return (
    <Animated.View style={[styles.container, { opacity: exit }]} accessibilityLabel="SnapSchool">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FBFF" />
      <View style={styles.orb} />
      <View style={styles.markArea}>
        <View style={styles.logo}>
          <Animated.View style={{ opacity: logo, transform: [{ translateY: logo.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }}>
          <GraduationCap size={46} color="#FFFFFF" strokeWidth={2.2} />
          </Animated.View>
        </View>
      </View>
      <View style={styles.wordmark}>
        <Animated.Text style={[styles.brand, reveal(snap)]}>Snap</Animated.Text>
        <Animated.Text style={[styles.brand, { color: '#0055D4' }, reveal(school)]}>School</Animated.Text>
      </View>
      <Animated.Text style={[styles.tagline, { opacity: school }]}>{tagline}</Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orb: { position: 'absolute', width: 440, height: 440, borderRadius: 220, backgroundColor: '#EFF7FB', right: -160, top: -200 },
  markArea: { width: 220, height: 150, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 88, height: 88, borderRadius: 27, backgroundColor: '#0055D4', alignItems: 'center', justifyContent: 'center', shadowColor: '#0055D4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 6 },
  wordmark: { flexDirection: 'row', marginTop: 8 },
  brand: { fontSize: 36, fontWeight: '800', letterSpacing: -1.2, color: '#263238' },
  tagline: { fontSize: 14, lineHeight: 22, color: '#64748B', marginTop: 16, paddingHorizontal: 24, textAlign: 'center' },
});
