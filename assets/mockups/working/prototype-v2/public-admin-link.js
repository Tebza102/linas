// Lina's public site — the "Login" nav item becomes "Back to Admin" for
// already-authenticated admin/staff users. The public site and /admin
// portal are the same Vercel deployment, same domain, same Firebase
// project, so a session created at /admin/login.html is already visible
// here via the shared browserLocalPersistence auth state
// (admin/js/firebase-init.js) — no second login, no separate token
// exchange.
//
// Ordinary visitors see plain "Login" (the link's default state in the
// HTML, unchanged until this script confirms a real authorised session)
// — this only ever upgrades the existing nav item, never adds a second one.
import { auth } from "/admin/js/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const VALID_ROLES = ["owner", "developer", "observer", "staff"];

onAuthStateChanged(auth, async (user) => {
  const navLogin = document.getElementById("navLogin");
  if (!navLogin || !user) return;
  try {
    const tokenResult = await user.getIdTokenResult();
    if (!VALID_ROLES.includes(tokenResult.claims.role)) return;
  } catch (err) {
    return;
  }
  navLogin.textContent = "Back to Admin";
  navLogin.href = "/admin/dashboard.html";
});
