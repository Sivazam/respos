# TODO - Critical Issues Fix Plan

**Generated:** March 22, 2026  
**Audit Type:** Comprehensive Codebase Security & Quality Audit  
**Total Issues Found:** 31 (3 Critical, 28 High)

---

## 🚨 CRITICAL ISSUES (Fix Immediately)

### 1. Use of `eval()` - SEVERE SECURITY VULNERABILITY
- **Priority:** P0 - Fix Today
- **File:** `src/utils/indexesHelper.ts:54`
- **Code:**
  ```typescript
  const firestoreModule = eval('require')('firebase/firestore');
  ```
- **Risk:** Arbitrary code execution, complete security bypass
- **Impact:** If any user input reaches this code path, attacker could execute malicious code
- **Fix:**
  ```typescript
  // Replace with standard ES6 import
  import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
  // Use directly instead of dynamic require
  ```
- **Status:** ⏳ Pending

---

### 2. Race Condition in Order Transfer - DATA LOSS RISK
- **Priority:** P0 - Fix Today
- **File:** `src/contexts/TemporaryOrderContext.tsx:605-700`
- **Function:** `transferOrderToManager`
- **Issue:** Multiple async operations without transaction handling
- **Risk:** Orders could be lost or duplicated during transfer from staff to manager
- **Impact:** Critical business data loss, duplicate orders, inconsistent state
- **Fix:**
  ```typescript
  // Use Firestore transactions for atomic operations
  await runTransaction(db, async (transaction) => {
    // Read order
    // Update order status
    // Create manager order
    // All or nothing
  });
  ```
- **Status:** ⏳ Pending

---

### 3. XSS via dangerouslySetInnerHTML
- **Priority:** P0 - Fix Today
- **File:** `src/pages/print/PrintReceiptPage.tsx:626`
- **Code:**
  ```typescript
  <div dangerouslySetInnerHTML={{ __html: getReceiptHTMLContent() }} />
  ```
- **Risk:** If receipt contains user input (customer names, notes), could execute malicious scripts
- **Impact:** Session hijacking, data theft, defacement
- **Fix:**
  ```typescript
  import DOMPurify from 'dompurify';
  
  <div dangerouslySetInnerHTML={{ 
    __html: DOMPurify.sanitize(getReceiptHTMLContent()) 
  }} />
  ```
- **Dependencies to Add:** `npm install dompurify @types/dompurify`
- **Status:** ⏳ Pending

---

## ⚠️ HIGH SEVERITY ISSUES

### **Security Issues**

#### 4. XSS via innerHTML Manipulation
- **Priority:** P1 - Fix This Week
- **File:** `src/pages/dashboards/ManagerDashboard.tsx:771-777`
- **Code:**
  ```typescript
  parent.innerHTML = `
    <div class="...">
      <span>${item.name.charAt(0).toUpperCase()}</span>
    </div>
  `;
  ```
- **Risk:** If `item.name` contains malicious content, it would execute
- **Fix:** Use React rendering instead of innerHTML
- **Status:** ⏳ Pending

---

#### 5. Insecure Firebase Security Rules
- **Priority:** P1 - Fix This Week
- **File:** `firestore.rules:1-35`
- **Issue:** Rules only check authentication, not authorization. Any authenticated user can read/write ANY document.
- **Risk:** Compromised user account could access all data
- **Impact:** Data breach, unauthorized access, data manipulation
- **Fix:**
  ```javascript
  match /locations/{locationId} {
    allow read: if request.auth != null && 
      (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['superadmin', 'admin'] ||
       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.locationId == locationId);
    allow write: if request.auth != null &&
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['superadmin', 'admin'];
  }
  ```
- **Status:** ⏳ Pending

---

#### 6. Hardcoded Firebase API Key
- **Priority:** P1 - Fix This Week
- **File:** `src/firebase/config.ts:11-18`
- **Code:**
  ```typescript
  const firebaseConfig = {
    apiKey: "AIzaSyC9f76SkbwC6Dgef8WS6bIS_h5gRL9137k",
    // ...
  };
  ```
- **Risk:** Exposes Firebase project credentials
- **Impact:** Unauthorized usage of Firebase services, quota exhaustion
- **Fix:**
  1. Go to Firebase Console > Project Settings > General > Your apps
  2. Add domain restrictions (restrict to production domains only)
  3. Use environment variables:
  ```typescript
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    // ...
  };
  ```
- **Status:** ⏳ Pending

---

### **Performance Issues (Memory Leaks)**

#### 7. Missing useEffect Cleanup - RealtimeTableContext
- **Priority:** P1 - Fix This Week
- **File:** `src/contexts/RealtimeTableContext.tsx:347-357`
- **Issue:** `releaseTable` in dependencies causes interval to recreate constantly
- **Fix:** Use `useRef` to avoid dependency issues
- **Status:** ⏳ Pending

