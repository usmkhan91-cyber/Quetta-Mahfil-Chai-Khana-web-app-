import CryptoJS from 'crypto-js';

// Retrieve configured key or generate a session-bound entropy token (never bundle hardcoded production secrets)
const getSessionEntropy = (): string => {
  if (typeof window === 'undefined') return 'server-context-safe';
  let sessionKey = window.sessionStorage.getItem('mahfil_client_entropy');
  if (!sessionKey) {
    const array = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
      sessionKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    } else {
      sessionKey = 'mahfil-entropy-' + Date.now();
    }
    window.sessionStorage.setItem('mahfil_client_entropy', sessionKey);
  }
  return sessionKey;
};

const SECRET_KEY = import.meta.env.VITE_E2EE_KEY || getSessionEntropy();

/**
 * Encrypts sensitive data locally before sending to Firestore
 */
export const encryptData = (data: string): string => {
  if (!data) return data;
  try {
    return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
  } catch (err) {
    console.error("Client encryption non-fatal failure", err);
    return data;
  }
};

/**
 * Decrypts sensitive data locally after fetching from Firestore
 */
export const decryptData = (ciphertext: string): string => {
  if (!ciphertext) return ciphertext;
  // If not encrypted format, return as is
  if (!ciphertext.startsWith('U2FsdGVkX1')) {
    return ciphertext;
  }
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText || ciphertext;
  } catch (err) {
    console.error("Client decryption non-fatal failure", err);
    return ciphertext;
  }
};
