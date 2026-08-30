// Lina's admin portal — route protection. Every admin page (except
// login.html) imports and awaits requireAuth() before rendering anything,
// so an unauthenticated visitor never sees enquiry or dashboard data —
// they're redirected to login before any Firestore read is even attempted.
import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const VALID_ROLES = ["owner", "developer", "observer", "staff"];

/**
 * Resolves with { user, role } once a signed-in admin/staff user is
 * confirmed, or redirects to login.html and never resolves otherwise.
 */
export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        redirectToLogin();
        return;
      }
      try {
        // Force-refresh so a role assigned moments ago (via the bootstrap
        // script) is reflected immediately rather than needing a fresh
        // sign-in.
        const tokenResult = await user.getIdTokenResult(true);
        const role = tokenResult.claims.role;
        if (!VALID_ROLES.includes(role)) {
          redirectToLogin("no-role");
          return;
        }
        updateDoc(doc(db, "adminUsers", user.uid), { lastLoginAt: serverTimestamp() }).catch(() => {
          // Best-effort only — not being able to record a login timestamp
          // must never block access to the portal.
        });
        resolve({ user, role });
      } catch (err) {
        console.error("Auth check failed:", err);
        redirectToLogin();
      }
    });
  });
}

function redirectToLogin(reason) {
  const suffix = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  if (!location.pathname.endsWith("login.html")) {
    location.href = `login.html${suffix}`;
  }
}

export function logout() {
  return signOut(auth).then(() => { location.href = "login.html"; });
}
