import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';
import { getChatResponse } from './aiService';

export interface UserMemory {
  userId: string;
  preferences: {
    preferredOrders: string[];
    greetingStyle: string;
    topicsOfInterest: string[];
    personalityNotes: string;
    lastAnalyzedAt?: any;
  };
  rawMemory: string[];
}

const DEFAULT_MEMORY = (userId: string): UserMemory => ({
  userId,
  preferences: {
    preferredOrders: [],
    greetingStyle: "Traditional Pashtun hospitality",
    topicsOfInterest: [],
    personalityNotes: "Respectful and curious"
  },
  rawMemory: []
});

export async function getUserMemory(userId: string): Promise<UserMemory> {
  const path = `user_memories/${userId}`;
  try {
    const docRef = doc(db, 'user_memories', userId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as UserMemory;
    }
    return DEFAULT_MEMORY(userId);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return DEFAULT_MEMORY(userId);
  }
}

export async function updateUserMemory(userId: string, memory: Partial<UserMemory>) {
  const path = `user_memories/${userId}`;
  try {
    const docRef = doc(db, 'user_memories', userId);
    await setDoc(docRef, {
      ...memory,
      userId,
      'preferences.lastAnalyzedAt': serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToUserMemory(userId: string, callback: (memory: UserMemory) => void) {
  const path = `user_memories/${userId}`;
  const docRef = doc(db, 'user_memories', userId);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as UserMemory);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function analyzeAndExtractMemory(userId: string, messages: { role: string, content: string }[]) {
  const memoryContext = JSON.stringify(await getUserMemory(userId));
  const chatHistory = messages.map(m => `${m.role}: ${m.content}`).join('\n');

  const systemPrompt = `You are a memory extraction engine for Saki, the AI host at Quetta Mahfil.
Your task is to analyze the chat history and the current user memory, then output a NEW UPDATED JSON that captures:
1. User's preferred tea/food orders.
2. Changes in how the user likes to be greeted (e.g., if they are informal or formal).
3. Topics they discussed (culture, poetry, specific tea origins).
4. Subtle personality notes (mood, humor, values).

User Memory: ${memoryContext}
New Chat History: ${chatHistory}

Output ONLY the raw JSON object matching the UserMemory schema. DO NOT include markdown backticks.`;

  try {
    // We use getChatResponse directly but with a special system prompt
    // For this, we'll need to modify aiService slightly or just use a custom fetch here
    // Let's use getChatResponse with a flag or just a custom call to the same endpoint
    
    const response = await fetch('/api/ai/universal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: [
          { role: 'user', content: `${systemPrompt}\n\nUser Memory: ${memoryContext}\n\nNew Chat History: ${chatHistory}` }
        ]
      }),
    });

    if (!response.ok) return;
    const result = await response.json();
    const rawText = result.text || '';
    const cleanedText = rawText.replace(/```json|```/g, '').trim();
    if (!cleanedText) return;

    try {
      const extractedMemory = JSON.parse(cleanedText);
      await updateUserMemory(userId, extractedMemory);
    } catch {
      // Non-JSON or conversational text, safely skip auto-update
    }
  } catch (error) {
    console.warn("Memory extraction notice:", error);
  }
}
