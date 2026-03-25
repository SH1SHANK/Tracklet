import {
  AUTOPOOL_MOCK_OFFERS,
  COORDS,
  DESTINATIONS,
  EVENTS,
  MICRO_GIGS,
  MODE_COSTS,
  MODES,
  RATIONALES,
  RELIABILITY_PEAK_HOURS,
  SPEEDS,
  START_LOCATIONS,
  clamp,
  distanceKmBetween,
  formatRange,
  formatTime,
  normalizeDestination,
  normalizeOrigin,
} from "./data.js";

const HISTORY_KEY = "tracklet-history";
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=11.3218&longitude=75.9349&hourly=precipitation_probability&forecast_days=1&timezone=Asia%2FKolkata";

const byId = (id) => document.getElementById(id);

const elements = {
  plannerCard: byId("planner-card"),
  originSelect: byId("origin-select"),
  originSelectText: byId("origin-select-text"),
  originMenu: byId("origin-menu"),
  originOptions: byId("origin-options"),
  destinationSelect: byId("destination-select"),
  destinationSelectText: byId("destination-select-text"),
  destinationMenu: byId("destination-menu"),
  destinationOptions: byId("destination-options"),
  goButton: byId("go-button"),
  liveClock: byId("live-clock"),
  destLabel: byId("dest-label"),
  historyStrip: byId("history-strip"),
  historyChips: byId("history-chips"),
  decisionCard: byId("decision-card"),
  decisionMode: byId("decision-mode"),
  arrivalSummary: byId("arrival-summary"),
  spareTimeBadge: byId("spare-time-badge"),
  riskRationale: byId("risk-rationale"),
  delayChipText: byId("delay-chip-text"),
  weatherChipText: byId("weather-chip-text"),
  optionsHeading: byId("options-heading"),
  optionsGrid: byId("options-grid"),
  modeDetail: byId("mode-detail"),
  busSection: byId("bus-section"),
  busFeedNote: byId("bus-feed-note"),
  busRouteName: byId("bus-route-name"),
  busStatusBadge: byId("bus-status-badge"),
  busStopName: byId("bus-stop-name"),
  busMeta: byId("bus-meta"),
  busArrival: byId("bus-arrival"),
  busLastUpdated: byId("bus-last-updated"),
  busReliability: byId("bus-reliability"),
  busCrowd: byId("bus-crowd"),
  autopoolSection: byId("autopool-section"),
  autopoolHeading: byId("autopool-heading"),
  autopoolNote: byId("autopool-note"),
  autopoolStatusBadge: byId("autopool-status-badge"),
  autopoolSummary: byId("autopool-summary"),
  autopoolOfferList: byId("autopool-offer-list"),
  gigSection: byId("gig-section"),
  gigRouteLine: byId("gig-route-line"),
  gigNote: byId("gig-note"),
  gigCarousel: byId("gig-carousel"),
  eventSection: byId("event-section"),
  eventCarousel: byId("event-carousel"),
  eventRouteLine: byId("event-route-line"),
  secondaryDivider: byId("secondary-divider"),
  secondaryZone: byId("secondary-zone"),
  themeToggle: byId("theme-toggle"),
};

elements.optionCards = Array.from(
  elements.optionsGrid?.querySelectorAll("[data-mode]") || [],
);
elements.optionMap = elements.optionCards.reduce((map, card) => {
  const mode = card.getAttribute("data-mode");
  if (mode) {
    map[mode] = card;
  }
  return map;
}, {});
elements.confidenceSegments = Array.from(
  elements.decisionCard?.querySelectorAll(".confidence-segment") || [],
);

const timeLabelMap = {
  WALK: byId("time-walk"),
  BUS: byId("time-bus"),
  POOL: byId("time-pool"),
  AUTO: byId("time-auto"),
};

const reliabilityFillMap = {
  WALK: byId("reliability-walk"),
  BUS: byId("reliability-bus"),
  POOL: byId("reliability-pool"),
  AUTO: byId("reliability-auto"),
};

const recBadgeMap = {
  WALK: byId("rec-badge-walk"),
  BUS: byId("rec-badge-bus"),
  POOL: byId("rec-badge-pool"),
  AUTO: byId("rec-badge-auto"),
};

const selectedClasses = [
  "bg-black",
  "text-white",
  "dark:bg-white",
  "dark:text-black",
  "opacity-100",
];
const unselectedClasses = [
  "bg-white",
  "dark:bg-neo-card-dark",
  "text-black",
  "dark:text-white",
  "opacity-75",
];
const reliabilityWidthClasses = [
  "reliability-width-1",
  "reliability-width-2",
  "reliability-width-3",
  "reliability-width-4",
  "reliability-width-5",
];
const reliabilityColorClasses = ["bg-green-500", "bg-yellow-400", "bg-red-500"];

let currentState = null;
let latestWeatherProbability = null;
let loadingTimer = null;
let liveClockIntervalId = null;
let isLoading = false;
let mockBusTick = 0;
let mockBusIntervalId = null;
let openDropdownKey = null;

const plannerDropdowns = {
  origin: {
    trigger: elements.originSelect,
    text: elements.originSelectText,
    menu: elements.originMenu,
    list: elements.originOptions,
    items: START_LOCATIONS,
    normalize: normalizeOrigin,
  },
  destination: {
    trigger: elements.destinationSelect,
    text: elements.destinationSelectText,
    menu: elements.destinationMenu,
    list: elements.destinationOptions,
    items: DESTINATIONS,
    normalize: normalizeDestination,
  },
};

