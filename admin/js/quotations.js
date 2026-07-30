// Lina's admin portal — Quotations. Owner-only (see firestore.rules).
// A reliable structured record only — no pricing engine, no "Viewed"
// status (no genuine open-tracking exists to back it).
import { requireAuth } from "./auth-guard.js";
import { db } from "./firebase-init.js";
import { initLayout } from "./layout.js";
import {
  collection, doc, setDoc, updateDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const STATUSES = ["Draft", "Sent", "Accepted", "Declined", "Expired", "Revised"];

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtRand(n) { return typeof n === "number" ? "R" + n.toLocaleString("en-ZA") : "—"; }
function todayDatePart() {
  const d = new Date();
  return d.getUTCFullYear().toString() + String(d.getUTCMonth() + 1).padStart(2, "0") + String(d.getUTCDate()).padStart(2, "0");
}

async function main() {
  const { user, role } = await requireAuth();
  initLayout({ user, role, active: "quotations" });

  if (role !== "owner") {
    document.getElementById("accessDenied").hidden = false;
    return;
  }
  document.getElementById("quotationsBody").hidden = false;

  const statusFilter = document.getElementById("statusFilter");
  STATUSES.forEach((s) => statusFilter.insertAdjacentHTML("beforeend", `<option value="${esc(s)}">${esc(s)}</option>`));

  const detailPanel = document.getElementById("detailPanel");
  let quotations = [];
  let enquiries = [];

  function render() {
    const statusQ = statusFilter.value;
    const rows = quotations.filter((q) => !statusQ || q.status === statusQ)
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    const list = document.getElementById("quotesList");
    if (!rows.length) {
      list.innerHTML = '<p class="empty-state">No quotations yet. Create one from a confirmed lead in the pipeline.</p>';
      return;
    }
    list.innerHTML = rows.map((q) => `
      <div class="record-row" data-id="${esc(q.id)}">
        <div class="record-row__top"><span>${esc(q.quoteNumber)} — ${esc(q.customerName || "")}</span><span>${fmtRand(q.amount)}</span></div>
        <div class="record-row__meta">
          <span>${esc(q.serviceOrEvent || "—")}</span><span>${esc(q.status)}</span>
          <span>Quote date: ${esc(q.quoteDate || "—")}</span>
          ${q.followUpDate ? `<span>Follow-up: ${esc(q.followUpDate)}</span>` : ""}
        </div>
      </div>
    `).join("");
    list.querySelectorAll(".record-row").forEach((row) => {
      row.addEventListener("click", () => openQuoteDetail(quotations.find((q) => q.id === row.dataset.id)));
    });
  }

  function openNewQuoteFlow() {
    const openEnquiries = enquiries.filter((e) => !e.isTestRecord && !["Lost/Cancelled"].includes(e.status));
    detailPanel.innerHTML = `
      <div class="detail-panel__inner">
        <button class="detail-panel__close" id="dpClose" aria-label="Close">Close ✕</button>
        <h2 style="font-family:var(--font-display);">New quotation</h2>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Enquiry
          <select id="fEnquiry">
            <option value="">Select an enquiry…</option>
            ${openEnquiries.map((e) => `<option value="${esc(e.id)}">${esc(e.customerName)} — ${esc(e.referenceNumber)} (${esc(e.status)})</option>`).join("")}
          </select>
        </label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Amount (R)
          <input type="number" id="fAmount" min="0" step="1"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Quote date
          <input type="date" id="fQuoteDate" value="${new Date().toISOString().slice(0, 10)}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Expiry date
          <input type="date" id="fExpiryDate"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Notes
          <textarea id="fNotes" rows="2"></textarea></label>
        <button type="button" class="btn btn--primary" id="createQuoteBtn" style="margin-top:16px;">Create quotation</button>
        <p class="form-status" id="quoteSaveStatus" role="status" aria-live="polite"></p>
      </div>
    `;
    detailPanel.querySelector("#dpClose").addEventListener("click", () => { detailPanel.hidden = true; });
    detailPanel.querySelector("#createQuoteBtn").addEventListener("click", async () => {
      const statusEl = detailPanel.querySelector("#quoteSaveStatus");
      const enquiryId = detailPanel.querySelector("#fEnquiry").value;
      const amountVal = detailPanel.querySelector("#fAmount").value;
      if (!enquiryId) { statusEl.textContent = "Select an enquiry first."; statusEl.setAttribute("data-state", "error"); return; }
      if (amountVal === "") { statusEl.textContent = "Enter an amount."; statusEl.setAttribute("data-state", "error"); return; }
      const enquiry = enquiries.find((e) => e.id === enquiryId);
      try {
        // A client-allocated doc ref (no server round trip needed) lets the
        // quote number be computed and written in a single set() — no
        // second write that could leave the number stuck if it failed.
        const ref = doc(collection(db, "quotations"));
        await setDoc(ref, {
          quoteNumber: `Q-${todayDatePart()}-${ref.id.slice(0, 6).toUpperCase()}`,
          enquiryId,
          customerName: enquiry.customerName,
          serviceOrEvent: enquiry.enquiryType,
          quoteDate: detailPanel.querySelector("#fQuoteDate").value || null,
          expiryDate: detailPanel.querySelector("#fExpiryDate").value || null,
          amount: Number(amountVal),
          status: "Draft",
          followUpDate: null,
          notes: detailPanel.querySelector("#fNotes").value.trim() || null,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        // Keep the enquiry's own quotation-tracking fields in step —
        // owner-only fields, matches the existing money-field pattern.
        await updateDoc(doc(db, "enquiries", enquiryId), {
          quotationDate: detailPanel.querySelector("#fQuoteDate").value || null,
          updatedAt: serverTimestamp()
        });
        statusEl.textContent = "Quotation created."; statusEl.setAttribute("data-state", "success");
        setTimeout(() => { detailPanel.hidden = true; }, 700);
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Could not create: " + (err.message || "unknown error");
        statusEl.setAttribute("data-state", "error");
      }
    });
    detailPanel.hidden = false;
  }

  function openQuoteDetail(q) {
    detailPanel.innerHTML = `
      <div class="detail-panel__inner">
        <button class="detail-panel__close" id="dpClose" aria-label="Close">Close ✕</button>
        <h2 style="font-family:var(--font-display);">${esc(q.quoteNumber)}</h2>
        <div class="detail-field"><dt>Customer</dt><dd>${esc(q.customerName || "—")}</dd></div>
        <div class="detail-field"><dt>Service/event</dt><dd>${esc(q.serviceOrEvent || "—")}</dd></div>
        <div class="detail-field"><dt>Amount</dt><dd>${fmtRand(q.amount)}</dd></div>
        <div class="detail-field"><dt>Quote date</dt><dd>${esc(q.quoteDate || "—")}</dd></div>
        <div class="detail-field"><dt>Expiry date</dt><dd>${esc(q.expiryDate || "—")}</dd></div>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Status
          <select id="fStatus">${STATUSES.map((s) => `<option ${s === q.status ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Follow-up date
          <input type="date" id="fFollowUp" value="${esc(q.followUpDate || "")}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Notes
          <textarea id="fNotes" rows="3">${esc(q.notes || "")}</textarea></label>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:16px;">
          <button type="button" class="btn btn--primary" id="saveQuoteBtn">Save changes</button>
          ${q.status === "Accepted" ? '<button type="button" class="btn btn--ghost" id="convertBtn" style="padding:8px 16px;">Convert enquiry to Confirmed</button>' : ""}
        </div>
        <p class="form-status" id="quoteSaveStatus" role="status" aria-live="polite"></p>
      </div>
    `;
    detailPanel.querySelector("#dpClose").addEventListener("click", () => { detailPanel.hidden = true; });
    detailPanel.querySelector("#saveQuoteBtn").addEventListener("click", async () => {
      const statusEl = detailPanel.querySelector("#quoteSaveStatus");
      const newStatus = detailPanel.querySelector("#fStatus").value;
      try {
        await updateDoc(doc(db, "quotations", q.id), {
          status: newStatus,
          followUpDate: detailPanel.querySelector("#fFollowUp").value || null,
          notes: detailPanel.querySelector("#fNotes").value.trim() || null,
          updatedAt: serverTimestamp()
        });
        statusEl.textContent = "Saved."; statusEl.setAttribute("data-state", "success");
        q.status = newStatus;
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Could not save: " + (err.message || "unknown error");
        statusEl.setAttribute("data-state", "error");
      }
    });
    const convertBtn = detailPanel.querySelector("#convertBtn");
    if (convertBtn) {
      convertBtn.addEventListener("click", async () => {
        const statusEl = detailPanel.querySelector("#quoteSaveStatus");
        try {
          await updateDoc(doc(db, "enquiries", q.enquiryId), {
            status: "Confirmed",
            confirmedAmount: q.amount,
            confirmedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          statusEl.textContent = "Enquiry confirmed. You can now create a booking from it in the Pipeline.";
          statusEl.setAttribute("data-state", "success");
        } catch (err) {
          console.error(err);
          statusEl.textContent = "Could not confirm the enquiry: " + (err.message || "unknown error");
          statusEl.setAttribute("data-state", "error");
        }
      });
    }
    detailPanel.hidden = false;
  }

  document.getElementById("newQuoteBtn").addEventListener("click", openNewQuoteFlow);
  statusFilter.addEventListener("change", render);

  onSnapshot(collection(db, "enquiries"), (snap) => { enquiries = snap.docs.map((d) => ({ id: d.id, ...d.data() })); },
    (err) => console.error("Enquiries listener error:", err));
  onSnapshot(collection(db, "quotations"), (snap) => { quotations = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => console.error("Quotations listener error:", err));
}

main().catch((err) => {
  console.error("Quotations failed to load:", err);
});
