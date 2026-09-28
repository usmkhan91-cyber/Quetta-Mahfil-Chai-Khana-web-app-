// Central Restaurant AI Agent - Unified Client Service
// Powers customer text, customer voice, reservations, order assistance, and Admin AI Control Center

export interface AgentResponse {
  reply: string;
  audioText?: string;
  toolCalls?: Array<{ name: string; args: any; result: any }>;
  actions?: Array<{ type: string; payload: any }>;
  provider?: string;
  error?: string;
}

export interface CentralAgentContext {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  cart?: Array<{ name: string; quantity: number; price?: number }>;
}

export interface QuoteResult {
  quotedItems: Array<{
    name: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    available: boolean;
  }>;
  subtotal: string;
  deliveryFee: string;
  tax: string;
  grandTotal: string;
  currency: string;
  estimatedPrepTime: string;
  paymentMethods: string[];
}

export interface OperationalReport {
  reportTime: string;
  timeframe: string;
  systemStatus: string;
  inventory: {
    totalCatalogItems: number;
    inStock: number;
    soldOutCount: number;
    soldOutNames: string[];
  };
  reservations: {
    totalBooked: number;
    recent: any[];
  };
  financials: {
    dailyEstimatedSales: string;
    averageOrderTicket: string;
    topSellingCategory: string;
    activeDeliveryRiders: number;
  };
  auditLogsCount: number;
  recentAudits: any[];
}

class CentralAgentService {
  private static instance: CentralAgentService;

  private constructor() {}

  public static getInstance(): CentralAgentService {
    if (!CentralAgentService.instance) {
      CentralAgentService.instance = new CentralAgentService();
    }
    return CentralAgentService.instance;
  }

  /**
   * Interact with the authoritative Central Restaurant AI Agent (Text or Voice)
   */
  public async interact(payload: {
    message: string;
    modality?: 'text' | 'voice';
    history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    context?: CentralAgentContext;
    authToken?: string;
  }): Promise<AgentResponse> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (payload.authToken) {
        headers['Authorization'] = `Bearer ${payload.authToken}`;
      }

