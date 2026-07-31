// Lina's admin portal — decision-focused reports. Every figure is
// calculated live from real Firestore data, with test and cancelled
// records excluded consistently with Overview's definitions.
import { requireAuth } from "./auth-guard.js";
import { db } from "./firebase-init.js";
import { initLayout } from "./layout.js";
import { collection, onSnapshot, doc, query, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const QUALIFIED_STATUSES = ["Contacted", "Quoted", "Confirmed", "In Progress", "Completed"];
const CONFIRMED_STATUSES = ["Confirmed", "In Progress", "Completed"];
const GOAL_FALLBACK = 350000;

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function todayIso() { return new Date().toISOString().slice(0, 10); }
function fmtRand(n) { return "R" + Number(n || 0).toLocaleString("en-ZA"); }
function tile(value, label) {
  return `<div class="kpi-tile"><div class="kpi-tile__value">${esc(value)}</div><div class="kpi-tile__label">${esc(label)}</div></div>`;
}
function renderCounts(el, counter, emptyText) {
  const entries = Object.entries(counter).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  el.innerHTML = entries.length
    ? entries.map(([k, n]) => `<li><span>${esc(k)}</span><span>${n}</span></li>`).join("")
    : `<li class="empty-state">${esc(emptyText)}</li>`;
}

async function main() {
  const { user, role } = await requireAuth();
  initLayout({ user, role, active: "reports" });

  let enquiries = [];
  let quotations = [];
  let campaigns = [];
  let goal = GOAL_FALLBACK;

  function render() {
    const real = enquiries.filter((e) => !e.isTestRecord);
    const qualified = real.filter((e) => QUALIFIED_STATUSES.includes(e.status));
    const quotedEnquiries = real.filter((e) => e.status === "Quoted" || CONFIRMED_STATUSES.includes(e.status));
    const confirmed = real.filter((e) => CONFIRMED_STATUSES.includes(e.status));
    const revenue = confirmed.filter((e) => typeof e.confirmedAmount === "number").reduce((s, e) => s + e.confirmedAmount, 0);
    const closed = real.filter((e) => ["Confirmed", "Completed", "Lost/Cancelled"].includes(e.status)).length;
    const conversionRate = closed > 0 ? Math.round((confirmed.length / closed) * 100) : null;
    const avgConfirmed = confirmed.length ? Math.round(revenue / confirmed.filter((e) => typeof e.confirmedAmount === "number").length || 0) : 0;
    const totalQuotedValue = quotations.filter((q) => q.status !== "Declined").reduce((s, q) => s + (Number(q.amount) || 0), 0);
    const overdue = real.filter((e) => e.followUpDate && !["Completed", "Lost/Cancelled"].includes(e.status) && e.followUpDate <= todayIso());

    document.getElementById("kpiGrid").innerHTML =
      tile(qualified.length, "Qualified leads") +
      tile(quotations.length, "Quotations sent") +
      tile(fmtRand(totalQuotedValue), "Total quoted value") +
      tile(confirmed.length, "Confirmed sales") +
      tile(fmtRand(revenue), "Revenue won") +
      tile(conversionRate === null ? "—" : conversionRate + "%", "Conversion rate") +
      tile(fmtRand(avgConfirmed), "Average confirmed value") +
      tile(overdue.length, "Overdue follow-ups");

    const bySource = {}, qualifiedBySource = {}, quotesBySource = {}, confirmedBySource = {}, revenueBySource = {};
    real.forEach((e) => {
      const s = e.source || "Unknown";
      bySource[s] = (bySource[s] || 0) + 1;
      if (QUALIFIED_STATUSES.includes(e.status)) qualifiedBySource[s] = (qualifiedBySource[s] || 0) + 1;
      if (e.status === "Quoted" || CONFIRMED_STATUSES.includes(e.status)) quotesBySource[s] = (quotesBySource[s] || 0) + 1;
      if (CONFIRMED_STATUSES.includes(e.status)) {
        confirmedBySource[s] = (confirmedBySource[s] || 0) + 1;
        if (typeof e.confirmedAmount === "number") revenueBySource[s] = (revenueBySource[s] || 0) + e.confirmedAmount;
      }
    });
    renderCounts(document.getElementById("bySourceList"), bySource, "No enquiries yet.");
    renderCounts(document.getElementById("qualifiedBySourceList"), qualifiedBySource, "No qualified leads yet.");
    renderCounts(document.getElementById("quotesBySourceList"), quotesBySource, "No quotations yet.");
    renderCounts(document.getElementById("confirmedBySourceList"), confirmedBySource, "No confirmed sales yet.");
    const revenueDisplay = {}; Object.entries(revenueBySource).forEach(([k, v]) => { revenueDisplay[k] = v; });
    document.getElementById("revenueBySourceList").innerHTML = Object.keys(revenueDisplay).length
      ? Object.entries(revenueDisplay).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><span>${esc(k)}</span><span>${fmtRand(v)}</span></li>`).join("")
      : '<li class="empty-state">No confirmed revenue yet.</li>';

    document.getElementById("overdueList").innerHTML = overdue.length
      ? overdue.slice(0, 10).map((e) => `<li><span>${esc(e.customerName)} — ${esc(e.referenceNumber)}</span><span class="overdue-text">${esc(e.followUpDate)}</span></li>`).join("")
      : '<li class="empty-state">No overdue follow-ups.</li>';

    const lostReasons = {};
    real.filter((e) => e.status === "Lost/Cancelled" && e.lostReason).forEach((e) => { lostReasons[e.lostReason] = (lostReasons[e.lostReason] || 0) + 1; });
    renderCounts(document.getElementById("lostReasonsList"), lostReasons, "No lost/cancelled enquiries recorded.");

    if (campaigns.length) {
      document.getElementById("campaignPerfList").innerHTML = campaigns.map((c) => {
        const matched = real.filter((e) => c.campaignCode && (e.campaignCode === c.campaignCode || e.utmCampaign === c.campaignCode || e.campaignId === c.id));
        const conf = matched.filter((e) => CONFIRMED_STATUSES.includes(e.status));
        const rev = conf.filter((e) => typeof e.confirmedAmount === "number").reduce((s, e) => s + e.confirmedAmount, 0);
        return `<li><span>${esc(c.campaignName)}</span><span>${matched.length} leads, ${fmtRand(rev)}</span></li>`;
      }).join("");
    } else {
      document.getElementById("campaignPerfList").innerHTML = '<li class="empty-state">No campaigns yet — connect account to view performance.</li>';
    }

    const pct = Math.min(100, Math.round((revenue / goal) * 100));
    document.getElementById("goalFill").style.width = pct + "%";
    document.getElementById("goalCaption").textContent = `${fmtRand(revenue)} of ${fmtRand(goal)} recorded (${pct}%).`;
  }

  document.getElementById("exportCsvBtn").addEventListener("click", () => {
    const real = enquiries.filter((e) => !e.isTestRecord);
    const cols = ["referenceNumber", "customerName", "phone", "email", "enquiryType", "source", "campaignCode", "status", "quotedAmount", "confirmedAmount", "estimatedValue", "followUpDate"];
    const lines = [cols.join(",")];
    real.forEach((e) => {
      lines.push(cols.map((c) => `"${String(e[c] == null ? "" : e[c]).replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lina-enquiries-report-${todayIso()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  });

  const canReadAll = role === "owner" || role === "developer" || role === "observer";
  const enquiriesQuery = canReadAll
    ? collection(db, "enquiries")
    : query(collection(db, "enquiries"), where("assignedOwnerId", "in", [user.uid, null]));
  onSnapshot(enquiriesQuery, (snap) => { enquiries = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => console.error("Reports enquiries listener error:", err));
  if (canReadAll) {
    onSnapshot(collection(db, "quotations"), (snap) => { quotations = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
      (err) => console.error("Reports quotations listener error:", err));
  }
  onSnapshot(collection(db, "campaigns"), (snap) => { campaigns = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => console.error("Reports campaigns listener error:", err));
  onSnapshot(doc(db, "settings", "business"), (snap) => {
    goal = (snap.exists() && typeof snap.data().dashboardGoal === "number") ? snap.data().dashboardGoal : GOAL_FALLBACK;
    render();
  }, (err) => console.error("Reports goal listener error:", err));
}

main().catch((err) => {
  console.error("Reports failed to load:", err);
});
