# Quetta Mahfil Chai Khana - Security Specification & Audit
**Standard**: Firebase Security Eight Pillars Enforcement  
**System**: Centralized Restaurant AI Agent & Omnichannel Super App  
**Environment**: Production Firestore + Express Backend Node

---

## 1. Data Invariants
1. **Frontend is Untrusted**: Prices, totals, roles, permissions, customer IDs, payment status, order status, reservation status, and loyalty balances are strictly authored/validated on the backend server (`server/centralAgent.ts`).
2. **Authority Hierarchy**:
   - `SuperAdmin` (Level 5) / `Admin` (Level 4): Full catalog, orders, and system governance.
   - `Staff` (Level 2) / `Customer` (Level 1): Can only create initial requests or access own data.
   - `Public` (Level 0): Read-only access to published public menu and active settings.
3. **No Unauthenticated Shadow Fields**: User profiles and orders must contain strictly validated key schemas with timestamp matching `request.time` and identity matching `request.auth.uid`.
4. **PII Isolation**: `users` and `user_profiles` are strictly partitioned so that only the document owner or an authenticated admin can read private profile/contact details.

---

## 2. The "Dirty Dozen" Threat Payloads & Mitigations

| # | Attack Vector | Payload Attempt | Security Rule Defense | Audit Status |
|---|---|---|---|---|
| **01** | **Admin Role Escalation** | Write `{ role: 'admin' }` to `/user_profiles/{uid}` | `isValidProfile` only allows non-privileged fields; role checks use `admins` collection or server claim | **BLOCKED** |
| **02** | **Price Tampering in Orders** | Write `{ total: 0.01 }` for 10 Zafrani Chais | Backend validates unit price * quantity; Client writes enforce `isValidOrder()` and non-negative total | **BLOCKED** |
| **03** | **Order Status Hijack** | Update order status to `'completed'` as customer | Only `isAdmin()` permitted to run updates on `/mahfil_orders/{id}` | **BLOCKED** |
| **04** | **Cross-User Order Snooping** | Query all orders without filter `where('userId', '==', uid)` | `allow list: if (isSignedIn() && resource.data.userId == request.auth.uid) \|\| isAdmin()` blocks query | **BLOCKED** |
| **05** | **Path ID Poisoning** | Create doc with 2KB junk string as ID | `isValidId(id)` regex check enforces alphanumeric characters and `<= 128` chars | **BLOCKED** |
| **06** | **Denial of Wallet Attack** | Insert 100MB string into note text | `isValidDiaryEntry` strictly caps text length `<= 500` characters | **BLOCKED** |
| **07** | **Fake Reservation Injection** | Create reservation with 5,000 guests | `isValidReservation` enforces `guests >= 1 && guests <= 50` | **BLOCKED** |
| **08** | **Loyalty Balance Inflation** | Modify loyalty points directly | `/loyalty_rewards` updates restricted only to `isRedeemed` flag; points computed server-side | **BLOCKED** |
| **09** | **Admin Document Enumeration** | Unauthenticated `read` on `/admins` collection | `allow read: if isAdmin()` ensures only verified admins can list the admin node | **BLOCKED** |
| **10** | **Identity Impersonation** | Submit order with victim's `userId` | `incoming().userId == request.auth.uid` enforces immutable author binding | **BLOCKED** |
| **11** | **Kindness Wall Token Theft** | Overwrite unclaimed tokens as public | Updates require auth and enforce state transition to `'claimed'` with `claimedBy == request.auth.uid` | **BLOCKED** |
| **12** | **Global Match Bypass** | Access undocumented collection `/{col}/{doc}` | Top-level default match `/{document=**}` denies all reads/writes unless explicitly opened | **BLOCKED** |

---

## 3. Eight Pillars Compliance Checklist

- [x] **Pillar 1: Master Gate** - Global fallback denial `match /{document=**} { allow read, write: if false; }`.
- [x] **Pillar 2: Validation Blueprints** - Standalone validator functions (`isValidOrder`, `isValidReservation`, `isValidProfile`, `isValidDiaryEntry`).
- [x] **Pillar 3: Path Variable Hardening** - `isValidId()` applied to path variables for `get`, `create`, `update`, `delete`.
- [x] **Pillar 4: Tiered Identity Logic** - Clear partitioning between public, customer owner, and admin roles.
- [x] **Pillar 5: Total Array & String Guarding** - String sizes strictly bounded (`size() <= 100`, `size() <= 500`, etc.).
- [x] **Pillar 6: PII Isolation** - Profile and order documents restricted to owner or admin.
- [x] **Pillar 7: The Atomicity Guarantee** - Central agent coordinates multi-record mutations authoritatively on backend.
- [x] **Pillar 8: Secure List Queries** - `allow list` explicitly validates `resource.data.userId == request.auth.uid` or `isAdmin()`.
