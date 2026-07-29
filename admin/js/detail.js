// Lina's admin portal — enquiry detail slide-in panel.
import { db } from "./firebase-init.js";
import {
  doc, updateDoc, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const STATUSES = ["New", "Contacted", "Quoted", "Confirmed", "In Progress", "Completed", "Lost/Cancelled"];

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function digitsOnly(phone) { return String(phone || "").replace(/\D/g, ""); }

async function loadActivities(enquiryId) {
  const q = query(collection(db, "enquiryActivities"), where("enquiryId", "==", enquiryId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

async function logActivity(enquiryId, uid, entries) {
  const writes = entries.map((e) => addDoc(collection(db, "enquiryActivities"), {
    enquiryId,
    actionType: e.actionType,
    previousValue: e.previousValue != null ? String(e.previousValue) : null,
    newValue: e.newValue != null ? String(e.newValue) : null,
    note: e.note || null,
    createdBy: uid,
    createdAt: serverTimestamp()
  }));
  await Promise.all(writes);
}

export async function openDetail(panelEl, enquiry, ctx) {
  const { user, role, adminUsersMap, onSaved } = ctx;
  const isOwner = role === "owner";

  const ownerOptions = ['<option value="">Unassigned</option>']
    .concat(Object.entries(adminUsersMap).map(([uid, u]) =>
      `<option value="${esc(uid)}" ${enquiry.assignedOwnerId === uid ? "selected" : ""}>${esc(u.displayName)}</option>`
    )).join("");

  const statusOptions = STATUSES.map((s) =>
    `<option value="${esc(s)}" ${enquiry.status === s ? "selected" : ""}>${esc(s)}</option>`
  ).join("");

  const waHref = digitsOnly(enquiry.phone).length >= 7
    ? `https://wa.me/${digitsOnly(enquiry.phone)}` : null;

  panelEl.innerHTML = `
    <div class="detail-panel__inner">
      <button class="detail-panel__close" id="detailClose" aria-label="Close enquiry details">Close ✕</button>
      <h2 style="font-family:var(--font-display);">${esc(enquiry.referenceNumber)}</h2>

      <div class="contact-shortcuts">
        <a class="btn btn--ghost" style="padding:6px 14px; font-size:13px;" href="tel:${esc(enquiry.phone)}">Call</a>
        ${enquiry.email ? `<a class="btn btn--ghost" style="padding:6px 14px; font-size:13px;" href="mailto:${esc(enquiry.email)}">Email</a>` : ""}
        ${waHref ? `<a class="btn btn--ghost" style="padding:6px 14px; font-size:13px;" href="${waHref}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
      </div>

      <dl id="detailFields"></dl>

      <label style="display:grid; gap:4px; font-size:14px; margin-top:16px;">
        Status
        <select id="statusSelect">${statusOptions}</select>
      </label>

      <div id="quoteBlock" style="margin-top:12px; display:none;">
        <label style="display:grid; gap:4px; font-size:14px;">
          Quoted amount (R) — leave blank and check "pending" if not yet costed
          <input type="number" id="quotedAmount" min="0" step="1" ${isOwner ? "" : "disabled"} value="${typeof enquiry.quotedAmount === "number" ? enquiry.quotedAmount : ""}">
        </label>
        <label style="display:flex; align-items:center; gap:6px; font-size:13px; margin-top:6px;">
          <input type="checkbox" id="quotedPending" ${enquiry.quotedAmount === "pending" ? "checked" : ""} ${isOwner ? "" : "disabled"}>
          Pending — amount not yet decided
        </label>
        ${isOwner ? "" : '<p style="font-size:12px; color:var(--white-faint);">Only an owner/admin can set the quoted amount.</p>'}
      </div>

      <div id="confirmBlock" style="margin-top:12px; display:none;">
        <label style="display:grid; gap:4px; font-size:14px;">
          Confirmed amount (R)
          <input type="number" id="confirmedAmount" min="0" step="1" ${isOwner ? "" : "disabled"} value="${typeof enquiry.confirmedAmount === "number" ? enquiry.confirmedAmount : ""}">
        </label>
        ${isOwner ? "" : '<p style="font-size:12px; color:var(--white-faint);">Only an owner/admin can set the confirmed amount.</p>'}
      </div>

      <div id="lostBlock" style="margin-top:12px; display:none;">
        <label style="display:grid; gap:4px; font-size:14px;">
          Lost/cancelled reason
          <input type="text" id="lostReason" value="${esc(enquiry.lostReason || "")}">
        </label>
      </div>

      <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">
        Owner
        <select id="ownerSelect">${ownerOptions}</select>
      </label>
      <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">
        Next action
        <input type="text" id="nextActionInput" value="${esc(enquiry.nextAction || "")}" placeholder="e.g. Call to confirm menu choices">
      </label>
      <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">
        Follow-up date
        <input type="date" id="followUpInput" value="${esc(enquiry.followUpDate || "")}">
      </label>
      <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">
        Add a note
        <textarea id="noteInput" rows="3" placeholder="Internal note (visible to admin/staff only)"></textarea>
      </label>

      <button class="btn btn--primary" id="saveDetailBtn" style="margin-top:16px;">Save changes</button>
      <p class="form-status" id="detailStatus" role="status" aria-live="polite"></p>

      <div class="detail-field" style="margin-top:24px;">
        <dt>POPIA consent</dt>
        <dd>${enquiry.popiaConsent ? "Given" : "Not recorded"} — ${fmtDate(enquiry.popiaConsentTimestamp)} (notice version ${esc(enquiry.privacyNoticeVersion || "—")})</dd>
      </div>

      <div class="detail-field">
        <dt>Activity history</dt>
        <dd><ul class="activity-log" id="activityLog"><li>Loading…</li></ul></dd>
      </div>
    </div>
  `;

  const fieldPairs = [
    ["Customer name", enquiry.customerName],
    ["Phone", enquiry.phone],
    ["Email", enquiry.email || "—"],
    ["Preferred contact", enquiry.preferredContactMethod || "—"],
    ["Event type", enquiry.enquiryType],
    ["Occasion", enquiry.occasion || "—"],
    ["Event date", enquiry.eventDate || "—"],
    ["Event time", enquiry.eventTime || "—"],
    ["Location", enquiry.location || "—"],
    ["Guest count", enquiry.guestCount != null ? enquiry.guestCount : "—"],
    ["Service requirements", enquiry.serviceRequirements || "—"],
    ["Menu requirements", enquiry.menuRequirements || "—"],
    ["Dietary requirements", enquiry.dietaryRequirements || "—"],
    ["Delivery/collection", enquiry.deliveryOrCollection || "—"],
    ["Equipment/staffing", enquiry.equipmentOrStaffing || "—"],
    ["Budget guidance", enquiry.budgetGuidance || "—"],
    ["Message", enquiry.message || "—"],
    ["Source", enquiry.source || "—"],
    ["Campaign", enquiry.campaign || "—"],
    ["Submitted", fmtDate(enquiry.createdAt)],
    ["Last updated", fmtDate(enquiry.updatedAt)]
  ];
  panelEl.querySelector("#detailFields").innerHTML = fieldPairs
    .map(([k, v]) => `<div class="detail-field"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");

  const statusSelect = panelEl.querySelector("#statusSelect");
  const quoteBlock = panelEl.querySelector("#quoteBlock");
  const confirmBlock = panelEl.querySelector("#confirmBlock");
  const lostBlock = panelEl.querySelector("#lostBlock");

  function syncConditionalBlocks() {
    const s = statusSelect.value;
    quoteBlock.style.display = (s === "Quoted" || s === "Confirmed" || s === "In Progress" || s === "Completed") ? "block" : "none";
    confirmBlock.style.display = (s === "Confirmed" || s === "In Progress" || s === "Completed") ? "block" : "none";
    lostBlock.style.display = s === "Lost/Cancelled" ? "block" : "none";
  }
  statusSelect.addEventListener("change", syncConditionalBlocks);
  syncConditionalBlocks();

  loadActivities(enquiry.id).then((activities) => {
    const log = panelEl.querySelector("#activityLog");
    if (!activities.length) { log.innerHTML = "<li>No activity yet.</li>"; return; }
    log.innerHTML = activities.map((a) => `
      <li><time>${fmtDate(a.createdAt)}</time>
        <strong>${esc(a.actionType)}</strong>
        ${a.previousValue != null || a.newValue != null ? `— ${esc(a.previousValue ?? "—")} → ${esc(a.newValue ?? "—")}` : ""}
        ${a.note ? `<br>${esc(a.note)}` : ""}
      </li>
    `).join("");
  }).catch((err) => {
    panelEl.querySelector("#activityLog").innerHTML = `<li>Could not load activity history.</li>`;
    console.error(err);
  });

  panelEl.querySelector("#detailClose").addEventListener("click", () => { panelEl.hidden = true; });
  panelEl.addEventListener("click", (e) => { if (e.target === panelEl) panelEl.hidden = true; });

  panelEl.querySelector("#saveDetailBtn").addEventListener("click", async () => {
    const statusEl = panelEl.querySelector("#detailStatus");
    statusEl.textContent = "Saving...";
    statusEl.removeAttribute("data-state");

    const newStatus = statusSelect.value;
    const newOwner = panelEl.querySelector("#ownerSelect").value || null;
    const newNextAction = panelEl.querySelector("#nextActionInput").value.trim() || null;
    const newFollowUp = panelEl.querySelector("#followUpInput").value || null;
    const noteText = panelEl.querySelector("#noteInput").value.trim();

    const quotedPendingEl = panelEl.querySelector("#quotedPending");
    const quotedAmountEl = panelEl.querySelector("#quotedAmount");
    const confirmedAmountEl = panelEl.querySelector("#confirmedAmount");
    const lostReasonEl = panelEl.querySelector("#lostReason");

    let quotedAmount = enquiry.quotedAmount ?? null;
    let confirmedAmount = enquiry.confirmedAmount ?? null;
    let lostReason = enquiry.lostReason ?? null;

    if (isOwner) {
      if (quotedPendingEl.checked) quotedAmount = "pending";
      else if (quotedAmountEl.value !== "") quotedAmount = Number(quotedAmountEl.value);
      if (confirmedAmountEl.value !== "") confirmedAmount = Number(confirmedAmountEl.value);
    }
    if (newStatus === "Lost/Cancelled") lostReason = lostReasonEl.value.trim();

    // Client-side mirror of the server-enforced business rules, so the
    // user gets a clear message instead of an opaque permission error.
    if (newStatus === "Quoted" && !(typeof quotedAmount === "number" || quotedAmount === "pending")) {
      statusEl.textContent = 'Quoted requires an amount, or check "pending".';
      statusEl.setAttribute("data-state", "error");
      return;
    }
    if (newStatus === "Confirmed" && typeof confirmedAmount !== "number") {
      statusEl.textContent = "Confirmed requires a confirmed amount.";
      statusEl.setAttribute("data-state", "error");
      return;
    }
    if (newStatus === "Lost/Cancelled" && !lostReason) {
      statusEl.textContent = "Lost/Cancelled requires a reason.";
      statusEl.setAttribute("data-state", "error");
      return;
    }

    const patch = {
      status: newStatus,
      assignedOwnerId: newOwner,
      nextAction: newNextAction,
      followUpDate: newFollowUp,
      updatedAt: serverTimestamp()
    };
    if (isOwner) {
      patch.quotedAmount = quotedAmount;
      patch.confirmedAmount = confirmedAmount;
    }
    if (newStatus === "Confirmed" && enquiry.status !== "Confirmed") patch.confirmedAt = serverTimestamp();
    if (newStatus === "Completed" && enquiry.status !== "Completed") patch.completedAt = serverTimestamp();
    if (newStatus === "Lost/Cancelled") patch.lostReason = lostReason;

    const activityEntries = [];
    if (newStatus !== enquiry.status) {
      activityEntries.push({ actionType: "status_change", previousValue: enquiry.status, newValue: newStatus });
    }
    if (newOwner !== (enquiry.assignedOwnerId || null)) {
      activityEntries.push({ actionType: "assignment", previousValue: enquiry.assignedOwnerId, newValue: newOwner });
    }
    if (newFollowUp !== (enquiry.followUpDate || null)) {
      activityEntries.push({ actionType: "follow_up_set", previousValue: enquiry.followUpDate, newValue: newFollowUp });
    }
    if (isOwner && quotedAmount !== (enquiry.quotedAmount ?? null)) {
      activityEntries.push({ actionType: "quote", previousValue: enquiry.quotedAmount, newValue: quotedAmount });
    }
    if (isOwner && confirmedAmount !== (enquiry.confirmedAmount ?? null)) {
      activityEntries.push({ actionType: "confirmation", previousValue: enquiry.confirmedAmount, newValue: confirmedAmount });
    }
    if (noteText) {
      activityEntries.push({ actionType: "note", note: noteText });
    }
    if (!activityEntries.length && !noteText) {
      activityEntries.push({ actionType: "update", note: "No tracked fields changed." });
    }

    try {
      await updateDoc(doc(db, "enquiries", enquiry.id), patch);
      await logActivity(enquiry.id, user.uid, activityEntries);

      // Update the in-memory enquiry object so a SECOND save within the
      // same still-open panel diffs against the just-saved state, not the
      // state from when the panel was first opened — otherwise every
      // status change in a row would incorrectly log "previousValue: New"
      // regardless of what it actually changed from.
      enquiry.status = newStatus;
      enquiry.assignedOwnerId = newOwner;
      enquiry.nextAction = newNextAction;
      enquiry.followUpDate = newFollowUp;
      if (isOwner) {
        enquiry.quotedAmount = quotedAmount;
        enquiry.confirmedAmount = confirmedAmount;
      }
      if (newStatus === "Lost/Cancelled") enquiry.lostReason = lostReason;

      statusEl.textContent = "Saved.";
      statusEl.setAttribute("data-state", "success");
      panelEl.querySelector("#noteInput").value = "";

      // Refresh the activity log in place so the trail is visible without
      // closing and reopening the panel.
      loadActivities(enquiry.id).then((activities) => {
        const log = panelEl.querySelector("#activityLog");
        log.innerHTML = activities.length ? activities.map((a) => `
          <li><time>${fmtDate(a.createdAt)}</time>
            <strong>${esc(a.actionType)}</strong>
            ${a.previousValue != null || a.newValue != null ? `— ${esc(a.previousValue ?? "—")} → ${esc(a.newValue ?? "—")}` : ""}
            ${a.note ? `<br>${esc(a.note)}` : ""}
          </li>
        `).join("") : "<li>No activity yet.</li>";
      }).catch((err) => console.error(err));

      if (onSaved) onSaved();
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Could not save: " + (err.message || "unknown error");
      statusEl.setAttribute("data-state", "error");
    }
  });

  panelEl.hidden = false;
  panelEl.querySelector("#detailClose").focus();
}
