import {
  MODE_COSTS,
  RATIONALES,
  RELIABILITY_PEAK_HOURS,
  SPEEDS,
  clamp,
  distanceKmBetween,
} from "./data.js";

const minMinutes = (value) => Math.max(4, Math.round(value));

const toDelayRisk = (minutes, reliability, baselineMinutes) => {
  const delta = minutes - baselineMinutes;
  if (reliability < 0.65 || delta >= 7) return "HIGH";
  if (reliability < 0.8 || delta >= 4) return "MEDIUM";
  return "LOW";
};

const scoreCandidate = (mode, score, conditions) => {
  const costWeight = score.cost * 2.2;
  const reliabilityWeight = (1 - score.reliability) * 18;
  const rainPenalty =
    conditions.weather === "RAIN LIKELY" && mode === "WALK" ? 4 : 0;
  const peakPenalty =
    conditions.peakState === "PEAK" && mode === "BUS" ? 3.5 : 0;
  return score.minutes + costWeight + reliabilityWeight + rainPenalty + peakPenalty;
};

export const scoreRoutes = (origin, destination, conditions = {}) => {
  const distanceKm = conditions.distanceKm ?? distanceKmBetween(origin, destination);
  const isPeakHour = conditions.peakState
    ? conditions.peakState === "PEAK"
    : RELIABILITY_PEAK_HOURS.includes(conditions.hourOfDay ?? new Date().getHours());
  const weatherIsWet = conditions.weather === "RAIN LIKELY";
  const roadTraffic = clamp(conditions.roadTraffic ?? 0.28, 0, 1);
  const crowdLevel = clamp(conditions.crowdLevel ?? 0.25, 0, 1);
  const waitMinutes = conditions.waitMinutes ?? {};
  const speedMultiplier = conditions.speedMultiplier ?? {};

  const walkMinutes = minMinutes(
    (distanceKm / (SPEEDS.WALK * (speedMultiplier.WALK ?? 1))) * 60,
  );
  const busMinutes = minMinutes(
    (distanceKm / (SPEEDS.BUS * (speedMultiplier.BUS ?? 1))) * 60 +
      (waitMinutes.BUS ?? 4),
  );
  const poolMinutes = minMinutes(
    (distanceKm / (SPEEDS.POOL * (speedMultiplier.POOL ?? 1))) * 60 +
      (waitMinutes.POOL ?? 2),
  );
  const autoMinutes = minMinutes(
    (distanceKm / (SPEEDS.AUTO * (speedMultiplier.AUTO ?? 1))) * 60 +
      (waitMinutes.AUTO ?? 2),
  );

  const walkReliability = clamp(
    0.97 - (weatherIsWet ? 0.16 : 0) - Math.max(0, distanceKm - 1.4) * 0.08,
    0.48,
    0.97,
  );
  const busReliability = clamp(
    0.88 -
      (isPeakHour ? 0.18 : 0) -
      roadTraffic * 0.16 -
      (weatherIsWet ? 0.04 : 0) -
      (distanceKm < 0.7 ? 0.05 : 0),
    0.45,
    0.9,
  );
  const poolReliability = clamp(
    0.84 - roadTraffic * 0.12 - crowdLevel * 0.08 + (distanceKm > 1.2 ? 0.03 : 0),
    0.52,
    0.88,
  );
  const autoReliability = clamp(
    0.8 -
      roadTraffic * 0.08 -
      crowdLevel * 0.05 +
      ((conditions.hourOfDay ?? 12) >= 20 ? 0.04 : 0.01),
    0.56,
    0.86,
  );

  return {
    WALK: {
      minutes: walkMinutes,
      reliability: walkReliability,
      cost: MODE_COSTS.WALK,
      delayRisk: toDelayRisk(walkMinutes, walkReliability, walkMinutes),
    },
    BUS: {
      minutes: busMinutes,
      reliability: busReliability,
      cost: MODE_COSTS.BUS,
      delayRisk: toDelayRisk(busMinutes, busReliability, walkMinutes),
    },
    POOL: {
      minutes: poolMinutes,
      reliability: poolReliability,
      cost: MODE_COSTS.POOL,
      delayRisk: toDelayRisk(poolMinutes, poolReliability, walkMinutes),
    },
    AUTO: {
      minutes: autoMinutes,
      reliability: autoReliability,
      cost: MODE_COSTS.AUTO,
      delayRisk: toDelayRisk(autoMinutes, autoReliability, walkMinutes),
    },
  };
};

