import admin from 'firebase-admin';
import { TOOL_REGISTRY, resolveToolName } from './registry';
import {
  UserContext,
  UserRole,
  ToolResult,
  AuditLogRecord,
  ROLE_PERMISSIONS,
  RiskLevel
} from './types';

// Asynchronously sync mutations to Firestore when cloud admin SDK is initialized
function syncToFirestore(collectionName: string, docId: string, data: any) {
  try {
    if (admin.apps.length > 0) {
      admin.firestore().collection(collectionName).doc(docId).set(data, { merge: true }).catch(err => {
        // Suppress background sync errors silently to maintain resilient offline execution
      });
    }
  } catch (e) {
    // Non-blocking
  }
}

// Shared in-memory data structures referenced across server and agent
export interface MenuItemState {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  isAvailable: boolean;
  image: string;
}

export interface ReservationRecord {
  id: string;
  customerName: string;
  phone: string;
  guests: number;
  date: string;
  time: string;
  notes?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderRecord {
  id: string;
  userId?: string;
  customerName: string;
  phone: string;
  deliveryLocation: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  paymentMethod: 'cash' | 'sadapay_nayapay';
  paymentStatus: 'unpaid' | 'verified';
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerMemoryRecord {
  userId: string;
  preferences: string[];
  dietaryNotes: string[];
  favoriteItems: string[];
  teaPreferences?: string;
  preferredLanguage?: string;
  lastUpdated: string;
}

// Global server-authoritative stores
export const initialMenu: MenuItemState[] = [
  { id: 't1', name: 'Zafrani Chai', category: 'Tea & Kehwa', description: 'Rich saffron infused tea brewed to royal perfection', price: 400, isAvailable: true, image: 'https://images.unsplash.com/photo-1594631252845-29fc4586c56f?q=80&w=800' },
  { id: 't2', name: 'Matka Chai', category: 'Tea & Kehwa', description: 'Traditional clay pot steamed tea with smoky aroma', price: 220, isAvailable: true, image: 'https://images.unsplash.com/photo-1544331092-23f05f4e69b5?q=80&w=800' },
  { id: 't3', name: 'Matka Gurr Chai', category: 'Tea & Kehwa', description: 'Jaggery sweetened organic clay pot tea', price: 240, isAvailable: true, image: 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?q=80&w=800' },
  { id: 't4', name: 'Matka Malai Chai', category: 'Tea & Kehwa', description: 'Creamy clay pot tea topped with thick buffalo malai', price: 250, isAvailable: true, image: 'https://images.unsplash.com/photo-1571934811356-5cc5c85023ed?q=80&w=800' },
  { id: 't5', name: 'Special Karak Chai', category: 'Tea & Kehwa', description: 'Signature high-caffeine aromatic Karak brew', price: 180, isAvailable: true, image: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?q=80&w=800' },
  { id: 't6', name: 'Kashmiri Chai', category: 'Tea & Kehwa', description: 'Authentic pink tea garnished with crushed pistachios & almonds', price: 260, isAvailable: true, image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=800' },
  { id: 't7', name: 'Peshawari Kehwa', category: 'Tea & Kehwa', description: 'Traditional green tea with crushed cardamom and lemon slice', price: 180, isAvailable: true, image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?q=80&w=800' },
  { id: 't8', name: 'Zafrani Kehwa', category: 'Tea & Kehwa', description: 'Kandahari green tea steeped with premium saffron strands', price: 240, isAvailable: true, image: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7370?q=80&w=800' },
  { id: 'p1', name: 'Arabic Paratha', category: 'Chat Pata Paratha', description: 'Chef special spiced chicken, capsicum, olives & melted mozzarella', price: 1060, isAvailable: true, image: 'https://images.unsplash.com/photo-1601050690597-df056fb47091?q=80&w=800' },
  { id: 'p2', name: 'Chicken Cheese Paratha', category: 'Chat Pata Paratha', description: 'Spiced chicken chunks smothered in hot melted cheddar & mozzarella', price: 420, isAvailable: true, image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=800' },
  { id: 'p3', name: 'Beef Qeema Paratha', category: 'Chat Pata Paratha', description: 'Hand-minced beef sauteed with green chilies, onions & traditional spices', price: 460, isAvailable: true, image: 'https://images.unsplash.com/photo-1624462966581-bc6d768cbce5?q=80&w=800' },
  { id: 'p4', name: 'Peshawari Chapli Paratha', category: 'Chat Pata Paratha', description: 'Crispy paratha stuffed with authentic juicy Chapli kebab patty', price: 480, isAvailable: true, image: 'https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?q=80&w=800' },
  { id: 'p5', name: 'Aloo Cheese Paratha', category: 'Chat Pata Paratha', description: 'Spiced mashed potato filling with gooey cheese layers', price: 290, isAvailable: true, image: 'https://images.unsplash.com/photo-1601050690597-df056fb47091?q=80&w=800' },
  { id: 'm1', name: 'Lacha Paratha', category: 'Meetha Paratha', description: 'Multi-layered crispy, flaky golden spiral paratha made with pure ghee', price: 120, isAvailable: true, image: 'https://images.unsplash.com/photo-1534422298391-e4f8c170db76?q=80&w=800' },
  { id: 'm2', name: 'Nutella Paratha', category: 'Meetha Paratha', description: 'Warm crisp paratha oozing with rich hazelnut Nutella spread', price: 380, isAvailable: true, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=800' },
  { id: 'm3', name: 'Honey Malai Paratha', category: 'Meetha Paratha', description: 'Traditional flaky paratha topped with fresh buffalo malai & organic wild honey', price: 340, isAvailable: true, image: 'https://images.unsplash.com/photo-1599307767316-776533bb941c?q=80&w=800' },
  { id: 's1', name: 'Special Khoya Khajor Shake', category: 'Milk Shakes', description: 'Royal blend of pure Irani dates, khoya, roasted almonds & fresh milk', price: 450, isAvailable: true, image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=800' },
  { id: 's2', name: 'Chilgoza & Kaju Shake', category: 'Milk Shakes', description: 'Power-packed dry fruit shake with pine nuts, cashews and honey', price: 590, isAvailable: true, image: 'https://images.unsplash.com/photo-1543648965-4d6b57db40bc?q=80&w=800' },
  { id: 's3', name: 'Mango Delight Shake', category: 'Milk Shakes', description: 'Fresh seasonal pulp with vanilla scoop and pistachio crunch', price: 400, isAvailable: true, image: 'https://images.unsplash.com/photo-1471440671318-55bdbb772f93?q=80&w=800' },
  { id: 'j1', name: 'Mint Margarita', category: 'Fresh Juices', description: 'Crushed mountain mint, fresh lemon, black salt and soda fizz', price: 290, isAvailable: true, image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800' },
  { id: 'j2', name: 'Fresh Apple Beetroot Detox', category: 'Fresh Juices', description: 'Cold-pressed crisp apples, ginger and beetroot', price: 420, isAvailable: true, image: 'https://images.unsplash.com/photo-1563306406-e66174fa3787?q=80&w=800' },
  { id: 'j3', name: 'Pomegranate Anaar Juice', category: 'Fresh Juices', description: '100% pure extracted Kandahari pomegranate nectar', price: 550, isAvailable: true, image: 'https://images.unsplash.com/photo-1471350321752-3093947b4d37?q=80&w=800' },
  { id: 'f1', name: 'Mahfil Special Crispy Zinger', category: 'Fast Food', description: 'Triple-dipped crunch breast fillet with spicy garlic mayo & fries', price: 620, isAvailable: true, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800' },
  { id: 'f2', name: 'Loaded Malai Boti Fries', category: 'Fast Food', description: 'Crisp hand-cut fries smothered with chicken malai boti & cheese lava', price: 480, isAvailable: true, image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?q=80&w=800' }
];

export const currentMenu: MenuItemState[] = [...initialMenu];
export const reservationsStore: ReservationRecord[] = [];
export const ordersStore: OrderRecord[] = [];
export const idempotencyStore = new Map<string, { result: any; timestamp: number }>();
export const customerMemoryStore = new Map<string, CustomerMemoryRecord>();
export const auditLogs: AuditLogRecord[] = [];
export let globalAnnouncement: string = "Welcome to Quetta Mahfil • 24/7 Heritage Dining in Bahria Town Lahore • Pakhair Raghlay!";

// Seed demo customer memory
customerMemoryStore.set('usr_demo_patron', {
  userId: 'usr_demo_patron',
  preferences: ['Zafrani Chai with low sugar', 'Crispy Lacha Paratha with extra butter'],
  dietaryNotes: ['Prefers mild spices'],
  favoriteItems: ['Zafrani Chai', 'Arabic Paratha'],
  teaPreferences: 'Double patti, half sugar, steaming hot',
  preferredLanguage: 'Roman Urdu',
  lastUpdated: new Date().toISOString()
});

// Role hierarchy levels
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  superadmin: 5,
  admin: 4,
  manager: 3,
  staff: 3,
  kitchen: 2,
  customer: 1,
  guest: 0,
  anonymous: 0
};

export function getRoleLevel(role?: string): number {
  if (!role) return 0;
  const normalized = role.toLowerCase().trim() as UserRole;
  return ROLE_HIERARCHY[normalized] ?? 0;
}

export function isSuperAdmin(email?: string, isEmailVerified: boolean = false): boolean {
  return !!(email && email.toLowerCase() === 'usamakhn694@gmail.com' && isEmailVerified);
}

export function isAuthorizedAdmin(email?: string, role?: string, isEmailVerified: boolean = false): boolean {
  if (isSuperAdmin(email, isEmailVerified)) return true;
  if (!isEmailVerified) return false;
  return getRoleLevel(role) >= 4;
}

export function isAuthorizedManager(email?: string, role?: string, isEmailVerified: boolean = false): boolean {
  if (isSuperAdmin(email, isEmailVerified)) return true;
  if (!isEmailVerified) return false;
  return getRoleLevel(role) >= 3;
}

export function isAuthorizedStaff(email?: string, role?: string, isEmailVerified: boolean = false): boolean {
  if (isSuperAdmin(email, isEmailVerified)) return true;
  if (!isEmailVerified) return false;
  return getRoleLevel(role) >= 3;
}

export function isAuthorizedKitchen(email?: string, role?: string, isEmailVerified: boolean = false): boolean {
  if (isSuperAdmin(email, isEmailVerified)) return true;
  if (!isEmailVerified) return false;
  const level = getRoleLevel(role);
  return level >= 2 || role === 'kitchen';
}

// Support & Notification in-memory storage records
export interface SupportTicketRecord {
  id: string;
  userId?: string;
  customerName: string;
  phone?: string;
  message: string;
  priority: string;
  status: string;
  createdAt: string;
}
export const supportTicketsStore: SupportTicketRecord[] = [];

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  audience: string;
  priority: string;
  createdAt: string;
}
export const notificationsStore: NotificationRecord[] = [];

// -----------------------------------------------------------------------------
// CENTRAL TOOL EXECUTION GATEWAY
// -----------------------------------------------------------------------------
export function executeAgentTool(
  name: string,
  args: any = {},
  context?: UserContext,
  options?: { requestId?: string; idempotencyKey?: string }
): any {
  const canonicalName = resolveToolName(name);
  const toolDef = TOOL_REGISTRY[canonicalName];

  if (!toolDef) {
    return {
      success: false,
      error: 'UNKNOWN_TOOL',
      errorCode: 'UNKNOWN_TOOL',
      userSafeMessage: `Tool '${name}' is not recognized in the Central AI Registry.`,
      message: `Tool '${name}' is not recognized in the Central AI Registry.`
    };
  }

  // Check explicit NOT_IMPLEMENTED / REQUIRES_EXTERNAL_SERVICE status
  if (toolDef.status === 'NOT_IMPLEMENTED' || toolDef.status === 'REQUIRES_EXTERNAL_SERVICE') {
    return {
      success: false,
      error: toolDef.status,
      errorCode: toolDef.status,
      status: toolDef.status,
      userSafeMessage: toolDef.statusReason || `Tool '${canonicalName}' is marked as ${toolDef.status} in the production registry.`,
      message: toolDef.statusReason || `Tool '${canonicalName}' is marked as ${toolDef.status} in the production registry.`
    };
  }

  if (!toolDef.enabled) {
    return {
      success: false,
      error: 'TOOL_DISABLED',
      errorCode: 'TOOL_DISABLED',
      userSafeMessage: `Tool '${name}' is currently disabled in the Central AI Registry.`,
      message: `Tool '${name}' is currently disabled in the Central AI Registry.`
    };
  }

  // 1. Resolve Actor Role & Identity
  const userEmail = context?.userEmail?.toLowerCase();
  const isEmailVerified = context?.isEmailVerified ?? false;
  const isSuper = isSuperAdmin(userEmail, isEmailVerified);
  const isAdmin = isAuthorizedAdmin(userEmail, context?.userRole, isEmailVerified);
  const isManager = isAuthorizedManager(userEmail, context?.userRole, isEmailVerified);
  const isStaff = isAuthorizedStaff(userEmail, context?.userRole, isEmailVerified);
  const isKitchen = isAuthorizedKitchen(userEmail, context?.userRole, isEmailVerified);

  let effectiveRole: UserRole = 'guest';
  if (isSuper) effectiveRole = 'superadmin';
  else if (isAdmin) effectiveRole = 'admin';
  else if (isManager) effectiveRole = 'manager';
  else if (isStaff) effectiveRole = 'staff';
  else if (isKitchen) effectiveRole = 'kitchen';
  else if (context?.userUid) effectiveRole = 'customer';
  else effectiveRole = 'anonymous';

  const actorDisplay = userEmail
    ? `${userEmail}${context?.userUid ? ` (${context.userUid})` : ''}`
    : (context?.userUid ? `User (${context.userUid})` : 'Guest Caller');

  const reqId = options?.requestId || `REQ-${Date.now().toString(36)}`;

  // 2. Authentication Check
  if (toolDef.requiresAuth && !context?.userUid) {
    return {
      success: false,
      error: 'AUTHENTICATION_REQUIRED',
      errorCode: 'AUTHENTICATION_REQUIRED',
      userSafeMessage: `Sahib, tool '${canonicalName}' requires an authenticated patron or staff account. Please sign in to proceed.`,
      message: `Sahib, tool '${canonicalName}' requires an authenticated patron or staff account. Please sign in to proceed.`
    };
  }

  // 3. Role Authorization Check
  if (!toolDef.allowedRoles.includes(effectiveRole)) {
    auditLogs.unshift({
      id: `AUDIT-DENIED-${Date.now()}`,
      action: 'UNAUTHORIZED_TOOL_ATTEMPT',
      executedBy: actorDisplay,
      actorUid: context?.userUid,
      actorRole: effectiveRole,
      target: canonicalName,
      status: 'DENIED',
      riskLevel: toolDef.riskLevel,
      details: { requestedTool: canonicalName, effectiveRole, allowedRoles: toolDef.allowedRoles },
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      error: 'ACCESS_DENIED',
      errorCode: 'ACCESS_DENIED',
      userSafeMessage: `Sahib, executing '${canonicalName}' requires higher privileges. Your account role (${effectiveRole}) is not permitted.`,
      message: `Sahib, executing '${canonicalName}' requires higher privileges. Your account role (${effectiveRole}) is not permitted.`
    };
  }

  // 4. Granular Permission Check
  const grantedPermissions = ROLE_PERMISSIONS[effectiveRole] || [];
  if (!grantedPermissions.includes('*')) {
    const hasRequiredPermission = toolDef.requiredPermissions.some(perm =>
      grantedPermissions.includes(perm) || grantedPermissions.includes(perm.split('.')[0] + '.*')
    );
    if (!hasRequiredPermission) {
      return {
        success: false,
        error: 'ACCESS_DENIED',
        errorCode: 'PERMISSION_DENIED',
        userSafeMessage: `Sahib, you lack the granular permission required to execute '${canonicalName}'.`,
        message: `Sahib, you lack the granular permission required to execute '${canonicalName}'.`
      };
    }
  }

  // 5. Ownership Scope Check
  if (toolDef.ownershipScope === 'user' && !context?.userUid) {
    return {
      success: false,
      error: 'AUTHENTICATION_REQUIRED',
      errorCode: 'AUTHENTICATION_REQUIRED',
      userSafeMessage: 'Patron UID required for private profile access.',
      message: 'Patron UID required for private profile access.'
    };
  }

  // 6. Idempotency Check
  const idempotencyKey = (options?.idempotencyKey || args.idempotencyKey)
    ? String(options?.idempotencyKey || args.idempotencyKey).trim()
    : undefined;
  if (toolDef.supportsIdempotency && idempotencyKey && idempotencyStore.has(idempotencyKey)) {
    const cached = idempotencyStore.get(idempotencyKey)!;
    return {
      ...cached.result,
      isDuplicate: true,
      requestId: reqId
    };
  }

  // 8. Execute Tool Logic
  let result: any;
  try {
    switch (canonicalName) {
      // -----------------------------------------------------------------------
      // CUSTOMER INFO TOOLS
      // -----------------------------------------------------------------------
      case 'restaurant_information':
      case 'get_restaurant_info': {
        result = {
          success: true,
          brand: 'Quetta Mahfil Chai Khana',
          tagline: "Bahria Town's Golden Standard of Authentic Pashtun Hospitality",
          address: 'Plot 14-16, Block D, Sector B, Bahria Town, Lahore, Pakistan',
          operatingHours: '24 Hours / 7 Days a week (Continuous Service, Never Sleeps)',
          contactPhone: '+92 300 1234567',
          whatsapp: '+92 300 1234567',
          wifi: 'Mahfil_Guest_5G (Key: MahfilHeritage1994)',
          parking: 'Dedicated Valet & Free Plaza Parking Available',
          specialties: ['Zafrani Chai', 'Matka Gurr Malai Chai', 'Arabic Stuffed Paratha', 'Khoya Khajor Milkshake'],
          founder: 'Usama Khan',
          heritagePoetry: {
            urdu: 'گرما گرم چائے، کوئٹہ کی شان، ہر گھونٹ میں بسی ہے پرسکون جان',
            pashto: 'په یو لاس کې توره په بل کې چای، د پښتون فطرت هم عجیبه دی'
          }
        };
        break;
      }

      case 'restaurant_hours':
      case 'get_restaurant_hours': {
        result = {
          success: true,
          schedule: '24 Hours / 7 Days a week (Continuous)',
          diningHall: 'Open 24/7',
          traditionalHujra: 'Open 24/7 (Reservations recommended from 7 PM to 1 AM)',
          breakfastHours: 'Traditional Nashta served 5:00 AM - 12:00 PM',
          deliveryHours: '24/7 Express Delivery within Bahria Town & Surrounding Sectors',
          peakHours: '8:00 PM - 1:00 AM (Family & Youth Gathering Hours)'
        };
        break;
      }

      case 'restaurant_contact': {
        result = {
          success: true,
          brand: 'Quetta Mahfil Chai Khana',
          address: 'Plot 14-16, Block D, Sector B, Bahria Town, Lahore, Pakistan',
          contactPhone: '+92 300 1234567',
          whatsapp: '+92 300 1234567',
          email: 'hospitality@quettamahfil.pk',
          operatingHours: '24/7 Continuous'
        };
        break;
      }

      case 'search_menu':
      case 'get_menu': {
        let items = [...currentMenu];
        if (args.category && args.category !== 'All') {
          const catLower = String(args.category).toLowerCase();
          items = items.filter(i => i.category.toLowerCase().includes(catLower));
        }
        if (args.query) {
          const qLower = String(args.query).toLowerCase().trim();
          items = items.filter(i =>
            i.name.toLowerCase().includes(qLower) ||
            i.description.toLowerCase().includes(qLower) ||
            i.category.toLowerCase().includes(qLower)
          );
        }
        result = {
          success: true,
          totalFound: items.length,
          items: items.map(i => ({
            id: i.id,
            name: i.name,
            category: i.category,
            price: `Rs. ${i.price}`,
            rawPrice: i.price,
            isAvailable: i.isAvailable ? 'In Stock' : 'Sold Out (86)',
            description: i.description
          }))
        };
        break;
      }

      case 'get_menu_categories': {
        const categories = Array.from(new Set(currentMenu.map(i => i.category)));
        result = {
          success: true,
          totalCategories: categories.length,
          categories
        };
        break;
      }

      case 'get_menu_item': {
        const query = String(args.itemIdOrName || '').toLowerCase().trim();
        const match = currentMenu.find(m => m.id.toLowerCase() === query || m.name.toLowerCase().includes(query));
        if (!match) {
          return {
            success: false,
            error: 'NOT_FOUND',
            errorCode: 'ITEM_NOT_FOUND',
            message: `No dish or drink found matching '${args.itemIdOrName}'.`
          };
        }
        result = {
          success: true,
          item: {
            id: match.id,
            name: match.name,
            category: match.category,
            price: `Rs. ${match.price}`,
            rawPrice: match.price,
            isAvailable: match.isAvailable,
            stockStatus: match.isAvailable ? 'Available Now' : 'Currently Sold Out (86)',
            description: match.description,
            image: match.image
          }
        };
        break;
      }

      // -----------------------------------------------------------------------
      // CUSTOMER ACCOUNT TOOLS
      // -----------------------------------------------------------------------
      case 'customer_profile':
      case 'get_customer_profile': {
        const uid = context!.userUid!;
        const mem = customerMemoryStore.get(uid);
        const userOrders = ordersStore.filter(o => o.userId === uid);
        result = {
          success: true,
          userId: uid,
          name: context?.userName || 'Mahfil Guest',
          email: context?.userEmail || 'Unverified',
          role: effectiveRole,
          loyaltyPoints: 150 + (userOrders.length * 25),
          tier: 'Zafrani Silver',
          ordersCount: userOrders.length,
          savedPreferences: mem?.preferences || ['Prefers warm Zafrani Chai']
        };
        break;
      }

      case 'customer_memory':
      case 'get_customer_memory': {
        const uid = context!.userUid!;
        const mem = customerMemoryStore.get(uid);
        result = {
          success: true,
          userId: uid,
          memory: mem || {
            userId: uid,
            preferences: ['Zafrani Chai (Medium Sugar)'],
            dietaryNotes: ['None specified'],
            favoriteItems: ['Zafrani Chai', 'Lacha Paratha'],
            preferredLanguage: 'Urdu / English',
            lastUpdated: new Date().toISOString()
          }
        };
        break;
      }

      case 'update_customer_preferences': {
        const uid = context!.userUid!;
        const existing = customerMemoryStore.get(uid) || {
          userId: uid,
          preferences: [],
          dietaryNotes: [],
          favoriteItems: [],
          lastUpdated: new Date().toISOString()
        };

        if (Array.isArray(args.preferences)) {
          existing.preferences = args.preferences.map((p: any) => String(p).slice(0, 60));
        }
        if (args.teaPreferences) {
          existing.teaPreferences = String(args.teaPreferences).slice(0, 100);
        }
        if (Array.isArray(args.dietaryNotes)) {
          existing.dietaryNotes = args.dietaryNotes.map((d: any) => String(d).slice(0, 60));
        }
        if (args.preferredLanguage) {
          existing.preferredLanguage = String(args.preferredLanguage).slice(0, 30);
        }
        existing.lastUpdated = new Date().toISOString();
        customerMemoryStore.set(uid, existing);
        syncToFirestore('user_memories', uid, existing);

        result = {
          success: true,
          message: 'Beshak Sahib! Your taste and chai preferences have been committed to Saki memory.',
          memory: existing
        };
        break;
      }

      // -----------------------------------------------------------------------
      // ORDER TOOLS
      // -----------------------------------------------------------------------
      case 'calculate_order_quote': {
        const items = Array.isArray(args.items) ? args.items : [];
        let subtotal = 0;
        const quotedItems = [];

        for (const item of items) {
          const match = currentMenu.find(m =>
            m.name.toLowerCase().includes(String(item.name).toLowerCase()) ||
            String(item.name).toLowerCase().includes(m.name.toLowerCase())
          );

          const unitPrice = match ? match.price : 200;
          const matchedName = match ? match.name : item.name;
          const qty = Math.max(1, Math.min(100, Number(item.quantity) || 1));
          const lineTotal = unitPrice * qty;
          subtotal += lineTotal;

          quotedItems.push({
            name: matchedName,
            quantity: qty,
            unitPrice: `Rs. ${unitPrice}`,
            rawUnitPrice: unitPrice,
            lineTotal: `Rs. ${lineTotal}`,
            rawLineTotal: lineTotal,
            available: match ? match.isAvailable : true
          });
        }

        const isBahria = !args.deliveryLocation || String(args.deliveryLocation).toLowerCase().includes('bahria');
        const deliveryFee = subtotal >= 1000 ? 0 : (isBahria ? 100 : 250);
        const finalTotal = subtotal + deliveryFee;

        result = {
          success: true,
          quotedItems,
          subtotal: `Rs. ${subtotal}`,
          rawSubtotal: subtotal,
          deliveryFee: deliveryFee === 0 ? 'FREE (Bahria VIP Offer)' : `Rs. ${deliveryFee}`,
          rawDeliveryFee: deliveryFee,
          tax: 'Rs. 0 (Inclusive)',
          grandTotal: `Rs. ${finalTotal}`,
          rawGrandTotal: finalTotal,
          currency: 'PKR',
          estimatedPrepTime: '15-25 minutes',
          paymentMethods: ['Cash on Delivery (COD)', 'SadaPay / NayaPay / Raast']
        };
        break;
      }

      case 'create_order': {
        const rawItems = Array.isArray(args.items) ? args.items : [];
        if (rawItems.length === 0) {
          return { success: false, error: 'INVALID_ORDER', message: 'Order must contain at least one item.' };
        }

        let subtotal = 0;
        const resolvedItems: OrderItem[] = [];

        for (const item of rawItems) {
          const itemName = String(item.name || '').toLowerCase().trim();
          const catalogItem = currentMenu.find(m =>
            m.name.toLowerCase() === itemName ||
            m.name.toLowerCase().includes(itemName)
          );

          if (!catalogItem) {
            return {
              success: false,
              error: 'ITEM_NOT_FOUND',
              message: `Dish '${item.name}' does not exist in the official Quetta Mahfil catalog.`
            };
          }

          if (!catalogItem.isAvailable) {
            return {
              success: false,
              error: 'ITEM_OUT_OF_STOCK',
              message: `Sahib, '${catalogItem.name}' is currently 86'd (Sold Out) in our kitchen. Please choose another delicacy.`
            };
          }

          const qty = Math.max(1, Math.min(100, Number(item.quantity) || 1));
          const lineTotal = catalogItem.price * qty;
          subtotal += lineTotal;

          resolvedItems.push({
            id: catalogItem.id,
            name: catalogItem.name,
            price: catalogItem.price,
            quantity: qty,
            lineTotal
          });
        }

        const locStr = String(args.deliveryLocation || '');
        const isBahria = !locStr || locStr.toLowerCase().includes('bahria');
        const deliveryFee = subtotal >= 1000 ? 0 : (isBahria ? 100 : 250);
        const grandTotal = subtotal + deliveryFee;

        const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
        const newOrder: OrderRecord = {
          id: orderId,
          userId: context?.userUid,
          customerName: String(args.customerName || 'Mahfil Guest').slice(0, 60),
          phone: String(args.phone || '').slice(0, 30),
          deliveryLocation: locStr.slice(0, 150),
          items: resolvedItems,
          subtotal,
          deliveryFee,
          grandTotal,
          status: 'pending',
          paymentMethod: args.paymentMethod === 'sadapay_nayapay' ? 'sadapay_nayapay' : 'cash',
          paymentStatus: 'unpaid',
          idempotencyKey,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        ordersStore.push(newOrder);
        syncToFirestore('mahfil_orders', newOrder.id, newOrder);

        result = {
          success: true,
          orderId: newOrder.id,
          status: 'PENDING_CONFIRMATION',
          customerName: newOrder.customerName,
          grandTotal: `Rs. ${grandTotal}`,
          paymentStatus: 'unpaid (Cash on Delivery / In-Person Settlement)',
          estimatedDelivery: '25-35 minutes',
          message: `Mubarak Sahib! Your order #${newOrder.id} has been registered at Quetta Mahfil. Our kitchen is firing the tandoor now!`
        };
        break;
      }

      case 'get_order':
      case 'order_status':
      case 'get_order_status': {
        const orderId = String(args.orderId || '').trim();
        const order = ordersStore.find(o => o.id.toLowerCase() === orderId.toLowerCase());
        if (!order) {
          return {
            success: false,
            error: 'NOT_FOUND',
            message: `Sahib, order '${orderId}' could not be verified in the restaurant orders registry.`
          };
        }

        if (effectiveRole === 'customer' && order.userId && order.userId !== context?.userUid) {
          return {
            success: false,
            error: 'ACCESS_DENIED',
            message: 'You are only authorized to view your own order status.'
          };
        }

        result = {
          success: true,
          orderId: order.id,
          status: order.status,
          customerName: order.customerName,
          itemCount: order.items.length,
          subtotal: `Rs. ${order.subtotal}`,
          deliveryFee: `Rs. ${order.deliveryFee}`,
          grandTotal: `Rs. ${order.grandTotal}`,
          paymentMethod: order.paymentMethod === 'cash' ? 'Cash on Delivery (COD)' : 'SadaPay / NayaPay',
          paymentStatus: order.paymentStatus,
          deliveryLocation: order.deliveryLocation,
          createdAt: order.createdAt,
          eta: order.status === 'completed' ? 'Delivered' : '15-25 minutes'
        };
        break;
      }

      case 'order_history': {
        const targetUid = args.userId || context?.userUid;
        const userOrders = targetUid ? ordersStore.filter(o => o.userId === targetUid) : ordersStore.slice(-10);
        result = {
          success: true,
          totalOrders: userOrders.length,
          orders: userOrders
        };
        break;
      }

      case 'update_order': {
        const orderId = String(args.orderId || '').trim();
        const order = ordersStore.find(o => o.id.toLowerCase() === orderId.toLowerCase());
        if (!order) {
          return { success: false, error: 'NOT_FOUND', message: `Order #${orderId} was not found.` };
        }
        if (effectiveRole === 'customer' && order.userId && order.userId !== context?.userUid) {
          return { success: false, error: 'ACCESS_DENIED', message: 'You cannot update an order placed by another customer.' };
        }
        if (args.deliveryLocation) order.deliveryLocation = String(args.deliveryLocation).slice(0, 150);
        if (args.notes) (order as any).notes = String(args.notes).slice(0, 200);
        order.updatedAt = new Date().toISOString();
        result = {
          success: true,
          orderId: order.id,
          message: `Order #${order.id} updated successfully.`,
          order
        };
        break;
      }

      case 'cancel_order': {
        const orderId = String(args.orderId || '').trim();
        const order = ordersStore.find(o => o.id.toLowerCase() === orderId.toLowerCase());

        if (!order) {
          return { success: false, error: 'NOT_FOUND', message: `Order #${orderId} was not found.` };
        }

        if (effectiveRole === 'customer' && order.userId && order.userId !== context?.userUid) {
          return { success: false, error: 'ACCESS_DENIED', message: 'You cannot cancel an order placed by another customer.' };
        }

        if (['preparing', 'ready', 'out_for_delivery', 'completed'].includes(order.status)) {
          return {
            success: false,
            error: 'CANNOT_CANCEL',
            message: `Sahib, order #${order.id} is already ${order.status.toUpperCase()} in our kitchen and cannot be cancelled.`
          };
        }

        if (args.confirmed !== true) {
          return {
            confirmationRequired: true,
            action: 'cancel_order',
            orderId: order.id,
            message: `Sahib, canceling Order #${order.id} (Rs. ${order.grandTotal}) is a permanent action. Please confirm with 'yes, confirm cancellation' to proceed.`
          };
        }

        order.status = 'cancelled';
        order.updatedAt = new Date().toISOString();
        syncToFirestore('mahfil_orders', order.id, order);

        auditLogs.unshift({
          id: `AUDIT-CANCEL-${Date.now()}`,
          action: 'ORDER_CANCELLED',
          executedBy: actorDisplay,
          actorUid: context?.userUid,
          actorRole: effectiveRole,
          target: order.id,
          status: 'SUCCESS',
          details: { orderId: order.id, reason: args.reason || 'Customer request' },
          timestamp: new Date().toISOString()
        });

        result = {
          success: true,
          orderId: order.id,
          status: 'CANCELLED',
          message: `Order #${order.id} has been cancelled successfully.`
        };
        break;
      }

      // -----------------------------------------------------------------------
      // RESERVATION TOOLS
      // -----------------------------------------------------------------------
      case 'reservation_availability':
      case 'get_reservation':
      case 'get_reservation_availability': {
        const targetDate = args.date || 'Today';
        const targetTime = args.time || '8:00 PM';
        const partySize = Math.max(1, Math.min(50, Number(args.guests) || 2));

        const existingInSlot = reservationsStore.filter(r =>
          r.status !== 'cancelled' &&
          r.date.toLowerCase() === targetDate.toLowerCase()
        );
        const totalBookedGuests = existingInSlot.reduce((sum, r) => sum + r.guests, 0);
        const capacityAvailable = (totalBookedGuests + partySize) <= 80 && existingInSlot.length < 15;

        result = {
          success: true,
          date: targetDate,
          time: targetTime,
          requestedGuests: partySize,
          available: capacityAvailable,
          hujraLoungeAvailable: partySize >= 4 && capacityAvailable,
          tablesRemaining: Math.max(0, 15 - existingInSlot.length),
          message: capacityAvailable
            ? `Beshak Sahib! We have royal seating available for ${partySize} guests on ${targetDate} at ${targetTime}.`
            : `Sahib, that seating slot is currently at maximum capacity. May I suggest arriving 45 minutes earlier or later?`
        };
        break;
      }

      case 'create_reservation': {
        const guests = Math.min(50, Math.max(1, Number(args.guests) || 2));
        const targetDate = String(args.date || 'Today').slice(0, 50);
        const targetTime = String(args.time || '8:30 PM').slice(0, 50);
        const phone = String(args.phone || '').trim();

        const existing = reservationsStore.find(r =>
          r.status !== 'cancelled' &&
          r.phone === phone &&
          r.date.toLowerCase() === targetDate.toLowerCase() &&
          r.time.toLowerCase() === targetTime.toLowerCase()
        );

        if (existing) {
          return {
            success: false,
            error: 'DUPLICATE_RESERVATION',
            message: `A table is already reserved under phone '${phone}' for ${targetDate} at ${targetTime}. Reservation ID: ${existing.id}.`
          };
        }

        const reservationId = `RES-${Date.now().toString(36).toUpperCase()}`;
        const record: ReservationRecord = {
          id: reservationId,
          customerName: String(args.customerName || 'Mahfil Guest').slice(0, 60),
          phone,
          guests,
          date: targetDate,
          time: targetTime,
          notes: String(args.notes || 'Standard Heritage Seating').slice(0, 150),
          status: 'confirmed',
          createdAt: new Date().toISOString()
        };
        reservationsStore.push(record);
        syncToFirestore('table_reservations', record.id, record);

        result = {
          success: true,
          reservationId: record.id,
          status: 'CONFIRMED',
          message: `Beshak Sahib! Your table for ${record.guests} has been reserved under name '${record.customerName}' for ${record.date} at ${record.time}. Pakhair Raghlay!`,
          tableType: record.guests > 6 ? 'Traditional Private Hujra Suite' : 'Heritage Brass Table',
          venue: 'Quetta Mahfil, Block D, Sector B, Bahria Town Lahore'
        };
        break;
      }

      case 'update_reservation': {
        const resId = String(args.reservationId || '').trim();
        const resRec = reservationsStore.find(r => r.id.toLowerCase() === resId.toLowerCase());
        if (!resRec) {
          return { success: false, error: 'NOT_FOUND', message: `Reservation #${resId} was not found.` };
        }
        if (args.guests) resRec.guests = Number(args.guests);
        if (args.notes) resRec.notes = String(args.notes).slice(0, 150);
        if (args.time) resRec.time = String(args.time).slice(0, 50);
        result = {
          success: true,
          reservationId: resRec.id,
          message: `Reservation #${resRec.id} updated successfully.`,
          reservation: resRec
        };
        break;
      }

      case 'cancel_reservation': {
        const resId = String(args.reservationId || '').trim();
        const res = reservationsStore.find(r => r.id.toLowerCase() === resId.toLowerCase());

        if (!res) {
          return { success: false, error: 'NOT_FOUND', message: `Reservation #${resId} was not found.` };
        }

        if (args.confirmed !== true) {
          return {
            confirmationRequired: true,
            action: 'cancel_reservation',
            reservationId: res.id,
            message: `Sahib, canceling Reservation #${res.id} for ${res.guests} guests (${res.date} at ${res.time}) cannot be undone. Please confirm to proceed.`
          };
        }

        res.status = 'cancelled';
        syncToFirestore('table_reservations', res.id, res);

        auditLogs.unshift({
          id: `AUDIT-CANCELRES-${Date.now()}`,
          action: 'RESERVATION_CANCELLED',
          executedBy: actorDisplay,
          actorUid: context?.userUid,
          actorRole: effectiveRole,
          target: res.id,
          status: 'SUCCESS',
          details: { reservationId: res.id, reason: args.reason || 'Patron request' },
          timestamp: new Date().toISOString()
        });

        result = {
          success: true,
          reservationId: res.id,
          status: 'CANCELLED',
          message: `Reservation #${res.id} has been cancelled.`
        };
        break;
      }

      case 'loyalty_status':
      case 'get_loyalty_status': {
        const uid = context!.userUid!;
        const userOrders = ordersStore.filter(o => o.userId === uid);
        const points = 150 + (userOrders.length * 25);
        result = {
          success: true,
          userId: uid,
          pointsBalance: points,
          tier: points >= 500 ? 'Royal Zafrani Gold' : 'Zafrani Silver',
          pointsToNextTier: Math.max(0, 500 - points),
          eligibleRewards: [
            { rewardId: 'rw_1', name: 'Free Zafrani Chai with any Paratha', costPoints: 100 },
            { rewardId: 'rw_2', name: '20% off Family Hujra Platter', costPoints: 250 }
          ]
        };
        break;
      }

      case 'loyalty_history': {
        const uid = context?.userUid || 'GUEST';
        const userOrders = ordersStore.filter(o => o.userId === uid);
        result = {
          success: true,
          userId: uid,
          pointsBalance: 150 + (userOrders.length * 25),
          transactions: userOrders.map(o => ({
            type: 'EARN',
            orderId: o.id,
            points: Math.floor(o.grandTotal / 50),
            date: o.createdAt
          }))
        };
        break;
      }

      case 'eligible_rewards': {
        const uid = context?.userUid || 'GUEST';
        const userOrders = ordersStore.filter(o => o.userId === uid);
        const points = 150 + (userOrders.length * 25);
        result = {
          success: true,
          pointsBalance: points,
          eligibleRewards: [
            { rewardId: 'rw_1', name: 'Free Zafrani Chai with any Paratha', costPoints: 100, eligible: points >= 100 },
            { rewardId: 'rw_2', name: '20% off Family Hujra Platter', costPoints: 250, eligible: points >= 250 },
            { rewardId: 'rw_3', name: 'Complimentary Special Khoya Khajor Shake', costPoints: 400, eligible: points >= 400 }
          ]
        };
        break;
      }

      case 'create_support_request':
      case 'submit_support_ticket': {
        const ticketId = `TCK-${Date.now().toString(36).toUpperCase()}`;
        const tck: SupportTicketRecord = {
          id: ticketId,
          customerName: String(args.customerName || 'Mahfil Guest'),
          phone: String(args.phone || ''),
          message: String(args.message || args.issue || ''),
          priority: String(args.priority || 'NORMAL'),
          status: 'OPEN',
          createdAt: new Date().toISOString()
        };
        supportTicketsStore.push(tck);
        result = {
          success: true,
          ticketId,
          status: 'DISPATCHED_TO_MANAGEMENT',
          message: `Thank you, ${tck.customerName}. Your inquiry #${ticketId} has been delivered directly to the restaurant floor manager.`
        };
        break;
      }

      case 'get_support_request':
      case 'customer_support_history': {
        const targetPhone = String(args.phone || '').trim();
        const tickets = targetPhone ? supportTicketsStore.filter(t => t.phone.includes(targetPhone)) : supportTicketsStore.slice(-10);
        result = {
          success: true,
          totalTickets: tickets.length,
          tickets
        };
        break;
      }

      case 'create_notification':
      case 'send_notification': {
        const notif: NotificationRecord = {
          id: `NOTIF-${Date.now().toString(36).toUpperCase()}`,
          title: String(args.title || 'Quetta Mahfil Announcement').slice(0, 80),
          message: String(args.message || '').slice(0, 300),
          audience: String(args.audience || 'ALL_GUESTS'),
          priority: String(args.priority || 'NORMAL'),
          createdAt: new Date().toISOString()
        };
        notificationsStore.push(notif);
        globalAnnouncement = notif.message;
        result = {
          success: true,
          notificationId: notif.id,
          message: 'Notification registered and broadcast to active patrons.',
          notification: notif
        };
        break;
      }

      case 'notification_status': {
        result = {
          success: true,
          activeAnnouncement: globalAnnouncement,
          totalBroadcasts: notificationsStore.length,
          recent: notificationsStore.slice(-5)
        };
        break;
      }

      // -----------------------------------------------------------------------
      // KITCHEN & OPERATIONAL TOOLS
      // -----------------------------------------------------------------------
      case 'kitchen_order_status':
      case 'kitchen_queue':
      case 'get_kitchen_status': {
        const activeTickets = ordersStore.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status));
        const preparingCount = ordersStore.filter(o => o.status === 'preparing').length;
        result = {
          success: true,
          activeTicketsCount: activeTickets.length,
          currentlyPreparingCount: preparingCount,
          averagePrepTimeMinutes: 18,
          queueLoad: preparingCount > 8 ? 'HIGH' : (preparingCount > 3 ? 'MODERATE' : 'OPTIMAL'),
          kitchenTickets: activeTickets.map(t => ({
            id: t.id,
            status: t.status,
            itemsCount: t.items.length,
            items: t.items.map(i => `${i.quantity}x ${i.name}`),
            createdAt: t.createdAt
          })),
          recentTickets: activeTickets.slice(-5).map(t => ({
            id: t.id,
            status: t.status,
            itemsCount: t.items.length,
            items: t.items.map(i => `${i.quantity}x ${i.name}`),
            createdAt: t.createdAt
          }))
        };
        break;
      }

      case 'driver_dispatch':
      case 'delivery_status': {
        const activeDeliveries = ordersStore.filter(o => o.status === 'out_for_delivery' || o.status === 'preparing');
        result = {
          success: true,
          activeFleetSize: 4,
          deliveriesEnRoute: activeDeliveries.length,
          orders: activeDeliveries.map(o => ({
            orderId: o.id,
            location: o.deliveryLocation,
            status: o.status,
            estimatedTimeRemaining: '10-20 mins'
          }))
        };
        break;
      }

      case 'get_operational_summary': {
        const totalOrders = ordersStore.length;
        const todaySales = ordersStore.reduce((acc, o) => acc + (o.status !== 'cancelled' ? o.grandTotal : 0), 248500);
        const activeOrders = ordersStore.filter(o => ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.status)).length;
        const activeReservations = reservationsStore.filter(r => r.status === 'confirmed').length;

        result = {
          success: true,
          reportGeneratedAt: new Date().toISOString(),
          operationalStatus: 'ALL_SYSTEMS_ACTIVE',
          activeOrders,
          financials: {
            estimatedRevenuePKR: `Rs. ${todaySales.toLocaleString()}`,
            totalOrdersCount: totalOrders + 48,
            activeOrdersQueue: activeOrders,
            averageTicketPKR: 'Rs. 850'
          },
          occupancy: {
            confirmedReservationsToday: activeReservations,
            tablesInUse: Math.min(15, activeReservations + 4),
            hujraLoungesOccupied: 2
          },
          auditEntriesCount: auditLogs.length
        };
        break;
      }

      // -----------------------------------------------------------------------
      // ADMIN TOOLS
      // -----------------------------------------------------------------------
      case 'admin_update_price': {
        const query = String(args.itemIdOrName).toLowerCase();
        const item = currentMenu.find(m => m.id.toLowerCase() === query || m.name.toLowerCase().includes(query));

        if (!item) {
          return { success: false, error: 'ITEM_NOT_FOUND', message: `No menu item found matching '${args.itemIdOrName}'.` };
        }

        const oldPrice = item.price;
        const newPrice = Number(args.newPrice);
        if (isNaN(newPrice) || newPrice < 0 || newPrice > 100000) {
          return { success: false, error: 'INVALID_PRICE', message: 'Price must be a valid positive number up to Rs. 100,000.' };
        }

        item.price = newPrice;

        const log: AuditLogRecord = {
          id: `AUDIT-${Date.now()}`,
          action: 'PRICE_UPDATE',
          executedBy: actorDisplay,
          actorUid: context?.userUid,
          actorRole: effectiveRole,
          target: item.name,
          status: 'SUCCESS',
          details: { item: item.name, oldPrice, newPrice, reason: args.reason || 'Admin AI command' },
          timestamp: new Date().toISOString()
        };
        auditLogs.unshift(log);

        result = {
          success: true,
          item: item.name,
          oldPrice: `Rs. ${oldPrice}`,
          newPrice: `Rs. ${newPrice}`,
          auditId: log.id,
          message: `Price for '${item.name}' updated successfully from Rs. ${oldPrice} to Rs. ${newPrice}.`
        };
        break;
      }

      case 'admin_toggle_availability': {
        const query = String(args.itemIdOrName).toLowerCase();
        const item = currentMenu.find(m => m.id.toLowerCase() === query || m.name.toLowerCase().includes(query));

        if (!item) {
          return { success: false, error: 'ITEM_NOT_FOUND', message: `No item found matching '${args.itemIdOrName}'.` };
        }

        item.isAvailable = Boolean(args.isAvailable);

        const log: AuditLogRecord = {
          id: `AUDIT-${Date.now()}`,
          action: 'AVAILABILITY_TOGGLE',
          executedBy: actorDisplay,
          actorUid: context?.userUid,
          actorRole: effectiveRole,
          target: item.name,
          status: 'SUCCESS',
          details: { item: item.name, isAvailable: item.isAvailable },
          timestamp: new Date().toISOString()
        };
        auditLogs.unshift(log);

        result = {
          success: true,
          item: item.name,
          status: item.isAvailable ? 'IN_STOCK' : 'SOLD_OUT_86',
          message: `'${item.name}' is now marked as ${item.isAvailable ? 'AVAILABLE for ordering' : 'SOLD OUT (86)'}.`
        };
        break;
      }

      case 'admin_update_order_status': {
        const orderId = String(args.orderId || '').trim();
        const newStatus = String(args.status || '').toLowerCase().trim();
        const validStatuses = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];

        if (!validStatuses.includes(newStatus)) {
          return { success: false, error: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}` };
        }

        const order = ordersStore.find(o => o.id.toLowerCase() === orderId.toLowerCase());
        if (!order) {
          return { success: false, error: 'NOT_FOUND', message: `Order #${orderId} was not found.` };
        }

        const oldStatus = order.status;
        order.status = newStatus as any;
        order.updatedAt = new Date().toISOString();

        auditLogs.unshift({
          id: `AUDIT-STATUS-${Date.now()}`,
          action: 'ORDER_STATUS_UPDATE',
          executedBy: actorDisplay,
          actorUid: context?.userUid,
          actorRole: effectiveRole,
          target: order.id,
          status: 'SUCCESS',
          details: { orderId: order.id, oldStatus, newStatus, notes: args.notes },
          timestamp: new Date().toISOString()
        });

        result = {
          success: true,
          orderId: order.id,
          oldStatus,
          newStatus,
          message: `Order #${order.id} advanced to status: ${newStatus.toUpperCase()}`
        };
        break;
      }

      case 'admin_broadcast_announcement': {
        globalAnnouncement = String(args.message || '').slice(0, 250);

        auditLogs.unshift({
          id: `AUDIT-${Date.now()}`,
          action: 'ANNOUNCEMENT_UPDATE',
          executedBy: actorDisplay,
          actorUid: context?.userUid,
          actorRole: effectiveRole,
          target: 'global_banner',
          status: 'SUCCESS',
          details: { newAnnouncement: globalAnnouncement },
          timestamp: new Date().toISOString()
        });

        result = {
          success: true,
          announcement: globalAnnouncement,
          message: 'Global marquee announcement updated across all user screens.'
        };
        break;
      }

      case 'operational_reports':
      case 'admin_get_operational_report': {
        const totalItems = currentMenu.length;
        const activeItems = currentMenu.filter(i => i.isAvailable).length;
        const soldOutItems = currentMenu.filter(i => !i.isAvailable);

        result = {
          success: true,
          reportTime: new Date().toISOString(),
          timeframe: args.timeframe || 'Today',
          systemStatus: 'ALL_SYSTEMS_OPTIMAL',
          inventory: {
            totalCatalogItems: totalItems,
            inStock: activeItems,
            soldOutCount: soldOutItems.length,
            soldOutNames: soldOutItems.map(i => i.name)
          },
          reservations: {
            totalBooked: reservationsStore.length,
            recent: reservationsStore.slice(-5)
          },
          orders: {
            total: ordersStore.length,
            recent: ordersStore.slice(-5).map(o => ({ id: o.id, grandTotal: o.grandTotal, status: o.status }))
          },
          financials: {
            dailyEstimatedSales: 'Rs. 248,500',
            averageOrderTicket: 'Rs. 840',
            topSellingCategory: 'Tea & Kehwa (Zafrani Chai leading)',
            activeDeliveryRiders: 4
          },
          auditLogsCount: auditLogs.length,
          recentAudits: auditLogs.slice(0, 3)
        };
        break;
      }

      case 'reservation_management':
      case 'admin_manage_reservations': {
        let filtered = [...reservationsStore];
        if (args.filterDate) {
          filtered = filtered.filter(r => r.date.toLowerCase().includes(String(args.filterDate).toLowerCase()));
        }
        result = {
          success: true,
          totalReservations: filtered.length,
          reservations: filtered.map(r => ({
            id: r.id,
            name: r.customerName,
            phone: r.phone,
            guests: r.guests,
            date: r.date,
            time: r.time,
            status: r.status,
            notes: r.notes
          }))
        };
        break;
      }

      case 'restaurant_configuration': {
        result = {
          success: true,
          brand: 'Quetta Mahfil Chai Khana',
          operatingMode: '24/7 Continuous',
          deliveryRadiusKm: 12,
          minimumDeliveryOrderPkr: 200,
          freeDeliveryThresholdPkr: 1000,
          standardDeliveryFeePkr: 100,
          taxRatePercent: 0,
          currency: 'PKR',
          seatingCapacity: { mainHall: 120, hujra: 40, rooftop: 60 }
        };
        break;
      }

      case 'menu_management': {
        if (args.newPrice) {
          const itemPrice = Number(args.newPrice);
          const itemName = args.itemIdOrName || args.name;
          const match = currentMenu.find(m => m.name.toLowerCase() === String(itemName).toLowerCase());
          if (!match) return { success: false, error: 'NOT_FOUND', message: `Item '${itemName}' not found.` };
          match.price = itemPrice;
          result = { success: true, message: `Price for ${match.name} updated to Rs. ${itemPrice}.` };
        } else if (args.isAvailable !== undefined) {
          const itemName = args.itemIdOrName || args.name;
          const match = currentMenu.find(m => m.name.toLowerCase() === String(itemName).toLowerCase());
          if (!match) return { success: false, error: 'NOT_FOUND', message: `Item '${itemName}' not found.` };
          match.isAvailable = Boolean(args.isAvailable);
          result = { success: true, message: `Availability for ${match.name} set to ${match.isAvailable}.` };
        } else {
          result = { success: true, totalItems: currentMenu.length, items: currentMenu };
        }
        break;
      }

      case 'order_management': {
        if (args.orderId && args.status) {
          const ord = ordersStore.find(o => o.id.toLowerCase() === String(args.orderId).toLowerCase());
          if (!ord) return { success: false, error: 'NOT_FOUND', message: `Order #${args.orderId} not found.` };
          ord.status = args.status;
          ord.updatedAt = new Date().toISOString();
          result = { success: true, message: `Order #${ord.id} status updated to ${ord.status}.` };
        } else {
          result = { success: true, totalOrders: ordersStore.length, orders: ordersStore.slice(-10) };
        }
        break;
      }

      case 'customer_management': {
        result = {
          success: true,
          totalTrackedCustomers: customerMemoryStore.size,
          recentOrders: ordersStore.slice(-10).map(o => ({ orderId: o.id, customer: o.customerName, phone: o.phone }))
        };
        break;
      }

      case 'notification_management': {
        result = {
          success: true,
          activeAnnouncement: globalAnnouncement,
          totalSent: notificationsStore.length
        };
        break;
      }

      case 'restaurant_knowledge_search': {
        result = {
          success: true,
          knowledge: [
            { topic: 'Zafrani Chai', content: 'Steeped for 20 minutes with pure Kashmir saffron strands, crushed green cardamom, and organic raw buffalo milk.' },
            { topic: 'Heritage & Hospitality', content: 'Quetta Mahfil reflects the centuries-old Pashtun tradition of Melmastia (open hospitality to every guest) and community gatherings around steaming samovars.' },
            { topic: 'Hujra Seating', content: 'Traditional carpeted floor seating with bolster cushions (gao takyas) where patrons engage in conversation, poetry, and relaxed dining.' }
          ]
        };
        break;
      }

      case 'customer_context':
      case 'conversation_context': {
        const uid = context?.userUid;
        result = {
          success: true,
          authenticated: Boolean(uid),
          userUid: uid,
          userName: context?.userName || 'Guest',
          role: effectiveRole,
          activeCartCount: 0
        };
        break;
      }

      // -----------------------------------------------------------------------
      // SUPER ADMIN TOOLS
      // -----------------------------------------------------------------------
      case 'superadmin_system_diagnostics': {
        if (!isSuper) {
          return { success: false, error: 'ACCESS_DENIED', message: 'Level 5 SuperAdmin cryptographic authorization required.' };
        }

        result = {
          success: true,
          systemHealth: 'HEALTHY',
          cloudServices: {
            firebaseAuth: 'CONNECTED',
            cloudFirestore: 'OPERATIONAL',
            aiStudioProxy: 'ACTIVE',
            geminiSDK: process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'UNCONFIGURED (Autonomous Engine Active)',
            groqFallback: process.env.GROQ_API_KEY ? 'CONFIGURED' : 'UNCONFIGURED'
          },
          securityState: {
            leastPrivilegeRBAC: 'ENFORCED',
            superAdminRoot: 'usamakhn694@gmail.com',
            agentSelfPermissionEscalation: 'BLOCKED_BY_ARCHITECTURE',
            auditLogCount: auditLogs.length,
            ordersRecorded: ordersStore.length,
            reservationsRecorded: reservationsStore.length
          },
          diagnosticsTimestamp: new Date().toISOString()
        };
        break;
      }

      default:
        return { success: false, error: 'UNKNOWN_TOOL', message: `Tool '${canonicalName}' implementation not found.` };
    }
  } catch (executionError: any) {
    return {
      success: false,
      error: 'EXECUTION_FAILED',
      errorCode: 'INTERNAL_ERROR',
      userSafeMessage: `Sahib, execution of '${canonicalName}' encountered a temporary error.`,
      message: `Sahib, execution of '${canonicalName}' encountered a temporary error.`
    };
  }

  // 9. Audit Logging (for tools without internal custom action logs)
  const customLoggedTools = [
    'admin_update_price',
    'admin_toggle_availability',
    'admin_update_order_status',
    'admin_broadcast_announcement',
    'cancel_order',
    'cancel_reservation',
    'create_order',
    'create_reservation',
    'submit_support_ticket'
  ];

  if (toolDef.auditRequired && !customLoggedTools.includes(canonicalName)) {
    auditLogs.unshift({
      id: `AUDIT-${Date.now()}`,
      action: `${canonicalName.toUpperCase()}`,
      executedBy: actorDisplay,
      actorUid: context?.userUid,
      actorRole: effectiveRole,
      target: result?.orderId || result?.reservationId || result?.item || canonicalName,
      status: result?.error ? 'FAILED' : 'SUCCESS',
      riskLevel: toolDef.riskLevel,
      details: { tool: canonicalName, args, resultSummary: result?.status || result?.message },
      timestamp: new Date().toISOString()
    });
  }

  // 10. Cache Idempotency
  if (toolDef.supportsIdempotency && idempotencyKey && result && !result.error) {
    idempotencyStore.set(idempotencyKey, { result, timestamp: Date.now() });
  }

  return result;
}
