import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

/** Use the screen's back action for Android's system button and back gesture. */
export function useHardwareBack(onBack: () => void) {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);
}
