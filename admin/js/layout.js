// Lina's admin portal — shared sidebar/layout, mounted by every admin page
// after requireAuth() resolves. Centralises navigation, active-state,
// badges and the mobile drawer so no page duplicates this markup.
import { db } from "./firebase-init.js";
import { logout } from "./auth-guard.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", href: "dashboard.html" },
  { id: "leads", label: "Leads / Enquiries", href: "inbox.html", badge: "unread" },
  { id: "pipeline", label: "Sales Pipeline", href: "pipeline.html", badge: "overdue" },
  { id: "marketing", label: "Marketing", href: "marketing.html" },
  { id: "calendar", label: "Calendar", href: "calendar.html" },
  { id: "quotations", label: "Quotations", href: "quotations.html", ownerOnly: true },
  { id: "invoices", label: "Invoices", href: "invoices.html", ownerOnly: true },
  { id: "reports", label: "Reports", href: "reports.html" },
  { id: "settings", label: "Settings", href: "settings.html", ownerOnly: true }
];

const COLLAPSE_KEY = "lina-admin-sidebar-collapsed"; // UI preference only — no business data

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/**
 * Renders the sidebar + mobile drawer chrome and wires all its behaviour.
 * `active` must match one of NAV_ITEMS' `id`. Returns nothing — this is a
 * side-effecting mount, matching every other admin/js module's shape.
 */
export function initLayout({ user, role, active }) {
  const items = NAV_ITEMS.filter((item) => !item.ownerOnly || role === "owner");

  const navHtml = items.map((item) => `
    <a class="sidebar-nav__item${item.id === active ? " sidebar-nav__item--active" : ""}"
       href="${item.href}" ${item.id === active ? 'aria-current="page"' : ""}>
      <span class="sidebar-nav__label">${esc(item.label)}</span>
      ${item.badge ? `<span class="sidebar-badge" id="badge-${item.badge}" hidden></span>` : ""}
    </a>
  `).join("");

  const shell = document.createElement("div");
  shell.innerHTML = `
    <aside class="admin-sidebar" id="adminSidebar">
      <div class="sidebar-top">
        <a href="dashboard.html" class="sidebar-brand">
          <img src="../assets/source/brand/Linas_Favicon.jpg" alt="" width="28" height="28">
          <span class="sidebar-brand__text">Lina's</span>
        </a>
        <button type="button" class="sidebar-collapse-btn" id="sidebarCollapseBtn" aria-label="Collapse sidebar">«</button>
      </div>
      <nav class="sidebar-nav" aria-label="Admin navigation">${navHtml}</nav>
      <div class="sidebar-bottom">
        <div class="sidebar-account">
          <span class="sidebar-account__name">${esc(user.email)}</span>
          <span class="sidebar-account__role">${esc(role)}</span>
        </div>
        <button type="button" class="btn btn--ghost sidebar-signout" id="sidebarSignOutBtn">Sign out</button>
      </div>
    </aside>
    <div class="sidebar-backdrop" id="sidebarBackdrop" hidden></div>
  `;
  document.body.insertBefore(shell, document.body.firstChild);
  document.body.classList.add("has-admin-sidebar");

  const sidebar = document.getElementById("adminSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");

  // Mobile: a topbar toggle button (each page provides #mobileMenuToggle)
  // opens the drawer; the backdrop or choosing a nav link closes it.
  const mobileToggle = document.getElementById("mobileMenuToggle");
  function openDrawer() { sidebar.classList.add("admin-sidebar--open"); backdrop.hidden = false; }
  function closeDrawer() { sidebar.classList.remove("admin-sidebar--open"); backdrop.hidden = true; }
  if (mobileToggle) mobileToggle.addEventListener("click", openDrawer);
  backdrop.addEventListener("click", closeDrawer);
  sidebar.querySelectorAll(".sidebar-nav__item").forEach((a) => a.addEventListener("click", closeDrawer));

  // Desktop collapse — icon-only width, remembered as a plain UI
  // preference (not business data).
  const collapseBtn = document.getElementById("sidebarCollapseBtn");
  if (localStorage.getItem(COLLAPSE_KEY) === "1") document.body.classList.add("admin-sidebar-collapsed");
  collapseBtn.addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("admin-sidebar-collapsed");
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  });

  document.getElementById("sidebarSignOutBtn").addEventListener("click", logout);

  // Badges: unread enquiries, overdue follow-ups. Both derived live from
  // the same enquiries collection every page already has access to —
  // scoped by role exactly like the inbox's own query, so a badge never
  // implies access to data the signed-in user couldn't otherwise see.
  const unreadBadge = document.getElementById("badge-unread");
  const overdueBadge = document.getElementById("badge-overdue");
  if (unreadBadge || overdueBadge) {
    const q = role === "owner"
      ? query(collection(db, "enquiries"))
      : query(collection(db, "enquiries"), where("assignedOwnerId", "in", [user.uid, null]));
    const todayIso = new Date().toISOString().slice(0, 10);
    const TERMINAL = ["Completed", "Lost/Cancelled"];
    onSnapshot(q, (snap) => {
      let unread = 0;
      let overdue = 0;
      snap.forEach((d) => {
        const e = d.data();
        if (!e.viewedAt) unread++;
        if (e.followUpDate && !TERMINAL.includes(e.status) && e.followUpDate < todayIso) overdue++;
      });
      if (unreadBadge) { unreadBadge.textContent = String(unread); unreadBadge.hidden = unread === 0; }
      if (overdueBadge) { overdueBadge.textContent = String(overdue); overdueBadge.hidden = overdue === 0; }
    }, (err) => console.error("Layout badge listener error:", err));
  }
}
