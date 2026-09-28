import { GoogleGenAI, FunctionDeclaration } from '@google/genai';
import Groq from 'groq-sdk';
import { TOOL_REGISTRY } from './registry';
import {
  executeAgentTool,
  isAuthorizedAdmin,
  isSuperAdmin,
  currentMenu,
  ROLE_HIERARCHY
} from './gateway';
import { executeToolPipeline } from './pipeline';
import {
  AgentInteractionPayload,
  UserContext,
  UserRole,
  ROLE_PERMISSIONS
} from './types';

export const SYSTEM_PROMPT = `You are "Saki", the authoritative, charming, and intelligent Central AI Agent of "Quetta Mahfil Chai Khana" in Bahria Town, Lahore (Sector B, Block D).

IDENTITY & CULTURE:
- You embody 32+ years of authentic Pashtun and Balochi hospitality.
- Welcome guests warmly with cultural greetings: "Pakhair Raghlay", "Assalamu Alaikum Sahib / Janab".
- Creator: Usama Khan (Master Architect & Founder).
- Language: Flawless natural code-switching between Urdu, English, and Roman Urdu. Match the guest's language naturally.
- Traditional Poetry:
  - Tea: "گرما گرم چائے، کوئٹہ کی شان، ہر گھونٹ میں بسی ہے پرسکون جان"
  - Paratha: "پراٹھا گرم، چائے کڑک، یہی ہے پاکستانی ناشتے کی جھلک"
- Tone: Friendly, Personable, Respectful, Warm, Calm, Smart, Fast, Modern, Caring, Confident. Never robotic.

AUTHORITY & ANTI-HALLUCINATION RULES:
1. Live restaurant facts (items, prices, availability, order status, reservations) MUST come exclusively from verified tool results.
2. NEVER fabricate, estimate, or assume menu items, prices, opening hours, or table availability.
3. If verified information is unavailable, state clearly: "Sahib, I couldn't verify that from the current restaurant data."
4. Payment safety: NEVER mark an order as paid or claim payment succeeded without authoritative backend confirmation. Payment remains 'unpaid' until verified.
5. High-Risk Action Confirmation: Operations like canceling an order or canceling a reservation require explicit confirmation. Warn the user clearly before finalizing.
6. The AI Agent CANNOT grant itself permissions, change user roles, modify Firebase Security Rules, or expose internal secrets.
7. Customer data isolation: Never expose one patron's private memory, phone number, address, or orders to another person.`;

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (geminiClient) return geminiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
    return null;
  }
  geminiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
  return geminiClient;
}

export function getDeclarationsForRole(
  role: UserRole = 'customer',
  isVerifiedAdmin: boolean = false,
  userEmail?: string,
  isEmailVerified: boolean = false
): FunctionDeclaration[] {
  const declarations: FunctionDeclaration[] = [];
  const isRootSuper = isSuperAdmin(userEmail, isEmailVerified);
  const effectiveRole: UserRole = isRootSuper
    ? 'superadmin'
    : (isVerifiedAdmin ? (role === 'superadmin' ? 'admin' : role) : role);
  const permissions = ROLE_PERMISSIONS[effectiveRole] || [];

  for (const tool of Object.values(TOOL_REGISTRY)) {
    // 1. Never expose tools that are disabled, NOT_IMPLEMENTED, or REQUIRES_EXTERNAL_SERVICE
    if (!tool.enabled || tool.status === 'NOT_IMPLEMENTED' || tool.status === 'REQUIRES_EXTERNAL_SERVICE') {
      continue;
    }

    // 2. Authentication requirement
    if (tool.requiresAuth && (effectiveRole === 'anonymous' || effectiveRole === 'guest')) {
      continue;
    }

    // 3. SuperAdmin isolation: SuperAdmin tools are strictly only for root SuperAdmin
    if (tool.riskLevel === 'CRITICAL_ADMIN' || tool.category === 'SUPER_ADMIN') {
      if (!isRootSuper) {
        continue;
      }
    }

    // 4. Role check: Actor role must be in tool's allowedRoles
    if (!tool.allowedRoles.includes(effectiveRole)) {
      continue;
    }

    // 5. Granular permission check
    if (!permissions.includes('*')) {
      const hasPermission = tool.requiredPermissions.every(p =>
        permissions.includes(p) || permissions.includes(p.split('.')[0] + '.*')
      );
      if (!hasPermission) {
        continue;
      }
    }

    declarations.push({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    });
  }

  return declarations;
}

export const agentFunctionDeclarations: FunctionDeclaration[] = Object.values(TOOL_REGISTRY)
  .filter(t => t.enabled && t.status === 'IMPLEMENTED')
  .map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters
  }));

