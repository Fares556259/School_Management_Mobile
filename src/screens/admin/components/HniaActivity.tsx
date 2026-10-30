import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, AccessibilityInfo } from 'react-native';

export default function HniaActivity({ label }: { label: string }) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    let live = true;
    let loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then(reduceMotion => {
      if (!live || reduceMotion) { opacity.setValue(1); return; }
      loop = Animated.loop(Animated.sequence([Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }), Animated.timing(opacity, { toValue: 0.45, duration: 750, useNativeDriver: true })]));
      loop.start();
    });
    return () => { live = false; loop?.stop(); };
  }, [opacity]);
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite" style={s.row}><Animated.View style={[s.dot, { opacity }]} /><Text style={s.text}>{label}</Text></View>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10, flex: 1 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4e83ce' }, text: { color: '#69819c', fontSize: 12, flex: 1, lineHeight: 18 } });
