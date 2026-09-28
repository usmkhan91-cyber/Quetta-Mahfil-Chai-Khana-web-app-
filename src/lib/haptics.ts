export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'double';

export const isHapticsEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  const val = localStorage.getItem('mahfil_haptics_enabled');
  return val === null ? true : val === 'true';
};

export const setHapticsEnabled = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mahfil_haptics_enabled', String(enabled));
  }
};

export const isAudioEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  const val = localStorage.getItem('mahfil_sound_enabled');
  return val === null ? true : val === 'true';
};

export const setAudioEnabled = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mahfil_sound_enabled', String(enabled));
  }
};

export const triggerHaptic = (style: HapticStyle = 'light') => {
  if (!isHapticsEnabled()) return;
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    switch (style) {
      case 'light':
        window.navigator.vibrate(10);
        break;
      case 'medium':
        window.navigator.vibrate(30);
        break;
      case 'heavy':
        window.navigator.vibrate(80);
        break;
      case 'success':
        window.navigator.vibrate([20, 30, 50]);
        break;
      case 'warning':
        window.navigator.vibrate([100, 50, 100]);
        break;
      case 'error':
        window.navigator.vibrate([300, 100, 300]);
        break;
      case 'double':
        window.navigator.vibrate([20, 50, 20]);
        break;
      default:
        window.navigator.vibrate(10);
    }
  }
};

export const playSound = (url: string) => {
  if (!isAudioEnabled()) return;
  try {
    const audio = new Audio(url);
    audio.volume = 0.3;
    audio.play().catch(e => console.warn("Audio play blocked or unavailable", e));
  } catch (err) {
    console.warn("Audio Context error", err);
  }
};
