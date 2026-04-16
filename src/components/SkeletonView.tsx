import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle, DimensionValue } from 'react-native';

interface SkeletonBlockProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  marginBottom?: number;
  marginRight?: number;
  style?: ViewStyle;
}

/**
 * A high-performance skeleton loading block with a pulsing animation.
 * Used to improve UX by showing a placeholder during data fetching.
 */
export const SkeletonBlock = ({
  width = '100%',
  height = 20,
  borderRadius = 12,
  marginBottom = 0,
  marginRight = 0,
  style,
}: SkeletonBlockProps) => {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#e2e9ec',
          marginBottom,
          marginRight,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};
