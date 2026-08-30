// Lina's admin portal — Marketing Centre: content planner + campaign
// tracker + honest social-channel status. Campaign performance is always
// CALCULATED live from linked enquiries, never stored as an independent
// total that could drift out of sync.
import { requireAuth } from "./auth-guard.js";
import { db } from "./firebase-init.js";
import { initLayout } from "./layout.js";
import {
  collection, doc, addDoc, updateDoc, onSnapshot, serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const PLATFORMS = ["Instagram", "Facebook", "Google Business Profile", "Website", "WhatsApp"];
const CONTENT_STATUSES = ["Idea", "Draft", "Ready", "Scheduled", "Published", "Cancelled"];
const CAMPAIGN_STATUSES = ["Planned", "Active", "Paused", "Completed"];
const QUALIFIED_STATUSES = ["Contacted", "Quoted", "Confirmed", "In Progress", "Completed"];
const CONFIRMED_STATUSES = ["Confirmed", "In Progress", "Completed"];

// Plain manual links — never a fake "Publish" action. Opening the
// platform is as far as this goes until (if ever) a real API integration
// exists; posting itself is still done by Lina, by hand.
const PLATFORM_LINKS = {
  "Instagram": "https://www.instagram.com/",
  "Facebook": "https://www.facebook.com/",
  "Google Business Profile": "https://business.google.com/",
  "Website": "/assets/mockups/working/prototype-v2/index.html",
  "WhatsApp": "https://web.whatsapp.com/"
};

const CHANNEL_STATES = [
  { name: "Instagram", state: "Setup required", note: "Active account — API integration not connected." },
  { name: "Facebook", state: "Setup required", note: "Setup/connection pending." },
  { name: "Google Business Profile", state: "Setup required", note: "Profile created — connection pending." },
  { name: "Website", state: "Connected", note: "Connected — enquiries flow directly into this platform." },
  { name: "WhatsApp", state: "Authentication required", note: "Enquiry route active/pending confirmation." }
];

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtRand(n) { return "R" + Number(n || 0).toLocaleString("en-ZA"); }

async function main() {
  const { user, role } = await requireAuth();
  initLayout({ user, role, active: "marketing" });
  const isOwner = role === "owner" || role === "developer";

  const detailPanel = document.getElementById("detailPanel");
  let contentItems = [];
  let campaigns = [];
  let enquiries = [];

  // ---- Tabs ----
  const tabs = {
    content: { btn: document.getElementById("tabContentBtn"), section: document.getElementById("contentSection") },
    campaigns: { btn: document.getElementById("tabCampaignsBtn"), section: document.getElementById("campaignsSection") },
    channels: { btn: document.getElementById("tabChannelsBtn"), section: document.getElementById("channelsSection") }
  };
  function showTab(name) {
    Object.entries(tabs).forEach(([key, t]) => {
      t.section.hidden = key !== name;
      t.btn.setAttribute("aria-pressed", String(key === name));
    });
  }
  tabs.content.btn.addEventListener("click", () => showTab("content"));
  tabs.campaigns.btn.addEventListener("click", () => showTab("campaigns"));
  tabs.channels.btn.addEventListener("click", () => showTab("channels"));

  // ---- Content Planner ----
  const platformFilter = document.getElementById("platformFilter");
  PLATFORMS.forEach((p) => platformFilter.insertAdjacentHTML("beforeend", `<option value="${esc(p)}">${esc(p)}</option>`));
  const contentStatusFilter = document.getElementById("contentStatusFilter");
  CONTENT_STATUSES.forEach((s) => contentStatusFilter.insertAdjacentHTML("beforeend", `<option value="${esc(s)}">${esc(s)}</option>`));

  function renderContent() {
    const platformQ = platformFilter.value;
    const statusQ = contentStatusFilter.value;
    const rows = contentItems.filter((c) =>
      (!platformQ || c.platform === platformQ) && (!statusQ || c.status === statusQ)
    ).sort((a, b) => (a.scheduledDate || "").localeCompare(b.scheduledDate || ""));

    const list = document.getElementById("contentList");
    if (!rows.length) {
      list.innerHTML = '<p class="empty-state">No content planned yet. Use "+ New content item" to add one.</p>';
      return;
    }
    list.innerHTML = rows.map((c) => `
      <div class="record-row" data-id="${esc(c.id)}">
        <div class="record-row__top"><span>${esc(c.contentTitle)}</span><span>${esc(c.status)}</span></div>
        <div class="record-row__meta">
          <span>${esc(c.platform)}</span>
          <span>${esc(c.scheduledDate || "No date set")}${c.scheduledTime ? " " + esc(c.scheduledTime) : ""}</span>
          ${c.campaignName ? `<span>${esc(c.campaignName)}</span>` : ""}
        </div>
      </div>
    `).join("");
    list.querySelectorAll(".record-row").forEach((row) => {
      row.addEventListener("click", () => openContentDetail(contentItems.find((c) => c.id === row.dataset.id)));
    });
  }

  function openContentDetail(item) {
    const isNew = !item;
    const data = item || {
      contentTitle: "", platform: "Instagram", contentType: "", campaignId: "", campaignName: "",
      scheduledDate: "", scheduledTime: "", status: "Idea", caption: "", callToAction: "",
      relatedOffer: "", publishedDate: "", mediaReference: "", notes: "", assignedPerson: null
    };
    if (role === "observer" && item) {
      // Read-only: observer never creates content, so this branch only
      // needs to cover viewing an existing item.
      detailPanel.innerHTML = `
        <div class="detail-panel__inner">
          <button class="detail-panel__close" id="dpClose" aria-label="Close">Close ✕</button>
          <h2 style="font-family:var(--font-display);">${esc(data.contentTitle)}</h2>
          <div class="detail-field"><dt>Platform</dt><dd>${esc(data.platform)}</dd></div>
          <div class="detail-field"><dt>Status</dt><dd>${esc(data.status)}</dd></div>
          <div class="detail-field"><dt>Scheduled</dt><dd>${esc(data.scheduledDate || "—")} ${esc(data.scheduledTime || "")}</dd></div>
          <div class="detail-field"><dt>Caption</dt><dd>${esc(data.caption || "—")}</dd></div>
          <div class="detail-field"><dt>Notes</dt><dd>${esc(data.notes || "—")}</dd></div>
        </div>
      `;
      detailPanel.querySelector("#dpClose").addEventListener("click", () => { detailPanel.hidden = true; });
      detailPanel.hidden = false;
      return;
    }
    detailPanel.innerHTML = `
      <div class="detail-panel__inner">
        <button class="detail-panel__close" id="dpClose" aria-label="Close">Close ✕</button>
        <h2 style="font-family:var(--font-display);">${isNew ? "New content item" : "Edit content item"}</h2>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Title
          <input type="text" id="fTitle" value="${esc(data.contentTitle)}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Platform
          <select id="fPlatform">${PLATFORMS.map((p) => `<option ${p === data.platform ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Content type
          <input type="text" id="fType" value="${esc(data.contentType)}" placeholder="e.g. Reel, carousel, post"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Campaign name (optional)
          <input type="text" id="fCampaignName" value="${esc(data.campaignName || "")}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Scheduled date
          <input type="date" id="fDate" value="${esc(data.scheduledDate || "")}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Scheduled time
          <input type="time" id="fTime" value="${esc(data.scheduledTime || "")}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Status
          <select id="fStatus">${CONTENT_STATUSES.map((s) => `<option ${s === data.status ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Caption
          <textarea id="fCaption" rows="4">${esc(data.caption || "")}</textarea></label>
        <button type="button" class="btn btn--ghost" id="copyCaption" style="margin-top:6px; padding:6px 14px; font-size:13px;">Copy caption</button>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Call to action
          <input type="text" id="fCta" value="${esc(data.callToAction || "")}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Related offer
          <input type="text" id="fOffer" value="${esc(data.relatedOffer || "")}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Published date
          <input type="date" id="fPublished" value="${esc(data.publishedDate || "")}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Media reference (link or file note)
          <input type="text" id="fMedia" value="${esc(data.mediaReference || "")}" placeholder="Link to the asset — no upload in Phase 1"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Notes
          <textarea id="fNotes" rows="2">${esc(data.notes || "")}</textarea></label>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:16px;">
          <button type="button" class="btn btn--primary" id="saveContentBtn">Save</button>
          <a class="btn btn--ghost" style="padding:8px 20px;" href="${PLATFORM_LINKS[data.platform] || "#"}" target="_blank" rel="noopener">Open ${esc(data.platform)} →</a>
        </div>
        <p class="form-status" id="contentSaveStatus" role="status" aria-live="polite"></p>
      </div>
    `;
    detailPanel.querySelector("#dpClose").addEventListener("click", () => { detailPanel.hidden = true; });
    detailPanel.querySelector("#copyCaption").addEventListener("click", async () => {
      const text = detailPanel.querySelector("#fCaption").value;
      try { await navigator.clipboard.writeText(text); detailPanel.querySelector("#copyCaption").textContent = "Copied!"; }
      catch (err) { detailPanel.querySelector("#copyCaption").textContent = "Could not copy"; }
      setTimeout(() => { detailPanel.querySelector("#copyCaption").textContent = "Copy caption"; }, 1500);
    });
    // Platform link updates live if the platform dropdown changes.
    detailPanel.querySelector("#fPlatform").addEventListener("change", (e) => {
      const link = detailPanel.querySelector('a[target="_blank"]');
      link.href = PLATFORM_LINKS[e.target.value] || "#";
      link.textContent = `Open ${e.target.value} →`;
    });
    detailPanel.querySelector("#saveContentBtn").addEventListener("click", async () => {
      const statusEl = detailPanel.querySelector("#contentSaveStatus");
      const payload = {
        contentTitle: detailPanel.querySelector("#fTitle").value.trim(),
        platform: detailPanel.querySelector("#fPlatform").value,
        contentType: detailPanel.querySelector("#fType").value.trim() || null,
        campaignName: detailPanel.querySelector("#fCampaignName").value.trim() || null,
        scheduledDate: detailPanel.querySelector("#fDate").value || null,
        scheduledTime: detailPanel.querySelector("#fTime").value || null,
        status: detailPanel.querySelector("#fStatus").value,
        caption: detailPanel.querySelector("#fCaption").value.trim() || null,
        callToAction: detailPanel.querySelector("#fCta").value.trim() || null,
        relatedOffer: detailPanel.querySelector("#fOffer").value.trim() || null,
        publishedDate: detailPanel.querySelector("#fPublished").value || null,
        mediaReference: detailPanel.querySelector("#fMedia").value.trim() || null,
        notes: detailPanel.querySelector("#fNotes").value.trim() || null,
        updatedAt: serverTimestamp()
      };
      if (!payload.contentTitle) {
        statusEl.textContent = "Title is required."; statusEl.setAttribute("data-state", "error"); return;
      }
      try {
        if (isNew) {
          await addDoc(collection(db, "contentItems"), {
            ...payload, assignedPerson: null, createdBy: user.uid, createdAt: serverTimestamp()
          });
        } else {
          await updateDoc(doc(db, "contentItems", item.id), payload);
        }
        statusEl.textContent = "Saved."; statusEl.setAttribute("data-state", "success");
        setTimeout(() => { detailPanel.hidden = true; }, 600);
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Could not save: " + (err.message || "unknown error");
        statusEl.setAttribute("data-state", "error");
      }
    });
    detailPanel.hidden = false;
  }

  document.getElementById("newContentBtn").addEventListener("click", () => openContentDetail(null));
  if (!isOwner) document.getElementById("newContentBtn").hidden = true;
  platformFilter.addEventListener("change", renderContent);
  contentStatusFilter.addEventListener("change", renderContent);

  onSnapshot(collection(db, "contentItems"), (snap) => {
    contentItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderContent();
  }, (err) => console.error("Content items listener error:", err));

  // ---- Campaign Tracker ----
  function campaignMetrics(campaign) {
    const matched = enquiries.filter((e) =>
      !e.isTestRecord && campaign.campaignCode &&
      (e.campaignCode === campaign.campaignCode || e.utmCampaign === campaign.campaignCode || e.campaignId === campaign.id)
    );
    const qualified = matched.filter((e) => QUALIFIED_STATUSES.includes(e.status));
    const quotationsSent = matched.filter((e) => e.status === "Quoted" || CONFIRMED_STATUSES.includes(e.status));
    const confirmed = matched.filter((e) => CONFIRMED_STATUSES.includes(e.status));
    const revenue = confirmed.filter((e) => typeof e.confirmedAmount === "number").reduce((s, e) => s + e.confirmedAmount, 0);
    const closed = matched.filter((e) => ["Confirmed", "Completed", "Lost/Cancelled"].includes(e.status)).length;
    const conversionRate = closed > 0 ? Math.round((confirmed.length / closed) * 100) : null;
    return { leads: matched.length, qualified: qualified.length, quotationsSent: quotationsSent.length, confirmed: confirmed.length, revenue, conversionRate };
  }

  function renderCampaigns() {
    const list = document.getElementById("campaignsList");
    if (!campaigns.length) {
      list.innerHTML = '<p class="empty-state">No campaigns yet. Use "+ New campaign" to add one.</p>';
      return;
    }
    list.innerHTML = campaigns.map((c) => {
      const m = campaignMetrics(c);
      return `
        <div class="record-row" data-id="${esc(c.id)}">
          <div class="record-row__top"><span>${esc(c.campaignName)}</span><span>${esc(c.status)}</span></div>
          <div class="record-row__meta">
            <span>${esc(c.channel || "—")}</span>
            <span>${esc(c.campaignCode || "no code set")}</span>
            <span>${esc(c.startDate || "—")} → ${esc(c.endDate || "—")}</span>
          </div>
          <div class="record-row__meta" style="margin-top:8px;">
            <span>${m.leads} leads</span><span>${m.qualified} qualified</span><span>${m.quotationsSent} quoted</span>
            <span>${m.confirmed} confirmed</span><span>${fmtRand(m.revenue)} revenue</span>
            <span>${m.conversionRate === null ? "—" : m.conversionRate + "%"} conversion</span>
          </div>
        </div>
      `;
    }).join("");
    list.querySelectorAll(".record-row").forEach((row) => {
      row.addEventListener("click", () => openCampaignDetail(campaigns.find((c) => c.id === row.dataset.id)));
    });
  }

  function openCampaignDetail(campaign) {
    const isNew = !campaign;
    const data = campaign || {
      campaignName: "", objective: "", offer: "", targetAudience: "", startDate: "", endDate: "",
      channel: "", campaignCode: "", status: "Planned", budget: "", notes: "", lessons: ""
    };
    const metricsHtml = !isNew ? (() => {
      const m = campaignMetrics(campaign);
      return `
        <div class="kpi-grid" style="margin-top:16px;">
          <div class="kpi-tile"><div class="kpi-tile__value">${m.leads}</div><div class="kpi-tile__label">Leads</div></div>
          <div class="kpi-tile"><div class="kpi-tile__value">${m.qualified}</div><div class="kpi-tile__label">Qualified</div></div>
          <div class="kpi-tile"><div class="kpi-tile__value">${m.quotationsSent}</div><div class="kpi-tile__label">Quotations</div></div>
          <div class="kpi-tile"><div class="kpi-tile__value">${m.confirmed}</div><div class="kpi-tile__label">Confirmed sales</div></div>
          <div class="kpi-tile"><div class="kpi-tile__value">${fmtRand(m.revenue)}</div><div class="kpi-tile__label">Revenue</div></div>
          <div class="kpi-tile"><div class="kpi-tile__value">${m.conversionRate === null ? "—" : m.conversionRate + "%"}</div><div class="kpi-tile__label">Conversion rate</div></div>
        </div>
      `;
    })() : '<p class="empty-state" style="margin-top:12px;">Metrics appear once this campaign is saved and enquiries reference its campaign code.</p>';

    if (role === "observer" && campaign) {
      detailPanel.innerHTML = `
        <div class="detail-panel__inner">
          <button class="detail-panel__close" id="dpClose" aria-label="Close">Close ✕</button>
          <h2 style="font-family:var(--font-display);">${esc(data.campaignName)}</h2>
          <div class="detail-field"><dt>Objective</dt><dd>${esc(data.objective || "—")}</dd></div>
          <div class="detail-field"><dt>Channel</dt><dd>${esc(data.channel || "—")}</dd></div>
          <div class="detail-field"><dt>Status</dt><dd>${esc(data.status)}</dd></div>
          <div class="detail-field"><dt>Dates</dt><dd>${esc(data.startDate || "—")} to ${esc(data.endDate || "—")}</dd></div>
          ${metricsHtml}
        </div>
      `;
      detailPanel.querySelector("#dpClose").addEventListener("click", () => { detailPanel.hidden = true; });
      detailPanel.hidden = false;
      return;
    }

    detailPanel.innerHTML = `
      <div class="detail-panel__inner">
        <button class="detail-panel__close" id="dpClose" aria-label="Close">Close ✕</button>
        <h2 style="font-family:var(--font-display);">${isNew ? "New campaign" : "Edit campaign"}</h2>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Campaign name
          <input type="text" id="fName" value="${esc(data.campaignName)}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Objective
          <input type="text" id="fObjective" value="${esc(data.objective || "")}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Offer
          <input type="text" id="fOffer" value="${esc(data.offer || "")}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Target audience
          <input type="text" id="fAudience" value="${esc(data.targetAudience || "")}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Start date
          <input type="date" id="fStart" value="${esc(data.startDate || "")}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">End date
          <input type="date" id="fEnd" value="${esc(data.endDate || "")}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Channel
          <input type="text" id="fChannel" value="${esc(data.channel || "")}" placeholder="e.g. Instagram, Google Ads"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Campaign code
          <input type="text" id="fCode" value="${esc(data.campaignCode || "")}" placeholder="e.g. SPRING26 — used in utm_campaign links"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Status
          <select id="fStatus">${CAMPAIGN_STATUSES.map((s) => `<option ${s === data.status ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Budget (optional)
          <input type="number" id="fBudget" min="0" value="${data.budget != null ? esc(data.budget) : ""}"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Notes
          <textarea id="fNotes" rows="2">${esc(data.notes || "")}</textarea></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Lessons learned
          <textarea id="fLessons" rows="2">${esc(data.lessons || "")}</textarea></label>
        ${metricsHtml}
        <button type="button" class="btn btn--primary" id="saveCampaignBtn" style="margin-top:16px;">Save</button>
        <p class="form-status" id="campaignSaveStatus" role="status" aria-live="polite"></p>
      </div>
    `;
    detailPanel.querySelector("#dpClose").addEventListener("click", () => { detailPanel.hidden = true; });
    detailPanel.querySelector("#saveCampaignBtn").addEventListener("click", async () => {
      const statusEl = detailPanel.querySelector("#campaignSaveStatus");
      const budgetVal = detailPanel.querySelector("#fBudget").value;
      const payload = {
        campaignName: detailPanel.querySelector("#fName").value.trim(),
        objective: detailPanel.querySelector("#fObjective").value.trim() || null,
        offer: detailPanel.querySelector("#fOffer").value.trim() || null,
        targetAudience: detailPanel.querySelector("#fAudience").value.trim() || null,
        startDate: detailPanel.querySelector("#fStart").value || null,
        endDate: detailPanel.querySelector("#fEnd").value || null,
        channel: detailPanel.querySelector("#fChannel").value.trim() || null,
        campaignCode: detailPanel.querySelector("#fCode").value.trim() || null,
        status: detailPanel.querySelector("#fStatus").value,
        budget: budgetVal !== "" ? Number(budgetVal) : null,
        notes: detailPanel.querySelector("#fNotes").value.trim() || null,
        lessons: detailPanel.querySelector("#fLessons").value.trim() || null,
        updatedAt: serverTimestamp()
      };
      if (!payload.campaignName) {
        statusEl.textContent = "Campaign name is required."; statusEl.setAttribute("data-state", "error"); return;
      }
      try {
        if (isNew) {
          await addDoc(collection(db, "campaigns"), { ...payload, createdBy: user.uid, createdAt: serverTimestamp() });
        } else {
          await updateDoc(doc(db, "campaigns", campaign.id), payload);
        }
        statusEl.textContent = "Saved."; statusEl.setAttribute("data-state", "success");
        setTimeout(() => { detailPanel.hidden = true; }, 600);
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Could not save: " + (err.message || "unknown error");
        statusEl.setAttribute("data-state", "error");
      }
    });
    detailPanel.hidden = false;
  }

  document.getElementById("newCampaignBtn").addEventListener("click", () => openCampaignDetail(null));
  if (!isOwner) document.getElementById("newCampaignBtn").hidden = true;

  onSnapshot(collection(db, "campaigns"), (snap) => {
    campaigns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderCampaigns();
  }, (err) => console.error("Campaigns listener error:", err));

  // Observer reads everything (per firestore.rules) but never writes —
  // scoped the same as owner/developer here, distinct from plain staff.
  const canReadAllEnquiries = isOwner || role === "observer";
  const enquiriesQuery = canReadAllEnquiries
    ? collection(db, "enquiries")
    : query(collection(db, "enquiries"), where("assignedOwnerId", "in", [user.uid, null]));
  onSnapshot(enquiriesQuery, (snap) => {
    enquiries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderCampaigns();
  }, (err) => console.error("Enquiries listener (for campaign metrics) error:", err));

  // ---- Channel status ----
  document.getElementById("channelsList").innerHTML = CHANNEL_STATES.map((ch) => `
    <div class="channel-card">
      <h2 style="font-family:var(--font-display); font-size:16px; margin:0;">${esc(ch.name)}</h2>
      <span class="channel-card__status" data-state="${esc(ch.state)}">${esc(ch.state)}</span>
      <p style="font-size:13px; color:var(--white-dim); margin-top:var(--space-2);">${esc(ch.note)}</p>
      <p style="font-size:13px; color:var(--white-faint); margin-top:var(--space-2);">Connect account to view performance.</p>
    </div>
  `).join("");
}

main().catch((err) => {
  console.error("Marketing centre failed to load:", err);
});