const readHistory = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeHistory = (destination) => {
  const nextHistory = readHistory()
    .filter((item) => item !== destination)
    .slice(0, 4);
  nextHistory.unshift(destination);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory.slice(0, 5)));
  return nextHistory.slice(0, 5);
};

const getDropdownOptionElements = (key) =>
  Array.from(
    plannerDropdowns[key]?.list?.querySelectorAll("[data-dropdown-value]") || [],
  );

const setDropdownValue = (key, value) => {
  const config = plannerDropdowns[key];
  if (!config?.trigger || !config.text) return;

  const normalized = config.normalize(value);
  config.trigger.value = normalized;
  config.text.textContent = normalized;

  getDropdownOptionElements(key).forEach((option) => {
    const selected = option.dataset.dropdownValue === normalized;
    option.classList.toggle("bg-primary", selected);
    option.classList.toggle("font-bold", selected);
    option.classList.toggle("bg-white", !selected);
    option.classList.toggle("text-black", !selected);
    option.classList.toggle("dark:bg-neo-card-dark", !selected);
    option.classList.toggle("dark:text-white", !selected);
    option.classList.toggle("dark:bg-primary", selected);
    option.classList.toggle("dark:text-black", selected);
    option.setAttribute("aria-selected", selected ? "true" : "false");
  });
};

const setDropdownOpen = (key, open) => {
  const config = plannerDropdowns[key];
  if (!config?.trigger || !config.menu) return;

  config.menu.classList.toggle("hidden", !open);
  config.trigger.setAttribute("aria-expanded", open ? "true" : "false");
  config.trigger.classList.toggle("border-primary", open);
  config.trigger.classList.toggle("dark:border-primary", open);

  if (open) {
    openDropdownKey = key;
  } else if (openDropdownKey === key) {
    openDropdownKey = null;
  }
};

const closeAllDropdowns = (exceptKey = null) => {
  Object.keys(plannerDropdowns).forEach((key) => {
    if (key !== exceptKey) {
      setDropdownOpen(key, false);
    }
  });
};

const focusDropdownOption = (key, index) => {
  const options = getDropdownOptionElements(key);
  if (!options.length) return;
  const boundedIndex = Math.max(0, Math.min(index, options.length - 1));
  options[boundedIndex].focus();
};

const readTheme = () =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

const pulse = (element) => {
  if (!element) return;
  element.classList.remove("pulse-update");
  void element.offsetWidth;
  element.classList.add("pulse-update");
};

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
  return (
    score.minutes + costWeight + reliabilityWeight + rainPenalty + peakPenalty
  );
};

const confidenceLabel = (reliability) => {
  if (reliability >= 0.84) return "HIGH";
  if (reliability >= 0.68) return "MODERATE";
  return "LOW";
};

const riskRationale = (mode, routeScores, conditions = {}) => {
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
    if (routeScores.BUS.minutes <= routeScores.WALK.minutes - 3) {
      return rationaleSet.fast;
    }
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
  if (routeScores.AUTO.minutes <= routeScores.BUS.minutes) {
    return rationaleSet.direct;
  }
  return rationaleSet.fallback;
};

