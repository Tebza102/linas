// Lina's admin portal — shared sidebar/layout, mounted by every admin page
// after requireAuth() resolves. Centralises navigation, active-state,
// badges and the mobile drawer so no page duplicates this markup.
import { db } from "./firebase-init.js";
import { logout } from "./auth-guard.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Grouped navigation per the branded admin restructure. `roles` is an
// allowlist — omit it for items every signed-in admin role may open.
// Observer may view every module except Users/Settings (enforced here AND
// in firestore.rules, since a hidden button is not access control).
const NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      // First group: the daily order queue is what Lina opens most.
      { id: "orders", label: "Orders", href: "orders.html", roles: ["owner", "developer", "observer"], badge: "orders" }
    ]
  },
  {
    label: "Sales",
    items: [
      { id: "overview", label: "Overview", href: "dashboard.html" },
      { id: "leads", label: "Leads / Enquiries", href: "inbox.html", badge: "unread" },
      { id: "pipeline", label: "Sales Pipeline", href: "pipeline.html", badge: "overdue" },
      { id: "quotations", label: "Quotations", href: "quotations.html", roles: ["owner", "developer", "observer"] },
      { id: "invoices", label: "Invoices", href: "invoices.html", roles: ["owner", "developer", "observer"] }
    ]
  },
  {
    label: "Marketing",
    items: [
      { id: "marketing", label: "Marketing", href: "marketing.html" },
      { id: "calendar", label: "Calendar", href: "calendar.html" },
      { id: "reports", label: "Reports", href: "reports.html" }
    ]
  },
  {
    label: "System",
    items: [
      { id: "users", label: "Users", href: "users.html", roles: ["owner", "developer"] },
      { id: "settings", label: "Settings", href: "settings.html", roles: ["owner", "developer"] },
      { id: "public-site", label: "View Public Site", href: "/", external: true }
    ]
  }
];

const COLLAPSE_KEY = "lina-admin-sidebar-collapsed"; // UI preference only — no business data

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const ROLE_LABELS = { owner: "Owner", developer: "Developer", observer: "Observer", staff: "Staff" };

/**
 * Renders the sidebar + mobile drawer chrome and wires all its behaviour.
 * `active` must match one of NAV_GROUPS' item `id`s. Returns nothing —
 * this is a side-effecting mount, matching every other admin/js module's shape.
 */
export function initLayout({ user, role, active }) {
  const groupsHtml = NAV_GROUPS.map((group) => {
    const items = group.items.filter((item) => !item.roles || item.roles.includes(role));
    if (!items.length) return "";
    const itemsHtml = items.map((item) => `
      <a class="sidebar-nav__item${item.id === active ? " sidebar-nav__item--active" : ""}"
         href="${item.href}" ${item.external ? 'target="_blank" rel="noopener"' : ""} ${item.id === active ? 'aria-current="page"' : ""}>
        <span class="sidebar-nav__label">${esc(item.label)}</span>
        ${item.badge ? `<span class="sidebar-badge" id="badge-${item.badge}" hidden></span>` : ""}
      </a>
    `).join("");
    return `
      <div class="sidebar-nav__group">
        <p class="sidebar-nav__group-label">${esc(group.label)}</p>
        ${itemsHtml}
      </div>
    `;
  }).join("");

  const shell = document.createElement("div");
  shell.innerHTML = `
    <aside class="admin-sidebar" id="adminSidebar">
      <div class="sidebar-top">
        <a href="dashboard.html" class="sidebar-brand">
          <img src="/assets/source/brand/Linas_Favicon.jpg" alt="" width="36" height="36">
          <span class="sidebar-brand__text">Lina's<span class="sidebar-brand__sub">Digital Business Platform</span></span>
        </a>
        <button type="button" class="sidebar-collapse-btn" id="sidebarCollapseBtn" aria-label="Collapse sidebar">«</button>
      </div>
      <nav class="sidebar-nav" aria-label="Admin navigation">${groupsHtml}</nav>
      <div class="sidebar-bottom">
        <div class="sidebar-account">
          <span class="sidebar-account__name">${esc(user.email)}</span>
          <span class="sidebar-account__role">${esc(ROLE_LABELS[role] || role)}</span>
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
  // opens the drawer; the backdrop, Escape, or choosing a nav link closes it.
  const mobileToggle = document.getElementById("mobileMenuToggle");
  function openDrawer() { sidebar.classList.add("admin-sidebar--open"); backdrop.hidden = false; }
  function closeDrawer() { sidebar.classList.remove("admin-sidebar--open"); backdrop.hidden = true; }
  if (mobileToggle) mobileToggle.addEventListener("click", openDrawer);
  backdrop.addEventListener("click", closeDrawer);
  sidebar.querySelectorAll(".sidebar-nav__item").forEach((a) => a.addEventListener("click", closeDrawer));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar.classList.contains("admin-sidebar--open")) closeDrawer();
  });

  // Desktop collapse — icon-only width, remembered as a plain UI
  // preference (not business data). Expanded by default.
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
  // Observer has no assignment scoping (reads everything, per rules), so
  // it uses the same unscoped query as owner/developer.
  const unreadBadge = document.getElementById("badge-unread");
  const overdueBadge = document.getElementById("badge-overdue");
  if (unreadBadge || overdueBadge) {
    const q = (role === "owner" || role === "developer" || role === "observer")
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

  // Orders awaiting confirmation. This is the platform's only prompt that a
  // customer has placed an order — nothing emails Lina when one arrives — so
  // it matters that it is visible from every admin page.
  // Role-guarded: staff cannot read orders, and must never attempt to.
  const ordersBadge = document.getElementById("badge-orders");
  if (ordersBadge && (role === "owner" || role === "developer" || role === "observer")) {
    onSnapshot(collection(db, "orders"), (snap) => {
      let pending = 0;
      snap.forEach((d) => {
        const o = d.data();
        if (!o.isTestRecord && o.status === "Pending WhatsApp") pending++;
      });
      ordersBadge.textContent = String(pending);
      ordersBadge.hidden = pending === 0;
    }, (err) => console.error("Orders badge listener error:", err));
  }
}