export const confidenceLabel = (reliability) => {
  if (reliability >= 0.84) return "HIGH";
  if (reliability >= 0.68) return "MODERATE";
  return "LOW";
};

export const riskRationale = (mode, routeScores, conditions = {}) => {
  const distanceKm = conditions.distanceKm ?? 0;
  const wet = conditions.weather === "RAIN LIKELY";
  const peak = conditions.peakState === "PEAK";
  const rationaleSet = RATIONALES[mode];

  if (mode === "WALK") {
    if (distanceKm <= 0.8) return rationaleSet.short;
    if (wet) return rationaleSet.wet;
    return rationaleSet.steady;
  }

  if (mode === "BUS") {
    if (peak) return rationaleSet.peak;
    if (routeScores.BUS.minutes <= routeScores.WALK.minutes - 3) return rationaleSet.fast;
    return rationaleSet.covered;
  }

  if (mode === "POOL") {
    if (routeScores.POOL.reliability >= routeScores.BUS.reliability + 0.08) {
      return rationaleSet.recovery;
    }
    if (distanceKm > 1.4) return rationaleSet.efficient;
    return rationaleSet.reroute;
  }

  if ((conditions.hourOfDay ?? 12) >= 20) return rationaleSet.late;
  if (routeScores.AUTO.minutes <= routeScores.BUS.minutes) return rationaleSet.direct;
  return rationaleSet.fallback;
};

export const recommendRoute = (routeScores, conditions = {}) => {
  const distanceKm = conditions.distanceKm ?? 0;
  const viableModes = Object.entries(routeScores).filter(
    ([, score]) => score.reliability >= 0.55,
  );

  let mode = "AUTO";
  if (distanceKm <= 0.55 && routeScores.WALK.reliability >= 0.7) {
    mode = "WALK";
  } else if (
    distanceKm <= 1.2 &&
    conditions.weather !== "RAIN LIKELY" &&
    routeScores.WALK.minutes <= routeScores.BUS.minutes + 2
  ) {
    mode = "WALK";
  } else {
    const candidates = viableModes.length ? viableModes : Object.entries(routeScores);
    mode = candidates
      .slice()
      .sort(
        ([modeA, scoreA], [modeB, scoreB]) =>
          scoreCandidate(modeA, scoreA, conditions) -
          scoreCandidate(modeB, scoreB, conditions),
      )[0][0];
  }

  return {
    mode,
    confidence: confidenceLabel(routeScores[mode].reliability),
    rationale: riskRationale(mode, routeScores, conditions),
  };
};

export const isGigOnRoute = (startCoords, destCoords, gigCoords) => {
  const proximityKm = 0.18;
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const lat1 = toRad(startCoords.lat);
  const lon1 = toRad(startCoords.lon);
  const lat2 = toRad(destCoords.lat);
  const lon2 = toRad(destCoords.lon);
  const lat3 = toRad(gigCoords.lat);
  const lon3 = toRad(gigCoords.lon);

  const dLon13 = lon3 - lon1;
  const dLon12 = lon2 - lon1;
  const y = Math.sin(dLon13) * Math.cos(lat3);
  const x =
    Math.cos(lat1) * Math.sin(lat3) -
    Math.sin(lat1) * Math.cos(lat3) * Math.cos(dLon13);
  const courseAB = Math.atan2(
    Math.sin(dLon12) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon12),
  );
  const distanceAC = Math.acos(
    Math.sin(lat1) * Math.sin(lat3) +
      Math.cos(lat1) * Math.cos(lat3) * Math.cos(dLon13),
  );
  const crossTrackKm =
    Math.asin(Math.sin(distanceAC) * Math.sin(courseAB - Math.atan2(y, x))) *
    earthRadiusKm;

  return Math.abs(crossTrackKm) <= proximityKm;
};

const RouteEngine = {
  confidenceLabel,
  isGigOnRoute,
  recommendRoute,
  riskRationale,
  scoreRoutes,
};

export default RouteEngine;
