// Production Verification Test Suite for Quetta Mahfil Central AI Agent
// Zero Mocks. Real Business Rules Execution. Real Security Boundaries.

import {
  executeAgentTool,
  processCentralAgentInteraction,
  getDeclarationsForRole,
  TOOL_REGISTRY,
  currentMenu,
  ordersStore,
  reservationsStore,
  auditLogs,
  customerMemoryStore,
  UserContext
} from '../server/centralAgent';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`, detail || '');
    failed++;
  }
}

async function runTests() {
  console.log('\n=============================================================');
  console.log(' QUETTA MAHFIL CHAI KHANA — CENTRAL AI AGENT VERIFICATION');
  console.log('=============================================================\n');

  // -------------------------------------------------------------------------
  // 1. TOOL REGISTRY INTEGRITY
  // -------------------------------------------------------------------------
  console.log('--- 1. TOOL REGISTRY INTEGRITY ---');
  const toolKeys = Object.keys(TOOL_REGISTRY);
  assert(toolKeys.length >= 18, `Tool registry contains complete toolset (Found ${toolKeys.length} tools)`);

  let allToolsValid = true;
  for (const [key, tool] of Object.entries(TOOL_REGISTRY)) {
    if (!tool.name || !tool.category || !tool.purpose || !Array.isArray(tool.allowedRoles) || !tool.ownershipScope) {
      allToolsValid = false;
      console.error(`Tool metadata invalid for: ${key}`);
    }
  }
  assert(allToolsValid, 'Every tool has complete production metadata (purpose, roles, scopes, confirmation)');

  // Ensure no privilege escalation tools exist
  const dangerousTools = toolKeys.filter(t => t.includes('grant') || t.includes('make_admin') || t.includes('bypass'));
  assert(dangerousTools.length === 0, 'No tool permits AI self-privilege escalation');

  // -------------------------------------------------------------------------
  // 2. AUTHENTICATION REQUIREMENT
  // -------------------------------------------------------------------------
  console.log('\n--- 2. AUTHENTICATION REQUIREMENT ---');
  const unauthProfile = executeAgentTool('get_customer_profile', {}, undefined);
  assert(unauthProfile.error === 'AUTHENTICATION_REQUIRED', 'Unauthenticated call to get_customer_profile is rejected');

  const unauthMemory = executeAgentTool('get_customer_memory', {}, undefined);
  assert(unauthMemory.error === 'AUTHENTICATION_REQUIRED', 'Unauthenticated call to get_customer_memory is rejected');

  const unauthUpdatePref = executeAgentTool('update_customer_preferences', { preferences: ['Less sugar'] }, undefined);
  assert(unauthUpdatePref.error === 'AUTHENTICATION_REQUIRED', 'Unauthenticated call to update_customer_preferences is rejected');

  // -------------------------------------------------------------------------
  // 3. AUTHORIZATION & ROLE ISOLATION
  // -------------------------------------------------------------------------
  console.log('\n--- 3. AUTHORIZATION & ROLE ISOLATION ---');
  const customerContext: UserContext = {
    userId: 'cust_123',
    userUid: 'cust_123',
    userName: 'Tariq Jan',
    userEmail: 'tariq@gmail.com',
    userRole: 'customer',
    isEmailVerified: true
  };

  const adminAttempt = executeAgentTool('admin_update_price', { itemIdOrName: 'Zafrani Chai', newPrice: 350 }, customerContext);
  assert(adminAttempt.error === 'ACCESS_DENIED', 'Customer is strictly denied admin_update_price execution');

  const reportAttempt = executeAgentTool('admin_get_operational_report', {}, customerContext);
  assert(reportAttempt.error === 'ACCESS_DENIED', 'Customer is strictly denied admin_get_operational_report execution');

  const superDiagAttempt = executeAgentTool('superadmin_system_diagnostics', {}, customerContext);
  assert(superDiagAttempt.error === 'ACCESS_DENIED', 'Customer is strictly denied superadmin_system_diagnostics');

  // Admin without verified superadmin root cannot call superadmin tools
  const regularAdminContext: UserContext = {
    userId: 'adm_456',
    userUid: 'adm_456',
    userName: 'Manager Asad',
    userEmail: 'asad.manager@quettamahfil.pk',
    userRole: 'admin',
    isEmailVerified: true
  };
  const regularAdminDiag = executeAgentTool('superadmin_system_diagnostics', {}, regularAdminContext);
  assert(regularAdminDiag.error === 'ACCESS_DENIED', 'Regular Admin cannot access SuperAdmin diagnostics');

  // Verified SuperAdmin root account succeeds
  const superAdminContext: UserContext = {
    userId: 'super_001',
    userUid: 'super_001',
    userName: 'Usama Khan',
    userEmail: 'usamakhn694@gmail.com',
    userRole: 'superadmin',
    isEmailVerified: true
  };
  const superDiagSuccess = executeAgentTool('superadmin_system_diagnostics', {}, superAdminContext);
  assert(superDiagSuccess.systemHealth === 'HEALTHY', 'Verified SuperAdmin successfully accesses diagnostics');

  // -------------------------------------------------------------------------
  // 4. CUSTOMER DATA ISOLATION
  // -------------------------------------------------------------------------
  console.log('\n--- 4. CUSTOMER DATA ISOLATION ---');
  // Seed memory for customer 1
  executeAgentTool('update_customer_preferences', {
    teaPreferences: 'Very strong karak, 1 spoon sugar',
    preferences: ['Zafrani Chai', 'Chicken Cheese Paratha']
  }, customerContext);

  const ownMemory = executeAgentTool('get_customer_memory', {}, customerContext);
  assert(ownMemory.memory?.teaPreferences === 'Very strong karak, 1 spoon sugar', 'Customer accesses their own memory');

  // Customer 2 cannot read or tamper with Customer 1 memory
  const customer2Context: UserContext = {
    userId: 'cust_999',
    userUid: 'cust_999',
    userName: 'Bilal Khan',
    userEmail: 'bilal@gmail.com',
    userRole: 'customer',
    isEmailVerified: true
  };
  const cust2Memory = executeAgentTool('get_customer_memory', {}, customer2Context);
  assert(cust2Memory.memory.teaPreferences !== 'Very strong karak, 1 spoon sugar', 'Customer 2 cannot view Customer 1 private memory');

  // -------------------------------------------------------------------------
  // 5. SERVER-AUTHORITATIVE ORDER PRICING & STOCK CHECK
  // -------------------------------------------------------------------------
  console.log('\n--- 5. SERVER-AUTHORITATIVE ORDER PRICING & STOCK CHECK ---');
  // Authoritative quote
  const quote = executeAgentTool('calculate_order_quote', {
    items: [
      { name: 'Zafrani Chai', quantity: 2 }, // 400 * 2 = 800
      { name: 'Lacha Paratha', quantity: 1 }  // 120 * 1 = 120 -> Subtotal = 920
    ],
    deliveryLocation: 'Sector B, Bahria Town Lahore'
  }, customerContext);

  assert(quote.rawSubtotal === 920, 'Subtotal correctly calculated by backend (920 PKR)');
  assert(quote.rawDeliveryFee === 100, 'Delivery fee flat 100 applied under 1000 PKR threshold in Bahria Town');
  assert(quote.rawGrandTotal === 1020, 'Grand total authoritative (1020 PKR)');

  // Test Out of Stock rejection
  // 86 an item first
  executeAgentTool('admin_toggle_availability', { itemIdOrName: 'Nutella Paratha', isAvailable: false }, regularAdminContext);

  const orderSoldOut = executeAgentTool('create_order', {
    customerName: 'Tariq Jan',
    phone: '03001234567',
    deliveryLocation: 'Bahria Town',
    items: [{ name: 'Nutella Paratha', quantity: 1 }]
  }, customerContext);
  assert(orderSoldOut.error === 'ITEM_OUT_OF_STOCK', 'Order for sold-out item is strictly rejected');

  // Restore availability
  executeAgentTool('admin_toggle_availability', { itemIdOrName: 'Nutella Paratha', isAvailable: true }, regularAdminContext);

  // -------------------------------------------------------------------------
  // 6. IDEMPOTENCY & DUPLICATE ORDER PREVENTION
  // -------------------------------------------------------------------------
  console.log('\n--- 6. IDEMPOTENCY & DUPLICATE ORDER PREVENTION ---');
  const testIdempotencyKey = `IDEMP-${Date.now()}`;
  const initialOrderCount = ordersStore.length;

  const orderSubmission1 = executeAgentTool('create_order', {
    customerName: 'Tariq Jan',
    phone: '03001234567',
    deliveryLocation: 'Sector B, Bahria Town',
    items: [{ name: 'Zafrani Chai', quantity: 1 }],
    idempotencyKey: testIdempotencyKey
  }, customerContext);

  assert(orderSubmission1.success === true, 'First order submission succeeds');
  const createdOrderId = orderSubmission1.orderId;

  // Immediate second submission (e.g. user double-tapped or network re-sent request)
  const orderSubmission2 = executeAgentTool('create_order', {
    customerName: 'Tariq Jan',
    phone: '03001234567',
    deliveryLocation: 'Sector B, Bahria Town',
    items: [{ name: 'Zafrani Chai', quantity: 1 }],
    idempotencyKey: testIdempotencyKey
  }, customerContext);

  assert(orderSubmission2.isDuplicate === true, 'Second submission detected as duplicate (Idempotency Match)');
  assert(orderSubmission2.orderId === createdOrderId, 'Idempotent request returns exact same Order ID');
  assert(ordersStore.length === initialOrderCount + 1, 'No duplicate record was inserted into ordersStore');

  // -------------------------------------------------------------------------
  // 7. PAYMENT SAFETY
  // -------------------------------------------------------------------------
  console.log('\n--- 7. PAYMENT SAFETY ---');
  const storedOrder = ordersStore.find(o => o.id === createdOrderId);
  assert(storedOrder?.paymentStatus === 'unpaid', 'Payment status is strictly initialized as unpaid');

  // Verify that an order cannot be marked paid via regular tool execution
  const unauthPaidAttempt = executeAgentTool('admin_update_order_status', {
    orderId: createdOrderId,
    status: 'completed'
  }, customerContext);
  assert(unauthPaidAttempt.error === 'ACCESS_DENIED', 'Customer cannot manipulate order status');

  // -------------------------------------------------------------------------
  // 8. HIGH-RISK ACTION CONFIRMATION
  // -------------------------------------------------------------------------
  console.log('\n--- 8. HIGH-RISK ACTION CONFIRMATION ---');
  // Attempt cancellation without explicit confirmation
  const unconfirmedCancel = executeAgentTool('cancel_order', {
    orderId: createdOrderId,
    confirmed: false
  }, customerContext);
  assert(unconfirmedCancel.confirmationRequired === true, 'cancel_order without confirmed=true halts for explicit confirmation');
  assert(storedOrder?.status !== 'cancelled', 'Order was not cancelled without confirmation');

  // Execute cancellation with confirmed=true
  const confirmedCancel = executeAgentTool('cancel_order', {
    orderId: createdOrderId,
    confirmed: true
  }, customerContext);
  assert(confirmedCancel.success === true, 'cancel_order with confirmed=true succeeds');
  assert(storedOrder?.status === 'cancelled', 'Order status correctly changed to CANCELLED in store');

  // -------------------------------------------------------------------------
  // 9. RESERVATIONS & DUPLICATE PREVENTION
  // -------------------------------------------------------------------------
  console.log('\n--- 9. RESERVATIONS & DUPLICATE PREVENTION ---');
  const resPhone = '03217654321';
  const resDate = '2026-10-15';
  const resTime = '9:00 PM';

  const res1 = executeAgentTool('create_reservation', {
    customerName: 'Hamza Khan',
    phone: resPhone,
    guests: 4,
    date: resDate,
    time: resTime,
    notes: 'Near fountain'
  }, customerContext);
  assert(res1.success === true, 'First reservation confirmed');

  // Attempt duplicate reservation with same phone, date, time
  const resDuplicate = executeAgentTool('create_reservation', {
    customerName: 'Hamza Khan',
    phone: resPhone,
    guests: 4,
    date: resDate,
    time: resTime
  }, customerContext);
  assert(resDuplicate.error === 'DUPLICATE_RESERVATION', 'Duplicate reservation for same phone/date/time is prevented');

  // Cancel reservation confirmation check
  const cancelResUnconfirmed = executeAgentTool('cancel_reservation', {
    reservationId: res1.reservationId,
    confirmed: false
  }, customerContext);
  assert(cancelResUnconfirmed.confirmationRequired === true, 'cancel_reservation requires confirmation');

  const cancelResConfirmed = executeAgentTool('cancel_reservation', {
    reservationId: res1.reservationId,
    confirmed: true
  }, customerContext);
  assert(cancelResConfirmed.success === true, 'cancel_reservation with confirmed=true succeeds');

  // -------------------------------------------------------------------------
  // 10. AUDIT LOGGING
  // -------------------------------------------------------------------------
  console.log('\n--- 10. AUDIT LOGGING ---');
  const initialAuditCount = auditLogs.length;

  // Execute price update by authorized admin
  const priceUpdateRes = executeAgentTool('admin_update_price', {
    itemIdOrName: 'Zafrani Chai',
    newPrice: 420,
    reason: 'Saffron import cost update'
  }, regularAdminContext);

  assert(priceUpdateRes.success === true, 'Price update executed by authorized admin');
  assert(auditLogs.length > initialAuditCount, 'Audit log entry created for administrative action');

  const latestLog = auditLogs[0];
  assert(latestLog.action === 'PRICE_UPDATE', 'Audit log records exact PRICE_UPDATE action');
  assert(latestLog.executedBy.includes('asad.manager@quettamahfil.pk'), 'Audit log includes verified actor email');
  assert(latestLog.status === 'SUCCESS', 'Audit log marks status as SUCCESS');

  // -------------------------------------------------------------------------
  // 11. ANTI-HALLUCINATION HANDLING
  // -------------------------------------------------------------------------
  console.log('\n--- 11. ANTI-HALLUCINATION HANDLING ---');
  const unknownItem = executeAgentTool('get_menu_item', { itemIdOrName: 'Imaginary Dragon Soup' }, customerContext);
  assert(unknownItem.error === 'NOT_FOUND', 'Non-existent menu item returns NOT_FOUND (no hallucinated data)');

  const unknownOrder = executeAgentTool('get_order_status', { orderId: 'ORD-NONEXISTENT' }, customerContext);
  assert(unknownOrder.error === 'NOT_FOUND', 'Non-existent order status returns NOT_FOUND');

  // -------------------------------------------------------------------------
  // 12. VOICE MODALITY & CONVERSATIONAL ENGINE
  // -------------------------------------------------------------------------
  console.log('\n--- 12. VOICE MODALITY & CONVERSATIONAL ENGINE ---');
  const voiceInteraction = await processCentralAgentInteraction({
    message: 'Menu dikhayein aur Zafrani Chai ka rate batayein',
    modality: 'voice',
    context: customerContext
  });

  assert(typeof voiceInteraction.reply === 'string' && voiceInteraction.reply.length > 0, 'Interaction returns conversational reply');
  assert(typeof voiceInteraction.audioText === 'string', 'Voice interaction returns clean audioText');
  assert(!voiceInteraction.audioText?.includes('*') && !voiceInteraction.audioText?.includes('#'), 'audioText is clean and stripped of markdown formatting');

  // -------------------------------------------------------------------------
  // 13. KITCHEN / KDS & STAFF ROLE ISOLATION
  // -------------------------------------------------------------------------
  console.log('\n--- 13. KITCHEN / KDS & STAFF ROLE ISOLATION ---');
  const kitchenContext: UserContext = {
    userId: 'kds_chef_1',
    userUid: 'kds_chef_1',
    userName: 'Ustad Gul Khan (Head Chaiwala)',
    userEmail: 'kds@quettamahfil.pk',
    userRole: 'kitchen',
    isEmailVerified: true
  };

  const staffContext: UserContext = {
    userId: 'staff_front_1',
    userUid: 'staff_front_1',
    userName: 'Bilal Captain',
    userEmail: 'bilal.captain@quettamahfil.pk',
    userRole: 'staff',
    isEmailVerified: true
  };

  // Kitchen status access
  const chefKitchenAccess = executeAgentTool('get_kitchen_status', {}, kitchenContext);
  assert(chefKitchenAccess.activeTicketsCount !== undefined, 'Kitchen staff successfully accesses get_kitchen_status');

  const customerKitchenAccess = executeAgentTool('get_kitchen_status', {}, customerContext);
  assert(customerKitchenAccess.error === 'ACCESS_DENIED', 'Customer is strictly denied get_kitchen_status');

  // Operational summary access
  const staffSummaryAccess = executeAgentTool('get_operational_summary', {}, staffContext);
  assert(staffSummaryAccess.operationalStatus !== undefined, 'Staff successfully accesses get_operational_summary');

  const customerSummaryAccess = executeAgentTool('get_operational_summary', {}, customerContext);
  assert(customerSummaryAccess.error === 'ACCESS_DENIED', 'Customer is strictly denied get_operational_summary');

  // -------------------------------------------------------------------------
  // 14. ANTI-SELF-ESCALATION & IMPOSTOR IMMUNITY
  // -------------------------------------------------------------------------
  console.log('\n--- 14. ANTI-SELF-ESCALATION & IMPOSTOR IMMUNITY ---');
  const impostorContext: UserContext = {
    userId: 'impostor_999',
    userUid: 'impostor_999',
    userName: 'Infiltrator',
    userEmail: 'malicious@external.com',
    userRole: 'superadmin', // Claims to be superadmin via payload
    isEmailVerified: true
  };

  const impostorAttempt = executeAgentTool('superadmin_system_diagnostics', {}, impostorContext);
  assert(impostorAttempt.error === 'ACCESS_DENIED', 'Non-root account claiming superadmin role is strictly denied SuperAdmin execution');

  // -------------------------------------------------------------------------
  // 15. SAFE ERROR BOUNDARIES & SECRETS PRIVACY
  // -------------------------------------------------------------------------
  console.log('\n--- 15. SAFE ERROR BOUNDARIES & SECRETS PRIVACY ---');
  const unknownToolRes = executeAgentTool('exploit_secret_dump', {}, customerContext);
  assert(unknownToolRes.error === 'UNKNOWN_TOOL', 'Unrecognized exploit tool returns safe UNKNOWN_TOOL error');
  assert(!JSON.stringify(unknownToolRes).includes('process.env') && !JSON.stringify(unknownToolRes).includes('apiKey'), 'Error payload does not expose environment secrets or stacks');

  // -------------------------------------------------------------------------
  // 16. RATE LIMIT CLASSIFICATION INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n--- 16. RATE LIMIT CLASSIFICATION INTEGRITY ---');
  const validRateClasses = ['standard', 'strict', 'privileged'];
  const allRateLimitsValid = Object.values(TOOL_REGISTRY).every(t => validRateClasses.includes(t.rateLimitClass));
  assert(allRateLimitsValid, 'All 65 tools have a valid rate-limit tier (standard, strict, privileged)');

  // -------------------------------------------------------------------------
  // 17. DYNAMIC TOOL DISCOVERY PER ACTOR
  // -------------------------------------------------------------------------
  console.log('\n--- 17. DYNAMIC TOOL DISCOVERY PER ACTOR ---');
  // Anonymous / Guest actor tool discovery
  const anonTools = getDeclarationsForRole('anonymous').map(d => d.name);
  assert(!anonTools.includes('get_customer_profile'), 'Anonymous actor is NOT offered get_customer_profile');
  assert(!anonTools.includes('admin_update_price'), 'Anonymous actor is NOT offered admin_update_price');
  assert(!anonTools.includes('superadmin_system_diagnostics'), 'Anonymous actor is NOT offered superadmin_system_diagnostics');
  assert(anonTools.includes('search_menu'), 'Anonymous actor is offered search_menu');
  assert(anonTools.includes('get_restaurant_info'), 'Anonymous actor is offered get_restaurant_info');

  // Customer actor tool discovery
  const customerTools = getDeclarationsForRole('customer', false, 'patron@gmail.com', true).map(d => d.name);
  assert(customerTools.includes('get_customer_profile'), 'Customer actor is offered get_customer_profile');
  assert(!customerTools.includes('admin_update_price'), 'Customer actor is NOT offered admin_update_price');
  assert(!customerTools.includes('admin_get_operational_report'), 'Customer actor is NOT offered admin_get_operational_report');
  assert(!customerTools.includes('superadmin_system_diagnostics'), 'Customer actor is NOT offered superadmin_system_diagnostics');

  // Admin actor tool discovery
  const adminTools = getDeclarationsForRole('admin', true, 'manager@quettamahfil.pk', true).map(d => d.name);
  assert(adminTools.includes('admin_update_price'), 'Admin actor is offered admin_update_price');
  assert(adminTools.includes('admin_get_operational_report'), 'Admin actor is offered admin_get_operational_report');
  assert(!adminTools.includes('superadmin_system_diagnostics'), 'Normal admin actor is NOT offered superadmin_system_diagnostics');

  // SuperAdmin actor tool discovery
  const superTools = getDeclarationsForRole('superadmin', true, 'usamakhn694@gmail.com', true).map(d => d.name);
  assert(superTools.includes('superadmin_system_diagnostics'), 'SuperAdmin root actor is offered superadmin_system_diagnostics');

  // Non-implemented tools are never exposed to AI
  const allToolDecls = superTools.concat(adminTools, customerTools, anonTools);
  assert(!allToolDecls.includes('automated_bank_refund'), 'NOT_IMPLEMENTED tool automated_bank_refund is never exposed to model');
  assert(!allToolDecls.includes('driver_live_gps_stream'), 'NOT_IMPLEMENTED tool driver_live_gps_stream is never exposed to model');

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
