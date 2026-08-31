"use strict";

/*
 * Whether the configured public launch instant has arrived. Lets the
 * Coming Soon gate in middleware.js open itself automatically the moment
 * the server's own clock reaches COMING_SOON_LAUNCH_AT — no redeploy or
 * manual step needed at the actual launch time, since middleware already
 * runs fresh (no caching) on every request.
 *
 * Exported as a pure function, taking plain values rather than reading
 * process.env itself, so it is unit-testable without mocking globals —
 * same shape as parseLaunchAt in api/coming-soon/config.js.
 *
 * `hold` is a deliberate escape hatch: if a problem is found close to the
 * configured instant, setting COMING_SOON_LAUNCH_HOLD=true keeps the gate
 * closed regardless of the clock, without touching COMING_SOON_LAUNCH_AT
 * itself — the countdown display keeps its correct, already-approved
 * value; only enforcement pauses.
 */
function hasLaunchTimeArrived(launchAtRaw, nowMs, hold) {
  if (hold) return false;
  if (!launchAtRaw || typeof launchAtRaw !== "string") return false;
  const launchMs = Date.parse(launchAtRaw.trim());
  if (Number.isNaN(launchMs)) return false;
  return nowMs >= launchMs;
}

module.exports = { hasLaunchTimeArrived };
