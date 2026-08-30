// Lina's admin portal — Orders.
//
// Owner/developer manage orders; observer reads them; staff have no access
// (see firestore.rules — this mirrors it, it does not replace it).
//
// Orders are created only by /api/orders/create, so there is deliberately no
// "new order" button here. Nothing in this module deletes an order either:
// a cancelled or uncollected order is a real business event and keeps its
// place in the record with the appropriate status.
import { requireAuth } from "./auth-guard.js";
import { db } from "./firebase-init.js";
import { initLayout } from "./layout.js";
import {
  collection, doc, query, orderBy, limit, where, getDocs,
  onSnapshot, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  ORDER_STATUSES, ORDER_ACTIVE_STATUSES,
  ALLOWED_TRANSITIONS, REASON_REQUIRED_STATUSES, STATUS_TIMESTAMP_FIELD,
  PAYMENT_STATUSES, PAYMENT_METHODS,
  fmtCents, sastToday, sastDateOf
} from "./order-constants.js";

// Orders accumulate every trading day, unlike quotations. An unbounded
// snapshot is the first query in this codebase that would genuinely hurt, and
// retrofitting a limit later means re-verifying every derived figure.
const ORDER_FETCH_LIMIT = 300;

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function digitsOnly(s) { return String(s || "").replace(/\D/g, ""); }
function fmtDateTime(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function tile(value, label) {
  return `<div class="kpi-tile"><div class="kpi-tile__value">${esc(value)}</div><div class="kpi-tile__label">${esc(label)}</div></div>`;
}

async function main() {
  const { user, role } = await requireAuth();
  initLayout({ user, role, active: "orders" });

  const canWrite = role === "owner" || role === "developer";
  if (!canWrite && role !== "observer") {
    document.getElementById("accessDenied").hidden = false;
    return;
  }
  document.getElementById("ordersBody").hidden = false;

  const statusFilter = document.getElementById("statusFilter");
  ORDER_STATUSES.forEach((s) => statusFilter.insertAdjacentHTML("beforeend", `<option value="${esc(s)}">${esc(s)}</option>`));

  const detailPanel = document.getElementById("detailPanel");
  const todayPanel = document.getElementById("todayPanel");
  const allPanel = document.getElementById("allPanel");
  let orders = [];
  let view = "today";

  /* ---------- Today: the operational board ---------- */
  function renderToday() {
    const today = sastToday();
    const real = orders.filter((o) => !o.isTestRecord);
    // Every unresolved order, not just today's: one placed late last night and
    // still unconfirmed is exactly what Lina needs to see when she opens up.
    const active = real.filter((o) => ORDER_ACTIVE_STATUSES.includes(o.status));

    // "Collected today" keys off when it was COLLECTED, not when it was placed.
    const collectedToday = real.filter((o) => o.status === "Collected" && sastDateOf(o.collectedAt) === today);
    const cancelledToday = real.filter((o) => o.status === "Cancelled" && sastDateOf(o.cancelledAt) === today);
    const notCollectedToday = real.filter((o) => o.status === "Not Collected" && sastDateOf(o.notCollectedAt) === today);
    const collectedTodayValue = collectedToday.reduce((t, o) => t + (Number(o.subtotalCents) || 0), 0);

    document.getElementById("todayKpis").innerHTML =
      tile(active.length, "Active now") +
      tile(active.filter((o) => o.status === "Pending WhatsApp").length, "Awaiting confirmation") +
      tile(active.filter((o) => o.status === "Preparing").length, "Preparing") +
      tile(active.filter((o) => o.status === "Ready for Collection").length, "Ready for collection") +
      tile(collectedToday.length, "Collected today") +
      tile(fmtCents(collectedTodayValue), "Collected value today") +
      tile(cancelledToday.length, "Cancelled today") +
      tile(notCollectedToday.length, "Not collected today");

    // Grouped in workflow order so the board reads the way the kitchen works.
    const groups = [
      { label: "Awaiting confirmation", items: active.filter((o) => o.status === "Pending WhatsApp") },
      { label: "Confirmed", items: active.filter((o) => o.status === "Confirmed") },
      { label: "Preparing", items: active.filter((o) => o.status === "Preparing") },
      { label: "Ready for collection", items: active.filter((o) => o.status === "Ready for Collection") },
      { label: "Collected today", items: collectedToday },
      { label: "Cancelled today", items: cancelledToday },
      { label: "Not collected today", items: notCollectedToday }
    ];

    document.getElementById("todayGroups").innerHTML = groups.map((g) => `
      <div class="panel-card">
        <h2>${esc(g.label)} <span class="kpi-tile__label" style="text-transform:none;">(${g.items.length})</span></h2>
        ${g.items.length ? g.items.map(orderRowHtml).join("") : '<p class="empty-state">Nothing here.</p>'}
      </div>
    `).join("");

    bindRows(document.getElementById("todayGroups"));
  }

  function orderRowHtml(o) {
    return `
      <div class="record-row" data-id="${esc(o.id)}">
        <div class="record-row__top">
          <span>${esc(o.referenceNumber)}</span><span>${fmtCents(o.subtotalCents)}</span>
        </div>
        <div class="record-row__meta">
          <span class="status-badge" data-status="${esc(o.status)}">${esc(o.status)}</span>
          <span>${o.itemCount} item${o.itemCount === 1 ? "" : "s"}</span>
          ${o.customerName ? `<span>${esc(o.customerName)}</span>` : ""}
          <span>${fmtDateTime(o.createdAt)}</span>
          ${o.paymentStatus && o.paymentStatus !== "Pending" ? `<span class="status-badge" data-status="${esc(o.paymentStatus)}">${esc(o.paymentStatus)}</span>` : ""}
        </div>
      </div>`;
  }

  function bindRows(root) {
    root.querySelectorAll(".record-row").forEach((row) => {
      row.addEventListener("click", () => {
        const o = orders.find((x) => x.id === row.dataset.id);
        if (o) openOrderDetail(o);
      });
    });
  }

  /* ---------- All orders: history + search ---------- */
  function renderAll() {
    const q = document.getElementById("searchInput").value.trim().toLowerCase();
    const qDigits = digitsOnly(q);
    const statusQ = statusFilter.value;
    const from = document.getElementById("dateFrom").value;
    const to = document.getElementById("dateTo").value;

    const rows = orders.filter((o) => {
      if (statusQ && o.status !== statusQ) return false;
      // ISO dates sort lexicographically, so plain string comparison is correct.
      if (from && (o.orderDateKey || "") < from) return false;
      if (to && (o.orderDateKey || "") > to) return false;
      if (!q) return true;
      const matchesText =
        (o.referenceNumber || "").toLowerCase().includes(q) ||
        (o.customerName || "").toLowerCase().includes(q);
      // Phone is compared digits-only so "076 483 4344" finds "0764834344".
      const matchesPhone = qDigits.length >= 3 && digitsOnly(o.customerPhone).includes(qDigits);
      return matchesText || matchesPhone;
    });

    document.getElementById("allSummary").textContent =
      `${rows.length} order${rows.length === 1 ? "" : "s"} shown` +
      (orders.length >= ORDER_FETCH_LIMIT ? ` (most recent ${ORDER_FETCH_LIMIT} loaded)` : "");

    const list = document.getElementById("ordersList");
    list.innerHTML = rows.length ? rows.map(orderRowHtml).join("") : '<p class="empty-state">No orders match these filters.</p>';
    bindRows(list);
  }

  function render() {
    if (view === "today") renderToday(); else renderAll();
  }

  /* ---------- Detail panel ---------- */
  async function loadActivity(orderId) {
    try {
      const snap = await getDocs(query(
        collection(db, "orderActivities"), where("orderId", "==", orderId), orderBy("createdAt", "desc")
      ));
      return snap.docs.map((d) => d.data());
    } catch (err) {
      console.error("Order activity load failed:", err);
      return null;
    }
  }

  function itemsTableHtml(o) {
    return `
      <div class="detail-field">
        <dt>Items (recorded at order time — not editable)</dt>
        <dd>
          <ul class="panel-list">
            ${(o.items || []).map((i) => `
              <li><span>${esc(i.name)} × ${i.quantity}</span><span>${fmtCents(i.lineTotalCents)}</span></li>
            `).join("")}
            <li><span><strong>Subtotal</strong></span><span><strong>${fmtCents(o.subtotalCents)}</strong></span></li>
          </ul>
        </dd>
      </div>`;
  }

  function activityHtml(activity) {
    if (activity === null) return '<p class="empty-state">Could not load history.</p>';
    if (!activity.length) return '<p class="empty-state">No history yet.</p>';
    return `<ul class="activity-log">${activity.map((a) => `
      <li>
        ${esc(a.actionType === "created" ? "Order placed" :
              a.actionType === "status-change" ? `${a.previousValue || "—"} → ${a.newValue}` :
              a.actionType === "payment-change" ? `Payment: ${a.newValue}` :
              a.actionType)}
        ${a.reason ? `<br><em>${esc(a.reason)}</em>` : ""}
        ${a.note ? `<br>${esc(a.note)}` : ""}
        <time>${fmtDateTime(a.createdAt)}${a.createdBy && a.createdBy !== "system" ? "" : " · system"}</time>
      </li>`).join("")}</ul>`;
  }

  async function openOrderDetail(o) {
    const activity = await loadActivity(o.id);

    if (!canWrite) {
      // Observer: full visibility, zero controls.
      detailPanel.innerHTML = `
        <div class="detail-panel__inner">
          <button class="detail-panel__close" id="dpClose" aria-label="Close">Close ✕</button>
          <h2 style="font-family:var(--font-display);">${esc(o.referenceNumber)}</h2>
          <div class="detail-field"><dt>Status</dt><dd><span class="status-badge" data-status="${esc(o.status)}">${esc(o.status)}</span></dd></div>
          ${o.statusReason ? `<div class="detail-field"><dt>Reason</dt><dd>${esc(o.statusReason)}</dd></div>` : ""}
          <div class="detail-field"><dt>Payment</dt><dd>${esc(o.paymentStatus)}${o.paymentMethod ? ` · ${esc(o.paymentMethod)}` : ""}</dd></div>
          ${itemsTableHtml(o)}
          <div class="detail-field"><dt>Customer</dt><dd>${esc(o.customerName || "Not provided")}${o.customerPhone ? `<br>${esc(o.customerPhone)}` : ""}</dd></div>
          <div class="detail-field"><dt>Customer note</dt><dd>${esc(o.customerNote || "—")}</dd></div>
          <div class="detail-field"><dt>Placed</dt><dd>${fmtDateTime(o.createdAt)}</dd></div>
          <div class="detail-field"><dt>Internal notes</dt><dd>${esc(o.internalNotes || "—")}</dd></div>
          <div class="detail-field"><dt>History</dt><dd>${activityHtml(activity)}</dd></div>
        </div>`;
      detailPanel.querySelector("#dpClose").addEventListener("click", () => { detailPanel.hidden = true; });
      detailPanel.hidden = false;
      return;
    }

    const nextStatuses = ALLOWED_TRANSITIONS[o.status] || [];
    const isTerminal = nextStatuses.length === 0;

    detailPanel.innerHTML = `
      <div class="detail-panel__inner">
        <button class="detail-panel__close" id="dpClose" aria-label="Close">Close ✕</button>
        <h2 style="font-family:var(--font-display);">${esc(o.referenceNumber)}</h2>
        <div class="detail-field"><dt>Current status</dt><dd><span class="status-badge" data-status="${esc(o.status)}">${esc(o.status)}</span></dd></div>
        ${o.statusReason ? `<div class="detail-field"><dt>Reason</dt><dd>${esc(o.statusReason)}</dd></div>` : ""}
        ${itemsTableHtml(o)}
        <div class="detail-field"><dt>Customer note</dt><dd>${esc(o.customerNote || "—")}</dd></div>
        <div class="detail-field"><dt>Placed</dt><dd>${fmtDateTime(o.createdAt)}</dd></div>

        ${isTerminal ? `
          <p class="empty-state" style="margin-top:12px;">This order is closed as <strong>${esc(o.status)}</strong>. Its status can no longer change — notes and payment details can still be updated.</p>
        ` : `
          <label style="display:grid; gap:4px; font-size:14px; margin-top:16px;">Move to
            <select id="fStatus">
              <option value="">Leave as ${esc(o.status)}</option>
              ${nextStatuses.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}
            </select>
          </label>
          <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;" id="reasonWrap" hidden>Reason (required)
            <input type="text" id="fReason" maxlength="300" placeholder="e.g. Customer never arrived">
          </label>
        `}

        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Payment status
          <select id="fPaymentStatus">${PAYMENT_STATUSES.map((s) => `<option ${s === o.paymentStatus ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>
        </label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Payment method
          <select id="fPaymentMethod">
            <option value="">Not recorded</option>
            ${PAYMENT_METHODS.map((m) => `<option ${m === o.paymentMethod ? "selected" : ""}>${esc(m)}</option>`).join("")}
          </select>
        </label>

        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Customer name
          <input type="text" id="fCustomerName" maxlength="120" value="${esc(o.customerName || "")}">
        </label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Customer phone
          <input type="tel" id="fCustomerPhone" maxlength="40" value="${esc(o.customerPhone || "")}">
        </label>
        <p style="font-size:12px; color:var(--white-faint); margin-top:6px;">
          Details you add here are for fulfilling this order. They do not record the customer's POPIA consent — only the customer can give that, on the order form.
        </p>

        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Internal notes
          <textarea id="fInternalNotes" rows="3">${esc(o.internalNotes || "")}</textarea>
        </label>

        <button type="button" class="btn btn--primary" id="saveOrderBtn" style="margin-top:16px;">Save changes</button>
        <p class="form-status" id="orderSaveStatus" role="status" aria-live="polite"></p>

        <div class="detail-field" style="margin-top:24px;"><dt>History</dt><dd id="activityWrap">${activityHtml(activity)}</dd></div>
      </div>`;

    detailPanel.querySelector("#dpClose").addEventListener("click", () => { detailPanel.hidden = true; });

    const statusEl = detailPanel.querySelector("#fStatus");
    const reasonWrap = detailPanel.querySelector("#reasonWrap");
    if (statusEl) {
      statusEl.addEventListener("change", () => {
        reasonWrap.hidden = !REASON_REQUIRED_STATUSES.includes(statusEl.value);
      });
    }

    detailPanel.querySelector("#saveOrderBtn").addEventListener("click", () => saveOrder(o));
    detailPanel.hidden = false;
  }

  async function saveOrder(o) {
    const out = detailPanel.querySelector("#orderSaveStatus");
    const statusEl = detailPanel.querySelector("#fStatus");
    const newStatus = statusEl ? statusEl.value : "";
    const reason = detailPanel.querySelector("#fReason") ? detailPanel.querySelector("#fReason").value.trim() : "";

    if (newStatus && REASON_REQUIRED_STATUSES.includes(newStatus) && !reason) {
      out.textContent = `Marking an order ${newStatus} needs a reason.`;
      out.setAttribute("data-state", "error");
      return;
    }

    // Only changed fields — a blanket write would fight the rules' hasOnly
    // allowlist and be rejected.
    const patch = { updatedAt: serverTimestamp() };
    const activities = [];

    if (newStatus && newStatus !== o.status) {
      patch.status = newStatus;
      patch.statusUpdatedAt = serverTimestamp();
      patch.statusUpdatedBy = user.uid;
      const tsField = STATUS_TIMESTAMP_FIELD[newStatus];
      if (tsField) patch[tsField] = serverTimestamp();
      if (REASON_REQUIRED_STATUSES.includes(newStatus)) patch.statusReason = reason;
      activities.push({
        actionType: "status-change", previousValue: o.status, newValue: newStatus,
        reason: REASON_REQUIRED_STATUSES.includes(newStatus) ? reason : null, note: null
      });
    }

    const newPayment = detailPanel.querySelector("#fPaymentStatus").value;
    if (newPayment !== o.paymentStatus) {
      patch.paymentStatus = newPayment;
      patch.paymentUpdatedAt = serverTimestamp();
      activities.push({ actionType: "payment-change", previousValue: o.paymentStatus, newValue: newPayment, reason: null, note: null });
    }
    const newMethod = detailPanel.querySelector("#fPaymentMethod").value || null;
    if (newMethod !== (o.paymentMethod || null)) patch.paymentMethod = newMethod;

    const newName = detailPanel.querySelector("#fCustomerName").value.trim() || null;
    if (newName !== (o.customerName || null)) patch.customerName = newName;
    const newPhone = detailPanel.querySelector("#fCustomerPhone").value.trim() || null;
    if (newPhone !== (o.customerPhone || null)) patch.customerPhone = newPhone;

    const newNotes = detailPanel.querySelector("#fInternalNotes").value.trim() || null;
    if (newNotes !== (o.internalNotes || null)) {
      patch.internalNotes = newNotes;
      activities.push({ actionType: "note", previousValue: null, newValue: null, reason: null, note: newNotes });
    }

    if (Object.keys(patch).length === 1) {
      out.textContent = "Nothing to save.";
      out.removeAttribute("data-state");
      return;
    }

    out.textContent = "Saving…";
    out.removeAttribute("data-state");

    try {
      // The order update and its audit entries commit together, so a status
      // can never move without leaving a trace of who moved it and why.
      const batch = writeBatch(db);
      batch.update(doc(db, "orders", o.id), patch);
      activities.forEach((a) => {
        batch.set(doc(collection(db, "orderActivities")), {
          orderId: o.id, orderReference: o.referenceNumber,
          actionType: a.actionType, previousValue: a.previousValue, newValue: a.newValue,
          reason: a.reason, note: a.note,
          createdBy: user.uid, createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      out.textContent = "Saved.";
      out.setAttribute("data-state", "success");
      setTimeout(() => { detailPanel.hidden = true; }, 700);
    } catch (err) {
      console.error("Order save failed:", err);
      out.textContent = "Could not save: " + (err.message || "unknown error");
      out.setAttribute("data-state", "error");
    }
  }

  /* ---------- View switching + filters ---------- */
  function setView(next) {
    view = next;
    const todayBtn = document.getElementById("viewToday");
    const allBtn = document.getElementById("viewAll");
    todayPanel.hidden = next !== "today";
    allPanel.hidden = next !== "all";
    todayBtn.className = next === "today" ? "btn btn--primary" : "btn btn--ghost";
    allBtn.className = next === "all" ? "btn btn--primary" : "btn btn--ghost";
    todayBtn.setAttribute("aria-selected", String(next === "today"));
    allBtn.setAttribute("aria-selected", String(next === "all"));
    render();
  }
  document.getElementById("viewToday").addEventListener("click", () => setView("today"));
  document.getElementById("viewAll").addEventListener("click", () => setView("all"));
  ["searchInput", "statusFilter", "dateFrom", "dateTo"].forEach((id) => {
    document.getElementById(id).addEventListener("input", render);
    document.getElementById(id).addEventListener("change", render);
  });
  document.getElementById("clearFilters").addEventListener("click", () => {
    ["searchInput", "statusFilter", "dateFrom", "dateTo"].forEach((id) => { document.getElementById(id).value = ""; });
    render();
  });

  onSnapshot(
    query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(ORDER_FETCH_LIMIT)),
    (snap) => { orders = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => {
      console.error("Orders listener error:", err);
      document.getElementById("ordersList").innerHTML = '<p class="empty-state">Could not load orders. Please refresh.</p>';
    }
  );
}

main().catch((err) => {
  console.error("Orders failed to load:", err);
});
