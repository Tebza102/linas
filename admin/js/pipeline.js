// Lina's admin portal — Sales Pipeline. Same enquiry documents as the
// inbox, grouped by stage instead of a flat table — no duplicate lead
// records, and opening a card reuses the exact same detail panel/logic
// as the inbox (admin/js/detail.js), so a stage change here is the same
// write as a status change there.
import { requireAuth } from "./auth-guard.js";
import { db } from "./firebase-init.js";
import { initLayout } from "./layout.js";
import { collection, query, where, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { openDetail } from "./detail.js";

const STAGES = ["New", "Contacted", "Quoted", "Confirmed", "In Progress", "Completed", "Lost/Cancelled"];
const ENQUIRY_TYPES = ["Wedding", "Funeral", "Corporate event", "Private function", "Mobile-kitchen order"];
const SOURCES = ["Website", "Instagram", "Facebook", "WhatsApp", "Google", "Referral", "Direct outreach", "Campaign", "Other"];
const TERMINAL_STATUSES = ["Completed", "Lost/Cancelled"];

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function todayIso() { return new Date().toISOString().slice(0, 10); }
function fmtValue(e) {
  if (typeof e.confirmedAmount === "number") return "R" + e.confirmedAmount.toLocaleString("en-ZA");
  if (typeof e.quotedAmount === "number") return "R" + e.quotedAmount.toLocaleString("en-ZA");
  if (e.quotedAmount === "pending") return "Quote pending";
  if (typeof e.estimatedValue === "number") return "~R" + e.estimatedValue.toLocaleString("en-ZA");
  return "—";
}

async function main() {
  const { user, role } = await requireAuth();
  initLayout({ user, role, active: "pipeline" });

  const sourceFilter = document.getElementById("sourceFilter");
  SOURCES.forEach((s) => sourceFilter.insertAdjacentHTML("beforeend", `<option value="${esc(s)}">${esc(s)}</option>`));
  const typeFilter = document.getElementById("typeFilter");
  ENQUIRY_TYPES.forEach((t) => typeFilter.insertAdjacentHTML("beforeend", `<option value="${esc(t)}">${esc(t)}</option>`));

  const adminUsersMap = {};
  const usersSnap = await getDocs(collection(db, "adminUsers"));
  usersSnap.forEach((d) => { adminUsersMap[d.id] = d.data(); });

  const detailPanel = document.getElementById("detailPanel");
  const body = document.getElementById("pipelineBody");
  let allEnquiries = [];

  function isOverdue(e) {
    if (!e.followUpDate || TERMINAL_STATUSES.includes(e.status)) return false;
    return e.followUpDate <= todayIso();
  }

  function render() {
    const q = document.getElementById("searchBox").value.trim().toLowerCase();
    const sourceQ = sourceFilter.value;
    const typeQ = typeFilter.value;

    const filtered = allEnquiries.filter((e) => {
      if (e.isTestRecord) return false;
      if (q) {
        const hay = `${e.customerName || ""} ${e.phone || ""} ${e.referenceNumber || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (sourceQ && e.source !== sourceQ) return false;
      if (typeQ && e.enquiryType !== typeQ) return false;
      return true;
    });

    body.innerHTML = STAGES.map((stage) => {
      const items = filtered.filter((e) => e.status === stage);
      const cards = items.map((e) => `
        <div class="pipeline-card" data-id="${esc(e.id)}" tabindex="0" role="button">
          <div class="pipeline-card__top">
            <span>${esc(e.customerName)}</span>
            <span>${fmtValue(e)}</span>
          </div>
          <div class="pipeline-card__meta">
            <span>${esc(e.enquiryType)}</span>
            <span>${esc(e.eventDate || "No date set")}</span>
            <span>${esc(e.source || "—")}</span>
            ${e.campaignName ? `<span>${esc(e.campaignName)}</span>` : ""}
          </div>
          ${e.nextAction ? `<div class="pipeline-card__next">${esc(e.nextAction)}${e.followUpDate ? ` — <span class="${isOverdue(e) ? "overdue-text" : ""}">${esc(e.followUpDate)}${isOverdue(e) ? " (overdue)" : ""}</span>` : ""}</div>` : ""}
        </div>
      `).join("");
      return `
        <div class="pipeline-stage">
          <div class="pipeline-stage__header">
            <h2>${esc(stage)}</h2>
            <span class="pipeline-stage__count">${items.length}</span>
          </div>
          ${items.length ? cards : '<p class="empty-state">No enquiries at this stage.</p>'}
        </div>
      `;
    }).join("");

    body.querySelectorAll(".pipeline-card").forEach((card) => {
      const openThis = () => {
        const e = allEnquiries.find((x) => x.id === card.dataset.id);
        if (e) openDetail(detailPanel, e, { user, role, adminUsersMap });
      };
      card.addEventListener("click", openThis);
      card.addEventListener("keydown", (ev) => { if (ev.key === "Enter") openThis(); });
    });
  }

  const q = role === "owner"
    ? query(collection(db, "enquiries"))
    : query(collection(db, "enquiries"), where("assignedOwnerId", "in", [user.uid, null]));
  onSnapshot(q, (snap) => {
    allEnquiries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  }, (err) => {
    console.error("Pipeline listener error:", err);
    body.innerHTML = '<p class="empty-state">Could not load the pipeline. Please refresh.</p>';
  });

  ["searchBox"].forEach((id) => document.getElementById(id).addEventListener("input", render));
  [sourceFilter, typeFilter].forEach((el) => el.addEventListener("change", render));
}

main().catch((err) => {
  console.error("Pipeline failed to load:", err);
  document.getElementById("pipelineBody").innerHTML = '<p class="empty-state">Could not load the pipeline. Please refresh.</p>';
});
