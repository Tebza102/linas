// Lina's admin portal — enquiry inbox list.
import { requireAuth, logout } from "./auth-guard.js";
import { db } from "./firebase-init.js";
import {
  collection, query, where, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { openDetail } from "./detail.js";

const STATUSES = ["New", "Contacted", "Quoted", "Confirmed", "In Progress", "Completed", "Lost/Cancelled"];
const ENQUIRY_TYPES = ["Wedding", "Funeral", "Corporate event", "Private function", "Mobile-kitchen order"];
const SOURCES = ["Website", "Instagram", "WhatsApp", "Referral", "Other"];
const TERMINAL_STATUSES = ["Completed", "Lost/Cancelled"];

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
  document.getElementById("userLabel").textContent = `${user.email} (${role})`;
  document.getElementById("logoutBtn").addEventListener("click", logout);

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
  let allEnquiries = [];

  async function loadEnquiries() {
    tbody.innerHTML = '<tr><td colspan="9">Loading…</td></tr>';
    // Scope the base query by role. Staff only ever fetch enquiries that
    // are assigned to them or unassigned — matches firestore.rules exactly,
    // so this query never gets a permission-denied on a matching read.
    let q;
    if (role === "owner") {
      q = query(collection(db, "enquiries"), orderBy("createdAt", "desc"));
    } else {
      q = query(collection(db, "enquiries"), where("assignedOwnerId", "in", [user.uid, null]), orderBy("createdAt", "desc"));
    }
    const snap = await getDocs(q);
    allEnquiries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
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
      tr.className = "row" + (e.status === "New" ? " row--new" : "") + (isOverdue(e) ? " row--overdue" : "");
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
      const openThis = () => openDetail(detailPanel, e, { user, role, adminUsersMap, onSaved: loadEnquiries });
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

  await loadEnquiries();
}

main().catch((err) => {
  console.error("Inbox failed to load:", err);
  document.getElementById("leadTableBody").innerHTML =
    `<tr><td colspan="9">Could not load enquiries. Please refresh, or contact an administrator if this continues.</td></tr>`;
});
