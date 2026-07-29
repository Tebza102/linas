// Lina's admin portal — live Firestore-backed dashboard. Owner/Admin only
// (per the Phase 1 role spec — Staff do not have dashboard access).
import { requireAuth, logout } from "./auth-guard.js";
import { db } from "./firebase-init.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const STATUSES = ["New", "Contacted", "Quoted", "Confirmed", "In Progress", "Completed", "Lost/Cancelled"];
const ENQUIRY_TYPES = ["Wedding", "Funeral", "Corporate event", "Private function", "Mobile-kitchen order"];
const SOURCES = ["Website", "Instagram", "WhatsApp", "Referral", "Other"];
const GOAL = 350000;
const TERMINAL_STATUSES = ["Completed", "Lost/Cancelled"];

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function todayIso() { return new Date().toISOString().slice(0, 10); }
function tile(value, label) {
  return `<div class="stat-tile"><div class="stat-tile__value">${esc(value)}</div><div class="stat-tile__label">${esc(label)}</div></div>`;
}
function toDate(ts) {
  if (!ts) return null;
  return ts.toDate ? ts.toDate() : new Date(ts);
}

async function main() {
  const { user, role } = await requireAuth();
  document.getElementById("userLabel").textContent = `${user.email} (${role})`;
  document.getElementById("logoutBtn").addEventListener("click", logout);

  if (role !== "owner") {
    document.getElementById("accessDenied").hidden = false;
    return;
  }
  document.getElementById("dashboardBody").hidden = false;

  const typeFilter = document.getElementById("typeFilter");
  ENQUIRY_TYPES.forEach((t) => typeFilter.insertAdjacentHTML("beforeend", `<option value="${esc(t)}">${esc(t)}</option>`));
  const sourceFilter = document.getElementById("sourceFilter");
  SOURCES.forEach((s) => sourceFilter.insertAdjacentHTML("beforeend", `<option value="${esc(s)}">${esc(s)}</option>`));

  const adminUsersMap = {};
  const usersSnap = await getDocs(collection(db, "adminUsers"));
  usersSnap.forEach((d) => { adminUsersMap[d.id] = d.data(); });
  const ownerFilter = document.getElementById("ownerFilter");
  Object.entries(adminUsersMap).forEach(([uid, u]) => {
    ownerFilter.insertAdjacentHTML("beforeend", `<option value="${esc(uid)}">${esc(u.displayName)}</option>`);
  });

  const enquiriesSnap = await getDocs(collection(db, "enquiries"));
  const allEnquiries = enquiriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Average response time: earliest status_change activity per enquiry
  // where the transition left "New", compared against that enquiry's
  // createdAt. Enquiries never touched yet simply don't contribute.
  const activitiesSnap = await getDocs(query(collection(db, "enquiryActivities"), where("actionType", "==", "status_change")));
  const firstResponseByEnquiry = {};
  activitiesSnap.forEach((d) => {
    const a = d.data();
    if (a.previousValue !== "New") return;
    const t = toDate(a.createdAt);
    if (!t) return;
    if (!firstResponseByEnquiry[a.enquiryId] || t < firstResponseByEnquiry[a.enquiryId]) {
      firstResponseByEnquiry[a.enquiryId] = t;
    }
  });

  const rangePreset = document.getElementById("rangePreset");
  const customFromWrap = document.getElementById("customFromWrap");
  const customToWrap = document.getElementById("customToWrap");
  rangePreset.addEventListener("change", () => {
    const isCustom = rangePreset.value === "custom";
    customFromWrap.hidden = !isCustom;
    customToWrap.hidden = !isCustom;
    render();
  });
  [document.getElementById("customFrom"), document.getElementById("customTo"), sourceFilter, typeFilter, ownerFilter]
    .forEach((el) => el.addEventListener("change", render));

  function currentRange() {
    const preset = rangePreset.value;
    const now = new Date();
    if (preset === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return { from: start, to: null };
    }
    if (preset === "month") {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: null };
    }
    if (preset === "custom") {
      const fromVal = document.getElementById("customFrom").value;
      const toVal = document.getElementById("customTo").value;
      return { from: fromVal ? new Date(fromVal) : null, to: toVal ? new Date(toVal + "T23:59:59") : null };
    }
    return { from: null, to: null };
  }

  let filtered = [];

  function render() {
    const { from, to } = currentRange();
    const sourceQ = sourceFilter.value;
    const typeQ = typeFilter.value;
    const ownerQ = ownerFilter.value;

    filtered = allEnquiries.filter((e) => {
      const created = toDate(e.createdAt);
      if (from && created && created < from) return false;
      if (to && created && created > to) return false;
      if (sourceQ && e.source !== sourceQ) return false;
      if (typeQ && e.enquiryType !== typeQ) return false;
      if (ownerQ && e.assignedOwnerId !== ownerQ) return false;
      return true;
    });

    const byStatus = {};
    STATUSES.forEach((s) => { byStatus[s] = 0; });
    filtered.forEach((e) => { byStatus[e.status] = (byStatus[e.status] || 0) + 1; });

    const won = byStatus["Confirmed"] + byStatus["In Progress"] + byStatus["Completed"];
    const lost = byStatus["Lost/Cancelled"];
    const closed = won + lost;
    const conversionRate = closed > 0 ? Math.round((won / closed) * 100) : null;

    const pipelineValue = filtered
      .filter((e) => e.status === "Quoted" && typeof e.quotedAmount === "number")
      .reduce((sum, e) => sum + e.quotedAmount, 0);

    const confirmedRevenue = filtered
      .filter((e) => ["Confirmed", "In Progress", "Completed"].includes(e.status) && typeof e.confirmedAmount === "number")
      .reduce((sum, e) => sum + e.confirmedAmount, 0);

    document.getElementById("statGrid").innerHTML =
      tile(filtered.length, "Total enquiries") +
      tile(byStatus["New"], "New") +
      tile(byStatus["Contacted"], "Contacted") +
      tile(byStatus["Quoted"], "Quotations sent") +
      tile(byStatus["Confirmed"], "Confirmed") +
      tile(byStatus["Completed"], "Completed") +
      tile(byStatus["Lost/Cancelled"], "Lost/cancelled") +
      tile(conversionRate === null ? "—" : conversionRate + "%", "Conversion rate") +
      tile("R" + pipelineValue.toLocaleString("en-ZA"), "Quoted pipeline value") +
      tile("R" + confirmedRevenue.toLocaleString("en-ZA"), "Confirmed revenue");

    function breakdown(el, counter) {
      const entries = Object.entries(counter).filter(([, n]) => n > 0);
      el.innerHTML = entries.length
        ? entries.map(([k, n]) => `<li><span>${esc(k)}</span><span>${n}</span></li>`).join("")
        : '<li class="empty-state">No enquiries yet.</li>';
    }
    const bySource = {}; SOURCES.forEach((s) => { bySource[s] = 0; });
    filtered.forEach((e) => { bySource[e.source || "Unknown"] = (bySource[e.source || "Unknown"] || 0) + 1; });
    breakdown(document.getElementById("bySourceList"), bySource);

    const byType = {}; ENQUIRY_TYPES.forEach((t) => { byType[t] = 0; });
    filtered.forEach((e) => { byType[e.enquiryType || "Unknown"] = (byType[e.enquiryType || "Unknown"] || 0) + 1; });
    breakdown(document.getElementById("byTypeList"), byType);

    breakdown(document.getElementById("byStatusList"), byStatus);

    const overdue = filtered.filter((e) => e.followUpDate && !TERMINAL_STATUSES.includes(e.status) && e.followUpDate < todayIso());
    const overdueEl = document.getElementById("overdueList");
    overdueEl.innerHTML = overdue.length
      ? overdue.map((e) => `<li><span>${esc(e.referenceNumber)} — ${esc(e.customerName)}</span><span>${esc(e.followUpDate)}</span></li>`).join("")
      : '<li class="empty-state">No overdue follow-ups.</li>';

    const upcoming = filtered
      .filter((e) => e.eventDate && !TERMINAL_STATUSES.includes(e.status) && e.eventDate >= todayIso())
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
      .slice(0, 10);
    const upcomingEl = document.getElementById("upcomingList");
    upcomingEl.innerHTML = upcoming.length
      ? upcoming.map((e) => `<li><span>${esc(e.referenceNumber)} — ${esc(e.customerName)} (${esc(e.enquiryType)})</span><span>${esc(e.eventDate)}</span></li>`).join("")
      : '<li class="empty-state">No upcoming events on record.</li>';

    const goalPct = Math.min(100, Math.round((confirmedRevenue / GOAL) * 100));
    document.getElementById("goalFill").style.width = goalPct + "%";
    document.getElementById("goalNote").textContent = confirmedRevenue > 0
      ? "Calculated from confirmedAmount on Confirmed/In Progress/Completed enquiries in the current filter."
      : "No confirmed revenue recorded yet in the current filter — shown honestly as 0%, not estimated.";
    document.getElementById("goalCaption").textContent =
      `R${confirmedRevenue.toLocaleString("en-ZA")} of R${GOAL.toLocaleString("en-ZA")} recorded (${goalPct}%).`;

    const responseTimes = filtered
      .map((e) => {
        const created = toDate(e.createdAt);
        const responded = firstResponseByEnquiry[e.id];
        if (!created || !responded) return null;
        return (responded.getTime() - created.getTime()) / (1000 * 60 * 60);
      })
      .filter((h) => h != null && h >= 0);
    const responseNote = document.getElementById("responseTimeNote");
    if (responseTimes.length) {
      const avgHours = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      responseNote.textContent = `Average ${avgHours < 1 ? Math.round(avgHours * 60) + " minutes" : avgHours.toFixed(1) + " hours"} to first status change, based on ${responseTimes.length} enquiries with a recorded response in this filter.`;
    } else {
      responseNote.textContent = "Not yet measurable in this filter — no enquiries here have had their status changed away from \"New\" yet.";
    }
  }

  document.getElementById("exportCsvBtn").addEventListener("click", () => {
    const cols = [
      "referenceNumber", "customerName", "phone", "email", "enquiryType", "eventDate",
      "location", "guestCount", "source", "status", "quotedAmount", "confirmedAmount",
      "lostReason", "assignedOwnerId", "nextAction", "followUpDate"
    ];
    const lines = [cols.join(",")];
    filtered.forEach((e) => {
      lines.push(cols.map((c) => {
        const v = e[c];
        const s = v == null ? "" : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      }).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lina-enquiries-export-${todayIso()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  render();
}

main().catch((err) => {
  console.error("Dashboard failed to load:", err);
});
