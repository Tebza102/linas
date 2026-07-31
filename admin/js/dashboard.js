// Lina's admin portal — Overview: a presentation-ready command centre.
// Every figure and chart here is computed from real Firestore data, live,
// with test records excluded (isTestRecord) — no invented or estimated
// marketing/platform figures are ever shown. Deliberately does NOT embed
// full modules — each panel is a short (<=5 item) pointer to its real page.
import { requireAuth } from "./auth-guard.js";
import { db } from "./firebase-init.js";
import { initLayout } from "./layout.js";
import { horizontalBarChart, verticalBarChart } from "./charts.js";
import {
  ORDER_SALE_STATUSES, ORDER_ACTIVE_STATUSES, ORDER_LOST_STATUSES,
  fmtCents, sumCents, countIn, sastToday, sastDateOf
} from "./order-constants.js";
import {
  collection, query, where, onSnapshot, doc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const CONFIRMED_STATUSES = ["Confirmed", "In Progress", "Completed"];
const OPEN_STATUSES = ["New", "Contacted", "Quoted", "In Progress"];
const CLOSED_STATUSES = ["Confirmed", "Completed", "Lost/Cancelled"];
const FUNNEL_STAGES = ["New", "Contacted", "Quoted", "Confirmed"];
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
function isTest(e) { return e.isTestRecord === true; }

async function main() {
  const { user, role } = await requireAuth();
  initLayout({ user, role, active: "overview" });

  const canReadAll = role === "owner" || role === "developer" || role === "observer";
  const canReadFinancial = role === "owner" || role === "developer" || role === "observer";

  // ---- Header: greeting, date, honest one-line status ----
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  // A missing displayName AND email is unusual but possible, and it must not
  // white-screen the entire Overview over a greeting.
  const firstName = ((user.displayName || (user.email || "").split("@")[0] || "there").split(" ")[0]) || "there";
  document.getElementById("greeting").textContent = `Good ${timeOfDay}, ${firstName}`;
  document.getElementById("todayDate").textContent = new Date().toLocaleDateString("en-ZA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  let enquiries = [];
  let quotations = [];
  let campaigns = [];
  let bookings = [];
  let contentItems = [];
  let orders = [];

  /**
   * Order figures, kept entirely separate from the enquiry-derived revenue
   * above. Order money is integer cents (fmtCents); enquiry money is whole
   * Rands (fmtRand). They are never added together, and the growth-goal bar
   * below stays enquiry-only — combining them would be a business decision,
   * not a quiet code change.
   */
  function renderOrders() {
    const panel = document.getElementById("ordersPanel");
    if (!panel || !canReadAll) return;
    panel.hidden = false;

    const today = sastToday();
    const real = orders.filter((o) => !o.isTestRecord);
    const collectedToday = real.filter((o) => o.status === "Collected" && sastDateOf(o.collectedAt) === today);

    document.getElementById("ordersKpis").innerHTML =
      tile(countIn(orders, ORDER_SALE_STATUSES), "Completed sales") +
      tile(fmtCents(sumCents(orders, ORDER_SALE_STATUSES)), "Completed sales value") +
      tile(fmtCents(sumCents(orders, ORDER_ACTIVE_STATUSES)), "Pending order value") +
      tile(fmtCents(sumCents(orders, ["Cancelled"])), "Cancelled value") +
      tile(fmtCents(sumCents(orders, ["Not Collected"])), "Not-collected value");

    const awaiting = real.filter((o) => o.status === "Pending WhatsApp").length;
    const ready = real.filter((o) => o.status === "Ready for Collection").length;
    renderList(
      document.getElementById("ordersTodayList"),
      [
        `<span>Collected today</span><span>${collectedToday.length} · ${esc(fmtCents(collectedToday.reduce((t, o) => t + (Number(o.subtotalCents) || 0), 0)))}</span>`,
        `<span>Awaiting confirmation</span><span${awaiting > 0 ? ' class="overdue-text"' : ""}>${awaiting}</span>`,
        `<span>Ready for collection</span><span>${ready}</span>`
      ],
      "No orders yet."
    );
  }

  function render() {
    const real = enquiries.filter((e) => !isTest(e));

    const newLeads = real.filter((e) => e.status === "New");
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
    const overdueFollowUps = real.filter((e) =>
      e.followUpDate && !["Completed", "Lost/Cancelled"].includes(e.status) && e.followUpDate <= todayIso()
    );
    const upcomingBookings = bookings
      .filter((b) => b.eventDate && b.eventDate >= todayIso() && b.bookingStatus !== "Cancelled")
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

    // ---- Header status statement ----
    document.getElementById("statusStatement").textContent =
      `${newLeads.length} new lead${newLeads.length === 1 ? "" : "s"} waiting, ` +
      `${overdueFollowUps.length} overdue follow-up${overdueFollowUps.length === 1 ? "" : "s"}, ` +
      `${fmtRand(pipelineValue)} in open pipeline.`;

    // ---- KPI grid (exactly the six approved tiles) ----
    document.getElementById("kpiGrid").innerHTML =
      tile(newLeads.length, "New leads") +
      tile(fmtRand(pipelineValue), "Pipeline value") +
      tile(fmtRand(revenueWon), "Revenue won") +
      tile(conversionRate === null ? "—" : conversionRate + "%", "Conversion rate") +
      tile(overdueFollowUps.length, "Overdue follow-ups") +
      tile(upcomingBookings.length, "Upcoming bookings");

    // ---- Sales funnel chart ----
    const funnelData = FUNNEL_STAGES.map((stage) => ({
      label: stage,
      value: real.filter((e) => e.status === stage).length
    }));
    horizontalBarChart(document.getElementById("funnelChart"), funnelData, "No enquiries yet.");

    // ---- Leads by source chart ----
    const bySource = {};
    real.forEach((e) => { bySource[e.source || "Unknown"] = (bySource[e.source || "Unknown"] || 0) + 1; });
    const bySourceData = Object.entries(bySource).sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
    horizontalBarChart(document.getElementById("bySourceChart"), bySourceData, "No enquiries yet.");

    // ---- Confirmed revenue over time (last 6 months, including this one) ----
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-ZA", { month: "short" }) });
    }
    const revenueByMonth = {};
    confirmedSales.forEach((e) => {
      if (typeof e.confirmedAmount !== "number" || !e.confirmedAt || !e.confirmedAt.toDate) return;
      const d = e.confirmedAt.toDate();
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      revenueByMonth[key] = (revenueByMonth[key] || 0) + e.confirmedAmount;
    });
    const revenueOverTimeData = months.map((m) => ({
      label: m.label, value: revenueByMonth[m.key] || 0, formattedValue: revenueByMonth[m.key] ? fmtRand(revenueByMonth[m.key]) : ""
    }));
    verticalBarChart(document.getElementById("revenueOverTimeChart"), revenueOverTimeData, "No confirmed revenue recorded yet.");

    // ---- Campaign performance chart (revenue per campaign, real matches only) ----
    const campaignData = campaigns.map((c) => {
      const matched = real.filter((e) =>
        (e.campaignCode && e.campaignCode === c.campaignCode) ||
        (e.utmCampaign && e.utmCampaign === c.campaignCode) ||
        e.campaignId === c.id
      );
      const revenue = matched
        .filter((e) => CONFIRMED_STATUSES.includes(e.status) && typeof e.confirmedAmount === "number")
        .reduce((sum, e) => sum + e.confirmedAmount, 0);
      return { label: c.campaignName, value: revenue, formattedValue: fmtRand(revenue) };
    });
    horizontalBarChart(document.getElementById("campaignChart"), campaignData,
      canReadAll ? "No campaigns recorded yet." : "Campaign data not available for this role.");

    // ---- Compact panels (max 5 items each, all link to their full module) ----
    renderList(
      document.getElementById("leadsAttentionList"),
      newLeads.slice(0, 5).map((e) => `<span>${esc(e.customerName)} — ${esc(e.referenceNumber)}</span><span>${esc(e.enquiryType)}</span>`),
      "No new leads waiting right now."
    );

    renderList(
      document.getElementById("quotesFollowUpList"),
      canReadFinancial
        ? quotations.filter((q) => q.status === "Sent" && q.followUpDate && q.followUpDate <= todayIso())
            .slice(0, 5)
            .map((q) => `<span>${esc(q.quoteNumber)} — ${esc(q.customerName || "")}</span><span class="overdue-text">${esc(q.followUpDate)}</span>`)
        : [],
      canReadFinancial ? "No quotations waiting on follow-up." : "Not available for this role."
    );

    renderList(
      document.getElementById("scheduledContentList"),
      contentItems.filter((c) => c.status === "Scheduled" && c.scheduledDate)
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
        .slice(0, 5)
        .map((c) => `<span>${esc(c.contentTitle)} — ${esc(c.platform)}</span><span>${esc(c.scheduledDate)}</span>`),
      "No content scheduled yet."
    );

    renderList(
      document.getElementById("upcomingEventsList"),
      upcomingBookings.slice(0, 5)
        .map((b) => `<span>${esc(b.customerName || b.title)} — ${esc(b.eventType)}</span><span>${esc(b.eventDate)}</span>`),
      "No upcoming confirmed events yet."
    );
  }

  onSnapshot(
    canReadAll ? collection(db, "enquiries") : query(collection(db, "enquiries"), where("assignedOwnerId", "in", [user.uid, null])),
    (snap) => { enquiries = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => console.error("Overview enquiries listener error:", err)
  );

  if (canReadFinancial) {
    onSnapshot(collection(db, "quotations"), (snap) => { quotations = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
      (err) => console.error("Overview quotations listener error:", err));
  }
  onSnapshot(collection(db, "campaigns"), (snap) => { campaigns = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => console.error("Overview campaigns listener error:", err));
  // Conditional subscribe: staff cannot read orders under firestore.rules, so
  // they must never attempt the read in the first place.
  if (canReadAll) {
    onSnapshot(collection(db, "orders"), (snap) => { orders = snap.docs.map((d) => ({ id: d.id, ...d.data() })); renderOrders(); },
      (err) => console.error("Overview orders listener error:", err));
  }
  onSnapshot(collection(db, "contentItems"), (snap) => { contentItems = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => console.error("Overview contentItems listener error:", err));
  onSnapshot(
    canReadAll ? collection(db, "bookings") : query(collection(db, "bookings"), where("assignedPerson", "in", [user.uid, null])),
    (snap) => { bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => console.error("Overview bookings listener error:", err)
  );

  // Growth-goal progress — read live from settings/business.dashboardGoal,
  // honestly falling back to the known R350,000 target if that document
  // doesn't exist yet (never inventing a different number). Staff/observer
  // can read settings only if staff (rules); observer cannot — falls back
  // silently to the known target in that case, same honest behaviour.
  onSnapshot(doc(db, "settings", "business"), (snap) => {
    const goal = (snap.exists() && typeof snap.data().dashboardGoal === "number") ? snap.data().dashboardGoal : GOAL_FALLBACK;
    document.getElementById("goalAmountLabel").textContent = fmtRand(goal);
    const real = enquiries.filter((e) => !isTest(e));
    const revenueWon = real
      .filter((e) => CONFIRMED_STATUSES.includes(e.status) && typeof e.confirmedAmount === "number")
      .reduce((sum, e) => sum + e.confirmedAmount, 0);
    const pct = Math.min(100, Math.round((revenueWon / goal) * 100));
    document.getElementById("goalFill").style.width = pct + "%";
    document.getElementById("goalCaption").textContent = revenueWon > 0
      ? `${fmtRand(revenueWon)} of ${fmtRand(goal)} recorded (${pct}%).`
      : `No confirmed revenue recorded yet — shown honestly as 0% of ${fmtRand(goal)}.`;
  }, (err) => console.error("Overview goal listener error:", err));
}

main().catch((err) => {
  console.error("Overview failed to load:", err);
});
