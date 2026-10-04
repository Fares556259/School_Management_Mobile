import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    const update = (enabled: boolean) => { if (active) setReducedMotion(enabled); };
    AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => update(false));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reducedMotion;
}
