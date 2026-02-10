import {
  DESTINATIONS,
  START_LOCATIONS,
  EVENTS,
  MICRO_GIGS,
  AUTOPOOL_USERS,
  MODES,
  SPEEDS,
  randomInt,
  randomItem,
  normalizeDestination,
  distanceKmBetween,
  formatTime,
  formatRange,
} from "./data.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const searchInput = $("#destination-search");
if (!searchInput) {
  throw new Error("Destination input not found.");
}
const searchRow = searchInput.closest(".flex-1")?.parentElement || null;
const goButton = searchRow?.querySelector("button") || null;

const greetingText = $$('p.font-display').find((el) =>
  el.textContent.toLowerCase().includes("good morning"),
);
const greetingCard = greetingText?.closest(".border-3") || null;
const greetingTime = greetingCard?.querySelector("span.font-mono") || null;
const destinationLine = greetingCard?.querySelector("div.font-mono") || null;

const decisionCard = $$('div.bg-primary').find((el) => el.querySelector("h3")) || null;
const decisionMode = decisionCard?.querySelector("h3") || null;
const arrivalSummary = decisionCard?.querySelector("div.font-mono") || null;
const reliabilityText = decisionCard?.querySelector("p.font-body") || null;
const riskRow = decisionCard?.querySelector("div.flex.flex-wrap.gap-2") || null;
const delayChip = riskRow?.children?.[0] || null;
const weatherChip = riskRow?.children?.[1] || null;

const optionsHeading = $$('h4.font-mono').find((el) =>
  el.textContent.toLowerCase().includes("options"),
);
const optionsSection = optionsHeading?.closest("div") || null;
const optionsGrid = optionsSection?.querySelector("div.grid") || null;
const optionCards = optionsGrid ? Array.from(optionsGrid.children) : [];
const optionMap = optionCards.reduce((acc, card) => {
  const label = card.querySelector("div.font-display");
  if (label) acc[label.textContent.trim().toUpperCase()] = card;
  return acc;
}, {});
const recBadge = optionsGrid?.querySelector("div.absolute") || null;
const recBadgeHome = recBadge?.parentElement || null;

const routeHeading = $$('h4.font-display').find(
  (el) => el.textContent.trim().toLowerCase() === "route",
);
const routeSection = routeHeading?.closest(".border-3") || null;
const routeText = routeSection?.querySelector("div.font-mono.text-xs.font-bold") || null;

const autopoolHeading = $$('h4.font-display').find((el) =>
  el.textContent.toLowerCase().includes("autopool"),
);
const autopoolSection =
  autopoolHeading?.closest("div")?.parentElement?.parentElement || null;
const autopoolCard =
  autopoolSection?.querySelector('[class*="min-w-[240px]"]') || null;
const autopoolName = autopoolCard?.querySelector("p.font-bold") || null;
const autopoolSeatRow = autopoolCard?.querySelector("div.bg-black") || null;
const autopoolSeats = autopoolSeatRow?.children?.[0] || null;
const autopoolImpact = autopoolSeatRow?.children?.[1] || null;
const autopoolRow =
  autopoolSection?.querySelector("div.flex.gap-4.overflow-x-auto") || null;

const gigLabel = $$('span').find(
  (el) => el.textContent.trim().toLowerCase() === "quick task",
);
const gigSection = gigLabel?.closest("div")?.parentElement?.parentElement || null;
const gigRouteLine = gigSection?.querySelector("div.font-mono.text-\\[9px\\]") || null;
const gigTitle = gigSection?.querySelector("h5") || null;
const gigDetail = gigSection?.querySelector("p.font-mono.text-xs") || null;
const gigImpact = gigSection?.querySelector("p.font-mono.text-\\[10px\\]") || null;

const eventCard = $$('div.border-2').find((el) => el.querySelector("h3.font-display")) || null;
const eventTitle = eventCard?.querySelector("h3.font-display") || null;
const eventMeta = eventCard?.querySelector("div.font-mono.text-xs") || null;
const eventBest = eventCard?.querySelector("div.bg-black") || null;

const main = $("main");

const pulse = (el) => {
  if (!el) return;
  el.classList.remove("pulse-update");
  void el.offsetWidth;
  el.classList.add("pulse-update");
};

