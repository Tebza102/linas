"use strict";

/*
 * POST /api/preview/logout — clears private-preview access. Works for both
 * reviewer and developer sessions identically, since both use the same
 * cookie; there is nothing scope-specific about logging out.
 */

const { clearCookie, COOKIE_NAME, UI_HINT_COOKIE_NAME } = require("../_lib/preview-token");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  res.setHeader("Set-Cookie", [clearCookie(COOKIE_NAME), clearCookie(UI_HINT_COOKIE_NAME)]);
  res.setHeader("Cache-Control", "private, no-store");
  res.status(200).json({ ok: true });
};
