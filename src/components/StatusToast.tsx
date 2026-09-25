import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { CheckCircle2, Bell, BellOff, AlertCircle, X } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastConfig {
  visible: boolean;
  type?: ToastType;
  title: string;
  message?: string;
}

interface StatusToastProps {
  visible: boolean;
  type?: ToastType;
  title: string;
  message?: string;
  onDismiss: () => void;
  duration?: number;
}

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle2,
    color: '#10b981',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  info: {
    icon: Bell,
    color: '#0055d4',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  warning: {
    icon: BellOff,
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  error: {
    icon: AlertCircle,
    color: '#ef4444',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
  },
};

export const StatusToast = ({
  visible,
  type = 'info',
  title,
  message,
  onDismiss,
  duration = 3500,
}: StatusToastProps) => {
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, type, duration, onDismiss]);

  if (!visible) return null;

  const current = TYPE_CONFIG[type];
  const IconComponent = current.icon;

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(18).stiffness(140)}
      exiting={FadeOutUp.duration(200)}
      style={[
        styles.container,
        {
          top: Math.max(insets.top + 10, 20),
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onDismiss}
        style={[
          styles.toastCard,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            borderColor: current.borderColor,
          },
        ]}
      >
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: current.bgColor,
              marginRight: isRTL ? 0 : 12,
              marginLeft: isRTL ? 12 : 0,
            },
          ]}
        >
          <IconComponent size={22} color={current.color} strokeWidth={2.2} />
        </View>

        <View
          style={[
            styles.textContainer,
            { alignItems: isRTL ? 'flex-end' : 'flex-start' },
          ]}
        >
          <Text
            style={[
              styles.title,
              { textAlign: isRTL ? 'right' : 'left' },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {!!message && (
            <Text
              style={[
                styles.message,
                { textAlign: isRTL ? 'right' : 'left' },
              ]}
              numberOfLines={2}
            >
              {message}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.closeBtn}
        >
          <X size={16} color="#94a3b8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginLeft: 6,
  },
});
