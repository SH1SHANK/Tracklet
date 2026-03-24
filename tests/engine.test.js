import test from "node:test";
import assert from "node:assert/strict";

import { recommendRoute, scoreRoutes } from "../js/engine.js";

const clearConditions = {
  distanceKm: 0.42,
  weather: "CLEAR",
  peakState: "STEADY",
  hourOfDay: 10,
  roadTraffic: 0.18,
  crowdLevel: 0.12,
  waitMinutes: { BUS: 3, POOL: 2, AUTO: 2 },
  speedMultiplier: { WALK: 1, BUS: 1, POOL: 1, AUTO: 1 },
};

test("short routes prefer walking when timing is stable", () => {
  const scores = scoreRoutes("MBH II", "Central Library", clearConditions);
  const recommendation = recommendRoute(scores, clearConditions);

  assert.equal(recommendation.mode, "WALK");
  assert.equal(scores.WALK.delayRisk, "LOW");
});

test("longer routes produce scored options for every mode", () => {
  const conditions = {
    ...clearConditions,
    distanceKm: 2.4,
    roadTraffic: 0.42,
    crowdLevel: 0.35,
    waitMinutes: { BUS: 5, POOL: 2, AUTO: 2 },
  };
  const scores = scoreRoutes("MBH I", "Sports Complex", conditions);

  assert.ok(scores.BUS.minutes >= 4);
  assert.ok(scores.POOL.minutes >= 4);
  assert.ok(scores.AUTO.minutes >= 4);
  assert.ok(scores.POOL.reliability >= 0.52);
});

test("rain penalizes walking confidence compared with a clear route", () => {
  const wet = scoreRoutes("MBH II", "Central Library", {
    ...clearConditions,
    weather: "RAIN LIKELY",
    speedMultiplier: { WALK: 0.86, BUS: 0.95, POOL: 0.97, AUTO: 0.96 },
  });
  const dry = scoreRoutes("MBH II", "Central Library", clearConditions);

  assert.ok(wet.WALK.minutes > dry.WALK.minutes);
  assert.ok(wet.WALK.reliability < dry.WALK.reliability);
});
