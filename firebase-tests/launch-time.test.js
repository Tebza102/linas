"use strict";

/*
 * Tests for the automatic-launch clock check the Coming Soon middleware
 * relies on. The failure modes that matter most here are launching early
 * (a customer sees the real site before it's ready) and never launching
 * automatically at all (someone has to notice and intervene by hand).
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { hasLaunchTimeArrived } = require("../api/_lib/launch-time");

const LAUNCH = "2026-09-01T07:00:00.000Z"; // 1 Sept 2026, 09:00 SAST

test("before the configured instant, the gate stays closed", () => {
  const oneSecondBefore = Date.parse(LAUNCH) - 1000;
  assert.equal(hasLaunchTimeArrived(LAUNCH, oneSecondBefore, false), false);
});

test("at the exact configured instant, the gate opens", () => {
  assert.equal(hasLaunchTimeArrived(LAUNCH, Date.parse(LAUNCH), false), true);
});

test("after the configured instant, the gate stays open", () => {
  const oneSecondAfter = Date.parse(LAUNCH) + 1000;
  assert.equal(hasLaunchTimeArrived(LAUNCH, oneSecondAfter, false), true);
});

test("hold overrides the clock even after launch time has passed", () => {
  const oneHourAfter = Date.parse(LAUNCH) + 60 * 60 * 1000;
  assert.equal(hasLaunchTimeArrived(LAUNCH, oneHourAfter, true), false);
});

test("no launch date configured means no automatic launch, ever", () => {
  assert.equal(hasLaunchTimeArrived(undefined, Date.parse(LAUNCH) + 1000, false), false);
  assert.equal(hasLaunchTimeArrived("", Date.parse(LAUNCH) + 1000, false), false);
});

test("a malformed launch date never triggers an early launch", () => {
  assert.equal(hasLaunchTimeArrived("not a date", Date.now() + 1000, false), false);
  assert.equal(hasLaunchTimeArrived("2026-13-45T99:99:99Z", Date.now() + 1000, false), false);
});
