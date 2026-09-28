import { centralAgent } from "./centralAgentService";

export type AiProvider = 'gemini' | 'groq' | 'deepseek';

export interface AiRequestOptions {
  provider?: AiProvider;
  model?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  userMemory?: string;
  context?: any;
}

/**
 * Unified AI Gateway - Centralized Restaurant AI Agent powered by Gemini 3.8
 */
export async function getUnifiedAiResponse(
  message: string,
  options: AiRequestOptions = {}
): Promise<string | null> {
  const { history = [], context } = options;

  try {
    const res = await centralAgent.interact({
      message,
      history,
      context: {
        userName: context?.userName || 'Mahfil Guest',
        userRole: context?.userRole || 'customer'
      }
    });

    return res.reply || "Assalamu Alaikum! Saki is ready to serve you.";
  } catch (error) {
    console.error("Unified AI Error:", error);
    return "Assalamu Alaikum! My neural circuits are slightly foggy right now. Please try again in a moment, Sahib.";
  }
}

/**
 * Gemini-Powered Cultural Semantic Search
 */
export async function aiEnhancedSearch(query: string, items: any[]): Promise<any[]> {
  try {
    const result = await centralAgent.getSmartSearch(query);
    if (result && Array.isArray(result.items) && result.items.length > 0) {
      return result.items;
    }
  } catch (e) {
    console.warn('Gemini search fallback:', e);
  }

  const normalizedQuery = query.toLowerCase();
  return items.filter(item => 
    item.name.toLowerCase().includes(normalizedQuery) ||
    item.category.toLowerCase().includes(normalizedQuery) ||
    (item.description && item.description.toLowerCase().includes(normalizedQuery))
  );
}

/**
 * Gemini Palate & Mood Recommendation
 */
export async function getMoodRecommendation(text: string, items: any[]): Promise<{ recommendation: string, menuId?: string, pairingChai?: string, moodTag?: string }> {
  try {
    const result = await centralAgent.getMoodMatch(text);
    if (result && result.recommendation) {
      const rec = result.recommendation;
      const matchedItem = items.find(i => i.name.toLowerCase() === (rec.recommendedItemName || '').toLowerCase()) || rec.item;
      return {
        recommendation: `${rec.urduPoeticReason || ''}\n\n${rec.flavorExplanation || ''}`,
        menuId: matchedItem?.id,
        pairingChai: rec.pairingChaiName,
        moodTag: rec.moodTag
      };
    }
  } catch (error) {
    console.warn('Mood match error:', error);
  }

  return { recommendation: "A steaming cup of Matka Zafrani Chai with crispy Lacha Paratha is always the perfect remedy." };
}

/**
 * Gemini Cultural Heritage Lore
 */
export async function getHeritageLore(itemName: string, category?: string): Promise<string> {
  return await centralAgent.getHeritageLore(itemName, category);
}

/**
 * Backward compatibility aliases
 */
export const getChatResponse = getUnifiedAiResponse;

export async function analyzeNeuralIntent(query: string) {
  return { intent: 'general', confidence: 0.95 };
}

