import { useCallback, useEffect, useState } from 'react';
import { 
  triggerHaptic, 
  isHapticsEnabled, 
  setHapticsEnabled, 
  HapticStyle 
} from '../lib/haptics';

export interface UseHapticsReturn {
  trigger: (style?: HapticStyle) => void;
  cartFeedback: () => void;
  orderFinalizedFeedback: () => void;
  selectionFeedback: () => void;
  errorFeedback: () => void;
  isSupported: boolean;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

/**
 * Hook to trigger native haptic vibrations on supported mobile devices
 * when users interact with cart items, finalize orders, or navigate surfaces.
 */
export function useHaptics(): UseHapticsReturn {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isEnabled, setIsEnabledState] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in window.navigator) {
      setIsSupported(true);
    }
    setIsEnabledState(isHapticsEnabled());
  }, []);

  const trigger = useCallback((style: HapticStyle = 'light') => {
    triggerHaptic(style);
  }, []);

  const cartFeedback = useCallback(() => {
    triggerHaptic('medium');
  }, []);

  const orderFinalizedFeedback = useCallback(() => {
    triggerHaptic('success');
  }, []);

  const selectionFeedback = useCallback(() => {
    triggerHaptic('light');
  }, []);

  const errorFeedback = useCallback(() => {
    triggerHaptic('error');
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setHapticsEnabled(enabled);
    setIsEnabledState(enabled);
  }, []);

  return {
    trigger,
    cartFeedback,
    orderFinalizedFeedback,
    selectionFeedback,
    errorFeedback,
    isSupported,
    isEnabled,
    setEnabled
  };
}

export default useHaptics;
