import { auth } from "./firebase";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  const errorCode = (error as any)?.code;
  const isOffline = 
    errorCode === 'unavailable' ||
    message.includes('offline') || 
    message.includes('unavailable') ||
    message.includes('Failed to get document') ||
    message.includes('Could not reach Cloud Firestore') ||
    message.includes('healthy Internet connection');

  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  const errorJson = JSON.stringify(errInfo);

  if (isOffline) {
    // Silent recovery for offline/reconnecting state - Firestore SDK handles eventual consistency
    console.info('Firestore (Offline/Reconnecting): Action queued for background sync.', { operationType, path, code: errorCode });
    return; 
  }

  console.error('Firestore Secure Error: ', errorJson);
  throw new Error(errorJson);
}
