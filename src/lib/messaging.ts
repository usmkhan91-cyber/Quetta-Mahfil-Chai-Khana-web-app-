import { getToken, onMessage, isSupported } from "firebase/messaging";
import { messaging, auth, db } from "./firebase";
import { doc, updateDoc } from 'firebase/firestore';

export const requestFirebaseNotificationPermission = async () => {
  const supported = await isSupported();
  if (!supported || !messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      
      const isValidVapid = (key: any): key is string => {
        if (!key || typeof key !== 'string') return false;
        const trimmed = key.trim();
        const isCommonLength = trimmed.length >= 40 && trimmed.length <= 100;
        const isUrlSafeBase64 = /^[A-Za-z0-9_-]+=?=?$/.test(trimmed);
        const isPlaceholder = trimmed === 'YOUR_VAPID_KEY' || trimmed.includes('VITE_FIREBASE') || trimmed.startsWith('{') || trimmed.includes(' ');
        
        return isCommonLength && isUrlSafeBase64 && !isPlaceholder;
      };

      if (!isValidVapid(vapidKey)) {
        console.warn('FCM VAPID Key is missing, invalid, or using placeholder. Push notifications disabled.');
        return null;
      }

      const cleanVapidKey = vapidKey.trim();

      let token = null;
      try {
        token = await getToken(messaging, { 
          vapidKey: cleanVapidKey
        });
      } catch (tokenErr: any) {
        if (tokenErr?.message?.includes('applicationServerKey') || tokenErr?.message?.includes('PushManager')) {
          console.warn('FCM Subscription failed: Invalid VAPID key pair or browser restriction.');
        } else {
          throw tokenErr; // Re-throw to be caught by outer catch
        }
      }
      
      if (token) {
        if (auth.currentUser) {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            fcmToken: token,
            notificationsEnabled: true
          });
        }
      }
      return token;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token:', err);
  }
  return null;
};

export const onMessageListener = (callback: (payload: any) => void) => {
  if (!messaging) return;
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};
