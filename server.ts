import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer as createViteServer } from 'vite';
import Groq from 'groq-sdk';
import admin from 'firebase-admin';
import { GoogleGenAI, Type } from '@google/genai';
import 'dotenv/config';
import type { UserContext } from './server/centralAgent';

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
  try {
    admin.initializeApp();
  } catch (err) {
    // Graceful fallback in environments without auto-provisioned cloud credentials
  }
}

// In-Memory Sliding Window Rate Limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    const record = rateLimitMap.get(key);
    if (!record || now > record.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (record.count >= options.max) {
      res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: options.message,
        retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000),
      });
    }

    record.count++;
    next();
  };
}

const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'AI request limit reached. Please wait a moment before sending more messages.'
});

const adminRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Administrative command rate limit exceeded.'
});

const checkinRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Check-in request rate limit reached.'
});

// Helper: Authoritatively verify Firebase ID token from Authorization header and resolve RBAC
interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  role?: string;
  isSuperAdmin: boolean;
}

async function verifyBearerToken(req: express.Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) return null;

  try {
    if (admin.apps.length > 0) {
      const decoded = await admin.auth().verifyIdToken(idToken);
      const email = decoded.email?.toLowerCase();
      const emailVerified = !!decoded.email_verified;

      // Primary SuperAdmin check (strictly verified root account, zero trust for arbitrary claims)
      const isSuperAdmin = email === 'usamakhn694@gmail.com' && emailVerified;

      let role: string | undefined = undefined;
      if (isSuperAdmin) {
        role = 'superadmin';
      } else if (emailVerified) {
        // Trusted custom claims on decoded token
        const claimRole = typeof decoded.role === 'string' ? decoded.role.toLowerCase() : (decoded.admin === true ? 'admin' : undefined);

        // Authoritative resolution: Query Firestore /admins/{uid} collection matching firestore.rules
        try {
          const adminDoc = await admin.firestore().collection('admins').doc(decoded.uid).get();
          if (adminDoc.exists) {
            const adminData = adminDoc.data();
            const fetchedRole = (adminData?.role || 'admin').toLowerCase();
            // Non-root accounts cannot hold superadmin privilege
            role = fetchedRole === 'superadmin' ? 'admin' : fetchedRole;
          } else if (claimRole) {
            role = claimRole === 'superadmin' ? 'admin' : claimRole;
          }
        } catch (dbErr) {
          if (claimRole) {
            role = claimRole === 'superadmin' ? 'admin' : claimRole;
          }
        }
      }

      return {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified,
        role,
        isSuperAdmin: !!isSuperAdmin
      };
    }
  } catch (e) {
    // Invalid or expired token
  }
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());
  app.use(cors());

  // Robust Security Headers & Strict Content Security Policy (OWASP ASVS & XSS Mitigation)
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          // Prohibits 'unsafe-inline' and 'unsafe-eval' to eliminate script-based XSS vectors
          scriptSrc: [
            "'self'",
            "https://apis.google.com",
            "https://www.gstatic.com",
            "https://www.google.com/recaptcha/",
            "https://recaptcha.net",
          ],
          scriptSrcAttr: ["'none'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Permitted for dynamic component styling, CSS-in-JS, and animation frames
            "https://fonts.googleapis.com",
            "https://unpkg.com",
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "data:",
          ],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https://images.unsplash.com",
            "https://*.googleusercontent.com",
            "https://*.gstatic.com",
          ],
          mediaSrc: [
            "'self'",
            "data:",
            "blob:",
          ],
          connectSrc: [
            "'self'",
            "https://firestore.googleapis.com",
            "https://identitytoolkit.googleapis.com",
            "https://securetoken.googleapis.com",
            "https://*.firebaseio.com",
            "https://firebaseinstallations.googleapis.com",
            "https://fcmregistrations.googleapis.com",
            "https://*.googleapis.com",
            "https://images.unsplash.com",
            "https://unpkg.com",
            "https://api.groq.com",
            "ws:",
            "wss:",
          ],
          frameSrc: [
            "'self'",
            "https://*.firebaseapp.com",
            "https://accounts.google.com",
            "https://www.google.com/recaptcha/",
            "https://recaptcha.net",
          ],
          frameAncestors: [
            "'self'",
            "https://ai.studio",
            "https://*.google.com",
            "https://*.run.app",
          ],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // Allows cross-origin assets (e.g. Unsplash images)
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Supports Firebase popup auth
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: false, // Handled via CSP frameAncestors for AI Studio preview compatibility
      xContentTypeOptions: true,
      xDnsPrefetchControl: { allow: false },
      xDownloadOptions: true,
      xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
      xXssProtection: true,
    })
  );

  // Additional defense-in-depth response headers
  app.use((_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(self), payment=()'
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'quetta-mahfil-chai-khana', timestamp: new Date().toISOString() });
  });

  // Production-grade logging: Only log in development or errors in production
  if (process.env.NODE_ENV !== 'production') {
    // Custom morgan to ignore static asset noise in development if needed
    app.use(morgan('dev', {
      skip: (req) => req.url.startsWith('/src/') || req.url.startsWith('/@vite/') || req.url.startsWith('/node_modules/')
    }));
  } else {
    // Minimal logging for production
    app.use(morgan('combined', {
      skip: (req, res) => res.statusCode < 400
    }));
  }

  // Groq Client initialization (Optional secondary fallback)
  const groq = (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_'))
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

  // Import Centralized Agent Module
  const { 
    processCentralAgentInteraction, 
    executeAgentTool, 
    executeToolPipeline,
    toolMetricsStore,
    getExternalIntegrationsStatus,
    currentMenu, 
    reservationsStore, 
    auditLogs, 
    isAuthorizedAdmin,
    isSuperAdmin,
    isAuthorizedStaff,
    isAuthorizedKitchen,
    globalAnnouncement,
    TOOL_REGISTRY,
    ROLE_PERMISSIONS
  } = await import('./server/centralAgent');

  // ============================================================================
  // CENTRAL RESTAURANT AI AGENT AUTHORITATIVE API ROUTES
  // ============================================================================

  // 1. Unified Agent Interaction (Voice + Text + Operations)
  app.post('/api/agent/interact', aiRateLimiter, async (req, res) => {
    try {
      const { message, modality = 'text', history = [], context = {} } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message string is required' });
      }
      if (message.length > 2000) {
        return res.status(400).json({ error: 'Message exceeds maximum length of 2000 characters' });
      }

      const verifiedUser = await verifyBearerToken(req);

      // Sanitize context: populate verified identity from token if authenticated
      const secureContext: UserContext = {
        userId: verifiedUser?.uid || (typeof context?.userId === 'string' ? context.userId : undefined),
        userUid: verifiedUser?.uid,
        userName: verifiedUser?.email ? verifiedUser.email.split('@')[0] : (typeof context?.userName === 'string' ? context.userName.slice(0, 50) : 'Guest'),
        userEmail: verifiedUser?.email,
        isEmailVerified: verifiedUser?.emailVerified ?? false,
        userRole: verifiedUser?.role || 'customer'
      };

      const result = await processCentralAgentInteraction({
        message,
        modality,
        history: Array.isArray(history) ? history.slice(-10) : [],
        context: secureContext
      });

      res.json(result);
    } catch (error: any) {
      console.error('Central Agent Error:', error);
      res.status(500).json({ error: 'Internal agent orchestration error' });
    }
  });

  // 2. Admin AI Control Center - Privileged Command Execution
  app.post('/api/agent/admin-command', adminRateLimiter, async (req, res) => {
    try {
      const { command, tool, args = {} } = req.body;
      const verifiedUser = await verifyBearerToken(req);

      if (!verifiedUser) {
        return res.status(401).json({
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Valid Firebase Bearer ID token required for administrative operations.'
        });
      }

      const authorized = isAuthorizedAdmin(verifiedUser.email, verifiedUser.role, verifiedUser.emailVerified);

      if (!authorized) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'Level 4 Administrator privilege required. The authenticated account does not hold administrative authority.'
        });
      }

      const actorContext: UserContext = {
        userId: verifiedUser.uid,
        userUid: verifiedUser.uid,
        userEmail: verifiedUser.email,
        userRole: verifiedUser.role || 'admin',
        userName: verifiedUser.email ? verifiedUser.email.split('@')[0] : 'Administrator',
        isEmailVerified: verifiedUser.emailVerified
      };

      // Allowed administrative tools
      const allowedAdminTools = [
        'admin_update_price',
        'admin_toggle_availability',
        'admin_update_order_status',
        'admin_broadcast_announcement',
        'admin_get_operational_report',
        'admin_manage_reservations',
        'superadmin_system_diagnostics'
      ];

      // If a specific tool is called directly
      if (tool) {
        if (!allowedAdminTools.includes(tool)) {
          return res.status(400).json({ error: 'INVALID_TOOL', message: `Tool ${tool} is not an authorized administrative tool.` });
        }
        // Input validation for tools
        if (tool === 'admin_update_price') {
          const itemPrice = typeof args.newPrice === 'number' ? args.newPrice : args.price;
          const itemName = args.itemIdOrName || args.name;
          if (!itemName || typeof itemName !== 'string' || typeof itemPrice !== 'number' || itemPrice <= 0 || itemPrice > 100000) {
            return res.status(400).json({ error: 'INVALID_ARGS', message: 'Valid item name and positive price (<= 100000) required' });
          }
          args.itemIdOrName = itemName;
          args.newPrice = itemPrice;
        }
        const result = executeAgentTool(tool, args, actorContext);
        return res.json({ success: true, tool, result });
      }

      // If a natural language command is provided
      if (command && typeof command === 'string') {
        if (command.length > 1000) {
          return res.status(400).json({ error: 'Command exceeds maximum length of 1000 characters' });
        }
        const result = await processCentralAgentInteraction({
          message: command,
          modality: 'text',
          context: actorContext
        });
        return res.json(result);
      }

      res.status(400).json({ error: 'Either tool or command must be provided' });
    } catch (error: any) {
      console.error('Admin AI Control Error:', error);
      res.status(500).json({ error: 'Internal administrative error' });
    }
  });

  // 2.1 Direct Authoritative Tool Execution Gateway
  app.post(['/api/agent/tool', '/api/agent/execute-tool'], aiRateLimiter, async (req, res) => {
    try {
      const { tool, name, args = {}, idempotencyKey } = req.body;
      const targetTool = tool || name;
      if (!targetTool || typeof targetTool !== 'string') {
        return res.status(400).json({ error: 'Tool name is required' });
      }

      const verifiedUser = await verifyBearerToken(req);
      const secureContext: UserContext = {
        userId: verifiedUser?.uid,
        userUid: verifiedUser?.uid,
        userName: verifiedUser?.email ? verifiedUser.email.split('@')[0] : 'Guest',
        userEmail: verifiedUser?.email,
        isEmailVerified: verifiedUser?.emailVerified ?? false,
        userRole: verifiedUser?.role || (verifiedUser ? 'customer' : 'anonymous')
      };

      const result = await executeToolPipeline(targetTool, args, secureContext, {
        idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey : undefined
      });
      res.json(result);
    } catch (error: any) {
      console.error('Agent tool execution error:', error);
      res.status(500).json({ error: 'Internal tool execution error' });
    }
  });

  // 3. Central Agent Health & Status
  app.get('/api/agent/status', (req, res) => {
    res.json({
      status: 'online',
      agentName: 'Saki',
      brand: 'Quetta Mahfil Chai Khana',
      location: 'Block D, Sector B, Bahria Town Lahore',
      operatingHours: '24/7 Continuous',
      models: {
        primary: process.env.GEMINI_API_KEY ? 'gemini-3.8-flash' : 'autonomous-heritage-engine',
        fallback: process.env.GROQ_API_KEY ? 'deepseek-r1-distill-llama-70b' : 'none'
      },
      toolsAvailable: Object.keys(TOOL_REGISTRY),
      authorityLayer: 'Backend Authoritative (Zero Client Trust)',
      announcement: globalAnnouncement,
      externalIntegrations: getExternalIntegrationsStatus()
    });
  });

  // 3.0 Tool Execution Pipeline Telemetry & Health Metrics (Admin Authorized)
  app.get('/api/agent/metrics', async (req, res) => {
    try {
      const verifiedUser = await verifyBearerToken(req);
      const userEmail = verifiedUser?.email?.toLowerCase();
      const isVerified = verifiedUser?.emailVerified ?? false;
      const isAdmin = isAuthorizedAdmin(userEmail, verifiedUser?.role, isVerified);

      if (!isAdmin) {
        return res.status(403).json({ error: 'Access Denied: Level 4 Admin verification required for pipeline metrics.' });
      }

      const metricsList = Array.from(toolMetricsStore.values());
      res.json({
        totalTrackedTools: metricsList.length,
        metrics: metricsList,
        externalIntegrations: getExternalIntegrationsStatus()
      });
    } catch (err: any) {
      console.error('Metrics retrieval error:', err);
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  });

  // 3.1 Authoritative Central Tool Registry Catalog (Introspection Endpoint with Dynamic Tool Discovery)
  app.get('/api/agent/tools', async (req, res) => {
    try {
      const verifiedUser = await verifyBearerToken(req);
      const userEmail = verifiedUser?.email?.toLowerCase();
      const isEmailVerified = verifiedUser?.emailVerified ?? false;
      const isRootSuper = isSuperAdmin(userEmail, isEmailVerified);
      const isAdmin = isAuthorizedAdmin(userEmail, verifiedUser?.role, isEmailVerified);
      const isStaff = isAuthorizedStaff(userEmail, verifiedUser?.role, isEmailVerified);
      const isKitchen = isAuthorizedKitchen(userEmail, verifiedUser?.role, isEmailVerified);

      let effectiveRole = 'anonymous';
      if (isRootSuper) effectiveRole = 'superadmin';
      else if (isAdmin) effectiveRole = 'admin';
      else if (isStaff) effectiveRole = 'staff';
      else if (isKitchen) effectiveRole = 'kitchen';
      else if (verifiedUser?.uid) effectiveRole = 'customer';

      const permissions = ROLE_PERMISSIONS[effectiveRole as keyof typeof ROLE_PERMISSIONS] || [];
      const showAllForAdmin = (isAdmin || isRootSuper) && req.query.all === 'true';

      const registrySummary = Object.values(TOOL_REGISTRY)
        .filter(t => {
          if (showAllForAdmin) return true;
          if (!t.enabled) return false;
          if (t.requiresAuth && (effectiveRole === 'anonymous' || effectiveRole === 'guest')) return false;
          if ((t.riskLevel === 'CRITICAL_ADMIN' || t.category === 'SUPER_ADMIN') && !isRootSuper) return false;
          if (!t.allowedRoles.includes(effectiveRole as any)) return false;
          if (!permissions.includes('*')) {
            const hasPerm = t.requiredPermissions.every(p =>
              permissions.includes(p) || permissions.includes(p.split('.')[0] + '.*')
            );
            if (!hasPerm) return false;
          }
          return true;
        })
        .map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          purpose: t.purpose,
          description: t.description,
          version: t.version,
          status: t.status,
          statusReason: t.statusReason,
          inputSchema: t.inputSchema,
          outputSchema: t.outputSchema,
          requiresAuth: t.requiresAuth,
          allowedRoles: t.allowedRoles,
          requiredPermissions: t.requiredPermissions,
          ownershipScope: t.ownershipScope,
          requiresConfirmation: t.requiresConfirmation,
          supportsIdempotency: t.supportsIdempotency,
          auditRequired: t.auditRequired,
          riskLevel: t.riskLevel,
          rateLimitClass: t.rateLimitClass,
          timeoutMs: t.timeoutMs,
          enabled: t.enabled,
          destructive: t.destructive,
          sensitiveData: t.sensitiveData
        }));

      res.json({
        role: effectiveRole,
        totalTools: registrySummary.length,
        registry: registrySummary
      });
    } catch (err: any) {
      console.error('Tools registry discovery error:', err);
      res.status(500).json({ error: 'Failed to retrieve tool registry' });
    }
  });

  // 4. Authoritative Menu Catalog
  app.get('/api/agent/menu', (req, res) => {
    res.json({
      items: currentMenu,
      total: currentMenu.length,
      announcement: globalAnnouncement
    });
  });

  // 5. Authoritative Order Quote Calculator
  app.post('/api/agent/quote', (req, res) => {
    try {
      const { items, deliveryLocation } = req.body;
      if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
        return res.status(400).json({ error: 'Items must be a non-empty array of up to 50 items' });
      }

      for (const item of items) {
        if (!item || typeof item.name !== 'string' || typeof item.quantity !== 'number' || item.quantity <= 0 || item.quantity > 100) {
          return res.status(400).json({ error: 'Each item must have a valid name and positive quantity <= 100' });
        }
      }

      const quote = executeAgentTool('calculate_order_quote', { items, deliveryLocation });
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to calculate quote' });
    }
  });

  // 6. Operational Report (Admin Only)
  app.get('/api/agent/admin/reports', adminRateLimiter, async (req, res) => {
    const verifiedUser = await verifyBearerToken(req);

    if (!verifiedUser) {
      return res.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Valid Firebase Bearer ID token required to access operational reports.'
      });
    }

    const authorized = isAuthorizedAdmin(verifiedUser.email, verifiedUser.role, verifiedUser.emailVerified);

    if (!authorized) {
      return res.status(403).json({ error: 'Access Denied: Level 4 Admin verification required' });
    }

    const report = executeAgentTool('admin_get_operational_report', { timeframe: req.query.timeframe || 'Today' }, {
      userId: verifiedUser.uid,
      userUid: verifiedUser.uid,
      userEmail: verifiedUser.email,
      userRole: verifiedUser.role,
      isEmailVerified: verifiedUser.emailVerified
    });
    res.json(report);
  });

  // 7. Authoritative Guest Check-In & Loyalty Endpoint
  app.post('/api/checkin', checkinRateLimiter, async (req, res) => {
    try {
      const { qrData, guestId, tableOrArea = 'Main Dining Hall', points = 50, staffName = 'Front Desk Saki Host' } = req.body;
      const targetId = guestId || qrData;
      if (!targetId || typeof targetId !== 'string' || targetId.length > 128) {
        return res.status(400).json({ error: 'Valid qrData or guestId string (<= 128 chars) is required' });
      }

      // Strict points validation to eliminate privilege inflation
      const pointsNum = Number(points);
      if (isNaN(pointsNum) || pointsNum < 1 || pointsNum > 100 || !Number.isInteger(pointsNum)) {
        return res.status(400).json({ error: 'Points awarded must be an integer between 1 and 100' });
      }

      // Verify caller is authenticated staff/admin
      const verifiedUser = await verifyBearerToken(req);
      if (!verifiedUser) {
        return res.status(401).json({ error: 'Staff authentication required for guest check-in.' });
      }

      const isStaffOrAdmin = isAuthorizedAdmin(verifiedUser.email, verifiedUser.role, verifiedUser.emailVerified);
      if (!isStaffOrAdmin) {
        return res.status(403).json({ error: 'Only authorized staff can confirm guest check-ins' });
      }

      // Authoritative audit log
      auditLogs.push({
        id: 'aud_' + Date.now(),
        action: 'GUEST_CHECKIN_VERIFIED',
        executedBy: `${verifiedUser.email || staffName} (${verifiedUser.uid})`,
        actorUid: verifiedUser.uid,
        actorRole: verifiedUser.role || 'staff',
        target: targetId,
        status: 'SUCCESS',
        details: { targetId, tableOrArea, pointsAwarded: pointsNum },
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: `Guest check-in confirmed for ${tableOrArea}! ${pointsNum} Mahfil Loyalty points awarded.`,
        checkedInAt: new Date().toISOString(),
        pointsAwarded: pointsNum
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to process checkin' });
    }
  });

  // ============================================================================
  // GOOGLE GEMINI 3.8 INTELLIGENCE AUTHORITATIVE ENDPOINTS
  // ============================================================================

  // 1. Gemini Text & Reasoning Intelligence
  app.post('/api/gemini/generate', aiRateLimiter, async (req, res) => {
    try {
      const { prompt, systemInstruction, temperature = 0.7 } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Valid prompt string is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'undefined' && apiKey !== 'null') {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              systemInstruction: systemInstruction || 'You are the intelligent culinary concierge of Quetta Mahfil Chai Khana in Bahria Town, Lahore. Answer warmly and hospitably in English or Urdu.',
              temperature,
            }
          });
          if (response.text) {
            return res.json({ text: response.text, model: 'gemini-3.8-flash' });
          }
        } catch (geminiErr: any) {
          console.warn('[Gemini Generate Fallback]:', geminiErr?.message || geminiErr);
        }
      }

      // Autonomous heritage engine fallback
      return res.json({
        text: "Assalamu Alaikum! Welcome to Quetta Mahfil Chai Khana. Our steaming Matka Zafrani Chai and crispy Arabic Parathas are ready for you in Bahria Town Lahore.",
        model: 'autonomous-heritage-engine'
      });
    } catch (err: any) {
      console.error('Gemini Generate Error:', err);
      res.status(500).json({ error: 'Failed to generate content' });
    }
  });

  // 2. Gemini Palate & Mood Matcher (Structured JSON Output via responseSchema)
  app.post('/api/gemini/mood-match', aiRateLimiter, async (req, res) => {
    try {
      const { mood, weather, timeOfDay } = req.body;
      if (!mood || typeof mood !== 'string') {
        return res.status(400).json({ error: 'Mood description is required' });
      }

      const menuBrief = currentMenu.map(m => `${m.name} (${m.category}, Rs. ${m.price}) - ${m.description}`).join('\n');
      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey && apiKey !== 'undefined' && apiKey !== 'null') {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `Patron's current vibe/mood: "${mood}". Weather: "${weather || 'Clear Lahore evening'}". Time: "${timeOfDay || 'Night'}".
Select the single best comforting or energizing dish from Quetta Mahfil Chai Khana menu, pair it with the ideal tea, and provide authentic Pashtun/Balochi hospitality warmth.
Menu options:
${menuBrief}`,
            config: {
              systemInstruction: "You are Saki, master sommelier and host at Quetta Mahfil Chai Khana. Recommend authentic dishes from the menu matching the patron's feeling, weather, and craving.",
              temperature: 0.6,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  recommendedItemName: { type: Type.STRING, description: "Exact name of recommended dish from menu" },
                  pairingChaiName: { type: Type.STRING, description: "Exact name of matching tea from menu" },
                  moodTag: { type: Type.STRING, description: "Short catchy mood label, e.g. Midnight Comfort, Energy Boost, Chill Vibe" },
                  urduPoeticReason: { type: Type.STRING, description: "A short poetic or warm hospitable remark in Urdu or Roman Urdu" },
                  flavorExplanation: { type: Type.STRING, description: "Detailed 1-2 sentence culinary explanation of why this fixes their mood" },
                  chefSecret: { type: Type.STRING, description: "A culinary brewing or baking detail about how it is prepared" }
                },
                required: ["recommendedItemName", "pairingChaiName", "moodTag", "urduPoeticReason", "flavorExplanation"]
              }
            }
          });

          const parsed = JSON.parse(response.text?.trim() || '{}');
          if (parsed.recommendedItemName) {
            const matchedItem = currentMenu.find(m => m.name.toLowerCase() === (parsed.recommendedItemName || '').toLowerCase()) 
              || currentMenu.find(m => m.name.toLowerCase().includes((parsed.recommendedItemName || '').toLowerCase()))
              || currentMenu[0];
            const matchedChai = currentMenu.find(m => m.name.toLowerCase() === (parsed.pairingChaiName || '').toLowerCase())
              || currentMenu[0];

            return res.json({
              success: true,
              recommendation: {
                ...parsed,
                item: matchedItem,
                pairingChai: matchedChai
              },
              engine: 'gemini-3.8-flash'
            });
          }
        } catch (geminiErr: any) {
          console.warn('[Gemini Mood Match Fallback]:', geminiErr?.message || geminiErr);
        }
      }

      // Resilient autonomous fallback
      const lower = mood.toLowerCase();
      let picked = currentMenu[0];
      let chai = currentMenu[1];
      let tag = "Warmth & Comfort";
      let urdu = "گرما گرم چائے، کوئٹہ کی شان، ہر گھونٹ میں بڑی جان";
      let exp = "Our Zafrani Chai brewed with crushed cardamom and saffron paired with piping hot paratha is the quintessential remedy.";

      if (lower.includes('sweet') || lower.includes('sugar') || lower.includes('nutella')) {
        picked = currentMenu.find(m => m.id === 'm2') || currentMenu[9];
        chai = currentMenu.find(m => m.id === 't5') || currentMenu[4];
        tag = "Sweet Indulgence";
        urdu = "میٹھا پراٹھا اور کڑک چائے، دل کو سکون مل جائے";
        exp = "Crisp golden paratha smothered in rich hazelnut Nutella balanced by our high-caffeine Karak brew.";
      } else if (lower.includes('tired') || lower.includes('exhaust') || lower.includes('work') || lower.includes('sleepy')) {
        picked = currentMenu.find(m => m.id === 'p1') || currentMenu[8];
        chai = currentMenu.find(m => m.id === 't1') || currentMenu[0];
        tag = "Revitalizing Feast";
        urdu = "تھکن بھلا دے وہ کڑک چائے اور ذائقے دار عربک پراٹھا";
        exp = "Rich royal saffron tea revives the senses while our mozzarella-stuffed Arabic Paratha replenishes your energy.";
      }

      return res.json({
        success: true,
        recommendation: {
          recommendedItemName: picked.name,
          pairingChaiName: chai.name,
          moodTag: tag,
          urduPoeticReason: urdu,
          flavorExplanation: exp,
          chefSecret: "Baked over glowing coals and brewed in thick unglazed earthen matkas.",
          item: picked,
          pairingChai: chai
        },
        engine: 'autonomous-heritage-engine'
      });
    } catch (err: any) {
      console.error('Mood match error:', err);
      res.status(500).json({ error: 'Failed to process mood recommendation' });
    }
  });

  // 3. Gemini Semantic & Cultural Heritage Search
  app.post('/api/gemini/smart-search', aiRateLimiter, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Valid query string is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'undefined' && apiKey !== 'null') {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });

          const menuList = currentMenu.map(m => `ID: ${m.id} | Name: ${m.name} | Category: ${m.category} | Price: ${m.price} | Desc: ${m.description}`).join('\n');

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `Patron query: "${query}".
Analyze the patron's culinary intent, flavor cravings, dietary keywords, or mood. From the following Quetta Mahfil catalog, return the best matching item IDs in order of relevance, plus a 1-sentence personalized sommelier note.
Catalog:
${menuList}`,
            config: {
              systemInstruction: "You are the AI culinary search engine for Quetta Mahfil Chai Khana. Identify the exact matching item IDs from the catalog.",
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  matchingItemIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Array of matching dish IDs in descending relevance"
                  },
                  aiNote: {
                    type: Type.STRING,
                    description: "Short friendly note in English/Roman Urdu explaining why these match"
                  }
                },
                required: ["matchingItemIds", "aiNote"]
              }
            }
          });

          const parsed = JSON.parse(response.text?.trim() || '{}');
          const matchedIds: string[] = Array.isArray(parsed.matchingItemIds) ? parsed.matchingItemIds : [];
          const matchedItems = matchedIds
            .map(id => currentMenu.find(m => m.id === id || m.name.toLowerCase() === id.toLowerCase()))
            .filter((item): item is typeof currentMenu[0] => Boolean(item));

          if (matchedItems.length > 0) {
            return res.json({
              items: matchedItems,
              aiNote: parsed.aiNote || "Dishes curated for your taste.",
              engine: 'gemini-3.8-flash'
            });
          }
        } catch (geminiErr: any) {
          console.warn('[Gemini Smart Search Fallback]:', geminiErr?.message || geminiErr);
        }
      }

      // Local semantic keyword fallback
      const q = query.toLowerCase();
      const localFiltered = currentMenu.filter(m => 
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      );

      return res.json({
        items: localFiltered,
        aiNote: `Found ${localFiltered.length} authentic dishes matching "${query}".`,
        engine: 'autonomous-heritage-engine'
      });
    } catch (err: any) {
      console.error('Smart search error:', err);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // 4. Gemini Culinary Lore & Heritage Storyteller
  app.post('/api/gemini/heritage-lore', aiRateLimiter, async (req, res) => {
    try {
      const { itemName, category } = req.body;
      if (!itemName || typeof itemName !== 'string') {
        return res.status(400).json({ error: 'Item name is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'undefined' && apiKey !== 'null') {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `Share a fascinating, evocative 2-3 sentence cultural heritage story and traditional cooking lore about "${itemName}" (${category || 'Pakistani Heritage Dish'}). Mention Quetta/Pashtun/Balochi traditions, slow-cooking over coal, clay samovars, or pure ghee tawa techniques. Keep it warm, authentic, and culturally resonant.`,
            config: {
              systemInstruction: "You are the resident heritage historian of Quetta Mahfil Chai Khana. You celebrate centuries of Central Asian and Pakistani hospitality and street food mastery.",
              temperature: 0.7
            }
          });

          if (response.text) {
            return res.json({
              lore: response.text.trim(),
              engine: 'gemini-3.8-flash'
            });
          }
        } catch (geminiErr: any) {
          console.warn('[Gemini Lore Fallback]:', geminiErr?.message || geminiErr);
        }
      }

      return res.json({
        lore: `${itemName} is prepared in the classic Quetta tradition—simmered with slow-fire patience to achieve the golden aromatic depth cherished across Pakistani chai khanas.`,
        engine: 'autonomous-heritage-engine'
      });
    } catch (err: any) {
      console.error('Heritage lore error:', err);
      res.status(500).json({ error: 'Failed to retrieve heritage lore' });
    }
  });

  // 5. Gemini Voice Synthesis TTS (via gemini-3.8-flash-lite-tts)
  app.post('/api/gemini/tts', aiRateLimiter, async (req, res) => {
    try {
      const { text, voiceName = 'Kore' } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text string is required' });
      }

      const cleanText = text.replace(/[*_#`[\]()]/g, '').slice(0, 300).trim();
      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey && apiKey !== 'undefined' && apiKey !== 'null') {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: cleanText,
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName === 'Zephyr' ? 'Zephyr' : 'Kore' }
              }
            }
          }
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          return res.json({
            audioBase64: base64Audio,
            mimeType: 'audio/wav',
            engine: 'gemini-3.8-flash-lite-tts'
          });
        }
      }

      return res.json({
        audioBase64: null,
        message: 'TTS generation unavailable or unconfigured',
        engine: 'browser-synthesis-fallback'
      });
    } catch (err: any) {
      console.error('TTS error:', err);
      res.status(500).json({ error: 'TTS synthesis error' });
    }
  });

  // API Routes
  app.post('/api/ai/universal', async (req, res) => {
    try {
      const { messages, provider, model } = req.body;
      const groqKey = process.env.GROQ_API_KEY?.trim();

      // If Groq is explicitly requested and a valid gsk_ key is provided
      if (provider === 'groq' && groq && groqKey && groqKey.startsWith('gsk_') && groqKey.length > 20) {
        const completion = await groq.chat.completions.create({
          messages,
          model: model || 'deepseek-r1-distill-llama-70b',
          temperature: 0.7,
        });
        return res.json({ text: completion.choices[0]?.message?.content });
      }

      // Default & primary route: Central Restaurant AI Agent (Gemini 3.8 + Tools + Resilient Heritage Engine)
      const msgList = Array.isArray(messages) ? messages : [];
      const lastUserMsg = [...msgList].reverse().find(m => m.role === 'user')?.content || 'Assalamu Alaikum';
      const history = msgList.slice(0, -1).map((m: any) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: String(m.content || '')
      }));

      const agentResult = await processCentralAgentInteraction({
        message: lastUserMsg,
        history,
        modality: 'text'
      });

      return res.json({ text: agentResult.reply, provider: agentResult.provider });
    } catch (error: any) {
      console.error('AI API Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { messages } = req.body;
      const msgList = Array.isArray(messages) ? messages : [];
      const lastUserMsg = [...msgList].reverse().find(m => m.role === 'user')?.content || 'Assalamu Alaikum';
      const history = msgList.slice(0, -1).map((m: any) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: String(m.content || '')
      }));

      const agentResult = await processCentralAgentInteraction({
        message: lastUserMsg,
        history,
        modality: 'text'
      });

      res.json({
        choices: [
          {
            message: {
              role: 'assistant',
              content: agentResult.reply
            }
          }
        ],
        provider: agentResult.provider
      });
    } catch (error: any) {
      console.error('Chat API Error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to generate AI response'
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production build serving with aggressive caching for assets
    const distPath = path.join(process.cwd(), 'dist');
    
    // Serve static assets with 1 year cache
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true
    }));

    // Serve other static files
    app.use(express.static(distPath, {
      maxAge: '1d', // 1 day for index.html etc (or use ETag)
    }));

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
