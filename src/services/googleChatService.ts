// Google Chat v1 REST Client Service
// Client-side authentication using in-memory bearer access token
// Adheres to Google Workspace Integration Skill guidelines

import { getAccessToken } from './googleWorkspaceAuth';

export interface GoogleChatSpace {
  name: string; // e.g. "spaces/AAAAAAAAAAA"
  displayName: string;
  type?: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE';
  spaceType?: string;
  singleUserBotDm?: boolean;
  spaceThreadingState?: string;
  spaceDetails?: {
    description?: string;
    guidelines?: string;
  };
}

export interface GoogleChatMessage {
  name: string; // e.g. "spaces/AAAAAAAAAAA/messages/BBBBBBBBBBB"
  text: string;
  createTime: string;
  sender?: {
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    type?: 'HUMAN' | 'BOT';
  };
}

export interface OperationalDispatchOptions {
  category: 'ORDER_DISPATCH' | 'SHIFT_REPORT' | 'KITCHEN_ALERT' | 'VIP_RESERVATION' | 'GENERAL_ANNOUNCEMENT';
  title: string;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
  details?: Record<string, string | number | undefined>;
  notes?: string;
}

/**
 * Lists all active Google Chat spaces the authenticated user is a member of.
 */
export async function listGoogleChatSpaces(pageSize: number = 30): Promise<GoogleChatSpace[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace authentication required. Please connect your Google account.');
  }

  const res = await fetch(`https://chat.googleapis.com/v1/spaces?pageSize=${pageSize}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch Google Chat spaces: ${res.status}`);
  }

  const data = await res.json();
  return (data.spaces || []).map((s: any) => ({
    name: s.name,
    displayName: s.displayName || (s.type === 'DIRECT_MESSAGE' ? 'Direct Message' : 'Unnamed Space'),
    type: s.type || s.spaceType || 'SPACE',
    spaceType: s.spaceType,
    singleUserBotDm: s.singleUserBotDm,
    spaceThreadingState: s.spaceThreadingState,
    spaceDetails: s.spaceDetails
  }));
}

/**
 * Retrieves details for a specific Google Chat space.
 */
export async function getGoogleChatSpace(spaceName: string): Promise<GoogleChatSpace> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace authentication required. Please connect your Google account.');
  }

  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to retrieve space: ${res.status}`);
  }

  return await res.json();
}

/**
 * Creates a new Google Chat space for restaurant operations.
 * NOTE: User confirmation dialog MUST be presented in UI prior to executing this.
 */
export async function createGoogleChatSpace(
  displayName: string,
  description?: string
): Promise<GoogleChatSpace> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace authentication required. Please connect your Google account.');
  }

  const bodyPayload: any = {
    displayName: displayName.trim(),
    spaceType: 'SPACE'
  };

  if (description) {
    bodyPayload.spaceDetails = {
      description: description.trim()
    };
  }

  const res = await fetch('https://chat.googleapis.com/v1/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyPayload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to create Google Chat space: ${res.status}`);
  }

  return await res.json();
}

/**
 * Lists the most recent messages in a Google Chat space.
 */
export async function listGoogleChatMessages(
  spaceName: string,
  pageSize: number = 25
): Promise<GoogleChatMessage[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace authentication required. Please connect your Google account.');
  }

  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=${pageSize}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to list messages: ${res.status}`);
  }

  const data = await res.json();
  const rawMessages: any[] = data.messages || [];
  
  // Sort oldest to newest for pleasant chat reading
  return rawMessages
    .map(m => ({
      name: m.name,
      text: m.text || '',
      createTime: m.createTime,
      sender: m.sender ? {
        name: m.sender.name,
        displayName: m.sender.displayName || 'Team Member',
        avatarUrl: m.sender.avatarUrl,
        type: m.sender.type
      } : undefined
    }))
    .sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());
}

/**
 * Sends a message to a Google Chat space on behalf of the authenticated user.
 * NOTE: User confirmation dialog MUST be presented in UI prior to executing this.
 */
export async function sendGoogleChatMessage(
  spaceName: string,
  text: string
): Promise<GoogleChatMessage> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace authentication required. Please connect your Google account.');
  }

  if (!text.trim()) {
    throw new Error('Message text cannot be empty.');
  }

  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text.trim()
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to send Google Chat message: ${res.status}`);
  }

  return await res.json();
}

/**
 * Formats and sends an authoritative restaurant operational dispatch to a Google Chat space.
 */
export async function sendOperationalDispatchToChat(
  spaceName: string,
  options: OperationalDispatchOptions
): Promise<GoogleChatMessage> {
  const timestamp = new Date().toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  let emojiHeader = '📢';
  if (options.category === 'ORDER_DISPATCH') emojiHeader = '🍳';
  if (options.category === 'SHIFT_REPORT') emojiHeader = '📊';
  if (options.category === 'KITCHEN_ALERT') emojiHeader = '🚨';
  if (options.category === 'VIP_RESERVATION') emojiHeader = '👑';

  const lines: string[] = [
    `${emojiHeader} *[QUETTA MAHFIL DISPATCH] ${options.title.toUpperCase()}*`,
    `🕒 *Time:* ${timestamp} | *Priority:* ${options.priority || 'NORMAL'}`
  ];

  if (options.details && Object.keys(options.details).length > 0) {
    lines.push('');
    for (const [key, val] of Object.entries(options.details)) {
      if (val !== undefined && val !== null) {
        lines.push(`• *${key}:* ${val}`);
      }
    }
  }

  if (options.notes) {
    lines.push('');
    lines.push(`📝 *Notes:* ${options.notes}`);
  }

  lines.push('');
  lines.push(`_Quetta Mahfil Chai Khana • Operations Dispatch Node_`);

  const fullText = lines.join('\n');
  return await sendGoogleChatMessage(spaceName, fullText);
}