export async function processCentralAgentInteraction(payload: AgentInteractionPayload): Promise<{
  reply: string;
  audioText?: string;
  toolCalls?: Array<{ name: string; args: any; result: any }>;
  actions?: Array<{ type: string; payload: any }>;
  provider: string;
}> {
  const { message, modality = 'text', history = [], context } = payload;
  const isEmailVerified = context?.isEmailVerified ?? false;
  const isSuper = isSuperAdmin(context?.userEmail, isEmailVerified);
  const isAdmin = isAuthorizedAdmin(context?.userEmail, context?.userRole, isEmailVerified);
  const resolvedRole: UserRole = isSuper
    ? 'superadmin'
    : (isAdmin ? (context?.userRole === 'superadmin' ? 'admin' : (context?.userRole as UserRole || 'admin')) : (context?.userUid ? 'customer' : 'guest'));

  const allowedDeclarations = getDeclarationsForRole(
    resolvedRole,
    isAdmin,
    context?.userEmail,
    isEmailVerified
  );

  // 1. Primary Engine: Google Gemini API via @google/genai SDK (Multi-Step Tool Execution)
  const ai = getGeminiClient();
  if (ai) {
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    for (const modelName of candidateModels) {
      try {
        const contents: any[] = [];
        const userContextString = `[SYSTEM CONTEXT: Caller is ${context?.userName || 'Guest'} | Role: ${resolvedRole} | Modality: ${modality}]`;

        for (const h of history.slice(-6)) {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
          });
        }

        contents.push({
          role: 'user',
          parts: [{ text: `${userContextString}\n${message}` }]
        });

        const executedTools: Array<{ name: string; args: any; result: any }> = [];
        const executedSignatures = new Set<string>();
        let currentContents = [...contents];
        let finalReply: string | undefined;
        const MAX_TOOL_STEPS = 5;

        for (let step = 0; step < MAX_TOOL_STEPS; step++) {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: currentContents,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              temperature: 0.7,
              tools: [{ functionDeclarations: allowedDeclarations }]
            }
          });

          const functionCalls = response.functionCalls;
          if (!functionCalls || functionCalls.length === 0) {
            finalReply = response.text;
            if (!finalReply && response.candidates?.[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                  finalReply = (finalReply ? finalReply + '\n' : '') + part.text;
                }
              }
            }
            break;
          }

          let hasNewCalls = false;
          const stepToolResults: Array<{ name: string; result: any }> = [];

          for (const call of functionCalls) {
            const sig = `${call.name}:${JSON.stringify(call.args || {})}`;
            if (executedSignatures.has(sig)) continue;
            executedSignatures.add(sig);
            hasNewCalls = true;

            const toolResult = await executeToolPipeline(call.name, call.args, context);
            executedTools.push({
              name: call.name,
              args: call.args,
              result: toolResult
            });
            stepToolResults.push({
              name: call.name,
              result: toolResult
            });
          }

          if (!hasNewCalls) {
            finalReply = response.text || "Beshak Sahib, your request has been recorded.";
            break;
          }

          const modelContent = response.candidates?.[0]?.content || {
            role: 'model',
            parts: functionCalls.map(call => ({ functionCall: call }))
          };

          currentContents = [
            ...currentContents,
            modelContent,
            {
              role: 'user',
              parts: stepToolResults.map(st => ({
                functionResponse: {
                  name: st.name,
                  response: st.result
                }
              }))
            }
          ];
        }

        if (!finalReply && executedTools.length > 0) {
          const firstTool = executedTools[0];
          if (firstTool.name === 'get_menu' && firstTool.result?.items) {
            finalReply = `وعلیکم السلام Sahib! Here are our royal recommendations from Quetta Mahfil:\n\n${firstTool.result.items.slice(0, 4).map((i: any) => `• **${i.name}** (${i.price}) — *${i.description}*`).join('\n')}\n\nWould you like me to prepare an order quote for you?`;
          } else if (firstTool.name === 'calculate_order_quote' && firstTool.result?.grandTotal) {
            finalReply = `Sahib, your total quote is **${firstTool.result.grandTotal}** for ${firstTool.result.quotedItems.length} items. Delivery: ${firstTool.result.deliveryFee}. Shall I book this order for you?`;
          } else if (firstTool.name === 'create_order' && firstTool.result?.orderId) {
            finalReply = `Mubarak Sahib! Your order **#${firstTool.result.orderId}** has been registered. Our kitchen has commenced brewing and baking. Estimated delivery: ${firstTool.result.estimatedDelivery}.`;
          } else if (firstTool.name === 'create_reservation' && firstTool.result?.reservationId) {
            finalReply = `Mubarak Sahib! Your table reservation **#${firstTool.result.reservationId}** is confirmed. Pakhair Raghlay!`;
          } else {
            finalReply = "Beshak Sahib! Your request has been executed by Quetta Mahfil Central AI.";
          }
        }

        if (finalReply) {
          return {
            reply: finalReply,
            audioText: finalReply.replace(/[*_#`]/g, '').trim(),
            toolCalls: executedTools.length > 0 ? executedTools : undefined,
            provider: modelName
          };
        }
      } catch (geminiError: any) {
        const errMsg = geminiError?.message || String(geminiError);
        const isTemporary = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429');
        if (isTemporary) {
          console.log(`[Gemini Engine] Model ${modelName} temporarily under demand. Trying next model...`);
          continue;
        }
        console.log(`[Gemini Engine] Notice for ${modelName}:`, errMsg.slice(0, 100));
        break;
      }
    }
  }

  // 2. Secondary Fallback: Groq (if configured)
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey && groqKey !== 'undefined' && groqKey !== 'null' && groqKey.startsWith('gsk_') && groqKey.length > 20) {
    try {
      const groq = new Groq({ apiKey: groqKey });
      const completion = await groq.chat.completions.create({
        model: 'deepseek-r1-distill-llama-70b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history.slice(-4).map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: message }
        ],
        temperature: 0.6
      });

      const reply = completion.choices[0]?.message?.content || "Assalamu Alaikum! Saki is ready to serve you.";
      return {
        reply,
        audioText: reply.replace(/[*_#`]/g, '').trim(),
        provider: 'groq-deepseek'
      };
    } catch (groqError: any) {
      console.warn("Groq fallback notice:", groqError?.message || groqError);
    }
  }

  // 3. Autonomous Resilient Heritage Engine (Guarantees zero downtime)
  const lower = message.toLowerCase();
  const fallbackExecutedTools: Array<{ name: string; args: any; result: any }> = [];

  if (lower.includes('menu') || lower.includes('chai') || lower.includes('paratha') || lower.includes('price') || lower.includes('juice')) {
    const toolRes = executeAgentTool('get_menu', { query: lower.replace(/menu|price|show|me/g, '').trim() }, context);
    fallbackExecutedTools.push({ name: 'get_menu', args: { query: lower }, result: toolRes });

    return {
      reply: `وعلیکم السلام Sahib! Here are our royal recommendations from Quetta Mahfil:\n\n${toolRes.items.slice(0, 4).map((i: any) => `• **${i.name}** (${i.price}) — *${i.description}* [${i.isAvailable}]`).join('\n')}\n\nShall I prepare an order quote for you?`,
      audioText: `Assalamu Alaikum Sahib! We have Zafrani Chai, Matka Chai, and hot Arabic Paratha ready for you in Bahria Town.`,
      toolCalls: fallbackExecutedTools,
      provider: 'autonomous-heritage-engine'
    };
  }

  if (lower.includes('reserve') || lower.includes('table') || lower.includes('booking') || lower.includes('hujra')) {
    const toolRes = executeAgentTool('create_reservation', {
      customerName: context?.userName || 'Mahfil Guest',
      phone: '+92 300 1234567',
      guests: 4,
      date: 'Tonight',
      time: '8:30 PM'
    }, context);
    fallbackExecutedTools.push({ name: 'create_reservation', args: {}, result: toolRes });

    return {
      reply: `Pakhair Raghlay! ${toolRes.message}\nYour booking reference is **${toolRes.reservationId}**. Your traditional Hujra space will be perfumed with oudh and ready.`,
      audioText: `Your table reservation is confirmed at Quetta Mahfil. Pakhair Raghlay!`,
      toolCalls: fallbackExecutedTools,
      provider: 'autonomous-heritage-engine'
    };
  }

  if (lower.includes('order') && (lower.includes('status') || lower.includes('where is'))) {
    const orderIdMatch = message.match(/ORD-[A-Z0-9]+/i);
    if (orderIdMatch) {
      const toolRes = executeAgentTool('get_order_status', { orderId: orderIdMatch[0] }, context);
      fallbackExecutedTools.push({ name: 'get_order_status', args: { orderId: orderIdMatch[0] }, result: toolRes });
      return {
        reply: toolRes.error
          ? `Sahib, ${toolRes.message}`
          : `Sahib, order **#${toolRes.orderId}** is currently **${toolRes.status.toUpperCase()}**. Delivery to ${toolRes.deliveryLocation}. Grand Total: ${toolRes.grandTotal}.`,
        audioText: `Order ${orderIdMatch[0]} is currently ${toolRes.status || 'in progress'}.`,
        toolCalls: fallbackExecutedTools,
        provider: 'autonomous-heritage-engine'
      };
    }
  }

  return {
    reply: "وعلیکم السلام و رحمتہ اللہ! Welcome to Quetta Mahfil Chai Khana, Bahria Town Lahore. I am Saki, your central AI host. Would you like to explore our Zafrani Chai, order a crispy Arabic Paratha, or book our traditional family Hujra?",
    audioText: "Walaykum Assalam! Welcome to Quetta Mahfil Chai Khana. I am Saki, your host. How may I serve you today?",
    provider: 'autonomous-heritage-engine'
  };
}
