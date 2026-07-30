// Lina's admin portal — enquiry inbox list.
import { requireAuth } from "./auth-guard.js";
import { db } from "./firebase-init.js";
import { initLayout } from "./layout.js";
import {
  collection, query, where, orderBy, getDocs, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { openDetail } from "./detail.js";

const STATUSES = ["New", "Contacted", "Quoted", "Confirmed", "In Progress", "Completed", "Lost/Cancelled"];
const ENQUIRY_TYPES = ["Wedding", "Funeral", "Corporate event", "Private function", "Mobile-kitchen order"];
const SOURCES = ["Website", "Instagram", "WhatsApp", "Referral", "Other"];
const TERMINAL_STATUSES = ["Completed", "Lost/Cancelled"];
// If no server-confirmed snapshot has arrived in this long, the connection
// indicator downgrades from Live to Reconnecting — this is also the
// practical implementation of "warn if a newly stored enquiry doesn't
// become visible within 10 seconds": a live listener in good health
// reflects new documents in well under this window, so a listener that's
// gone quiet for longer than this is the honest, checkable signal that
// something (not "nothing new happened") may be wrong.
const STALE_AFTER_MS = 10 * 1000;

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function todayIso() { return new Date().toISOString().slice(0, 10); }

async function main() {
  const { user, role } = await requireAuth();
  initLayout({ user, role, active: "leads" });

  // Populate filter dropdowns.
  const statusFilter = document.getElementById("statusFilter");
  STATUSES.forEach((s) => statusFilter.insertAdjacentHTML("beforeend", `<option value="${esc(s)}">${esc(s)}</option>`));
  const typeFilter = document.getElementById("typeFilter");
  ENQUIRY_TYPES.forEach((t) => typeFilter.insertAdjacentHTML("beforeend", `<option value="${esc(t)}">${esc(t)}</option>`));
  const sourceFilter = document.getElementById("sourceFilter");
  SOURCES.forEach((s) => sourceFilter.insertAdjacentHTML("beforeend", `<option value="${esc(s)}">${esc(s)}</option>`));

  // Load admin user directory (for owner filter, assignment dropdown, and
  // rendering "assigned to" names).
  const adminUsersMap = {};
  const usersSnap = await getDocs(collection(db, "adminUsers"));
  usersSnap.forEach((d) => { adminUsersMap[d.id] = d.data(); });
  const ownerFilter = document.getElementById("ownerFilter");
  Object.entries(adminUsersMap).forEach(([uid, u]) => {
    ownerFilter.insertAdjacentHTML("beforeend", `<option value="${esc(uid)}">${esc(u.displayName)}</option>`);
  });

  const tbody = document.getElementById("leadTableBody");
  const detailPanel = document.getElementById("detailPanel");
  const resultSummary = document.getElementById("resultSummary");
  const unreadCount = document.getElementById("unreadCount");
  const connectionState = document.getElementById("connectionState");
  const lastSyncEl = document.getElementById("lastSyncText");
  const refreshBtn = document.getElementById("manualRefreshBtn");
  let allEnquiries = [];
  let deepLinkOpened = false;
  let lastServerSyncAt = null;
  let unsubscribeEnquiries = null;

  function setConnectionState(state) {
    connectionState.textContent = state;
    connectionState.setAttribute("data-state", state.toLowerCase());
  }

  function subscribe() {
    if (unsubscribeEnquiries) unsubscribeEnquiries();
    tbody.innerHTML = '<tr><td colspan="9">Loading…</td></tr>';
    // Scope the base query by role. Staff only ever fetch enquiries that
    // are assigned to them or unassigned — matches firestore.rules exactly,
    // so this query never gets a permission-denied on a matching read.
    const q = role === "owner"
      ? query(collection(db, "enquiries"), orderBy("createdAt", "desc"))
      : query(collection(db, "enquiries"), where("assignedOwnerId", "in", [user.uid, null]), orderBy("createdAt", "desc"));

    unsubscribeEnquiries = onSnapshot(q, (snap) => {
      allEnquiries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (!snap.metadata.fromCache) {
        lastServerSyncAt = Date.now();
        setConnectionState("Live");
      }
      lastSyncEl.textContent = lastServerSyncAt ? `Last sync: ${new Date(lastServerSyncAt).toLocaleTimeString("en-ZA")}` : "Last sync: —";

      // Unread is deliberately independent of sales status: an enquiry can
      // move to "Contacted" and beyond while still never having been
      // opened by anyone, and conversely a "New" enquiry someone already
      // opened is no longer unread. viewedAt is the single source of truth.
      const unread = allEnquiries.filter((e) => !e.viewedAt).length;
      unreadCount.textContent = unread === 1 ? "1 unread" : `${unread} unread`;
      render();
      maybeOpenDeepLink();
    }, (err) => {
      console.error("Enquiries listener error:", err);
      setConnectionState("Offline");
    });
  }

  // No page-reload / polling needed for changes: this same listener also
  // picks up webhook-driven notification-status updates and detail-panel
  // saves automatically, since they're all just Firestore writes.
  subscribe();

  setInterval(() => {
    if (lastServerSyncAt && Date.now() - lastServerSyncAt > STALE_AFTER_MS && connectionState.getAttribute("data-state") === "live") {
      setConnectionState("Reconnecting");
    }
  }, 3000);

  refreshBtn.addEventListener("click", () => {
    setConnectionState("Reconnecting");
    subscribe();
  });

  function maybeOpenDeepLink() {
    if (deepLinkOpened) return;
    const targetId = new URLSearchParams(location.search).get("enquiry");
    if (!targetId) return;
    const target = allEnquiries.find((e) => e.id === targetId);
    if (!target) return;
    deepLinkOpened = true;
    openDetail(detailPanel, target, { user, role, adminUsersMap });
  }

  function isOverdue(e) {
    if (!e.followUpDate || TERMINAL_STATUSES.includes(e.status)) return false;
    return e.followUpDate < todayIso();
  }

  function render() {
    const q = document.getElementById("searchBox").value.trim().toLowerCase();
    const statusQ = statusFilter.value;
    const typeQ = typeFilter.value;
    const sourceQ = sourceFilter.value;
    const ownerQ = ownerFilter.value;
    const fromQ = document.getElementById("fromDate").value;
    const toQ = document.getElementById("toDate").value;

    const rows = allEnquiries.filter((e) => {
      if (q) {
        const hay = `${e.customerName || ""} ${e.phone || ""} ${e.email || ""} ${e.referenceNumber || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusQ && e.status !== statusQ) return false;
      if (typeQ && e.enquiryType !== typeQ) return false;
      if (sourceQ && e.source !== sourceQ) return false;
      if (ownerQ && e.assignedOwnerId !== ownerQ) return false;
      if (fromQ || toQ) {
        const created = e.createdAt && e.createdAt.toDate ? e.createdAt.toDate() : null;
        if (created) {
          const createdIso = created.toISOString().slice(0, 10);
          if (fromQ && createdIso < fromQ) return false;
          if (toQ && createdIso > toQ) return false;
        }
      }
      return true;
    });

    resultSummary.textContent = `${rows.length} of ${allEnquiries.length} enquiries`;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9">No enquiries match. Once someone submits the public enquiry form, it will appear here.</td></tr>';
      return;
    }

    tbody.innerHTML = "";
    rows.forEach((e) => {
      const tr = document.createElement("tr");
      tr.className = "row" + (e.status === "New" ? " row--new" : "") + (isOverdue(e) ? " row--overdue" : "") + (!e.viewedAt ? " row--unread" : "");
      tr.tabIndex = 0;
      tr.setAttribute("role", "button");
      const ownerName = e.assignedOwnerId && adminUsersMap[e.assignedOwnerId] ? adminUsersMap[e.assignedOwnerId].displayName : "Unassigned";
      tr.innerHTML = `
        <td>${esc(e.referenceNumber)}</td>
        <td>${esc(e.customerName)}</td>
        <td>${esc(e.enquiryType)}</td>
        <td>${esc(e.eventDate || "—")}</td>
        <td>${esc(e.source || "—")}</td>
        <td>${esc(ownerName)}</td>
        <td>${esc(e.nextAction || "—")}${e.followUpDate ? ` (${esc(e.followUpDate)})` : ""}</td>
        <td>${fmtDate(e.createdAt)}</td>
        <td><span class="status-badge" data-status="${esc(e.status)}">${esc(e.status)}</span></td>
      `;
      const openThis = () => openDetail(detailPanel, e, { user, role, adminUsersMap });
      tr.addEventListener("click", openThis);
      tr.addEventListener("keydown", (ev) => { if (ev.key === "Enter") openThis(); });
      tbody.appendChild(tr);
    });
  }

  ["input", "change"].forEach((evt) => {
    ["searchBox"].forEach((id) => document.getElementById(id).addEventListener(evt, render));
  });
  [statusFilter, typeFilter, sourceFilter, ownerFilter].forEach((el) => el.addEventListener("change", render));
  document.getElementById("fromDate").addEventListener("change", render);
  document.getElementById("toDate").addEventListener("change", render);
}

main().catch((err) => {
  console.error("Inbox failed to load:", err);
  document.getElementById("leadTableBody").innerHTML =
    `<tr><td colspan="9">Could not load enquiries. Please refresh, or contact an administrator if this continues.</td></tr>`;
});