---

#### 8. Missing Interval Cleanup - ManagerTableManagement
- **Priority:** P1 - Fix This Week
- **File:** `src/components/manager/ManagerTableManagement.tsx:62`
- **Issue:** setInterval without cleanup
- **Fix:**
  ```typescript
  useEffect(() => {
    const interval = setInterval(() => {
      // ...
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  ```
- **Status:** ⏳ Pending

---

#### 9. Missing Interval Cleanup - StaffTableManagement
- **Priority:** P1 - Fix This Week
- **File:** `src/components/staff/StaffTableManagement.tsx:42`
- **Issue:** setInterval without cleanup
- **Fix:** Add cleanup function
- **Status:** ⏳ Pending

---

#### 10. Global Interval Without Cleanup
- **Priority:** P1 - Fix This Week
- **File:** `src/main.tsx:35`
- **Code:**
  ```typescript
  setInterval(removeNetworkStatusElements, 1000);
  ```
- **Issue:** Global interval that runs forever, even after app unmounts
- **Fix:** Store interval ID and clear on page unload, or move into React component with proper lifecycle
- **Status:** ⏳ Pending

---

#### 11. Missing PWA Provider Cleanup
- **Priority:** P1 - Fix This Week
- **File:** `src/components/pwa/PWAProvider.tsx:172`
- **Issue:** setInterval without cleanup
- **Fix:** Add cleanup function
- **Status:** ⏳ Pending

---

#### 12. Missing Storage Cleanup Interval
- **Priority:** P1 - Fix This Week
- **File:** `src/hooks/useStorageCleanup.ts:118`
- **Issue:** setInterval without cleanup
- **Fix:** Add cleanup function
- **Status:** ⏳ Pending

---

#### 13. Missing Performance Optimization Cleanup
- **Priority:** P1 - Fix This Week
- **File:** `src/hooks/usePerformanceOptimization.ts:116`
- **Issue:** setInterval without cleanup
- **Fix:** Add cleanup function
- **Status:** ⏳ Pending

---

#### 14. Missing Metrics Collection Cleanup
- **Priority:** P1 - Fix This Week
- **File:** `src/components/pos/PerformanceMonitor.tsx:59`
- **Issue:** setInterval without cleanup
- **Fix:** Add cleanup function
- **Status:** ⏳ Pending

---

#### 15. Missing Pending Orders Cleanup
- **Priority:** P1 - Fix This Week
- **File:** `src/pages/manager/PendingOrdersPage.tsx:145`
- **Issue:** setInterval without cleanup
- **Fix:** Add cleanup function
- **Status:** ⏳ Pending

---

#### 16. Missing setTimeout Cleanup - ManagerPendingOrdersPage
- **Priority:** P1 - Fix This Week
- **File:** `src/pages/manager/ManagerPendingOrdersPage.tsx:528-533`
- **Issue:** setTimeout in async operations without cleanup
- **Fix:** Use cleanup ref pattern:
  ```typescript
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);
  // Then check isMountedRef.current before state updates
  ```
- **Status:** ⏳ Pending

---

#### 17. Missing Receipt Modal Cleanup
- **Priority:** P1 - Fix This Week
- **File:** `src/components/order/FinalReceiptModal.tsx:644-682`
- **Issue:** setTimeout in async operations without cleanup (3 instances)
- **Fix:** Use cleanup ref pattern
- **Status:** ⏳ Pending

---

### **Data Integrity Issues**

#### 18. Race Condition in Auth State
- **Priority:** P1 - Fix This Week
- **File:** `src/contexts/AuthContext.tsx:162-185`
- **Issue:** If `getUserWithRole` fails but Firebase auth succeeded, user could be in inconsistent state
- **Fix:** Implement retry logic with exponential backoff for critical updates
- **Status:** ⏳ Pending

---

#### 19. Silent Order Counter Failures
- **Priority:** P1 - Fix This Week
- **File:** `src/services/orderService.ts:183-186`
- **Code:**
  ```typescript
  updateDoc(counterRef, {...}).catch(err => console.error('Failed to update counter (will retry later):', err));
  ```
- **Issue:** Order counter update failure silently swallowed, could lead to duplicate order numbers
- **Fix:** Implement proper retry mechanism with exponential backoff and alert on persistent failures
- **Status:** ⏳ Pending

---

#### 20. Silent Table Update Failures
- **Priority:** P1 - Fix This Week
- **File:** `src/services/orderService.ts:302, 308`
- **Issue:** Critical order state updates failing silently
- **Fix:** Queue failed operations for retry and alert user/admin on persistent failures
- **Status:** ⏳ Pending

