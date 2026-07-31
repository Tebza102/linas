// Lina's public site — discreet "Admin" link for already-authenticated
// admin/staff users. The public site and /admin portal are the same
// Vercel deployment, same domain, same Firebase project, so a session
// created at /admin/login.html is already visible here via the shared
// browserLocalPersistence auth state (admin/js/firebase-init.js) — no
// second login, no separate token exchange.
//
// Renders NOTHING for an ordinary visitor: the link is only added to the
// DOM after a real signed-in session with a valid admin role claim is
// confirmed, so an anonymous visitor never sees so much as an empty
// placeholder hinting that a private area exists.
import { auth } from "/admin/js/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const VALID_ROLES = ["owner", "developer", "observer", "staff"];

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  try {
    const tokenResult = await user.getIdTokenResult();
    if (!VALID_ROLES.includes(tokenResult.claims.role)) return;
  } catch (err) {
    return;
  }

  const right = document.querySelector(".site-header__right");
  if (!right || document.getElementById("publicAdminLink")) return;
  const link = document.createElement("a");
  link.id = "publicAdminLink";
  link.href = "/admin/dashboard.html";
  link.textContent = "Admin";
  link.setAttribute("aria-label", "Back to admin platform");
  link.style.cssText = "font-size:13px; text-decoration:underline; color:var(--white-dim,#ccc); margin-right:12px; align-self:center;";
  right.insertBefore(link, right.firstChild);
});
