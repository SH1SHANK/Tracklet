import {
  AUTOPOOL_MOCK_OFFERS,
  COORDS,
  EVENTS,
  MICRO_GIGS,
  RELIABILITY_PEAK_HOURS,
  clamp,
  distanceKmBetween,
} from "./data.js";
import { isGigOnRoute } from "./engine.js";

export const hashString = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const createSeededRandom = (seed) => {
  let value = seed >>> 0;
  return () => {
    value = Math.imul(value + 1013904223, 1664525) >>> 0;
    return value / 4294967296;
  };
};

const pickDeterministicItem = (items, seed, offset = 0) =>
  items[(seed + offset) % items.length];

const sameMinuteBucket = (date) => {
  const rounded = new Date(date);
  rounded.setMinutes(Math.floor(rounded.getMinutes() / 15) * 15, 0, 0);
  return rounded;
};

export const buildSimulationContext = (
  origin,
  destination,
  now,
  weatherOverride,
) => {
  const timestamp = sameMinuteBucket(now);
  const timeBucket = timestamp.toISOString();
  const hourBucket = `${timestamp.getHours().toString().padStart(2, "0")}:${timestamp
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
  const seed = hashString(`${origin}|${destination}|${timeBucket}`);
  const random = createSeededRandom(seed);
  const peakState = RELIABILITY_PEAK_HOURS.includes(timestamp.getHours())
    ? "PEAK"
    : "STEADY";
  const simulatedRainProbability = Math.round(
    clamp((peakState === "PEAK" ? 0.24 : 0.08) + random() * 0.58, 0, 1) * 100,
  );
  const rainProbability =
    typeof weatherOverride === "number"
      ? Math.round(weatherOverride)
      : simulatedRainProbability;
  const weather = rainProbability >= 45 ? "RAIN LIKELY" : "CLEAR";
  const roadTraffic = clamp(
    (peakState === "PEAK" ? 0.48 : 0.18) + random() * 0.34,
    0.05,
    0.94,
  );
  const crowdLevel = clamp(
    (peakState === "PEAK" ? 0.44 : 0.16) + random() * 0.32,
    0.04,
    0.92,
  );

  return {
    seed,
    timeBucket,
    hourBucket,
    peakState,
    weather,
    rainProbability,
    weatherSource: typeof weatherOverride === "number" ? "live" : "simulated",
    roadTraffic,
    crowdLevel,
    waitMinutes: {
      BUS: 2 + Math.round(roadTraffic * 5 + random() * 2),
      POOL: 1 + Math.round(crowdLevel * 3 + random()),
      AUTO: 1 + Math.round(roadTraffic * 2 + random()),
    },
    speedMultiplier: {
      WALK: weather === "RAIN LIKELY" ? 0.86 : 1,
      BUS: clamp(1 - roadTraffic * 0.09, 0.8, 1),
      POOL: clamp(1 - roadTraffic * 0.05, 0.86, 1),
      AUTO: clamp(1 - roadTraffic * 0.07, 0.82, 1),
    },
    leaveWithin: 2 + Math.round(random() * 7),
    etaSpread: 4 + Math.round((roadTraffic + crowdLevel) * 3),
  };
};

export const buildAutopoolOffer = ({
  origin,
  destination,
  conditions,
  routeScores,
}) => {
  const distanceKm = distanceKmBetween(origin, destination);
  const roadModesViable = ["BUS", "POOL", "AUTO"].some(
    (mode) => routeScores[mode].reliability >= 0.62,
  );
  const visible =
    distanceKm >= 1.2 &&
    roadModesViable &&
    (routeScores.POOL.reliability >= 0.68 ||
      routeScores.AUTO.reliability >= 0.72);

  const offerCount = 1 + ((conditions.seed >> 8) % 2);
  const offers = Array.from({ length: offerCount }, (_, index) => {
    const offer = pickDeterministicItem(
      AUTOPOOL_MOCK_OFFERS,
      conditions.seed,
      1 + index,
    );
    return {
      driverName: offer.name,
      driverLabel: offer.label,
      pickupPoint: offer.pickup,
      vehicle: offer.vehicle,
      etaMinutes: 2 + ((conditions.seed >> (1 + index)) % 5),
      seats: 1 + ((conditions.seed >> (2 + index)) % 3),
      impactMinutes: 1 + ((conditions.seed >> (4 + index)) % 4),
    };
  });
  const primaryOffer = offers[0];

  if (!visible) {
    return {
      visible: false,
      offers,
      ...primaryOffer,
    };
  }

  return {
    visible: true,
    offers,
    ...primaryOffer,
  };
};

export const buildGigOpportunity = ({ origin, destination, conditions }) => {
  const startCoords = COORDS[origin];
  const destinationCoords = COORDS[destination];
  const distanceKm = distanceKmBetween(origin, destination);
  const candidates = MICRO_GIGS.filter((gig) => {
    const gigCoords = COORDS[gig.location];
    return gigCoords && isGigOnRoute(startCoords, destinationCoords, gigCoords);
  });
  const visible =
    distanceKm >= 0.85 &&
    conditions.weather !== "RAIN LIKELY" &&
    candidates.length > 0;

  if (!visible) {
    return { visible: false };
  }

  const gig = pickDeterministicItem(candidates, conditions.seed, 3);
  return {
    visible: true,
    title: gig.title,
    location: gig.location,
    reward: 20 + ((conditions.seed >> 5) % 4) * 10,
    impactMinutes: 2 + ((conditions.seed >> 7) % 4),
  };
};

export const buildEventSuggestion = (destination, now) => {
  const seed = hashString(
    `${destination}|event|${sameMinuteBucket(now).toISOString()}`,
  );
  let event = pickDeterministicItem(EVENTS, seed);
  if (event.location === destination) {
    event = pickDeterministicItem(EVENTS, seed, 1);
  }

  return {
    ...event,
    offsetMinutes: 60 + (seed % 6) * 30,
  };
};