---

#### 21. localStorage Data Loss Risk
- **Priority:** P1 - Fix This Week
- **File:** `src/contexts/TemporaryOrderContext.tsx` (4 locations: 103-110, 327-330, 508-516, 863-866)
- **Issues:**
  1. No error handling for localStorage quota exceeded
  2. No error handling for private browsing mode (localStorage may be unavailable)
  3. JSON.stringify can fail on circular references
  4. Data stored in localStorage is not synced across tabs properly
- **Fix:**
  1. Wrap in try-catch with fallback to IndexedDB
  2. Implement cross-tab synchronization using BroadcastChannel API
  3. Add quota monitoring
- **Status:** ⏳ Pending

---

#### 22. Missing Null Checks in Critical Paths
- **Priority:** P1 - Fix This Week
- **File:** `src/contexts/BaseContext.ts:12-129`
- **Functions:** `getDataFilter`, `canUserAccessLocation`, `getAccessibleLocations`
- **Issue:** Functions accept `any` type and don't validate inputs. If called with null/undefined, will throw runtime errors.
- **Fix:** Add proper type guards and null checks:
  ```typescript
  export function canUserAccessLocation(user: User | null, locationId: string): boolean {
    if (!user || !locationId) return false;
    // ...
  }
  ```
- **Status:** ⏳ Pending

---

### **User Experience Issues**

#### 23. Missing Loading States - ManagerPendingOrdersPage
- **Priority:** P2 - Fix Next Week
- **File:** `src/pages/manager/ManagerPendingOrdersPage.tsx:1014+`
- **Function:** `handleUnifiedModalConfirm`
- **Issue:** Multiple async operations without loading indicator
- **Impact:** Users may click multiple times, causing duplicate orders/payments
- **Fix:** Add loading state and disable UI during async operations
- **Status:** ⏳ Pending

---

#### 24. Missing Loading States - EnhancedPendingOrdersPage
- **Priority:** P2 - Fix Next Week
- **File:** `src/pages/manager/EnhancedPendingOrdersPage.tsx:281`
- **Issue:** Same as above
- **Fix:** Add loading state
- **Status:** ⏳ Pending

---

#### 25. Missing ErrorBoundary Usage
- **Priority:** P2 - Fix Next Week
- **File:** `src/App.tsx`
- **Issue:** ErrorBoundary component exists but is not wrapping critical route components
- **Impact:** Any unhandled error in a page component will crash the entire app instead of just that section
- **Fix:** Wrap each route with ErrorBoundary:
  ```typescript
  <Route path="/admin/*" element={
    <ErrorBoundary>
      <AdminRoutes />
    </ErrorBoundary>
  } />
  ```
- **Status:** ⏳ Pending

---

### **Code Quality Issues**

#### 26. 1118 console.log Statements in Production Code
- **Priority:** P2 - Fix Next Week
- **Severity:** HIGH
- **Impact:**
  1. Performance degradation in production
  2. Potential information leakage
  3. Cluttered browser console
- **Fix:**
  1. Use a proper logging library (winston, pino)
  2. Strip console statements in production build using babel/terser
  3. Configure vite.build.rollupOptions to drop console
- **Status:** ⏳ Pending

---

#### 27. Excessive `any` Type Usage in Critical Paths
- **Priority:** P2 - Fix Next Week
- **Severity:** HIGH
- **Impact:** Defeats TypeScript's type safety, leading to runtime errors
- **Key Occurrences:**
  - `src/contexts/AuthContext.tsx:250, 471` - userData, updateData as any
  - `src/contexts/EnhancedOrderContext.tsx:16,18,20` - Multiple any types
  - `src/contexts/OrderContext.tsx:43,748` - Payment data as any
  - `src/contexts/TemporaryOrderContext.tsx:610` - customer parameter as any
  - `src/utils/indexesHelper.ts:48` - db parameter as any
  - `src/contexts/BaseContext.ts:8,12,79,103,129` - Multiple any types in utility functions
- **Fix:** Define proper interfaces for all data structures
- **Status:** ⏳ Pending

---

#### 28. @ts-ignore and @ts-expect-error Usage
- **Priority:** P2 - Fix Next Week
- **File:** `src/lib/browserPrint.ts:29, 61, 355, 387, 425`
- **Issue:** Suppresses TypeScript errors without proper justification
- **Fix:**
  1. Add proper type definitions for experimental APIs
  2. Use type guards instead of ignoring errors
  3. Document why each ignore is necessary
- **Status:** ⏳ Pending

---

### **Build/Deployment Issues**

