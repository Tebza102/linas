// Lina's admin portal — Users. Owner/developer only (see firestore.rules).
// Firebase Authentication is the account; adminUsers is the Firestore
// profile (role, relationship, active state). No public signup, no
// passwords ever stored here — new accounts get a Firebase-generated
// password-SET link via /api/admin/invite-user, shared manually by
// whoever invites them (this page never sends anything itself).
import { requireAuth } from "./auth-guard.js";
import { db } from "./firebase-init.js";
import { initLayout } from "./layout.js";
import {
  collection, doc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const ROLES = ["owner", "developer", "observer", "staff"];
const ACCESS_LEVEL_LABEL = {
  owner: "Full access", developer: "Full access", observer: "Read-only", staff: "Limited operational"
};

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

async function main() {
  const { user, role } = await requireAuth();
  initLayout({ user, role, active: "users" });

  if (role !== "owner" && role !== "developer") {
    document.getElementById("accessDenied").hidden = false;
    return;
  }
  document.getElementById("usersBody").hidden = false;

  const detailPanel = document.getElementById("detailPanel");
  const tbody = document.getElementById("usersTableBody");
  let users = [];

  function render() {
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="9">No admin users found.</td></tr>';
      return;
    }
    tbody.innerHTML = users.map((u) => `
      <tr>
        <td>${esc(u.displayName || "—")}</td>
        <td>${esc(u.email || "—")}</td>
        <td><span class="status-badge" data-status="${esc(u.role)}">${esc(u.role)}</span></td>
        <td>${esc(u.relationship || "—")}</td>
        <td>${esc(ACCESS_LEVEL_LABEL[u.role] || "—")}</td>
        <td>${u.active === false ? "Deactivated" : "Active"}</td>
        <td>${u.lastLoginAt ? fmtDate(u.lastLoginAt) : "Never signed in"}</td>
        <td>${fmtDate(u.createdAt)}</td>
        <td>
          ${u.uid === user.uid
            ? '<span style="font-size:12px; color:var(--white-faint);">This is you</span>'
            : `<button type="button" class="btn btn--ghost" style="padding:6px 12px; font-size:13px;" data-manage="${esc(u.uid)}">Manage</button>`}
        </td>
      </tr>
    `).join("");
    tbody.querySelectorAll("[data-manage]").forEach((btn) => {
      btn.addEventListener("click", () => openManage(users.find((u) => u.uid === btn.dataset.manage)));
    });
  }

  function openManage(u) {
    detailPanel.innerHTML = `
      <div class="detail-panel__inner">
        <button class="detail-panel__close" id="dpClose" aria-label="Close">Close ✕</button>
        <h2 style="font-family:var(--font-display);">${esc(u.displayName)}</h2>
        <div class="detail-field"><dt>Email</dt><dd>${esc(u.email)}</dd></div>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Role
          <select id="fRole">${ROLES.map((r) => `<option value="${r}" ${r === u.role ? "selected" : ""}>${r}</option>`).join("")}</select>
        </label>
        <label style="display:flex; align-items:center; gap:8px; font-size:14px; margin-top:12px;">
          <input type="checkbox" id="fActive" ${u.active === false ? "" : "checked"}>
          Account active
        </label>
        <button type="button" class="btn btn--primary" id="saveUserBtn" style="margin-top:16px;">Save changes</button>
        <p class="form-status" id="userSaveStatus" role="status" aria-live="polite"></p>
      </div>
    `;
    detailPanel.querySelector("#dpClose").addEventListener("click", () => { detailPanel.hidden = true; });
    detailPanel.querySelector("#saveUserBtn").addEventListener("click", async () => {
      const statusEl = detailPanel.querySelector("#userSaveStatus");
      try {
        await updateDoc(doc(db, "adminUsers", u.uid), {
          role: detailPanel.querySelector("#fRole").value,
          active: detailPanel.querySelector("#fActive").checked
        });
        statusEl.textContent = "Saved. Note: a role change only takes effect once that person's Firebase ID token next refreshes (usually within the hour, or immediately on their next sign-in).";
        statusEl.setAttribute("data-state", "success");
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Could not save: " + (err.message || "unknown error");
        statusEl.setAttribute("data-state", "error");
      }
    });
    detailPanel.hidden = false;
  }

  function openInviteFlow() {
    detailPanel.innerHTML = `
      <div class="detail-panel__inner">
        <button class="detail-panel__close" id="dpClose" aria-label="Close">Close ✕</button>
        <h2 style="font-family:var(--font-display);">Invite user</h2>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Full name
          <input type="text" id="fName"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Email
          <input type="email" id="fEmail"></label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Role
          <select id="fRole">${ROLES.map((r) => `<option value="${r}">${r}</option>`).join("")}</select>
        </label>
        <label style="display:grid; gap:4px; font-size:14px; margin-top:12px;">Relationship (optional)
          <input type="text" id="fRelationship" placeholder="e.g. Business owner, GEP Project Manager"></label>
        <button type="button" class="btn btn--primary" id="createInviteBtn" style="margin-top:16px;">Create account</button>
        <p class="form-status" id="inviteStatus" role="status" aria-live="polite"></p>
        <div id="inviteResult" hidden style="margin-top:16px; padding:12px; border-left:3px solid var(--red); background:rgba(255,255,255,0.04);">
          <p style="font-size:13px; margin:0 0 8px;">Account ready. This link lets them set their own password — nothing is emailed automatically. Share it yourself (WhatsApp, email, etc).</p>
          <textarea id="inviteLink" readonly rows="3" style="width:100%; font-size:12px; background:var(--black-soft); color:var(--white); border:1px solid var(--border); padding:8px;"></textarea>
          <button type="button" class="btn btn--ghost" id="copyLinkBtn" style="margin-top:8px; padding:6px 14px; font-size:13px;">Copy link</button>
        </div>
      </div>
    `;
    detailPanel.querySelector("#dpClose").addEventListener("click", () => { detailPanel.hidden = true; });
    detailPanel.querySelector("#createInviteBtn").addEventListener("click", async () => {
      const statusEl = detailPanel.querySelector("#inviteStatus");
      const name = detailPanel.querySelector("#fName").value.trim();
      const email = detailPanel.querySelector("#fEmail").value.trim();
      const roleVal = detailPanel.querySelector("#fRole").value;
      const relationship = detailPanel.querySelector("#fRelationship").value.trim();
      if (!name || !email) {
        statusEl.textContent = "Name and email are required.";
        statusEl.setAttribute("data-state", "error");
        return;
      }
      statusEl.textContent = "Creating…";
      statusEl.removeAttribute("data-state");
      try {
        const idToken = await user.getIdToken();
        const resp = await fetch("/api/admin/invite-user", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ displayName: name, email, role: roleVal, relationship })
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
          statusEl.textContent = data.error || "Could not create this account.";
          statusEl.setAttribute("data-state", "error");
          return;
        }
        statusEl.textContent = data.wasExisting ? "Existing account updated." : "Account created.";
        statusEl.setAttribute("data-state", "success");
        const resultBox = detailPanel.querySelector("#inviteResult");
        resultBox.hidden = false;
        detailPanel.querySelector("#inviteLink").value = data.passwordSetLink;
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Could not reach the server. Please try again.";
        statusEl.setAttribute("data-state", "error");
      }
    });
    detailPanel.addEventListener("click", async (e) => {
      if (e.target && e.target.id === "copyLinkBtn") {
        try {
          await navigator.clipboard.writeText(detailPanel.querySelector("#inviteLink").value);
          e.target.textContent = "Copied!";
          setTimeout(() => { e.target.textContent = "Copy link"; }, 1500);
        } catch (err) {
          e.target.textContent = "Could not copy";
        }
      }
    });
    detailPanel.hidden = false;
  }

  document.getElementById("inviteUserBtn").addEventListener("click", openInviteFlow);

  onSnapshot(collection(db, "adminUsers"), (snap) => {
    users = snap.docs.map((d) => d.data()).sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
    render();
  }, (err) => {
    console.error("Users listener error:", err);
    tbody.innerHTML = '<tr><td colspan="9">Could not load users.</td></tr>';
  });
}

main().catch((err) => {
  console.error("Users failed to load:", err);
});