const pressable = (el) => {
  if (!el) return;
  el.classList.add("pressable");
  el.addEventListener("pointerdown", () => el.classList.add("is-pressed"));
  el.addEventListener("pointerup", () => el.classList.remove("is-pressed"));
  el.addEventListener("pointerleave", () => el.classList.remove("is-pressed"));
};

const updateOptionCard = (card, minutes, isRecommended) => {
  const timeEl = card.querySelector("div.font-mono");
  if (timeEl) timeEl.textContent = `${minutes} MIN`;
  card.style.backgroundColor = "";
  card.style.color = "";
  card.style.opacity = "";
  if (isRecommended) {
    card.style.backgroundColor = "#000";
    card.style.color = "#fff";
    card.style.opacity = "1";
  } else {
    const label = card
      .querySelector("div.font-display")
      ?.textContent.trim()
      .toUpperCase();
    if (label === "WALK") {
      card.style.backgroundColor = "#fff";
      card.style.color = "#000";
      card.style.opacity = "0.8";
    }
  }
};

const makeSelectableGroup = (group, onSelect) => {
  if (!group) return;
  const cards = Array.from(group.children).filter((el) => el.nodeType === 1);
  cards.forEach((card) => {
    card.classList.add("interactive-card", "selectable-card");
    pressable(card);
    card.addEventListener("click", () => {
      cards.forEach((c) => c.classList.remove("is-selected"));
      card.classList.add("is-selected");
      pulse(card);
      if (onSelect) onSelect(card);
    });
  });
};

const setupInteractions = () => {
  $$('button').forEach(pressable);
  if (main) {
    Array.from(main.children).forEach((section, index) => {
      section.classList.add("animate-in");
      section.style.setProperty("--stagger", index);
    });
  }
  $$('main .rounded-xl, main .rounded-lg, main .shadow-neo').forEach((card) => {
    card.classList.add("interactive-card");
    pressable(card);
  });
};

const computeTimes = (distanceKm) => {
  const distance = Math.max(0.35, distanceKm);
  const times = {
    WALK: Math.round((distance / SPEEDS.WALK) * 60 + randomInt(-1, 2)),
    BUS: Math.round((distance / SPEEDS.BUS) * 60 + randomInt(3, 6)),
    POOL: Math.round((distance / SPEEDS.POOL) * 60 + randomInt(1, 3)),
    AUTO: Math.round((distance / SPEEDS.AUTO) * 60 + randomInt(1, 3)),
  };
  Object.keys(times).forEach((key) => {
    times[key] = Math.max(4, times[key]);
  });
  return times;
};

const buildState = (destinationInput) => {
  const destination = normalizeDestination(destinationInput);
  const start = randomItem(START_LOCATIONS);
  const distanceKm = distanceKmBetween(start, destination);
  const recommended = randomItem(MODES);
  return {
    destination,
    start,
    distanceKm,
    recommended,
    selectedMode: recommended,
    leaveWithin: randomInt(2, 10),
    etaSpread: randomInt(4, 8),
    delay: randomItem(["LOW", "MEDIUM", "HIGH"]),
    weather: randomItem(["CLEAR", "RAIN LIKELY"]),
    showAutopool: recommended === "AUTO" || Math.random() < 0.5,
    showGig: Math.random() < 0.5,
    autopool: {
      name: randomItem(AUTOPOOL_USERS),
      seats: randomInt(1, 3),
      impact: randomInt(1, 5),
    },
    gig: {
      ...randomItem(MICRO_GIGS),
      reward: randomInt(10, 50),
      impact: randomInt(3, 8),
    },
    event: {
      name: randomItem(EVENTS),
      location: randomItem(DESTINATIONS),
      offset: randomInt(60, 360),
    },
  };
};

let currentState = buildState(searchInput.value);

