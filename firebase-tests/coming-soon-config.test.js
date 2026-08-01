"use strict";

/*
 * Tests for the launch-date parsing used by GET /api/coming-soon/config.
 * The countdown must never show zeroes or an invented date, so an
 * absent/malformed value must resolve to null, not a guess.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseLaunchAt } = require("../api/coming-soon/config");

test("a valid ISO 8601 date with an explicit offset parses", () => {
  assert.equal(parseLaunchAt("2026-08-15T10:00:00+02:00"), "2026-08-15T08:00:00.000Z");
});

test("a valid ISO 8601 date in Z form parses", () => {
  assert.equal(parseLaunchAt("2026-08-15T08:00:00Z"), "2026-08-15T08:00:00.000Z");
});

test("missing value returns null (no countdown, not a guess)", () => {
  assert.equal(parseLaunchAt(undefined), null);
  assert.equal(parseLaunchAt(""), null);
});

test("a bare local time with no offset is rejected (ambiguous timezone)", () => {
  assert.equal(parseLaunchAt("2026-08-15T10:00:00"), null);
});

test("a non-date string is rejected", () => {
  assert.equal(parseLaunchAt("next month"), null);
  assert.equal(parseLaunchAt("2026-13-45T99:99:99Z"), null);
});
