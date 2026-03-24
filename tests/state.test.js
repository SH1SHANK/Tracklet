import test from "node:test";
import assert from "node:assert/strict";

import { buildSimulationContext } from "../js/simulation.js";
import { buildAppState } from "../js/state.js";

const fixedNow = new Date("2026-03-25T09:12:00+05:30");

test("simulation stays deterministic for the same route and time bucket", () => {
  const one = buildSimulationContext("MBH II", "Central Library", fixedNow, null);
  const two = buildSimulationContext("MBH II", "Central Library", fixedNow, null);

  assert.deepEqual(one, two);
});

test("short routes hide autopool when distance is below the threshold", () => {
  const state = buildAppState({
    origin: "Main Building",
    destination: "Central Library",
    now: fixedNow,
  });

  assert.ok(state.mainTrip.distanceKm < 1.2);
  assert.equal(state.autopool.visible, false);
});

test("gig visibility follows route-aware invariants", () => {
  const rainyState = buildAppState({
    origin: "MBH I",
    destination: "Central Library",
    now: fixedNow,
    weatherOverride: 80,
  });

  assert.equal(rainyState.conditions.weather, "RAIN LIKELY");
  assert.equal(rainyState.gig.visible, false);
});

test("event recommendation is computed from the event route, not reused blindly", () => {
  const state = buildAppState({
    origin: "MBH II",
    destination: "Central Library",
    now: fixedNow,
  });

  assert.ok(state.event.routeScores[state.event.recommendedMode]);
  assert.ok(state.event.minutes >= 4);
  assert.notEqual(state.event.location, state.destination);
});
