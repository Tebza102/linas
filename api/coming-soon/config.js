"use strict";

/*
 * GET /api/coming-soon/config — the ONLY way the static Coming Soon page
 * learns about the countdown/promo state, since a zero-build static file
 * has no way to read environment variables itself. Returns non-sensitive
 * DISPLAY config only. Never returns COMING_SOON_REVIEWER_PASSWORD,
 * COMING_SOON_COOKIE_SECRET, or anything else security-relevant.
 */

/**
 * A valid launch date must be ISO 8601 with an explicit UTC offset (not a
 * bare local time, which would be ambiguous about which timezone it means)
 * and must actually parse to a real instant. An absent or malformed value
 * means "no countdown" — never a fabricated or assumed date.
 */
function parseLaunchAt(raw) {
  if (!raw || typeof raw !== "string") return null;
  if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(raw.trim())) {
    return null;
  }
  const ms = Date.parse(raw.trim());
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=60");
  res.status(200).json({
    ok: true,
    previewActive: process.env.COMING_SOON_ENABLED === "true",
    launchAt: parseLaunchAt(process.env.COMING_SOON_LAUNCH_AT),
    promoEnabled: process.env.COMING_SOON_PROMO_ENABLED === "true",
    promoText: process.env.COMING_SOON_PROMO_ENABLED === "true"
      ? (process.env.COMING_SOON_PROMO_TEXT || null)
      : null
  });
}

// parseLaunchAt is attached to the exported handler (rather than a second
// module.exports style) so this stays a single default-exported function,
// matching every other api/*.js file's shape, while still being directly
// unit-testable without an HTTP round-trip.
module.exports = handler;
module.exports.parseLaunchAt = parseLaunchAt;