      const response = await fetch('/api/agent/interact', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Agent interaction failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.warn('Agent interaction error:', error);
      return {
        reply: "وعلیکم السلام Sahib! I am momentarily adjusting my samovar. Please try asking again in a moment.",
        audioText: "Assalamu Alaikum Sahib! Please try again in a moment.",
        provider: 'client-fallback',
        error: error.message
      };
    }
  }

  /**
   * Execute an administrative AI command or privileged tool
   */
  public async sendAdminCommand(payload: {
    command?: string;
    tool?: string;
    args?: any;
    authToken?: string;
  }): Promise<any> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (payload.authToken) {
        headers['Authorization'] = `Bearer ${payload.authToken}`;
      }

      const response = await fetch('/api/agent/admin-command', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Admin AI command failed');
      }

      return data;
    } catch (error: any) {
      console.error('Admin AI command error:', error);
      throw error;
    }
  }

  /**
   * Fetch live agent status and model capabilities
   */
  public async getAgentStatus(): Promise<any> {
    try {
      const res = await fetch('/api/agent/status');
      return await res.json();
    } catch {
      return { status: 'offline', toolsAvailable: [] };
    }
  }

  /**
   * Fetch the authoritative Central AI Tool Registry
   */
  public async getToolsRegistry(
    authToken?: string,
    options?: { all?: boolean }
  ): Promise<{ totalTools: number; registry: any[]; role?: string }> {
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const query = options?.all ? '?all=true' : '';
      const res = await fetch(`/api/agent/tools${query}`, { headers });
      return await res.json();
    } catch {
      return { totalTools: 0, registry: [] };
    }
  }

  /**
   * Directly invoke an authorized tool through the backend Tool Execution Gateway
   */
  public async executeTool(
    tool: string,
    args: Record<string, any> = {},
    options?: { authToken?: string; idempotencyKey?: string }
  ): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options?.authToken) {
      headers['Authorization'] = `Bearer ${options.authToken}`;
    }

    const res = await fetch('/api/agent/tool', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tool,
        args,
        idempotencyKey: options?.idempotencyKey,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || `Tool execution failed with status ${res.status}`);
    }
    return data;
  }

  /**
   * Fetch live Tool Execution Pipeline Telemetry & External Integrations status
   */
  public async getPipelineMetrics(authToken?: string): Promise<{
    totalTrackedTools: number;
    metrics: Array<{
      toolName: string;
      totalExecutions: number;
      successfulExecutions: number;
      failedExecutions: number;
      lastExecutedAt?: string;
      lastStatus?: string;
      averageDurationMs?: number;
    }>;
    externalIntegrations: Array<{
      name: string;
      category: string;
      configured: boolean;
      status: string;
      description: string;
      lastHealthCheck?: string;
    }>;
  }> {
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/agent/metrics', { headers });
      if (!res.ok) {
        return { totalTrackedTools: 0, metrics: [], externalIntegrations: [] };
      }
      return await res.json();
    } catch {
      return { totalTrackedTools: 0, metrics: [], externalIntegrations: [] };
    }
  }

  /**
   * Calculate authoritative server price quote for requested items
   */
  public async getAuthoritativeQuote(items: Array<{ name: string; quantity: number }>, deliveryLocation?: string): Promise<QuoteResult> {
    const res = await fetch('/api/agent/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, deliveryLocation })
    });
    if (!res.ok) throw new Error('Failed to calculate quote');
    return await res.json();
  }

  /**
   * Fetch full operational report (Admin only)
   */
  public async getOperationalReport(authToken?: string, timeframe: string = 'Today'): Promise<OperationalReport> {
    const params = new URLSearchParams();
    if (timeframe) params.append('timeframe', timeframe);

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`/api/agent/admin/reports?${params.toString()}`, { headers });
    if (!res.ok) throw new Error('Failed to retrieve operational report');
    return await res.json();
  }

  /**
   * Gemini 3.8 Flash Palate & Mood Matcher
   */
  public async getMoodMatch(mood: string, weather?: string, timeOfDay?: string): Promise<any> {
    try {
      const res = await fetch('/api/gemini/mood-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, weather, timeOfDay })
      });
      if (!res.ok) throw new Error('Mood match failed');
      return await res.json();
    } catch (e) {
      console.warn('Mood match error:', e);
      return null;
    }
  }

  /**
   * Gemini 3.8 Flash Semantic Cultural Search
   */
  public async getSmartSearch(query: string): Promise<any> {
    try {
      const res = await fetch('/api/gemini/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      if (!res.ok) throw new Error('Smart search failed');
      return await res.json();
    } catch (e) {
      console.warn('Smart search error:', e);
      return null;
    }
  }

  /**
   * Gemini 3.8 Flash Heritage Lore Storyteller
   */
  public async getHeritageLore(itemName: string, category?: string): Promise<string> {
    try {
      const res = await fetch('/api/gemini/heritage-lore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName, category })
      });
      if (!res.ok) throw new Error('Heritage lore failed');
      const data = await res.json();
      return data.lore || '';
    } catch (e) {
      console.warn('Heritage lore error:', e);
      return '';
    }
  }

  /**
   * Gemini Voice Synthesis TTS with Web Speech fallback
   */
  public async speak(text: string, lang: 'en' | 'ur' = 'en'): Promise<void> {
    const cleanText = text.replace(/[*_#`[\]()]/g, '').trim();
    if (!cleanText) return;

    // 1. Try Gemini 3.8 Flash Lite TTS via server-side endpoint
    try {
      const ttsRes = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voiceName: 'Kore' })
      });

      if (ttsRes.ok) {
        const data = await ttsRes.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
          audio.volume = 1.0;
          await audio.play();
          return;
        }
      }
    } catch (err) {
      // Fallback to browser SpeechSynthesis
    }

    // 2. Browser SpeechSynthesis fallback
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (lang === 'ur') {
        const urVoice = voices.find(v => v.lang.includes('ur') || v.lang.includes('hi'));
        if (urVoice) utterance.voice = urVoice;
      } else {
        const enVoice = voices.find(v => (v.name.includes('Google') || v.name.includes('Natural')) && v.lang.includes('en'));
        if (enVoice) utterance.voice = enVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis fallback error:', e);
    }
  }
}

export const centralAgent = CentralAgentService.getInstance();
