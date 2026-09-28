import { remoteConfig } from "./firebase";
import { fetchAndActivate, getString, getBoolean, getNumber, activate } from "firebase/remote-config";

export const initRemoteConfig = async () => {
  if (typeof window === 'undefined') return;
  try {
    // Initial activation
    if (remoteConfig && typeof remoteConfig.app !== 'undefined') {
      await activate(remoteConfig);
      // Removed dev logs for production cleanliness
      
      // Background fetch
      fetchAndActivate(remoteConfig).catch(err => {
        // Quietly handle specific common errors
        const msg = err?.message?.toLowerCase() || '';
        if (msg.includes('fetch') || msg.includes('installation') || msg.includes('api key') || msg.includes('not a function')) {
          // Suppressed
        } else {
          console.error("Remote Config Error:", err);
        }
      });
    }
  } catch (err) {
    console.error("Remote Config Failed", err);
  }
};

export const getRemoteValue = (key: string, type: 'string' | 'boolean' | 'number' = 'string') => {
  if (type === 'boolean') return getBoolean(remoteConfig, key);
  if (type === 'number') return getNumber(remoteConfig, key);
  return getString(remoteConfig, key);
};
