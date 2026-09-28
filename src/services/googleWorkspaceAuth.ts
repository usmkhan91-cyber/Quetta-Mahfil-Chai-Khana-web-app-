// In-Memory Google Workspace OAuth and Token Service
// Compliant with AI Studio Workspace Integration Skill:
// In-Memory token storage only (No localStorage / sessionStorage)

import { auth } from '../lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/chat.spaces',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.spaces.create',
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/chat.messages.readonly',
  'https://www.googleapis.com/auth/chat.messages.create',
  'https://www.googleapis.com/auth/chat.memberships',
  'https://www.googleapis.com/auth/chat.memberships.readonly'
];

let inMemoryAccessToken: string | null = null;
let isSigningIn = false;

// Clear in-memory token on sign-out or session expiration
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      inMemoryAccessToken = null;
    }
  });
}

/**
 * Authoritatively retrieves cached in-memory access token
 */
export async function getAccessToken(): Promise<string | null> {
  return inMemoryAccessToken;
}

/**
 * Checks if client has an active in-memory Google Workspace OAuth token
 */
export function hasWorkspaceToken(): boolean {
  return !!inMemoryAccessToken;
}

/**
 * Sign in with Google Workspace scopes to acquire Bearer OAuth token
 */
export async function signInWithGoogleWorkspace(): Promise<{ user: User; accessToken: string }> {
  if (isSigningIn) {
    throw new Error('Authentication is already in progress');
  }

  isSigningIn = true;
  try {
    const provider = new GoogleAuthProvider();
    for (const scope of WORKSPACE_SCOPES) {
      provider.addScope(scope);
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Failed to acquire OAuth access token from Google identity provider');
    }

    inMemoryAccessToken = credential.accessToken;
    return { user: result.user, accessToken: inMemoryAccessToken };
  } finally {
    isSigningIn = false;
  }
}

/**
 * Disconnects / clears cached workspace token
 */
export function clearWorkspaceToken() {
  inMemoryAccessToken = null;
}