#### 29. Hardcoded Allowed Hosts in Vite Config
- **Priority:** P2 - Fix Next Week
- **File:** `vite.config.ts:77-83, 92-98`
- **Code:**
  ```typescript
  allowedHosts: [
    'ws-e-eac-dd-ecf-mzrkuseuys.cn-hongkong-vpc.fcapp.run',
    'localhost',
    '127.0.0.1',
    '.space.z.ai',
    '*.space.z.ai',
    '*.cn-hongkong-vpc.fcapp.run'
  ],
  ```
- **Impact:**
  1. Exposes internal infrastructure details
  2. Hardcoded values should be environment-specific
  3. Wildcard patterns could allow unintended hosts
- **Fix:** Use environment variables:
  ```typescript
  allowedHosts: process.env.VITE_ALLOWED_HOSTS?.split(',') || ['localhost'],
  ```
- **Status:** ⏳ Pending

---

#### 30. Missing Content Security Policy Headers
- **Priority:** P2 - Fix Next Week
- **File:** `vercel.json`
- **Issue:** Missing Content-Security-Policy header
- **Impact:** Missing CSP leaves the application vulnerable to XSS attacks even with other headers in place
- **Fix:** Add CSP header:
  ```json
  {
    "key": "Content-Security-Policy",
    "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.firebaseio.com; ..."
  }
  ```
- **Status:** ⏳ Pending

---

#### 31. Unused Dependency (next-pwa)
- **Priority:** P3 - Fix When Possible
- **File:** `package.json:23`
- **Issue:** Project uses `next-pwa` but this is a Vite project, not Next.js
- **Impact:** Unnecessary dependencies increase bundle size and potential attack surface
- **Fix:** Remove `next-pwa` if not using Next.js. Use `vite-plugin-pwa` exclusively (which is already included)
- **Status:** ⏳ Pending

---

## 📊 SUMMARY

| Category | Critical | High | Total |
|----------|----------|------|-------|
| Security | 2 | 4 | 6 |
| Performance | 0 | 11 | 11 |
| Data Integrity | 1 | 5 | 6 |
| User Experience | 0 | 3 | 3 |
| Code Quality | 0 | 3 | 3 |
| Build/Deployment | 0 | 2 | 2 |
| **TOTAL** | **3** | **28** | **33** |

---

## 🎯 ACTION PLAN

### **Week 1 (CRITICAL - Security & Data Loss Prevention)**
- [ ] **1. Remove `eval()` usage** (indexesHelper.ts)
- [ ] **2. Add DOMPurify for dangerouslySetInnerHTML** (PrintReceiptPage.tsx)
- [ ] **3. Fix innerHTML in ManagerDashboard** (ManagerDashboard.tsx)
- [ ] **4. Add all missing useEffect cleanups** (11 files)
- [ ] **5. Restrict Firebase API key in Firebase Console**
- [ ] **6. Add ErrorBoundary wrappers** (App.tsx)

### **Week 2 (HIGH - Data Integrity & Performance)**
- [ ] **7. Implement Firestore transactions for orders** (TemporaryOrderContext.tsx)
- [ ] **8. Update Firebase security rules** (firestore.rules)
- [ ] **9. Add proper error handling in services** (orderService.ts)
- [ ] **10. Fix localStorage data loss risks** (TemporaryOrderContext.tsx)
- [ ] **11. Add null checks in critical paths** (BaseContext.ts)
- [ ] **12. Fix auth state race condition** (AuthContext.tsx)

### **Week 3 (MEDIUM - Code Quality & UX)**
- [ ] **13. Remove/reduce console.log statements** (grep & remove)
- [ ] **14. Fix `any` type usage in critical paths** (multiple files)
- [ ] **15. Add CSP headers** (vercel.json)
- [ ] **16. Fix missing loading states** (PendingOrdersPage files)
- [ ] **17. Remove unused dependencies** (package.json)
- [ ] **18. Fix @ts-ignore usage** (browserPrint.ts)

---

## 📝 NOTES

- **Priority Levels:**
  - **P0:** Fix today - Critical security/data loss issues
  - **P1:** Fix this week - High severity issues
  - **P2:** Fix next week - Medium severity issues
  - **P3:** Fix when possible - Low severity issues

- **Testing Required:**
  - All security fixes must be tested in staging before production
  - Performance fixes should be benchmarked before/after
  - Data integrity fixes require thorough integration testing

- **Dependencies to Add:**
  ```bash
  npm install dompurify @types/dompurify
  ```

- **External Actions Required:**
  - Firebase Console: Restrict API key domains
  - Firebase Console: Update security rules
  - Vercel/Hosting: Add CSP headers

---

**Last Updated:** March 22, 2026  
**Next Review:** After Week 1 fixes complete