const render = () => {
  const state = currentState;
  searchInput.value = state.destination;

  if (destinationLine) {
    destinationLine.textContent = `Destination: ${state.destination}`;
  }
  if (optionsHeading) {
    optionsHeading.textContent = `Options to ${state.destination}`;
  }
  if (routeText) {
    routeText.textContent = `${state.start} → ${state.destination}`;
  }
  if (autopoolHeading) {
    autopoolHeading.textContent = `Autopool to ${state.destination}`;
  }
  if (gigRouteLine) {
    gigRouteLine.textContent = `On your route to ${state.destination}`;
  }

  const now = new Date();
  if (greetingTime) greetingTime.textContent = formatTime(now);

  const times = computeTimes(state.distanceKm);
  const selectedMode = state.selectedMode;
  const decisionModeLabel = selectedMode === "AUTO" ? "AUTO" : selectedMode;
  if (decisionMode) decisionMode.textContent = decisionModeLabel;

  const optionKey = selectedMode === "AUTO" ? "POOL" : selectedMode;
  const travelTime = times[selectedMode];
  const etaStart = new Date(
    now.getTime() + (state.leaveWithin + travelTime) * 60000,
  );
  const etaEnd = new Date(etaStart.getTime() + state.etaSpread * 60000);
  const distanceText = `${state.distanceKm.toFixed(1)} km`;
  if (arrivalSummary) {
    arrivalSummary.textContent = `${distanceText} · ETA ${formatRange(
      etaStart,
      etaEnd,
    )} · leave within ${state.leaveWithin} min`;
  }
  if (reliabilityText) {
    reliabilityText.textContent = `Best: ${decisionModeLabel}`;
  }

  if (delayChip) {
    delayChip.childNodes[delayChip.childNodes.length - 1].textContent =
      ` Delay risk: ${state.delay.toLowerCase()}`;
  }
  if (weatherChip) {
    weatherChip.childNodes[weatherChip.childNodes.length - 1].textContent =
      state.weather === "CLEAR" ? " Weather: clear" : " Rain: likely";
  }

  Object.entries(optionMap).forEach(([mode, card]) => {
    updateOptionCard(card, times[mode], mode === optionKey);
  });

  if (recBadge && optionMap[optionKey]) {
    optionMap[optionKey].prepend(recBadge);
  } else if (recBadge && recBadgeHome) {
    recBadgeHome.appendChild(recBadge);
  }
  if (optionMap[optionKey]) {
    Object.values(optionMap).forEach((c) => c.classList.remove("is-selected"));
    optionMap[optionKey].classList.add("is-selected");
  }

  if (autopoolSection) {
    autopoolSection.classList.toggle("hidden", !state.showAutopool);
    if (state.showAutopool && autopoolCard) {
      if (autopoolName) autopoolName.textContent = state.autopool.name;
      if (autopoolSeats)
        autopoolSeats.textContent = `${state.autopool.seats} seats`;
      if (autopoolImpact)
        autopoolImpact.textContent = `+${state.autopool.impact} min`;
      autopoolCard.classList.add("is-selected");
    }
  }

  if (gigSection) {
    gigSection.classList.toggle("hidden", !state.showGig);
    if (state.showGig) {
      if (gigTitle) gigTitle.textContent = state.gig.title;
      if (gigDetail)
        gigDetail.textContent = `${state.gig.location} · ₹${state.gig.reward}`;
      if (gigImpact)
        gigImpact.textContent = `Adds ~${state.gig.impact} min to your route`;
    }
  }

  const eventTime = new Date(now.getTime() + state.event.offset * 60000);
  const eventDistance = distanceKmBetween(state.destination, state.event.location);
  const eventTimes = computeTimes(eventDistance);
  const bestMode = Object.entries(eventTimes).sort((a, b) => a[1] - b[1])[0][0];
  if (eventTitle) eventTitle.textContent = state.event.name;
  if (eventMeta) {
    eventMeta.textContent = `${state.event.location} · ${formatTime(
      eventTime,
    )} · ${eventDistance.toFixed(1)} km from ${state.destination}`;
  }
  if (eventBest) {
    eventBest.textContent = `Best way: ${bestMode} · ${eventTimes[bestMode]} min from ${state.destination}`;
  }

  pulse(decisionCard);
  pulse(optionsGrid);
  pulse(routeSection);
  if (state.showGig) pulse(gigSection);
  if (state.showAutopool) pulse(autopoolSection);
  pulse(eventCard);
};

const applyState = () => {
  currentState = buildState(searchInput.value);
  render();
};

const setupSelection = () => {
  makeSelectableGroup(optionsGrid, (card) => {
    const label = card
      .querySelector("div.font-display")
      ?.textContent.trim()
      .toUpperCase();
    if (!label) return;
    currentState.selectedMode = label;
    render();
  });
  makeSelectableGroup(autopoolRow);
  if (routeSection) {
    routeSection.addEventListener("click", () => {
      currentState.start = randomItem(START_LOCATIONS);
      render();
    });
  }
};

setupInteractions();
setupSelection();
applyState();

goButton?.addEventListener("click", applyState);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyState();
  }
});
