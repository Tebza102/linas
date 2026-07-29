/*
 * Lina's — local demo database layer.
 *
 * Uses Node's built-in `node:sqlite` (no npm install, no external service).
 * This is a LOCAL REVIEW DATABASE for the client working-model demo — not
 * the production database. The file lives in data/lina-demo.db and persists
 * across server restarts, satisfying "persist across refreshes and restarts"
 * without needing Firebase/Supabase/etc.
 */
"use strict";

const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.resolve(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "lina-demo.db");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS enquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    event_type TEXT NOT NULL,
    event_date TEXT,
    event_location TEXT,
    guest_count INTEGER,
    service_required TEXT,
    menu_interest TEXT,
    budget_range TEXT,
    notes TEXT,
    lead_source TEXT NOT NULL DEFAULT 'Website (demo)',
    popia_consent INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'New',
    follow_up_log TEXT NOT NULL DEFAULT '',
    next_action_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const VALID_STATUSES = ["New", "Contacted", "Quoted", "Confirmed", "Completed", "Lost"];

function nowIso() {
  return new Date().toISOString();
}

function generateReference() {
  const today = new Date();
  const datePart =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");
  const countRow = db
    .prepare("SELECT COUNT(*) AS c FROM enquiries WHERE reference LIKE ?")
    .get(`LINA-${datePart}-%`);
  const next = (countRow.c || 0) + 1;
  return `LINA-${datePart}-${String(next).padStart(4, "0")}`;
}

function createEnquiry(fields) {
  const required = ["name", "phone", "event_type"];
  for (const key of required) {
    if (!fields[key] || String(fields[key]).trim() === "") {
      throw new ValidationError(`Missing required field: ${key}`);
    }
  }
  if (!fields.popia_consent) {
    throw new ValidationError("POPIA consent is required before an enquiry can be stored.");
  }

  const reference = generateReference();
  const ts = nowIso();
  const stmt = db.prepare(`
    INSERT INTO enquiries (
      reference, name, phone, email, event_type, event_date, event_location,
      guest_count, service_required, menu_interest, budget_range, notes,
      lead_source, popia_consent, status, follow_up_log, next_action_date,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    reference,
    fields.name,
    fields.phone,
    fields.email || null,
    fields.event_type,
    fields.event_date || null,
    fields.event_location || null,
    fields.guest_count != null && fields.guest_count !== "" ? Number(fields.guest_count) : null,
    fields.service_required || null,
    fields.menu_interest || null,
    fields.budget_range || null,
    fields.notes || null,
    fields.lead_source || "Website (demo)",
    fields.popia_consent ? 1 : 0,
    "New",
    "",
    null,
    ts,
    ts
  );
  return getEnquiryById(info.lastInsertRowid);
}

function getEnquiryById(id) {
  return db.prepare("SELECT * FROM enquiries WHERE id = ?").get(id);
}

function listEnquiries() {
  return db.prepare("SELECT * FROM enquiries ORDER BY created_at DESC").all();
}

function updateEnquiry(id, patch) {
  const existing = getEnquiryById(id);
  if (!existing) throw new NotFoundError(`No enquiry with id ${id}`);

  let status = existing.status;
  if (patch.status !== undefined) {
    if (!VALID_STATUSES.includes(patch.status)) {
      throw new ValidationError(`Invalid status: ${patch.status}`);
    }
    status = patch.status;
  }

  let followUpLog = existing.follow_up_log || "";
  if (patch.follow_up_note && String(patch.follow_up_note).trim() !== "") {
    const stamp = new Date().toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
    followUpLog = followUpLog + (followUpLog ? "\n" : "") + `[${stamp}] ${patch.follow_up_note.trim()}`;
  }

  const nextActionDate = patch.next_action_date !== undefined ? patch.next_action_date : existing.next_action_date;
  const ts = nowIso();

  db.prepare(`
    UPDATE enquiries SET status = ?, follow_up_log = ?, next_action_date = ?, updated_at = ?
    WHERE id = ?
  `).run(status, followUpLog, nextActionDate, ts, id);

  return getEnquiryById(id);
}

function getDashboard() {
  const all = listEnquiries();
  const total = all.length;
  const byStatus = {};
  for (const s of VALID_STATUSES) byStatus[s] = 0;
  for (const row of all) byStatus[row.status] = (byStatus[row.status] || 0) + 1;

  const bySource = {};
  const byEventType = {};
  for (const row of all) {
    const src = row.lead_source || "Unknown";
    bySource[src] = (bySource[src] || 0) + 1;
    const et = row.event_type || "Unknown";
    byEventType[et] = (byEventType[et] || 0) + 1;
  }

  const won = byStatus["Confirmed"] + byStatus["Completed"];
  const closed = won + byStatus["Lost"];
  const conversionRate = closed > 0 ? Math.round((won / closed) * 100) : null;

  return {
    total,
    byStatus,
    bySource,
    byEventType,
    conversionRate,
    isDemoData: true
  };
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

module.exports = {
  DB_PATH,
  VALID_STATUSES,
  createEnquiry,
  getEnquiryById,
  listEnquiries,
  updateEnquiry,
  getDashboard,
  ValidationError,
  NotFoundError
};
