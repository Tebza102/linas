// Lina's admin portal — Invoices. Owner/developer full access, observer
// read-only, staff denied (see firestore.rules — this mirrors it, not
// replaces it). Recording and tracking only — no payment gateway, no
// reconciliation.
import { requireAuth } from "./auth-guard.js";
import { db } from "./firebase-init.js";
import { initLayout } from "./layout.js";
import {
  collection, doc, setDoc, updateDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const STATUSES = ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"];

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtRand(n) { return typeof n === "number" ? "R" + n.toLocaleString("en-ZA") : "—"; }
function todayDatePart() {
  const d = new Date();
  return d.getUTCFullYear().toString() + String(d.getUTCMonth() + 1).padStart(2, "0") + String(d.getUTCDate()).padStart(2, "0");
}
function outstanding(inv) { return Math.max(0, Number(inv.total || 0) - Number(inv.amountPaid || 0)); }

async function main() {
  const { user, role } = await requireAuth();
  initLayout({ user, role, active: "invoices" });

  const canWrite = role === "owner" || role === "developer";
  if (!canWrite && role !== "observer") {
    document.getElementById("accessDenied").hidden = false;
    return;
  }
  document.getElementById("invoicesBody").hidden = false;
  const newInvoiceBtn = document.getElementById("newInvoiceBtn");
  if (!canWrite) newInvoiceBtn.hidden = true;

  const statusFilter = document.getElementById("statusFilter");
  STATUSES.forEach((s) => statusFilter.insertAdjacentHTML("beforeend", `<option value="${esc(s)}">${esc(s)}</option>`));

  const detailPanel = document.getElementById("detailPanel");
  let invoices = [];
  let enquiries = [];
  let quotations = [];

  function render() {
    const statusQ = statusFilter.value;
    const rows = invoices.filter((i) => !statusQ || i.status === statusQ)
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    const list = document.getElementById("invoicesList");
    if (!rows.length) {
      list.innerHTML = '<p class="empty-state">No invoices yet.</p>';
      return;
    }
    list.innerHTML = rows.map((inv) => `
      <div class="record-row" data-id="${esc(inv.id)}">
        <div class="record-row__top"><span>${esc(inv.invoiceNumber)} — ${esc(inv.customerName || "")}</span><span>${fmtRand(inv.total)}</span></div>
        <div class="record-row__meta">
          <span>${esc(inv.status)}</span>
          <span>Due: ${esc(inv.dueDate || "—")}</span>
          <span class="${outstanding(inv) > 0 && inv.status !== "Cancelled" ? "overdue-text" : ""}">Outstanding: ${fmtRand(outstanding(inv))}</span>
        </div>
      </div>
    `).join("");
    list.querySelectorAll(".record-row").forEach((row) => {
      row.addEventListener("click", () => openInvoiceDetail(invoices.find((i) => i.id === row.dataset.id)));
    });
  }

  function openNewInvoiceFlow() {
    const eligible = enquiries.filter((e) => !e.isTestRecord && ["Confirmed", "In Progress", "Completed"].includes(e.status));
    detailPanel.innerHTML = `
      <div class="detail-panel__inner">
        <button class="detail-panel__close" id="dpClose" aria-label="Close">Close ✕</button>
        <h2 style="font-family:var(--font-display);">New invoice</h2>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Enquiry
          <select id="fEnquiry">
            <option value="">Select an enquiry…</option>
            ${eligible.map((e) => `<option value="${esc(e.id)}">${esc(e.customerName)} — ${esc(e.referenceNumber)}</option>`).join("")}
          </select>
        </label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Linked quotation (optional)
          <select id="fQuotation"><option value="">None</option>${quotations.map((q) => `<option value="${esc(q.id)}">${esc(q.quoteNumber)}</option>`).join("")}</select>
        </label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Total (R)
          <input type="number" id="fTotal" min="0" step="1"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Invoice date
          <input type="date" id="fInvoiceDate" value="${new Date().toISOString().slice(0, 10)}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Due date
          <input type="date" id="fDueDate"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Notes
          <textarea id="fNotes" rows="2"></textarea></label>
        <button type="button" class="btn btn--primary" id="createInvoiceBtn" style="margin-top:16px;">Create invoice</button>
        <p class="form-status" id="invoiceSaveStatus" role="status" aria-live="polite"></p>
      </div>
    `;
    detailPanel.querySelector("#dpClose").addEventListener("click", () => { detailPanel.hidden = true; });
    detailPanel.querySelector("#createInvoiceBtn").addEventListener("click", async () => {
      const statusEl = detailPanel.querySelector("#invoiceSaveStatus");
      const enquiryId = detailPanel.querySelector("#fEnquiry").value;
      const totalVal = detailPanel.querySelector("#fTotal").value;
      if (!enquiryId) { statusEl.textContent = "Select an enquiry first."; statusEl.setAttribute("data-state", "error"); return; }
      if (totalVal === "") { statusEl.textContent = "Enter a total amount."; statusEl.setAttribute("data-state", "error"); return; }
      const enquiry = enquiries.find((e) => e.id === enquiryId);
      try {
        // A client-allocated doc ref lets the invoice number be computed
        // and written in a single set() — no second write that could
        // leave the number stuck if it failed.
        const ref = doc(collection(db, "invoices"));
        await setDoc(ref, {
          invoiceNumber: `INV-${todayDatePart()}-${ref.id.slice(0, 6).toUpperCase()}`,
          enquiryId,
          quotationId: detailPanel.querySelector("#fQuotation").value || null,
          customerName: enquiry.customerName,
          invoiceDate: detailPanel.querySelector("#fInvoiceDate").value || null,
          dueDate: detailPanel.querySelector("#fDueDate").value || null,
          total: Number(totalVal),
          amountPaid: 0,
          status: "Draft",
          notes: detailPanel.querySelector("#fNotes").value.trim() || null,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        statusEl.textContent = "Invoice created."; statusEl.setAttribute("data-state", "success");
        setTimeout(() => { detailPanel.hidden = true; }, 700);
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Could not create: " + (err.message || "unknown error");
        statusEl.setAttribute("data-state", "error");
      }
    });
    detailPanel.hidden = false;
  }

  function openInvoiceDetail(inv) {
    if (!canWrite) {
      detailPanel.innerHTML = `
        <div class="detail-panel__inner">
          <button class="detail-panel__close" id="dpClose" aria-label="Close">Close ✕</button>
          <h2 style="font-family:var(--font-display);">${esc(inv.invoiceNumber)}</h2>
          <div class="detail-field"><dt>Customer</dt><dd>${esc(inv.customerName || "—")}</dd></div>
          <div class="detail-field"><dt>Total</dt><dd>${fmtRand(inv.total)}</dd></div>
          <div class="detail-field"><dt>Amount paid</dt><dd>${fmtRand(inv.amountPaid || 0)}</dd></div>
          <div class="detail-field"><dt>Outstanding</dt><dd>${fmtRand(outstanding(inv))}</dd></div>
          <div class="detail-field"><dt>Status</dt><dd>${esc(inv.status)}</dd></div>
          <div class="detail-field"><dt>Due date</dt><dd>${esc(inv.dueDate || "—")}</dd></div>
          <div class="detail-field"><dt>Notes</dt><dd>${esc(inv.notes || "—")}</dd></div>
        </div>
      `;
      detailPanel.querySelector("#dpClose").addEventListener("click", () => { detailPanel.hidden = true; });
      detailPanel.hidden = false;
      return;
    }
    detailPanel.innerHTML = `
      <div class="detail-panel__inner">
        <button class="detail-panel__close" id="dpClose" aria-label="Close">Close ✕</button>
        <h2 style="font-family:var(--font-display);">${esc(inv.invoiceNumber)}</h2>
        <div class="detail-field"><dt>Customer</dt><dd>${esc(inv.customerName || "—")}</dd></div>
        <div class="detail-field"><dt>Total</dt><dd>${fmtRand(inv.total)}</dd></div>
        <div class="detail-field"><dt>Outstanding</dt><dd>${fmtRand(outstanding(inv))}</dd></div>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Amount paid (R)
          <input type="number" id="fAmountPaid" min="0" step="1" value="${inv.amountPaid || 0}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Status
          <select id="fStatus">${STATUSES.map((s) => `<option ${s === inv.status ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Due date
          <input type="date" id="fDueDate" value="${esc(inv.dueDate || "")}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Notes
          <textarea id="fNotes" rows="3">${esc(inv.notes || "")}</textarea></label>
        <button type="button" class="btn btn--primary" id="saveInvoiceBtn" style="margin-top:16px;">Save changes</button>
        <p class="form-status" id="invoiceSaveStatus" role="status" aria-live="polite"></p>
      </div>
    `;
    detailPanel.querySelector("#dpClose").addEventListener("click", () => { detailPanel.hidden = true; });
    detailPanel.querySelector("#saveInvoiceBtn").addEventListener("click", async () => {
      const statusEl = detailPanel.querySelector("#invoiceSaveStatus");
      const amountPaid = Number(detailPanel.querySelector("#fAmountPaid").value || 0);
      let status = detailPanel.querySelector("#fStatus").value;
      // Outstanding is always derived from total - amountPaid — never a
      // separately-editable field that could drift from the two numbers
      // that actually define it.
      try {
        await updateDoc(doc(db, "invoices", inv.id), {
          amountPaid,
          status,
          dueDate: detailPanel.querySelector("#fDueDate").value || null,
          notes: detailPanel.querySelector("#fNotes").value.trim() || null,
          updatedAt: serverTimestamp()
        });
        statusEl.textContent = "Saved."; statusEl.setAttribute("data-state", "success");
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Could not save: " + (err.message || "unknown error");
        statusEl.setAttribute("data-state", "error");
      }
    });
    detailPanel.hidden = false;
  }

  document.getElementById("newInvoiceBtn").addEventListener("click", openNewInvoiceFlow);
  statusFilter.addEventListener("change", render);

  onSnapshot(collection(db, "enquiries"), (snap) => { enquiries = snap.docs.map((d) => ({ id: d.id, ...d.data() })); },
    (err) => console.error("Enquiries listener error:", err));
  onSnapshot(collection(db, "quotations"), (snap) => { quotations = snap.docs.map((d) => ({ id: d.id, ...d.data() })); },
    (err) => console.error("Quotations listener error:", err));
  onSnapshot(collection(db, "invoices"), (snap) => { invoices = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => console.error("Invoices listener error:", err));
}

main().catch((err) => {
  console.error("Invoices failed to load:", err);
});
