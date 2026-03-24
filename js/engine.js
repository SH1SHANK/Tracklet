import {
  SPEEDS,
  COORDS,
  distanceKmBetween,
  randomInt,
  MODE_COSTS,
  RELIABILITY_PEAK_HOURS,
  RATIONALES,
} from "./data.js";

export const RouteEngine = {
  /**
   * Scores all transportation modes for a given route.
   * Returns { WALK, BUS, POOL, AUTO } with each containing { minutes, reliability, cost }
   */
  scoreRoutes(start, destination, hourOfDay) {
    const startCoords = COORDS[start] || COORDS["Central Library"];
    const destCoords = COORDS[destination] || COORDS["Central Library"];
    const distanceKm = distanceKmBetween(start, destination);

    // Calculate minutes for each mode
    const walkMinutes = Math.max(
      4,
      Math.round((distanceKm / SPEEDS.WALK) * 60),
    );
    const busMinutes = Math.max(
      4,
      Math.round((distanceKm / SPEEDS.BUS) * 60 + randomInt(3, 6)),
    );
    const poolMinutes = Math.max(
      4,
      Math.round((distanceKm / SPEEDS.POOL) * 60 + randomInt(1, 3)),
    );
    const autoMinutes = Math.max(
      4,
      Math.round((distanceKm / SPEEDS.AUTO) * 60 + randomInt(1, 3)),
    );

    // Calculate reliability for each mode
    const isPeakHour = RELIABILITY_PEAK_HOURS.includes(hourOfDay);
    const busReliability = isPeakHour ? 0.55 : 0.85;

    return {
      WALK: {
        minutes: walkMinutes,
        reliability: 0.95,
        cost: MODE_COSTS.WALK,
      },
      BUS: {
        minutes: busMinutes,
        reliability: busReliability,
        cost: MODE_COSTS.BUS,
      },
      POOL: {
        minutes: poolMinutes,
        reliability: 0.8,
        cost: MODE_COSTS.POOL,
      },
      AUTO: {
        minutes: autoMinutes,
        reliability: 0.75,
        cost: MODE_COSTS.AUTO,
      },
    };
  },

  /**
   * Recommends the best transportation mode based on distance and scores.
   * Returns the mode key as a string.
   */
  recommend(scores, distanceKm) {
    // Rule out any mode with reliability < 0.5
    const validModes = Object.entries(scores).filter(
      ([_, score]) => score.reliability >= 0.5,
    );

    if (validModes.length === 0) {
      return "AUTO"; // Fallback if all reliability < 0.5
    }

    if (distanceKm < 0.5) {
      // Always WALK for very short distances
      return validModes.find(([mode]) => mode === "WALK")
        ? "WALK"
        : validModes[0][0];
    }

    if (distanceKm < 1.5) {
      // WALK if reliable, else BUS if reliable, else AUTO
      if (scores.WALK.reliability >= 0.9) {
        return "WALK";
      }
      if (scores.BUS.reliability >= 0.6) {
        return "BUS";
      }
      return "AUTO";
    }

    // distanceKm >= 1.5: lowest minutes among BUS/POOL/AUTO with reliability >= 0.6
    const candidates = ["BUS", "POOL", "AUTO"].filter(
      (mode) => scores[mode].reliability >= 0.6,
    );

    if (candidates.length === 0) {
      // If none meet reliability threshold, pick best available
      return Object.entries(validModes).sort((a, b) =>
        a[1].minutes > b[1].minutes ? 1 : -1,
      )[0][0];
    }

    // Return mode with lowest minutes
    return candidates.reduce((best, mode) =>
      scores[mode].minutes < scores[best].minutes ? mode : best,
    );
  },

  /**
   * Returns confidence label based on reliability score.
   */
  confidenceLabel(reliability) {
    if (reliability >= 0.8) return "HIGH";
    if (reliability >= 0.6) return "MODERATE";
    return "LOW";
  },

  /**
   * Returns a one-line rationale string explaining the recommendation.
   */
  riskRationale(mode, hourOfDay, reliability) {
    const isPeakHour = RELIABILITY_PEAK_HOURS.includes(hourOfDay);
    const rationales = RATIONALES[mode] || [];

    if (rationales.length === 0) {
      return `${mode} is a reasonable choice for this route.`;
    }

    // Select rationale based on reliability and time of day
    let selected;
    if (reliability >= 0.8) {
      // Use optimistic rationale for high reliability
      selected = rationales[0];
    } else if (reliability >= 0.6) {
      // Use moderate rationale
      selected = rationales[1] || rationales[0];
    } else {
      // Use cautionary rationale for low reliability
      selected = rationales[2] || rationales[1] || rationales[0];
    }

    return selected || `${mode} has mixed reliability on this route.`;
  },

  /**
   * Checks if a gig location is within 0.15 km of the route.
   * Uses perpendicular distance from point to line segment.
   */
  isGigOnRoute(startCoords, destCoords, gigCoords) {
    const PROXIMITY_KM = 0.15;

    // Convert coordinates to radians and use haversine-based projection
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Earth radius in km

    const lat1 = toRad(startCoords.lat);
    const lon1 = toRad(startCoords.lon);
    const lat2 = toRad(destCoords.lat);
    const lon2 = toRad(destCoords.lon);
    const lat3 = toRad(gigCoords.lat);
    const lon3 = toRad(gigCoords.lon);

    // Calculate cross-track distance using spherical geometry
    const dLon13 = lon3 - lon1;
    const dLon12 = lon2 - lon1;

    const y = Math.sin(dLon13) * Math.cos(lat3);
    const x =
      Math.cos(lat1) * Math.sin(lat3) -
      Math.sin(lat1) * Math.cos(lat3) * Math.cos(dLon13);
    const crsAB = Math.atan2(
      Math.sin(dLon12) * Math.cos(lat2),
      Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon12),
    );

    const dAC = Math.acos(
      Math.sin(lat1) * Math.sin(lat3) +
        Math.cos(lat1) * Math.cos(lat3) * Math.cos(dLon13),
    );
    const crossTrackDistance =
      Math.asin(Math.sin(dAC) * Math.sin(crsAB - Math.atan2(y, x))) * R;

    return Math.abs(crossTrackDistance) <= PROXIMITY_KM;
  },
};

export default RouteEngine;