const recommend = (routeScores, conditions = {}) => {
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

const scoreRoutes = (origin, destination, conditions = {}) => {
  const distanceKm =
    conditions.distanceKm ?? distanceKmBetween(origin, destination);
  const isPeakHour = conditions.peakState
    ? conditions.peakState === "PEAK"
    : RELIABILITY_PEAK_HOURS.includes(
        conditions.hourOfDay ?? new Date().getHours(),
      );
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
    0.84 -
      roadTraffic * 0.12 -
      crowdLevel * 0.08 +
      (distanceKm > 1.2 ? 0.03 : 0),
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

const toRad = (value) => (value * Math.PI) / 180;

const isGigOnRoute = (startCoords, destCoords, gigCoords) => {
  const proximityKm = 0.18;
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

const hashString = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed) => {
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

const buildSimulationContext = (
  origin,
  destination,
  now,
  weatherOverride,
) => {
  const timestamp = sameMinuteBucket(now);
  const timeBucket = timestamp.toISOString();
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

const buildAutopoolOffer = ({ origin, destination, conditions, routeScores }) => {
  const distanceKm = distanceKmBetween(origin, destination);
  const roadModesViable = ["BUS", "POOL", "AUTO"].some(
    (mode) => routeScores[mode].reliability >= 0.62,
  );
  const hasLiveOffers =
    distanceKm >= 1.2 &&
    roadModesViable &&
    (routeScores.POOL.reliability >= 0.68 ||
      routeScores.AUTO.reliability >= 0.72);

  const offerCount = hasLiveOffers ? 1 + ((conditions.seed >> 8) % 2) : 0;
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

  return {
    visible: true,
    hasLiveOffers,
    offers,
  };
};

const buildNearestBusInfo = ({
  origin,
  destination,
  conditions,
  routeScores,
  referenceTime = new Date(),
  tick = 0,
}) => {
  const routeNames = ["Bus 1", "Bus 2", "Bus 3", "Bus 4"];
  const stopCandidates = [
    `${origin} Stop`,
    `${destination} Stop`,
    "Main Gate Stop",
    "Main Building Portico",
    "Library Junction",
    "SAC Signal",
    "Nalanda Stop",
    "Mega Hostel Gate",
  ];
  const crowdLabels = ["low crowd", "steady crowd", "busy bus", "standing room"];
  const routeName = pickDeterministicItem(routeNames, conditions.seed, 2);
  const stopName = pickDeterministicItem(stopCandidates, conditions.seed, 5);
  const stage = tick % 5;
  const etaSequence = [
    Math.max(6, routeScores.BUS.minutes - 1),
    Math.max(4, routeScores.BUS.minutes - 2),
    Math.max(2, routeScores.BUS.minutes - 4),
    1,
    Math.max(5, routeScores.BUS.minutes),
  ];
  const statusSequence = [
    "On route",
    "Arriving",
    "Arriving",
    "Boarding",
    "Departed",
  ];
  const etaMinutes = etaSequence[stage];
  const seatsFree = Math.max(
    0,
    14 - (((conditions.seed >> 6) + tick * 2) % 11),
  );
  const crowdLabel = crowdLabels[(conditions.seed + tick) % crowdLabels.length];
  const status = statusSequence[stage];
  const delayChanceLabels = ["very low", "low", "moderate", "moderate"];
  const delayChance = delayChanceLabels[(conditions.seed + tick) % delayChanceLabels.length];
  const reliabilityLabel =
    conditions.peakState === "PEAK"
      ? "Usually steady for this hour"
      : "Usually on time this hour";
  const crowdStatus =
    seatsFree <= 2
      ? "Crowded"
      : seatsFree <= 5
        ? "Busy"
        : seatsFree <= 8
          ? "Steady"
          : "Plenty of seats";
  const arrivalStart = new Date(referenceTime.getTime() + etaMinutes * 60000);
  const arrivalEnd = new Date(
    arrivalStart.getTime() + (status === "Boarding" ? 1 : 2) * 60000,
  );

  return {
    visible: true,
    routeName,
    stopName,
    etaMinutes,
    seatsFree,
    crowdLabel,
    status,
    delayChance,
    reliabilityLabel,
    crowdStatus,
    arrivalWindow: formatRange(arrivalStart, arrivalEnd),
    mockUpdatedLabel: stage === 4 ? "Updated a moment ago" : "Updated just now",
  };
};

const buildGigOpportunity = ({ origin, destination, conditions }) => {
  const startCoords = COORDS[origin];
  const destinationCoords = COORDS[destination];
  const routeCandidates = MICRO_GIGS.filter((gig) => {
    const gigCoords = COORDS[gig.location];
    return gigCoords && isGigOnRoute(startCoords, destinationCoords, gigCoords);
  });
  const candidates = routeCandidates.length ? routeCandidates : MICRO_GIGS;

  const rewardSequence = [10, 20, 20, 30];
  const uniqueOffers = [];
  for (let index = 0; index < candidates.length && uniqueOffers.length < 4; index += 1) {
    const gig = pickDeterministicItem(candidates, conditions.seed, 3 + index);
    if (!uniqueOffers.some((item) => item.title === gig.title)) {
      uniqueOffers.push(gig);
    }
  }
  const offers = uniqueOffers.slice(0, 4).map((gig, index) => ({
    title: gig.title,
    location: gig.location,
    reward: rewardSequence[index % rewardSequence.length],
    impactMinutes: 1 + ((conditions.seed >> (7 + index)) % 4),
  }));
  const lead = offers[0];

  return {
    visible: offers.length > 0,
    routeAware: routeCandidates.length > 0,
    offers,
    title: lead.title,
    location: lead.location,
    reward: lead.reward,
    impactMinutes: lead.impactMinutes,
  };
};

const buildEventSuggestion = (origin, destination, now) => {
  const seed = hashString(
    `${origin}|${destination}|event|${sameMinuteBucket(now).toISOString()}`,
  );
  const startCoords = COORDS[origin];
  const destinationCoords = COORDS[destination];
  const routeEvents = EVENTS.filter((event) => {
    const eventCoords = COORDS[event.location];
    return (
      event.location !== destination &&
      eventCoords &&
      isGigOnRoute(startCoords, destinationCoords, eventCoords)
    );
  });
  const fallbackEvents = EVENTS.filter((event) => event.location !== destination);
  const source = routeEvents.length ? routeEvents : fallbackEvents;
  const uniqueEvents = [];
  for (let index = 0; index < source.length && uniqueEvents.length < 3; index += 1) {
    const event = pickDeterministicItem(source, seed, index);
    if (!uniqueEvents.some((item) => item.name === event.name)) {
      uniqueEvents.push(event);
    }
  }
  const offers = uniqueEvents.map((event, index) => ({
    ...event,
    onRoute: routeEvents.length > 0,
    offsetMinutes: 40 + ((seed >> index) % 5) * 20,
  }));
  const lead = offers[0];

  return {
    ...lead,
    offers,
  };
};

const minutesUntilNextHour = (date) => {
  const nextHour = new Date(date);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return Math.round((nextHour - date) / 60000);
};

const buildAppState = (inputs = {}, previousState = null) => {
  const now = inputs.now ? new Date(inputs.now) : new Date();
  const start = normalizeOrigin(inputs.start ?? previousState?.start);
  const destination = normalizeDestination(
    inputs.destination ?? previousState?.destination,
  );
  const history = Array.isArray(inputs.history)
    ? inputs.history
    : previousState?.history ?? [];
  const theme = inputs.theme ?? previousState?.theme ?? "light";

  const distanceKm = distanceKmBetween(start, destination);
  const conditions = {
    ...buildSimulationContext(start, destination, now, inputs.weatherOverride),
    distanceKm,
    hourOfDay: now.getHours(),
  };
  const routeScores = scoreRoutes(start, destination, conditions);
  const recommendation = recommend(routeScores, conditions);
  const recommended = recommendation.mode;

  const preserveSelection =
    previousState &&
    previousState.start === start &&
    previousState.destination === destination;
  const selectedMode =
    inputs.selectedMode && routeScores[inputs.selectedMode]
      ? inputs.selectedMode
      : preserveSelection && routeScores[previousState.selectedMode]
        ? previousState.selectedMode
        : recommended;

  const mainScore = routeScores[recommended];
  const etaStart = new Date(
    now.getTime() + (conditions.leaveWithin + mainScore.minutes) * 60000,
  );
  const etaEnd = new Date(etaStart.getTime() + conditions.etaSpread * 60000);
  const spareMinutes = Math.max(
    0,
    minutesUntilNextHour(now) - conditions.leaveWithin - mainScore.minutes,
  );

  const autopool = buildAutopoolOffer({
    origin: start,
    destination,
    conditions,
    routeScores,
  });
  const bus = buildNearestBusInfo({
    origin: start,
    destination,
    conditions,
    routeScores,
    referenceTime: now,
    tick: mockBusTick,
  });
  const gig = buildGigOpportunity({ origin: start, destination, conditions });

  const eventSeed = buildEventSuggestion(start, destination, now);
  const eventOffers = eventSeed.offers.map((event) => {
    const eventStart = new Date(now.getTime() + event.offsetMinutes * 60000);
    const eventDistanceKm = distanceKmBetween(destination, event.location);
    const eventConditions = {
      ...buildSimulationContext(
        destination,
        event.location,
        eventStart,
        inputs.weatherOverride,
      ),
      distanceKm: eventDistanceKm,
      hourOfDay: eventStart.getHours(),
    };
    const eventRouteScores = scoreRoutes(
      destination,
      event.location,
      eventConditions,
    );
    const eventRecommendation = recommend(eventRouteScores, eventConditions);

    return {
      name: event.name,
      location: event.location,
      label: event.label,
      onRoute: event.onRoute,
      startsAt: eventStart.toISOString(),
      distanceKm: eventDistanceKm,
      recommendedMode: eventRecommendation.mode,
      minutes: eventRouteScores[eventRecommendation.mode].minutes,
    };
  });
  const leadEvent = eventOffers[0];

  return {
    start,
    destination,
    history,
    theme,
    generatedAt: now.toISOString(),
    conditions,
    routeScores,
    recommendation,
    recommended,
    selectedMode,
    mainTrip: {
      distanceKm,
      leaveWithin: conditions.leaveWithin,
      etaStart: etaStart.toISOString(),
      etaEnd: etaEnd.toISOString(),
      spareMinutes,
      delayRisk: mainScore.delayRisk,
    },
    bus,
    autopool,
    gig,
    event: {
      visible: eventOffers.length > 0,
      destination,
      offers: eventOffers,
      name: leadEvent?.name,
      location: leadEvent?.location,
      label: leadEvent?.label,
      onRoute: leadEvent?.onRoute,
      startsAt: leadEvent?.startsAt,
      distanceKm: leadEvent?.distanceKm,
      recommendedMode: leadEvent?.recommendedMode,
      minutes: leadEvent?.minutes,
    },
  };
};

const populatePlannerSelects = () => {
  Object.entries(plannerDropdowns).forEach(([key, config]) => {
    if (!config.list || config.list.children.length) return;

    config.items.forEach((location) => {
      const option = document.createElement("button");
      option.type = "button";
      option.dataset.dropdownValue = location;
      option.setAttribute("role", "option");
      option.className =
        "pressable w-full border-b border-black/15 bg-white px-3 py-2.5 text-left font-mono text-[10px] uppercase leading-snug text-black dark:border-white/15 dark:bg-neo-card-dark dark:text-white";
      option.textContent = location;
      config.list.appendChild(option);
    });

    setDropdownValue(key, config.items[0]);
  });
};

const setLoadingState = (value) => {
  isLoading = value;
  const targets = [
    elements.plannerCard,
    elements.decisionCard,
    ...elements.optionCards,
  ];
  if (!elements.autopoolSection?.classList.contains("hidden")) {
    targets.push(elements.autopoolSection);
  }
  if (!elements.gigSection?.classList.contains("hidden")) {
    targets.push(elements.gigSection);
  }
  if (!elements.eventSection?.classList.contains("hidden")) {
    targets.push(elements.eventSection);
  }
  targets.forEach((target) => target?.classList.toggle("skeleton", value));
};

const updateLiveClock = (date = new Date()) => {
  if (elements.liveClock) {
    elements.liveClock.textContent = formatTime(date);
  }
};

const setSpareBadge = (spareMinutes) => {
  if (!elements.spareTimeBadge) return;
  elements.spareTimeBadge.classList.remove(
    "bg-green-400",
    "bg-secondary",
    "bg-red-400",
  );

  if (spareMinutes <= 0) {
    elements.spareTimeBadge.textContent = "Tight";
    elements.spareTimeBadge.classList.add("bg-red-400");
    return;
  }

  elements.spareTimeBadge.textContent = `${spareMinutes} min spare`;
  elements.spareTimeBadge.classList.add(
    spareMinutes <= 5 ? "bg-secondary" : "bg-green-400",
  );
};

const setConfidenceSegments = (confidence) => {
  const filled = confidence === "HIGH" ? 5 : confidence === "MODERATE" ? 3 : 1;
  elements.confidenceSegments.forEach((segment, index) => {
    segment.classList.toggle("bg-black", index < filled);
    segment.classList.toggle("bg-primary/40", index >= filled);
  });
};

const updateReliabilityFill = (mode, reliability) => {
  const fill = reliabilityFillMap[mode];
  if (!fill) return;

  fill.classList.remove(...reliabilityWidthClasses, ...reliabilityColorClasses);
  const level =
    reliability >= 0.9
      ? 5
      : reliability >= 0.8
        ? 4
        : reliability >= 0.68
          ? 3
          : reliability >= 0.56
            ? 2
            : 1;

  fill.classList.add(`reliability-width-${level}`);
  fill.classList.add(
    reliability >= 0.8
      ? "bg-green-500"
      : reliability >= 0.6
        ? "bg-yellow-400"
        : "bg-red-500",
  );
};

const updateOptionCard = (card, selected) => {
  if (!card) return;
  card.classList.remove(...selectedClasses, ...unselectedClasses);
  card.classList.add(...(selected ? selectedClasses : unselectedClasses));
  card.setAttribute("aria-checked", selected ? "true" : "false");
  card.tabIndex = selected ? 0 : -1;
};

const renderHistory = (state) => {
  if (!elements.historyStrip || !elements.historyChips) return;

  elements.historyChips.innerHTML = "";
  if (!state.history.length) {
    elements.historyStrip.classList.add("hidden");
    return;
  }

  elements.historyStrip.classList.remove("hidden");
  state.history.slice(0, 3).forEach((destination) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.historyDestination = destination;
    button.className =
      "pressable border-2 border-black bg-white px-3 py-1 font-mono text-[10px] uppercase text-black shadow-neo-sm dark:border-white dark:bg-neo-card-dark dark:text-white";
    button.textContent = destination;
    elements.historyChips.appendChild(button);
  });
};

const renderPlanner = (state) => {
  if (elements.originSelect && elements.originSelect.value !== state.start) {
    setDropdownValue("origin", state.start);
  }
  if (
    elements.destinationSelect &&
    document.activeElement !== elements.destinationSelect &&
    elements.destinationSelect.value !== state.destination
  ) {
    setDropdownValue("destination", state.destination);
  }
  if (elements.destLabel) {
    elements.destLabel.textContent = `${state.start} to ${state.destination}`;
  }
  renderHistory(state);
};

const renderDecision = (state) => {
  if (elements.decisionMode) {
    elements.decisionMode.textContent = state.recommended;
  }
  if (elements.arrivalSummary) {
    elements.arrivalSummary.textContent = `${state.mainTrip.distanceKm.toFixed(
      1,
    )} km | ETA ${formatRange(
      state.mainTrip.etaStart,
      state.mainTrip.etaEnd,
    )} | leave within ${state.mainTrip.leaveWithin} min`;
  }
  if (elements.riskRationale) {
    elements.riskRationale.textContent = state.recommendation.rationale;
  }
  if (elements.delayChipText) {
    elements.delayChipText.textContent = `Delay risk: ${state.mainTrip.delayRisk.toLowerCase()}`;
  }
  if (elements.weatherChipText) {
    const source =
      state.conditions.weatherSource === "live" ? "live" : "simulated";
    elements.weatherChipText.textContent = `Weather: ${state.conditions.weather.toLowerCase()} (${source})`;
  }
  setSpareBadge(state.mainTrip.spareMinutes);
  setConfidenceSegments(state.recommendation.confidence);
  pulse(elements.decisionCard);
};

const renderOptions = (state) => {
  if (elements.optionsHeading) {
    elements.optionsHeading.textContent = `Options to ${state.destination}`;
  }

  MODES.forEach((mode) => {
    const score = state.routeScores[mode];
    const card = elements.optionMap[mode];
    const badge = recBadgeMap[mode];
    const selected = state.selectedMode === mode;

    if (timeLabelMap[mode]) {
      timeLabelMap[mode].textContent = `${score.minutes} min`;
    }
    updateReliabilityFill(mode, score.reliability);
    updateOptionCard(card, selected);
    if (badge) {
      badge.classList.toggle("hidden", state.recommended !== mode);
    }
  });

  if (elements.modeDetail) {
    const selectedScore = state.routeScores[state.selectedMode];
    elements.modeDetail.textContent = `${state.selectedMode} | ${selectedScore.minutes} min | reliability ${confidenceLabel(
      selectedScore.reliability,
    ).toLowerCase()} | delay ${selectedScore.delayRisk.toLowerCase()}`;
    elements.modeDetail.classList.remove("hidden");
  }

  pulse(elements.optionsGrid);
};

const renderBus = (state) => {
  if (!elements.busSection || !state.bus) return;
  elements.busSection.classList.toggle("hidden", !state.bus.visible);
  if (!state.bus.visible) return;

  if (elements.busFeedNote) {
    elements.busFeedNote.textContent = state.bus.reliabilityLabel;
  }
  if (elements.busRouteName) {
    elements.busRouteName.textContent = state.bus.routeName;
  }
  if (elements.busStatusBadge) {
    elements.busStatusBadge.textContent = state.bus.status;
    elements.busStatusBadge.classList.remove(
      "bg-primary",
      "bg-secondary",
      "bg-tertiary",
    );
    elements.busStatusBadge.classList.add(
      state.bus.status === "Boarding"
        ? "bg-tertiary"
        : state.bus.status === "Arriving"
          ? "bg-primary"
          : "bg-secondary",
    );
  }
  if (elements.busStopName) {
    elements.busStopName.textContent = state.bus.stopName;
  }
  if (elements.busMeta) {
    elements.busMeta.textContent = `Delay chance ${state.bus.delayChance}`;
  }
  if (elements.busArrival) {
    elements.busArrival.textContent = state.bus.arrivalWindow;
  }
  if (elements.busLastUpdated) {
    elements.busLastUpdated.textContent = state.bus.mockUpdatedLabel;
  }
  if (elements.busReliability) {
    elements.busReliability.textContent = state.bus.reliabilityLabel;
  }
  if (elements.busCrowd) {
    elements.busCrowd.textContent = `${state.bus.crowdStatus} | ${state.bus.crowdLabel}`;
  }

  pulse(elements.busSection);
};

const renderAutopool = (state) => {
  if (!elements.autopoolSection) return;
  elements.autopoolSection.classList.toggle("hidden", !state.autopool.visible);
  if (!state.autopool.visible) return;

  if (elements.autopoolHeading) {
    elements.autopoolHeading.textContent = "Pooling";
  }
  if (elements.autopoolNote) {
    elements.autopoolNote.textContent = `Nearby rides around ${state.destination}`;
  }
  if (elements.autopoolStatusBadge) {
    const count = state.autopool.offers.length;
    elements.autopoolStatusBadge.textContent = count
      ? `${count} ${count === 1 ? "ride" : "rides"} live`
      : "Start one";
    elements.autopoolStatusBadge.classList.remove("bg-primary", "bg-secondary");
    elements.autopoolStatusBadge.classList.add(count ? "bg-primary" : "bg-secondary");
  }
  if (elements.autopoolSummary) {
    elements.autopoolSummary.textContent = state.autopool.offers.length
      ? `See active pools on this route or add your own ride to pick up others.`
      : `No pools nearby right now. Add your own ride with pickup, seats, and ETA.`;
  }
  if (elements.autopoolOfferList) {
    elements.autopoolOfferList.innerHTML = "";

    state.autopool.offers.forEach((offer) => {
      const card = document.createElement("article");
      card.className =
        "w-[210px] shrink-0 snap-start rounded-xl border-2 border-black bg-[#FFF9EF] p-3 dark:border-white dark:bg-[#1f1f1f]";
      card.innerHTML = `
        <p class="font-display text-lg uppercase leading-none">${offer.driverName}</p>
        <p class="mt-1 font-mono text-[9px] uppercase text-gray-600 dark:text-gray-400">${offer.driverLabel}</p>
        <p class="mt-3 font-mono text-[10px] uppercase text-black dark:text-white">${offer.vehicle} | ${offer.seats} seats</p>
        <p class="mt-1 font-mono text-[9px] uppercase text-gray-600 dark:text-gray-400">Pickup in ${offer.etaMinutes} min at ${offer.pickupPoint}</p>
        <p class="mt-1 font-mono text-[9px] uppercase text-gray-600 dark:text-gray-400">Adds about ${offer.impactMinutes} min</p>
        <button type="button" class="pressable mt-3 border-2 border-black bg-black px-3 py-2 font-mono text-[10px] font-bold uppercase text-white shadow-neo-sm dark:border-white dark:bg-white dark:text-black">Join pool</button>
      `;
      elements.autopoolOfferList.appendChild(card);
    });

    const addCard = document.createElement("button");
    addCard.type = "button";
    addCard.className =
      "pressable w-[210px] shrink-0 snap-start rounded-xl border-2 border-dashed border-black bg-white p-3 text-left dark:border-white dark:bg-[#1f1f1f]";
    addCard.innerHTML = `
      <p class="font-display text-lg uppercase leading-none">Add your ride</p>
      <p class="mt-1 font-mono text-[9px] uppercase text-gray-600 dark:text-gray-400">Create a pool on this route</p>
      <p class="mt-3 font-mono text-[10px] uppercase text-black dark:text-white">Set pickup, seats and ETA</p>
    `;
    elements.autopoolOfferList.appendChild(addCard);
  }

  pulse(elements.autopoolSection);
};

const renderGig = (state) => {
  if (!elements.gigSection) return;
  elements.gigSection.classList.toggle("hidden", !state.gig.visible);
  if (!state.gig.visible) return;

  if (elements.gigNote) {
    elements.gigNote.textContent = `Quick tasks on the way to ${state.destination}`;
  }
  if (elements.gigRouteLine) {
    elements.gigRouteLine.textContent = `On the way to your ${state.destination}`;
  }
  if (elements.gigCarousel) {
    elements.gigCarousel.innerHTML = "";
    state.gig.offers.forEach((offer) => {
      const card = document.createElement("article");
      card.className =
        "w-[220px] shrink-0 snap-start rounded-xl border-2 border-black bg-white p-3 text-black shadow-neo-sm dark:border-white dark:bg-[#2a2a2a] dark:text-white";
      card.innerHTML = `
        <p class="font-display text-lg uppercase leading-none">${offer.title}</p>
        <p class="mt-2 font-mono text-[9px] uppercase text-gray-600 dark:text-gray-400">${offer.location}</p>
        <div class="mt-3 flex items-center justify-between gap-3">
          <span class="border-2 border-black bg-primary px-2 py-1 font-mono text-[10px] font-bold uppercase text-black">₹${offer.reward}</span>
          <span class="font-mono text-[9px] uppercase text-gray-700 dark:text-gray-400">adds ${offer.impactMinutes} min</span>
        </div>
        <button type="button" class="pressable mt-3 w-full border-2 border-black bg-black px-3 py-2 font-mono text-[10px] font-bold uppercase text-white shadow-neo-sm dark:border-white dark:bg-white dark:text-black">Take task</button>
      `;
      elements.gigCarousel.appendChild(card);
    });
  }

  pulse(elements.gigSection);
};

const renderEvent = (state) => {
  if (!elements.eventSection) return;
  elements.eventSection.classList.toggle("hidden", !state.event.visible);
  if (!state.event.visible) return;

  if (elements.eventRouteLine) {
    elements.eventRouteLine.textContent = `On the way to your ${state.destination}`;
  }
  if (elements.eventCarousel) {
    elements.eventCarousel.innerHTML = "";

    state.event.offers.forEach((offer) => {
      const card = document.createElement("article");
      card.className =
        "w-[250px] shrink-0 snap-start rounded-xl border-2 border-black bg-[#FFF9EF] p-3 text-black shadow-neo-sm dark:border-white dark:bg-[#1f1f1f] dark:text-white";

      const routeText = offer.onRoute
        ? `This stop lines up with your route to ${state.destination}.`
        : `This stop stays close to your route to ${state.destination}.`;
      const metaText = `${offer.location} | ${formatTime(offer.startsAt)} | ${offer.distanceKm.toFixed(
        1,
      )} km from ${state.destination}`;

      card.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-display text-xl uppercase leading-none">${offer.name}</p>
            <p class="mt-2 font-mono text-[9px] uppercase leading-snug text-gray-600 dark:text-gray-400">${metaText}</p>
          </div>
          <span class="shrink-0 border-2 border-black bg-primary px-2 py-1 font-mono text-[9px] font-bold uppercase text-black shadow-neo-sm">${offer.label}</span>
        </div>
        <p class="mt-3 bg-black px-3 py-2 font-mono text-[10px] font-bold uppercase leading-snug text-white dark:bg-white dark:text-black">Best stop: ${offer.recommendedMode} | ${offer.minutes} min from your route</p>
        <p class="mt-3 font-mono text-[9px] uppercase leading-snug text-gray-700 dark:text-gray-400">${routeText}</p>
        <button type="button" class="pressable mt-3 w-full border-2 border-black bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase text-black shadow-neo-sm dark:border-white dark:bg-neo-card-dark dark:text-white">View route</button>
      `;

      elements.eventCarousel.appendChild(card);
    });
  }

  pulse(elements.eventSection);
};

const renderSecondaryVisibility = (state) => {
  const anyVisible =
    Boolean(state.bus?.visible) ||
    Boolean(state.autopool.visible) ||
    Boolean(state.gig.visible) ||
    Boolean(state.event.visible);
  elements.secondaryDivider?.classList.toggle("hidden", !anyVisible);
  elements.secondaryZone?.classList.toggle("hidden", !anyVisible);
};

const renderFull = () => {
  if (!currentState) return;
  renderPlanner(currentState);
  updateLiveClock(new Date());
  renderDecision(currentState);
  renderOptions(currentState);
  renderBus(currentState);
  renderAutopool(currentState);
  renderGig(currentState);
  renderEvent(currentState);
  renderSecondaryVisibility(currentState);
};

const rebuildState = (overrides = {}, previousState = currentState) => {
  currentState = buildAppState(
    {
      start: overrides.start ?? previousState?.start ?? START_LOCATIONS[0],
      destination:
        overrides.destination ??
        elements.destinationSelect?.value ??
        previousState?.destination ??
        DESTINATIONS[0],
      selectedMode: overrides.selectedMode,
      history: overrides.history ?? readHistory(),
      theme: readTheme(),
      weatherOverride: latestWeatherProbability,
    },
    previousState,
  );
  renderFull();
};

const commitRoute = (overrides = {}) => {
  if (loadingTimer) {
    window.clearTimeout(loadingTimer);
  }
  setLoadingState(true);

  loadingTimer = window.setTimeout(() => {
    const preview = buildAppState(
      {
        start:
          overrides.start ??
          elements.originSelect?.value ??
          currentState?.start ??
          START_LOCATIONS[0],
        destination:
          overrides.destination ??
          elements.destinationSelect?.value ??
          currentState?.destination ??
          DESTINATIONS[0],
        history: readHistory(),
        theme: readTheme(),
        weatherOverride: latestWeatherProbability,
      },
      currentState,
    );
    const history = writeHistory(preview.destination);
    currentState = buildAppState(
      {
        start: preview.start,
        destination: preview.destination,
        history,
        theme: readTheme(),
        weatherOverride: latestWeatherProbability,
      },
      currentState,
    );
    renderFull();
    setLoadingState(false);
  }, 320);
};

const selectMode = (mode) => {
  if (!MODES.includes(mode) || !currentState) return;
  currentState = buildAppState(
    {
      start: currentState.start,
      destination: currentState.destination,
      selectedMode: mode,
      history: currentState.history,
      theme: readTheme(),
      weatherOverride: latestWeatherProbability,
    },
    currentState,
  );
  renderFull();
};

const refreshCurrentRoute = () => {
  if (!currentState || isLoading) {
    updateLiveClock(new Date());
    return;
  }
  rebuildState(
    {
      start: currentState.start,
      destination: currentState.destination,
      selectedMode: currentState.selectedMode,
      history: readHistory(),
    },
    currentState,
  );
};

const refreshMockBusFeed = () => {
  if (!currentState || isLoading) return;
  mockBusTick += 1;
  currentState = {
    ...currentState,
    bus: buildNearestBusInfo({
      origin: currentState.start,
      destination: currentState.destination,
      conditions: currentState.conditions,
      routeScores: currentState.routeScores,
      referenceTime: new Date(),
      tick: mockBusTick,
    }),
  };
  renderBus(currentState);
};

const fetchWeather = async () => {
  try {
    const response = await fetch(WEATHER_URL);
    const payload = await response.json();
    const hour = new Date().getHours();
    const probability = payload?.hourly?.precipitation_probability?.[hour];
    return typeof probability === "number" ? probability : null;
  } catch {
    return null;
  }
};

const setupInteractions = () => {
  elements.goButton?.addEventListener("click", () => {
    closeAllDropdowns();
    commitRoute();
  });

  elements.historyChips?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("[data-history-destination]");
    if (!(button instanceof HTMLElement)) return;
    const destination = normalizeDestination(button.dataset.historyDestination);
    if (!destination || !elements.destinationSelect) return;
    setDropdownValue("destination", destination);
    commitRoute({ destination });
  });

  Object.entries(plannerDropdowns).forEach(([key, config]) => {
    config.trigger?.addEventListener("click", () => {
      const nextOpen = config.trigger.getAttribute("aria-expanded") !== "true";
      closeAllDropdowns(key);
      setDropdownOpen(key, nextOpen);
    });

    config.trigger?.addEventListener("keydown", (event) => {
      const options = getDropdownOptionElements(key);
      const selectedIndex = options.findIndex(
        (option) => option.dataset.dropdownValue === config.trigger.value,
      );

      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        closeAllDropdowns(key);
        setDropdownOpen(key, true);
        focusDropdownOption(key, selectedIndex >= 0 ? selectedIndex : 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        closeAllDropdowns(key);
        setDropdownOpen(key, true);
        focusDropdownOption(
          key,
          selectedIndex >= 0 ? selectedIndex : options.length - 1,
        );
      } else if (event.key === "Escape") {
        setDropdownOpen(key, false);
      }
    });

    config.list?.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const option = event.target.closest("[data-dropdown-value]");
      if (!(option instanceof HTMLElement)) return;

      const value = config.normalize(option.dataset.dropdownValue);
      setDropdownValue(key, value);
      setDropdownOpen(key, false);
      config.trigger?.focus();
    });

    config.list?.addEventListener("keydown", (event) => {
      const options = getDropdownOptionElements(key);
      const currentIndex = options.findIndex((option) => option === event.target);

      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusDropdownOption(key, currentIndex + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusDropdownOption(key, currentIndex - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusDropdownOption(key, 0);
      } else if (event.key === "End") {
        event.preventDefault();
        focusDropdownOption(key, options.length - 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setDropdownOpen(key, false);
        config.trigger?.focus();
      } else if (event.key === "Tab") {
        setDropdownOpen(key, false);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const option = options[currentIndex];
        if (!option) return;
        const value = config.normalize(option.dataset.dropdownValue);
        setDropdownValue(key, value);
        setDropdownOpen(key, false);
        config.trigger?.focus();
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;
    const clickedInsideDropdown = Object.values(plannerDropdowns).some(
      ({ trigger, menu }) =>
        trigger?.contains(event.target) || menu?.contains(event.target),
    );
    if (!clickedInsideDropdown) {
      closeAllDropdowns();
    }
  });

  if (elements.optionsGrid) {
    elements.optionsGrid.setAttribute("role", "radiogroup");
    elements.optionsGrid.setAttribute("tabindex", "0");
    elements.optionCards.forEach((card) => {
      card.setAttribute("role", "radio");
    });

    elements.optionsGrid.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const card = event.target.closest("[data-mode]");
      if (!(card instanceof HTMLElement)) return;
      const mode = card.dataset.mode;
      if (!mode) return;
      elements.optionsGrid.focus();
      selectMode(mode);
    });

    elements.optionsGrid.addEventListener("keydown", (event) => {
      const currentIndex = Math.max(0, MODES.indexOf(currentState?.selectedMode));
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        selectMode(MODES[(currentIndex - 1 + MODES.length) % MODES.length]);
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        selectMode(MODES[(currentIndex + 1) % MODES.length]);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectMode(currentState?.selectedMode ?? MODES[0]);
      }
    });
  }

  elements.themeToggle?.addEventListener("click", () => {
    window.setTimeout(() => {
      rebuildState(
        {
          start: currentState?.start,
          destination: currentState?.destination,
          selectedMode: currentState?.selectedMode,
          history: readHistory(),
        },
        currentState,
      );
    }, 0);
  });
};

populatePlannerSelects();

currentState = buildAppState({
  start: START_LOCATIONS[1],
  destination: DESTINATIONS[0],
  history: readHistory(),
  theme: readTheme(),
});

renderFull();
setupInteractions();

updateLiveClock(new Date());
liveClockIntervalId = window.setInterval(() => {
  refreshCurrentRoute();
}, 30000);
mockBusIntervalId = window.setInterval(() => {
  refreshMockBusFeed();
}, 8000);

fetchWeather().then((probability) => {
  if (typeof probability !== "number") return;
  latestWeatherProbability = probability;
  rebuildState(
    {
      start: currentState.start,
      destination: currentState.destination,
      selectedMode: currentState.selectedMode,
      history: readHistory(),
    },
    currentState,
  );
});
