// Lina's admin portal — Overview: a sales-and-marketing command centre.
// Every figure here is computed from real Firestore data, live, with
// test records excluded (see isTestRecord below) — no invented or
// estimated marketing/platform figures are ever shown.
import { requireAuth } from "./auth-guard.js";
import { db } from "./firebase-init.js";
import { initLayout } from "./layout.js";
import {
  collection, query, where, onSnapshot, doc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ---- Metric definitions (kept here in code, per the approved spec) ----
const QUALIFIED_STATUSES = ["Contacted", "Quoted", "Confirmed", "In Progress", "Completed"];
const CONFIRMED_STATUSES = ["Confirmed", "In Progress", "Completed"];
const OPEN_STATUSES = ["New", "Contacted", "Quoted", "In Progress"];
const CLOSED_STATUSES = ["Confirmed", "Completed", "Lost/Cancelled"];
const GOAL_FALLBACK = 350000;

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function todayIso() { return new Date().toISOString().slice(0, 10); }
function tile(value, label) {
  return `<div class="kpi-tile"><div class="kpi-tile__value">${esc(value)}</div><div class="kpi-tile__label">${esc(label)}</div></div>`;
}
function fmtRand(n) { return "R" + Number(n || 0).toLocaleString("en-ZA"); }
function renderList(el, items, emptyText) {
  el.innerHTML = items.length
    ? items.map((i) => `<li>${i}</li>`).join("")
    : `<li class="empty-state">${esc(emptyText)}</li>`;
}

async function main() {
  const { user, role } = await requireAuth();
  initLayout({ user, role, active: "overview" });

  let enquiries = [];
  let quotations = []; // stays empty for staff — see below
  let campaigns = [];
  let bookings = [];

  function isTest(e) { return e.isTestRecord === true; }

  function render() {
    const real = enquiries.filter((e) => !isTest(e));

    const newEnquiries = real.filter((e) => e.status === "New");
    const qualified = real.filter((e) => QUALIFIED_STATUSES.includes(e.status));
    // Quotations sent: enquiry status Quoted, OR (owner view only, since
    // staff cannot read quotations) a linked quotation already Sent/
    // Accepted/Revised — covers a quotation created before the enquiry's
    // own status caught up.
    const quotedEnquiryIds = new Set(
      quotations.filter((q) => ["Sent", "Accepted", "Revised"].includes(q.status)).map((q) => q.enquiryId)
    );
    const quotationsSent = real.filter((e) => e.status === "Quoted" || quotedEnquiryIds.has(e.id));
    const confirmedSales = real.filter((e) => CONFIRMED_STATUSES.includes(e.status));
    const revenueWon = confirmedSales
      .filter((e) => typeof e.confirmedAmount === "number")
      .reduce((sum, e) => sum + e.confirmedAmount, 0);
    const pipelineValue = real
      .filter((e) => OPEN_STATUSES.includes(e.status))
      .reduce((sum, e) => {
        const v = typeof e.quotedAmount === "number" ? e.quotedAmount : (typeof e.estimatedValue === "number" ? e.estimatedValue : 0);
        return sum + v;
      }, 0);
    const closedCount = real.filter((e) => CLOSED_STATUSES.includes(e.status)).length;
    const conversionRate = closedCount > 0 ? Math.round((confirmedSales.length / closedCount) * 100) : null;
    const outstandingFollowUps = real.filter((e) =>
      e.followUpDate && !["Completed", "Lost/Cancelled"].includes(e.status) && e.followUpDate <= todayIso()
    );

    document.getElementById("kpiGrid").innerHTML =
      tile(newEnquiries.length, "New enquiries") +
      tile(qualified.length, "Qualified leads") +
      tile(quotationsSent.length, "Quotations sent") +
      tile(confirmedSales.length, "Confirmed sales/bookings") +
      tile(fmtRand(revenueWon), "Revenue won") +
      tile(fmtRand(pipelineValue), "Estimated pipeline value") +
      tile(conversionRate === null ? "—" : conversionRate + "%", "Conversion rate") +
      tile(outstandingFollowUps.length, "Outstanding follow-ups");

    renderList(
      document.getElementById("leadsAttentionList"),
      newEnquiries.slice(0, 8).map((e) => `<span>${esc(e.customerName)} — ${esc(e.referenceNumber)}</span><span>${esc(e.enquiryType)}</span>`),
      "No new leads waiting right now."
    );

    renderList(
      document.getElementById("quotesFollowUpList"),
      quotations.filter((q) => q.status === "Sent" && q.followUpDate && q.followUpDate <= todayIso())
        .map((q) => `<span>${esc(q.quoteNumber)} — ${esc(q.customerName || "")}</span><span class="overdue-text">${esc(q.followUpDate)}</span>`),
      role === "owner" ? "No quotations waiting on follow-up." : "Owner-only data."
    );

    renderList(
      document.getElementById("overdueList"),
      outstandingFollowUps.slice(0, 8).map((e) =>
        `<span>${esc(e.customerName)} — ${esc(e.referenceNumber)}</span><span class="overdue-text">${esc(e.followUpDate)}</span>`),
      "No overdue follow-ups."
    );

    const recent = real.slice().sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).slice(0, 6);
    renderList(
      document.getElementById("recentEnquiriesList"),
      recent.map((e) => `<span>${esc(e.customerName)} — ${esc(e.referenceNumber)}</span><span>${esc(e.status)}</span>`),
      "No enquiries yet. Once someone submits the public form, it will appear here."
    );

    const byStage = {};
    ["New", "Contacted", "Quoted", "Confirmed", "In Progress", "Completed", "Lost/Cancelled"].forEach((s) => { byStage[s] = 0; });
    real.forEach((e) => { byStage[e.status] = (byStage[e.status] || 0) + 1; });
    renderList(
      document.getElementById("pipelineSummaryList"),
      Object.entries(byStage).filter(([, n]) => n > 0).map(([s, n]) => `<span>${esc(s)}</span><span>${n}</span>`),
      "No enquiries yet."
    );

    const bySource = {};
    real.forEach((e) => { bySource[e.source || "Unknown"] = (bySource[e.source || "Unknown"] || 0) + 1; });
    renderList(
      document.getElementById("bySourceList"),
      Object.entries(bySource).sort((a, b) => b[1] - a[1]).map(([s, n]) => `<span>${esc(s)}</span><span>${n}</span>`),
      "No enquiries yet."
    );

    renderList(
      document.getElementById("campaignsList"),
      campaigns.filter((c) => c.status === "Active").map((c) => `<span>${esc(c.campaignName)}</span><span>${esc(c.channel || "")}</span>`),
      "No active campaigns. Connect account to view performance once one is running."
    );

    const upcomingBookings = bookings
      .filter((b) => b.eventDate && b.eventDate >= todayIso() && b.bookingStatus !== "Cancelled")
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
      .slice(0, 5);
    renderList(
      document.getElementById("upcomingCalendarList"),
      upcomingBookings.map((b) => `<span>${esc(b.customerName || b.title)} — ${esc(b.eventType)}</span><span>${esc(b.eventDate)}</span>`),
      "No upcoming confirmed events yet."
    );
  }

  onSnapshot(
    role === "owner" ? collection(db, "enquiries") : query(collection(db, "enquiries"), where("assignedOwnerId", "in", [user.uid, null])),
    (snap) => { enquiries = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => console.error("Overview enquiries listener error:", err)
  );

  if (role === "owner") {
    onSnapshot(collection(db, "quotations"), (snap) => { quotations = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
      (err) => console.error("Overview quotations listener error:", err));
  }
  onSnapshot(collection(db, "campaigns"), (snap) => { campaigns = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => console.error("Overview campaigns listener error:", err));
  onSnapshot(
    role === "owner" ? collection(db, "bookings") : query(collection(db, "bookings"), where("assignedPerson", "in", [user.uid, null])),
    (snap) => { bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => console.error("Overview bookings listener error:", err)
  );

  // Growth-goal progress — read live from settings/business.dashboardGoal,
  // honestly falling back to the known R350,000 target if that document
  // doesn't exist yet (never inventing a different number).
  onSnapshot(doc(db, "settings", "business"), (snap) => {
    const goal = (snap.exists() && typeof snap.data().dashboardGoal === "number") ? snap.data().dashboardGoal : GOAL_FALLBACK;
    const real = enquiries.filter((e) => !isTest(e));
    const revenueWon = real
      .filter((e) => CONFIRMED_STATUSES.includes(e.status) && typeof e.confirmedAmount === "number")
      .reduce((sum, e) => sum + e.confirmedAmount, 0);
    const pct = Math.min(100, Math.round((revenueWon / goal) * 100));
    document.getElementById("goalFill").style.width = pct + "%";
    document.getElementById("goalNote").textContent = revenueWon > 0
      ? "Calculated from confirmedAmount on Confirmed/In Progress/Completed enquiries, excluding test records."
      : "No confirmed revenue recorded yet — shown honestly as 0%, not estimated.";
    document.getElementById("goalCaption").textContent = `${fmtRand(revenueWon)} of ${fmtRand(goal)} recorded (${pct}%).`;
  }, (err) => console.error("Overview goal listener error:", err));
}

main().catch((err) => {
  console.error("Overview failed to load:", err);
});
