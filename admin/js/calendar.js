// Lina's admin portal — one master calendar. Every item is either a real
// `bookings` document (a confirmed/tentative customer event) or DERIVED
// at render time from another collection's own date field (enquiry
// follow-ups, quotation follow-ups, content schedule) — nothing is
// duplicated into a separate calendarItems store, so an item here always
// reflects its source record exactly, with no risk of drift.
import { requireAuth } from "./auth-guard.js";
import { db } from "./firebase-init.js";
import { initLayout } from "./layout.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { openDetail } from "./detail.js";

const TERMINAL_STATUSES = ["Completed", "Lost/Cancelled"];

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function todayIso() { return new Date().toISOString().slice(0, 10); }
function startOfWeek(d) { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; }
function toIso(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

async function main() {
  const { user, role } = await requireAuth();
  initLayout({ user, role, active: "calendar" });

  const detailPanel = document.getElementById("detailPanel");
  const categoryFilter = document.getElementById("categoryFilter");
  const rangeLabel = document.getElementById("rangeLabel");
  const body = document.getElementById("calendarBody");

  const adminUsersMap = {};

  let enquiries = [];
  let bookings = [];
  let quotations = [];
  let contentItems = [];
  let view = window.matchMedia("(max-width: 900px)").matches ? "agenda" : "month";
  let anchorDate = new Date();

  function items() {
    const all = [];
    bookings.forEach((b) => {
      if (!b.eventDate || b.bookingStatus === "Cancelled") return;
      all.push({
        id: "booking-" + b.id, category: "Confirmed Bookings / Events", title: `${b.customerName || b.title} — ${b.eventType}`,
        date: b.eventDate, time: b.startTime || null, status: b.bookingStatus, sourceType: "booking", sourceId: b.id
      });
    });
    enquiries.forEach((e) => {
      if (e.isTestRecord || !e.followUpDate || TERMINAL_STATUSES.includes(e.status)) return;
      all.push({
        id: "followup-" + e.id, category: "Sales Follow-ups", title: `Follow up: ${e.customerName}`,
        date: e.followUpDate, time: null, status: e.status, sourceType: "enquiry", sourceId: e.id
      });
    });
    quotations.forEach((q) => {
      if (!q.followUpDate) return;
      all.push({
        id: "quote-" + q.id, category: "Quotations", title: `Quote follow-up: ${q.quoteNumber}${q.customerName ? " — " + q.customerName : ""}`,
        date: q.followUpDate, time: null, status: q.status, sourceType: "quotation", sourceId: q.id
      });
    });
    contentItems.forEach((c) => {
      if (!c.scheduledDate) return;
      all.push({
        id: "content-" + c.id, category: "Social Media", title: `${c.contentTitle} (${c.platform})`,
        date: c.scheduledDate, time: null, status: c.status, sourceType: "content", sourceId: c.id
      });
    });
    return all.sort((a, b) => a.date.localeCompare(b.date));
  }

  function filtered() {
    const cat = categoryFilter.value;
    return items().filter((i) => cat === "All" || i.category === cat);
  }

  function openItemDetail(item) {
    if (item.sourceType === "enquiry") {
      const e = enquiries.find((x) => x.id === item.sourceId);
      if (e) openDetail(detailPanel, e, { user, role, adminUsersMap });
      return;
    }
    // Bookings/quotations/content: a lightweight read-only summary — full
    // editing lives on their own module pages.
    detailPanel.innerHTML = `
      <div class="detail-panel__inner">
        <button class="detail-panel__close" id="calDetailClose" aria-label="Close">Close ✕</button>
        <h2 style="font-family:var(--font-display);">${esc(item.title)}</h2>
        <div class="detail-field"><dt>Category</dt><dd>${esc(item.category)}</dd></div>
        <div class="detail-field"><dt>Date</dt><dd>${esc(item.date)}${item.time ? " " + esc(item.time) : ""}</dd></div>
        <div class="detail-field"><dt>Status</dt><dd>${esc(item.status || "—")}</dd></div>
        ${item.sourceType === "booking" ? '<p style="margin-top:16px;"><a class="btn btn--ghost" style="padding:6px 14px; font-size:13px;" href="pipeline.html">Open related enquiry in pipeline →</a></p>' : ""}
        ${item.sourceType === "quotation" ? '<p style="margin-top:16px;"><a class="btn btn--ghost" style="padding:6px 14px; font-size:13px;" href="quotations.html">Open in Quotations →</a></p>' : ""}
        ${item.sourceType === "content" ? '<p style="margin-top:16px;"><a class="btn btn--ghost" style="padding:6px 14px; font-size:13px;" href="marketing.html">Open in Marketing →</a></p>' : ""}
      </div>
    `;
    detailPanel.querySelector("#calDetailClose").addEventListener("click", () => { detailPanel.hidden = true; });
    detailPanel.hidden = false;
  }

  function renderMonth() {
    const year = anchorDate.getFullYear(), month = anchorDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const gridStart = startOfWeek(firstOfMonth);
    rangeLabel.textContent = firstOfMonth.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });

    const byDate = {};
    filtered().forEach((i) => { (byDate[i.date] = byDate[i.date] || []).push(i); });

    const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<div class="calendar-day-header">${d}</div>`).join("");
    let cells = "";
    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      const iso = toIso(d);
      const outside = d.getMonth() !== month;
      const dayItems = byDate[iso] || [];
      cells += `
        <div class="calendar-day${outside ? " calendar-day--outside" : ""}" data-date="${iso}">
          <div class="calendar-day__num">${d.getDate()}</div>
          ${dayItems.map((i) => `<span class="calendar-chip" data-id="${esc(i.id)}" title="${esc(i.title)}">${esc(i.title)}</span>`).join("")}
        </div>
      `;
    }
    body.innerHTML = `<div class="calendar-month-grid">${dayHeaders}${cells}</div>`;
    wireChipClicks();
  }

  function renderWeek() {
    const start = startOfWeek(anchorDate);
    const end = addDays(start, 6);
    rangeLabel.textContent = `${start.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`;

    const byDate = {};
    filtered().forEach((i) => { (byDate[i.date] = byDate[i.date] || []).push(i); });

    let html = "";
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const iso = toIso(d);
      const dayItems = (byDate[iso] || []).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      html += `
        <div class="calendar-agenda-day">
          <div class="calendar-agenda-day__date">${d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "short" })}</div>
          ${dayItems.length ? dayItems.map((i) => `
            <div class="calendar-agenda-item" data-id="${esc(i.id)}">
              <span>${esc(i.title)}</span><span>${esc(i.category)}</span>
            </div>`).join("") : '<p class="empty-state">Nothing scheduled.</p>'}
        </div>
      `;
    }
    body.innerHTML = html;
    wireAgendaClicks();
  }

  function renderAgenda() {
    rangeLabel.textContent = "Upcoming";
    const upcoming = filtered().filter((i) => i.date >= todayIso());
    const byDate = {};
    upcoming.forEach((i) => { (byDate[i.date] = byDate[i.date] || []).push(i); });
    const dates = Object.keys(byDate).sort();
    body.innerHTML = dates.length ? dates.map((iso) => `
      <div class="calendar-agenda-day">
        <div class="calendar-agenda-day__date">${new Date(iso + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}</div>
        ${byDate[iso].map((i) => `
          <div class="calendar-agenda-item" data-id="${esc(i.id)}">
            <span>${esc(i.title)}</span><span>${esc(i.category)}</span>
          </div>`).join("")}
      </div>
    `).join("") : '<p class="empty-state">Nothing scheduled yet.</p>';
    wireAgendaClicks();
  }

  function wireChipClicks() {
    body.querySelectorAll(".calendar-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const item = items().find((i) => i.id === chip.dataset.id);
        if (item) openItemDetail(item);
      });
    });
  }
  function wireAgendaClicks() {
    body.querySelectorAll(".calendar-agenda-item").forEach((row) => {
      row.addEventListener("click", () => {
        const item = items().find((i) => i.id === row.dataset.id);
        if (item) openItemDetail(item);
      });
    });
  }

  function render() {
    if (view === "month") renderMonth();
    else if (view === "week") renderWeek();
    else renderAgenda();
    document.getElementById("viewMonthBtn").setAttribute("aria-pressed", String(view === "month"));
    document.getElementById("viewWeekBtn").setAttribute("aria-pressed", String(view === "week"));
    document.getElementById("viewAgendaBtn").setAttribute("aria-pressed", String(view === "agenda"));
  }

  document.getElementById("viewMonthBtn").addEventListener("click", () => { view = "month"; render(); });
  document.getElementById("viewWeekBtn").addEventListener("click", () => { view = "week"; render(); });
  document.getElementById("viewAgendaBtn").addEventListener("click", () => { view = "agenda"; render(); });
  document.getElementById("todayBtn").addEventListener("click", () => { anchorDate = new Date(); render(); });
  document.getElementById("prevBtn").addEventListener("click", () => {
    if (view === "month") anchorDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, 1);
    else anchorDate = addDays(anchorDate, -7);
    render();
  });
  document.getElementById("nextBtn").addEventListener("click", () => {
    if (view === "month") anchorDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1);
    else anchorDate = addDays(anchorDate, 7);
    render();
  });
  categoryFilter.addEventListener("change", render);

  const enquiriesQuery = role === "owner"
    ? query(collection(db, "enquiries"))
    : query(collection(db, "enquiries"), where("assignedOwnerId", "in", [user.uid, null]));
  onSnapshot(enquiriesQuery, (snap) => { enquiries = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => console.error("Calendar enquiries listener error:", err));

  const bookingsQuery = role === "owner"
    ? query(collection(db, "bookings"))
    : query(collection(db, "bookings"), where("assignedPerson", "in", [user.uid, null]));
  onSnapshot(bookingsQuery, (snap) => { bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => console.error("Calendar bookings listener error:", err));

  if (role === "owner") {
    onSnapshot(collection(db, "quotations"), (snap) => { quotations = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
      (err) => console.error("Calendar quotations listener error:", err));
  }
  onSnapshot(collection(db, "contentItems"), (snap) => { contentItems = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => console.error("Calendar contentItems listener error:", err));

  render();
}

main().catch((err) => {
  console.error("Calendar failed to load:", err);
  document.getElementById("calendarBody").innerHTML = '<p class="empty-state">Could not load the calendar. Please refresh.</p>';
});
