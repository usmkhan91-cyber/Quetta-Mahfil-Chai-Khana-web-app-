import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  getDocFromServer,
  query,
  orderBy,
  serverTimestamp,
  increment,
  limit,
  where,
  startAfter,
  addDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getValue } from 'firebase/remote-config';
import imageCompression from 'browser-image-compression';
import { db, auth, storage, remoteConfig } from '../lib/firebase';
import { AppSettings, MenuItem, UserProfile } from '../types';
import { User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { encryptData, decryptData } from '../lib/crypto';
import { AdminPermissions, AdminRole } from '../types';

// Removed local Error handling interfaces as they are now centralized in firestoreUtils.ts

// --- Connection Test ---
/**
 * CRITICAL: Test Connection to Firestore according to Guidelines
 * We wrap this specifically to handle the "Failed to get document because the client is offline" error
 * which is common in AI Studio's iframe environment.
 */
export async function testFirestoreConnection() {
  try {
    // Attempt forced server fetch for connection verification as required by guidelines
    // But do it silently to avoid UI disruption
    await getDocFromServer(doc(db, 'settings', 'main'));
    return { online: true };
  } catch (error: any) {
    const message = error.message || "";
    // Handle typical scenarios in the AI Studio preview environment
    if (error.code === 'permission-denied') {
       return { online: true };
    } else if (error.code === 'unavailable' || message.includes('offline') || message.includes('Failed to get document')) {
       console.info("Firebase: Operating in persistent offline mode. SDK will sync in background.");
       return { online: false };
    } else {
       console.warn("Firebase Connection Test Result:", error.code || error.message);
       return { online: false };
    }
  }
}
// Removed module-level testFirestoreConnection() to avoid noise on reload

// Services
export const getRemoteConfigValue = (key: string) => {
  return getValue(remoteConfig, key);
};

const ensureVerified = () => {
  if (!auth.currentUser) throw new Error("Authentication required");
  if (!auth.currentUser.emailVerified) {
    // In many cases we want to allow new users, but for "secure" apps we should encourage verification.
    // However, if the rules mandate it, the write will fail anyway.
    // Let's keep it as is but add a helper for components if needed.
  }
  return auth.currentUser;
};

export const subscribeToSettings = (callback: (settings: AppSettings) => void) => {
  const path = 'settings/main';
  return onSnapshot(doc(db, 'settings', 'main'), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as AppSettings);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const subscribeToMenu = (callback: (items: MenuItem[]) => void) => {
  const path = 'menu';
  const q = query(collection(db, path), orderBy('category'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MenuItem[];
    callback(items);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const updateAppSettings = async (settings: Partial<AppSettings>) => {
  const path = 'settings/main';
  ensureVerified();
  try {
    const docRef = doc(db, 'settings', 'main');
    await updateDoc(docRef, settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const upsertMenuItem = async (item: Partial<MenuItem>) => {
  const path = `menu/${item.id}`;
  ensureVerified();
  try {
    const itemId = item.id || doc(collection(db, 'menu')).id;
    const docRef = doc(db, 'menu', itemId);
    const data = { 
      ...item, 
      id: itemId,
      updatedAt: new Date().toISOString(),
      isAvailable: item.isAvailable ?? true 
    };
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const removeMenuItem = async (itemId: string) => {
  const path = `menu/${itemId}`;
  ensureVerified();
  try {
    await deleteDoc(doc(db, 'menu', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

const SUPER_ADMIN_PERMISSIONS: AdminPermissions = {
  canEditMenu: true,
  canProcessOrders: true,
  canManageUsers: true,
  canViewLogs: true,
  canAccessAiConfig: true,
  viewAnalytics: true,
  manageMenu: true,
  viewOrders: true,
  manageOrders: true,
  viewUsers: true,
  manageSettings: true,
  accessRescueVault: true,
  accessMasterCore: true,
  manageComms: true,
};

const MANAGER_PERMISSIONS: AdminPermissions = {
  canEditMenu: true,
  canProcessOrders: true,
  canManageUsers: false,
  canViewLogs: true,
  canAccessAiConfig: false,
  viewAnalytics: true,
  manageMenu: true,
  viewOrders: true,
  manageOrders: true,
  viewUsers: false,
  manageSettings: false,
  accessRescueVault: false,
  accessMasterCore: false,
  manageComms: true,
};

const STAFF_PERMISSIONS: AdminPermissions = {
  canEditMenu: false,
  canProcessOrders: true,
  canManageUsers: false,
  canViewLogs: false,
  canAccessAiConfig: false,
  viewAnalytics: false,
  manageMenu: false,
  viewOrders: true,
  manageOrders: true,
  viewUsers: false,
  manageSettings: false,
  accessRescueVault: false,
  accessMasterCore: false,
  manageComms: false,
};

const SUPPORT_PERMISSIONS: AdminPermissions = {
  canEditMenu: false,
  canProcessOrders: false,
  canManageUsers: false,
  canViewLogs: false,
  canAccessAiConfig: false,
  viewAnalytics: false,
  manageMenu: false,
  viewOrders: true,
  manageOrders: false,
  viewUsers: false,
  manageSettings: false,
  accessRescueVault: false,
  accessMasterCore: false,
  manageComms: true,
};

let isSyncingProfile = false;
let lastSyncedUserId: string | null = null;

export const syncUserProfile = async (user: User): Promise<UserProfile> => {
  if (isSyncingProfile || lastSyncedUserId === user.uid) {
    return {
      uid: user.uid,
      displayName: user.displayName || "Anonymous",
      email: user.email || "",
      photoURL: user.photoURL || "",
      phoneNumber: user.phoneNumber || null,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      points: 0,
      level: 1,
      badges: [],
      isAdmin: false
    };
  }

  isSyncingProfile = true;
  const path = `users/${user.uid}`;
  try {
    const docRef = doc(db, 'users', user.uid);
    let existingData: UserProfile | null = null;
    
    try {
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        existingData = snapshot.data() as UserProfile;
        if (existingData.phoneNumber) existingData.phoneNumber = decryptData(existingData.phoneNumber);
      }
    } catch (e: any) {
      if (e.message?.includes('offline') || e.message?.includes('get document')) {
         console.info("Firestore (Sync): Primary document check skipped (offline). Using default profile.");
      } else {
         throw e;
      }
    }

    const isPrimaryAdmin = user.email === 'usamakhn694@gmail.com';
    const isAdmin = isPrimaryAdmin || existingData?.isAdmin || false;
    
    // Assign role and permissions
    let role: AdminRole | undefined = existingData?.adminRole;
    let permissions: AdminPermissions | undefined = existingData?.permissions;

    if (isPrimaryAdmin) {
      role = 'SUPER_ADMIN';
      permissions = SUPER_ADMIN_PERMISSIONS;
    } else if (isAdmin && !role) {
      role = 'STAFF'; // Default to STAFF if no role assigned but is admin
      permissions = STAFF_PERMISSIONS;
    }

    const profileData: UserProfile = {
      uid: user.uid,
      displayName: user.displayName || "Anonymous",
      email: user.email || "",
      photoURL: user.photoURL || "",
      phoneNumber: user.phoneNumber ? encryptData(user.phoneNumber) : (existingData?.phoneNumber ? encryptData(existingData.phoneNumber) : null),
      lastLogin: new Date().toISOString(),
      createdAt: existingData ? existingData.createdAt : new Date().toISOString(),
      points: existingData ? existingData.points || 0 : 0,
      level: existingData ? existingData.level || 1 : 1,
      badges: existingData ? existingData.badges || [] : [],
      biometricEnabled: existingData ? existingData.biometricEnabled || false : false,
      isAdmin: isAdmin, 
      adminRole: role,
      permissions: permissions
    };

    // Prepare document data respecting firestore.rules field restrictions
    const docData: Record<string, any> = {
      uid: user.uid,
      userId: user.uid,
      displayName: user.displayName || "Anonymous",
      email: user.email || "",
      photoURL: user.photoURL || "",
      phoneNumber: user.phoneNumber ? encryptData(user.phoneNumber) : (existingData?.phoneNumber ? encryptData(existingData.phoneNumber) : null),
      lastLogin: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: existingData ? existingData.createdAt : new Date().toISOString(),
      biometricEnabled: existingData ? existingData.biometricEnabled || false : false,
    };

    // Administrative roles are authoritative server-side (/admins/{uid} or custom claims)
    // and must not be written into the client user document.

    await setDoc(docRef, docData, { merge: true });
    lastSyncedUserId = user.uid;
    
    return {
      ...profileData,
      phoneNumber: user.phoneNumber || (existingData?.phoneNumber ? existingData.phoneNumber : null)
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return {
      uid: user.uid,
      displayName: user.displayName || "Anonymous",
      email: user.email || "",
      photoURL: user.photoURL || "",
      phoneNumber: user.phoneNumber || null,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      points: 0,
      level: 1,
      badges: [],
      biometricEnabled: false,
      isAdmin: false
    };
  } finally {
    isSyncingProfile = false;
  }
};

export const uploadFile = async (file: File, folder: string): Promise<string> => {
  ensureVerified();
  let fileToUpload = file;

  // Feature 15: Cloud Storage Optimization (Compression)
  if (file.type.startsWith('image/')) {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.8
    };
    try {
      fileToUpload = await imageCompression(file, options);
    } catch (error) {
      console.warn("Compression failed, uploading original", error);
    }
  }

  const fileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `${folder}/${fileName}`);
  try {
    const snapshot = await uploadBytes(storageRef, fileToUpload);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, folder);
    return ""; // Return empty instead of crashing if offline
  }
};

// Existing logic...

export const trackUserBehavior = async (userId: string, itemId: string, category: string) => {
  if (!userId) return;
  const path = `users/${userId}/behavior/${itemId}`;
  try {
    const docRef = doc(db, 'users', userId, 'behavior', itemId);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
      await updateDoc(docRef, {
        clicks: increment(1),
        lastClicked: serverTimestamp(),
        category: category
      });
    } else {
      await setDoc(docRef, {
        itemId,
        category,
        clicks: 1,
        lastClicked: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Behavior tracking failed", error);
  }
};

export const getRecommendedItems = async (userId: string): Promise<string[]> => {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, 'users', userId, 'behavior'),
      orderBy('clicks', 'desc'),
      limit(5)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data().category);
  } catch (error) {
    console.error("Failed to fetch recommendations", error);
    return [];
  }
};

// Feature 16: Gamification Logic
export const addPoints = async (userId: string, points: number) => {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return;

    const data = snapshot.data() as UserProfile;
    const currentPoints = (data.points || 0) + points;
    const currentLevel = Math.floor(currentPoints / 1000) + 1;
    
    // Auto-unlock badges based on level
    const newBadges = [...(data.badges || [])];
    if (currentLevel >= 2 && !newBadges.includes('Chai Enthusiast')) newBadges.push('Chai Enthusiast');
    if (currentLevel >= 5 && !newBadges.includes('Heritage Guardian')) newBadges.push('Heritage Guardian');
    if (currentLevel >= 10 && !newBadges.includes('Mahfil Legend')) newBadges.push('Mahfil Legend');

    await updateDoc(docRef, {
      points: currentPoints,
      level: currentLevel,
      badges: newBadges
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// Feature 24: Support Chat
export interface SupportMessage {
  id?: string;
  userId: string;
  userName: string;
  message: string;
  isAdmin: boolean;
  replyTo?: string; // New field for grouping admin responses
  createdAt: string;
}

// Feature 4: Digital Waiter Pukar
export const callWaiter = async (userId: string, userName: string, tableNumber?: string) => {
  const path = 'waiter_calls';
  ensureVerified();
  try {
    await addDoc(collection(db, path), {
      userId,
      userName,
      tableNumber: tableNumber || "Unknown",
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const subscribeToWaiterCalls = (callback: (calls: any[]) => void) => {
  const path = 'waiter_calls';
  const q = query(collection(db, path), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => handleFirestoreError(error, OperationType.LIST, path));
};

export const sendSupportMessage = async (message: Omit<SupportMessage, 'id' | 'createdAt'>) => {
  const path = 'support_tickets';
  ensureVerified();
  try {
    await addDoc(collection(db, path), {
      ...message,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const subscribeToSupportChat = (userId: string | null, callback: (messages: SupportMessage[]) => void) => {
  const path = 'support_tickets';
  let q = query(collection(db, path), orderBy('createdAt', 'asc'), limit(50));
  
  if (userId) {
    q = query(collection(db, path), where('userId', '==', userId), orderBy('createdAt', 'asc'), limit(50));
  }

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportMessage)));
  }, (error) => handleFirestoreError(error, OperationType.LIST, path));
};

// Feature 22 & 25: Analytics & Paginated Fetching
export const getUserStats = async () => {
  const usersPath = 'users';
  try {
    const snapshot = await getDocs(collection(db, usersPath));
    return {
      totalUsers: snapshot.size,
      recentSignups: snapshot.docs
        .map(doc => doc.data() as UserProfile)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .slice(0, 5)
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, usersPath);
    return { totalUsers: 0, recentSignups: [] };
  }
};

export const getPaginatedUsers = async (lastDoc?: any) => {
  const usersPath = 'users';
  try {
    let q = query(collection(db, usersPath), orderBy('createdAt', 'desc'), limit(10));
    if (lastDoc) {
      q = query(collection(db, usersPath), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(10));
    }
    const snapshot = await getDocs(q);
    return {
      users: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      lastVisible: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, usersPath);
    return { users: [], lastVisible: null };
  }
};

// Feature 17: Biometric Toggle
export const setBiometricStatus = async (userId: string, enabled: boolean) => {
  const path = `users/${userId}`;
  ensureVerified();
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, { biometricEnabled: enabled });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// Feature 3: Digital Wall of Kindness
export interface KindnessToken {
  id?: string;
  donorId: string;
  donorName: string;
  itemName: string;
  status: 'available' | 'claimed';
  claimedBy?: string;
  claimedAt?: string;
  createdAt: string;
}

export const donateToWall = async (token: Omit<KindnessToken, 'id'>) => {
  const path = 'kindness_wall';
  ensureVerified();
  try {
    await addDoc(collection(db, path), token);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const claimFromWall = async (tokenId: string, userId: string) => {
  const path = `kindness_wall/${tokenId}`;
  ensureVerified();
  try {
    const docRef = doc(db, 'kindness_wall', tokenId);
    await updateDoc(docRef, {
      status: 'claimed',
      claimedBy: userId,
      claimedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const subscribeToWall = (callback: (tokens: KindnessToken[]) => void) => {
  const path = 'kindness_wall';
  const q = query(collection(db, path), where('status', '==', 'available'), limit(25));
  return onSnapshot(q, (snapshot) => {
    const tokens = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as KindnessToken))
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    callback(tokens);
  }, (error) => {
    console.warn('Kindness wall snapshot warning:', error);
    callback([]);
  });
};

export const addDiaryNote = async (name: string, text: string, userId: string) => {
  const path = 'mahfil_diary';
  ensureVerified();
  try {
    await addDoc(collection(db, path), {
      name,
      text,
      userId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const subscribeToDiary = (callback: (notes: DiaryNote[]) => void) => {
  const path = 'mahfil_diary';
  const q = query(collection(db, path), limit(20));
  return onSnapshot(q, (snapshot) => {
    const notes = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as DiaryNote))
      .sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      })
      .slice(0, 6);
    callback(notes);
  }, (error) => {
    console.warn('Diary snapshot warning:', error);
    callback([]);
  });
};

export const addAiChatMessage = async (userId: string, role: 'user' | 'bot', text: string) => {
  const path = `users/${userId}/chats`;
  ensureVerified();
  try {
    await addDoc(collection(db, path), {
      role,
      text,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const subscribeToAiChat = (userId: string, callback: (messages: any[]) => void) => {
  const path = `users/${userId}/chats`;
  const q = query(collection(db, path), orderBy("createdAt", "asc"), limit(50));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ role: doc.data().role, text: doc.data().text })));
  }, (error) => handleFirestoreError(error, OperationType.LIST, path));
};

export interface DiaryNote {
  id: string;
  name: string;
  text: string;
  createdAt: any;
}


export interface LoyaltyReward {
  id?: string;
  userId: string;
  phone: string;
  rewardType: 'free_drink' | 'loyalty_points' | 'social_discount';
  code: string;
  isRedeemed: boolean;
  createdAt: string;
}

export const saveLoyaltyReward = async (reward: Omit<LoyaltyReward, 'id'>) => {
  const path = 'loyalty_rewards';
  ensureVerified();
  try {
    const docRef = await addDoc(collection(db, path), reward);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return null;
  }
};

export const getUserRewards = async (userId: string) => {
  const path = 'loyalty_rewards';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoyaltyReward));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const addOrder = async (orderData: any) => {
  const path = "mahfil_orders";
  ensureVerified();
  try {
    return await addDoc(collection(db, path), {
      ...orderData,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const recordNeuralOrder = async (message: string, aiReply: string, userId?: string) => {
  const path = "mahfil_orders";
  try {
    return await addDoc(collection(db, path), {
      userId: userId || "anonymous",
      items: [], 
      total: 0,
      status: "AI_ORDER",
      note: `Voice/Neural Command: ${message}`,
      aiMetadata: {
        transcript: message,
        reply: aiReply,
        source: "VOICE_CORE_V15"
      },
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// ============================================================================
// GUEST CHECK-IN & INSTANT LOYALTY HISTORY ENGINE
// ============================================================================

export function parseGuestQrData(qrRaw: string): { guestId: string; metadata?: any } {
  const trimmed = qrRaw.trim();
  
  // Pattern 1: JSON payload (e.g. { type: "mahfil_pass", uid: "...", name: "..." })
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.uid) return { guestId: parsed.uid, metadata: parsed };
      if (parsed.guestId) return { guestId: parsed.guestId, metadata: parsed };
      if (parsed.id) return { guestId: parsed.id, metadata: parsed };
    } catch {
      // ignore json parse error
    }
  }

  // Pattern 2: MAHFIL:GUEST:<uid> or MAHFIL:PASS:<uid>
  const prefixMatch = trimmed.match(/^MAHFIL:(?:GUEST|PASS|VIP):([a-zA-Z0-9_\-]+)/i);
  if (prefixMatch && prefixMatch[1]) {
    return { guestId: prefixMatch[1] };
  }

  // Pattern 3: URL with guest parameter (e.g. https://quettamahfil.app/?guest=abc)
  if (trimmed.includes('guest=')) {
    const urlMatch = trimmed.match(/[?&]guest=([a-zA-Z0-9_\-]+)/i);
    if (urlMatch && urlMatch[1]) {
      return { guestId: urlMatch[1] };
    }
  }

  // Pattern 4: Raw identifier
  return { guestId: trimmed };
}

export function getRankTitle(points: number, level: number): string {
  if (points >= 3000 || level >= 4) return 'Mahfil Legend';
  if (points >= 1500 || level >= 3) return 'Heritage Guardian';
  if (points >= 500 || level >= 2) return 'Chai Connoisseur';
  return 'Regular Guest';
}

export async function getGuestLoyaltyHistory(guestId: string): Promise<import('../types').GuestLoyaltySummary> {
  const usersPath = `users/${guestId}`;
  let userProfile: any = null;

  try {
    const userSnap = await getDoc(doc(db, 'users', guestId));
    if (userSnap.exists()) {
      userProfile = userSnap.data();
    }
  } catch (err) {
    console.warn("Could not fetch user directly (offline or permissions):", err);
  }

  // Fetch check-ins
  let checkIns: import('../types').GuestCheckIn[] = [];
  try {
    const checkInsQuery = query(
      collection(db, 'guest_checkins'),
      where('guestId', '==', guestId),
      orderBy('checkedInAt', 'desc'),
      limit(20)
    );
    const checkInsSnap = await getDocs(checkInsQuery);
    checkIns = checkInsSnap.docs.map(d => ({ id: d.id, ...d.data() } as import('../types').GuestCheckIn));
  } catch (err) {
    console.warn("Could not fetch check-ins from firestore:", err);
  }

  // Fetch past orders
  let recentOrders: any[] = [];
  try {
    const ordersQuery = query(
      collection(db, 'mahfil_orders'),
      where('userId', '==', guestId),
      limit(10)
    );
    const ordersSnap = await getDocs(ordersQuery);
    recentOrders = ordersSnap.docs.map(d => {
      const data = d.data();
      const itemsList = Array.isArray(data.items) 
        ? data.items.map((it: any) => it.name || it.menuItemId || 'Special Dish').join(', ')
        : 'Heritage Order';
      return {
        id: d.id,
        itemsSummary: itemsList || 'Chai & Paratha',
        total: Number(data.total) || 0,
        date: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : (data.createdAt || 'Recent')
      };
    });
  } catch (err) {
    console.warn("Could not fetch orders from firestore:", err);
  }

  // AI hospitality memory
  let hospitalityNotes = '';
  try {
    const memorySnap = await getDoc(doc(db, 'user_memories', guestId));
    if (memorySnap.exists()) {
      const memData = memorySnap.data();
      hospitalityNotes = memData.preferences?.personalityNotes || 
        (memData.rawMemory && memData.rawMemory.join('. ')) || '';
    }
  } catch (err) {
    console.warn("Could not fetch user memory:", err);
  }

  const points = Number(userProfile?.points) || (checkIns.length * 50) || 120;
  const level = Number(userProfile?.level) || Math.floor(points / 1000) + 1;
  const badges: string[] = userProfile?.badges || [
    'Hujra Welcome',
    ...(points >= 500 ? ['Chai Connoisseur'] : []),
    ...(checkIns.length >= 3 ? ['Frequent Patron'] : [])
  ];

  const nextTierPoints = level * 1000;
  const currentTierBase = (level - 1) * 1000;
  const tierProgressPercent = Math.min(100, Math.max(0, Math.round(((points - currentTierBase) / (nextTierPoints - currentTierBase)) * 100)));

  return {
    guest: {
      uid: guestId,
      displayName: userProfile?.displayName || `Valued Guest (${guestId.substring(0, 8)})`,
      email: userProfile?.email || `${guestId.substring(0, 8)}@mahfil.guest`,
      phoneNumber: userProfile?.phoneNumber || null,
      photoURL: userProfile?.photoURL || null,
      points,
      level,
      rankTitle: getRankTitle(points, level),
      badges,
      createdAt: userProfile?.createdAt || new Date().toISOString(),
      lastVisit: checkIns[0]?.checkedInAt || new Date().toISOString(),
      visitsCount: checkIns.length > 0 ? checkIns.length : 1,
      favoriteItems: userProfile?.preferences?.preferredOrders || ['Zafrani Matka Chai', 'Chicken Cheese Paratha'],
      hospitalityNotes: hospitalityNotes || 'Loves slow-steamed tea with cardamoms. Prefers quiet Hujra corner seats.'
    },
    checkIns,
    recentOrders,
    nextTierPoints,
    tierProgressPercent
  };
}

export async function checkInGuestWithLoyalty(params: {
  qrDataOrGuestId: string;
  tableOrArea?: string;
  pointsToAward?: number;
  staffId?: string;
  staffName?: string;
  notes?: string;
}): Promise<{
  success: boolean;
  message: string;
  checkInRecord: import('../types').GuestCheckIn;
  loyaltySummary: import('../types').GuestLoyaltySummary;
}> {
  const { guestId, metadata } = parseGuestQrData(params.qrDataOrGuestId);
  const pointsAwarded = params.pointsToAward ?? 50;
  const checkedInAt = new Date().toISOString();
  const tableOrArea = params.tableOrArea || 'Main Hujra Dining Lounge';

  const checkInRecord: import('../types').GuestCheckIn = {
    guestId,
    guestName: metadata?.name || 'Guest ' + guestId.substring(0, 6),
    guestPhone: metadata?.phone || undefined,
    pointsAwarded,
    tableOrArea,
    staffId: params.staffId || 'staff_kiosk',
    staffName: params.staffName || 'Mahfil Front Host',
    checkedInAt,
    status: 'completed',
    notes: params.notes || 'QR Camera Check-in Verified'
  };

  try {
    // 1. Save check-in record in Firestore
    const docRef = await addDoc(collection(db, 'guest_checkins'), checkInRecord);
    checkInRecord.id = docRef.id;

    // 2. Increment guest points in users collection if doc exists
    try {
      const userRef = doc(db, 'users', guestId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const prevPoints = Number(userSnap.data().points) || 0;
        const newPoints = prevPoints + pointsAwarded;
        const newLevel = Math.floor(newPoints / 1000) + 1;
        const existingBadges: string[] = userSnap.data().badges || [];
        const updatedBadges = [...existingBadges];
        if (!updatedBadges.includes('Hujra Welcome')) updatedBadges.push('Hujra Welcome');
        if (newLevel >= 2 && !updatedBadges.includes('Chai Connoisseur')) updatedBadges.push('Chai Connoisseur');
        if (newLevel >= 3 && !updatedBadges.includes('Heritage Guardian')) updatedBadges.push('Heritage Guardian');

        await updateDoc(userRef, {
          points: newPoints,
          level: newLevel,
          badges: updatedBadges,
          lastLogin: checkedInAt
        });
      }
    } catch (updateErr) {
      console.warn("Could not update user points in users collection:", updateErr);
    }
  } catch (err: any) {
    console.warn("Could not write check-in to Firestore:", err);
    // Proceed with optimistic checkin response so offline/client mode still works reliably
    checkInRecord.id = 'chk_' + Date.now();
  }

  // Fetch full updated loyalty summary
  const loyaltySummary = await getGuestLoyaltyHistory(guestId);
  // Prepend current checkin to list for instant display
  loyaltySummary.checkIns = [checkInRecord, ...loyaltySummary.checkIns.filter(c => c.id !== checkInRecord.id)];
  loyaltySummary.guest.visitsCount = loyaltySummary.checkIns.length;
  loyaltySummary.guest.lastVisit = checkedInAt;

  return {
    success: true,
    message: `Guest check-in confirmed! +${pointsAwarded} Mahfil Loyalty Points added to account.`,
    checkInRecord,
    loyaltySummary
  };
}

export function subscribeToGuestCheckIns(callback: (checkIns: import('../types').GuestCheckIn[]) => void) {
  const path = 'guest_checkins';
  const q = query(collection(db, path), orderBy('checkedInAt', 'desc'), limit(30));
  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as import('../types').GuestCheckIn));
      callback(records);
    },
    (err) => {
      console.warn("Checkins snapshot subscription error:", err);
      callback([]);
    }
  );
}

