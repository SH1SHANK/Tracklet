import {
  DESTINATIONS,
  START_LOCATIONS,
  EVENTS,
  MICRO_GIGS,
  AUTOPOOL_USERS,
  MODES,
  SPEEDS,
  COORDS,
  randomInt,
  randomItem,
  normalizeDestination,
  distanceKmBetween,
  formatTime,
  formatRange,
  RELIABILITY_PEAK_HOURS,
  RATIONALES,
} from "./data.js";

// Global weather state
let rainProbability = null;

const fetchWeather = async () => {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=11.3218&longitude=75.9349" +
        "&hourly=precipitation_probability&forecast_days=1&timezone=Asia%2FKolkata",
    );
    const json = await res.json();
    const hour = new Date().getHours();
    rainProbability = json?.hourly?.precipitation_probability?.[hour] ?? null;
  } catch {
    rainProbability = null;
  }
};

// History management
const saveHistory = (destination) => {
  let history = JSON.parse(localStorage.getItem("tracklet-history") || "[]");
  // Remove duplicates
  history = history.filter((item) => item !== destination);
  // Add to front and keep max 5
  history.unshift(destination);
  history = history.slice(0, 5);
  localStorage.setItem("tracklet-history", JSON.stringify(history));
  renderHistory();
};

const renderHistory = () => {
  const historyStrip = document.getElementById("history-strip");
  if (!historyStrip) return;
  const history = JSON.parse(localStorage.getItem("tracklet-history") || "[]");
  const chipContainer = historyStrip.querySelector(".flex");
  if (!chipContainer) return;

  chipContainer.innerHTML = "";
  if (history.length === 0) {
    historyStrip.classList.add("hidden");
    return;
  }

  historyStrip.classList.remove("hidden");
  history.forEach((dest) => {
    const button = document.createElement("button");
    button.className =
      "border-2 border-black dark:border-white bg-white dark:bg-neo-card-dark px-3 py-1 font-mono text-[10px] uppercase shadow-neo-sm pressable";
    button.textContent = dest;
    button.addEventListener("click", () => {
      searchInput.value = dest;
      applyState();
    });
    chipContainer.appendChild(button);
  });
};

// Autocomplete initialization
const initAutocomplete = () => {
  const list = document.getElementById("autocomplete-list");
  if (!list || !searchInput) return;

  const show = (items) => {
    list.innerHTML = "";
    if (!items.length) {
      list.classList.add("hidden");
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      li.className =
        "px-3 py-2 font-mono text-[11px] uppercase cursor-pointer border-b border-gray-200 " +
        "dark:border-gray-700 hover:bg-primary hover:text-black transition-colors";
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        searchInput.value = item;
        list.classList.add("hidden");
        applyState();
      });
      list.appendChild(li);
    });
    list.classList.remove("hidden");
  };

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      list.classList.add("hidden");
      return;
    }
    const matches = DESTINATIONS.filter((d) =>
      d.toLowerCase().includes(q),
    ).slice(0, 6);
    show(matches);
  });

  searchInput.addEventListener("blur", () => {
    setTimeout(() => list.classList.add("hidden"), 150);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") list.classList.add("hidden");
  });
};

// Skeleton loading
const showSkeleton = () => {
  if (decisionCard) decisionCard.classList.add("skeleton");
  if (optionsGrid) optionsGrid.classList.add("skeleton");
  if (routeSection) routeSection.classList.add("skeleton");
};

const hideSkeleton = () => {
  setTimeout(() => {
    if (decisionCard) decisionCard.classList.remove("skeleton");
    if (optionsGrid) optionsGrid.classList.remove("skeleton");
    if (routeSection) routeSection.classList.remove("skeleton");
  }, 300);
};

// Bezier interpolation for route progress
const interpolateBezier = (t, p0, p1, p2, p3) => {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
};

// DOM selectors
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

const searchInput = $("#destination-search");
if (!searchInput) {
  throw new Error("Destination input not found.");
}
const searchRow = searchInput.closest(".flex-1")?.parentElement || null;
const goButton = searchRow?.querySelector("button") || null;

const greetingText = $$("p.font-display").find((el) =>
  el.textContent.toLowerCase().includes("good morning"),
);
const greetingCard = greetingText?.closest(".border-3") || null;
const greetingTime = greetingCard?.querySelector("span.font-mono") || null;
const destinationLine = greetingCard?.querySelector("div.font-mono") || null;

const decisionCard =
  $$("div.bg-primary").find((el) => el.querySelector("h3")) || null;
const decisionMode = decisionCard?.querySelector("h3") || null;
const arrivalSummary = decisionCard?.querySelector("div.font-mono") || null;
const spareTimeBadge = decisionCard?.querySelector("#spare-time-badge") || null;
const riskRationale = decisionCard?.querySelector("#risk-rationale") || null;
const reliabilityText = decisionCard?.querySelector("p.font-body") || null;
const confidenceSegments =
  decisionCard?.querySelectorAll("[data-confidence] > div.h-5 > div") || [];
const riskRow = decisionCard?.querySelector("div.flex.flex-wrap.gap-2") || null;
const delayChip = riskRow?.children?.[0] || null;
const weatherChip = riskRow?.children?.[1] || null;

const optionsHeading = $$("h2.font-mono").find((el) =>
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

const routeHeading = $$("h2.font-display").find(
  (el) => el.textContent.trim().toLowerCase() === "route",
);
const routeSection = routeHeading?.closest(".border-3") || null;
const routeText =
  routeSection?.querySelector("div.font-mono.text-xs.font-bold") || null;
const routeSVG = routeSection?.querySelector("svg") || null;
const routeProgress = routeSVG?.querySelector("#route-progress") || null;

const autopoolHeading = $$("h2.font-display").find((el) =>
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

const gigLabel = $$("span").find(
  (el) => el.textContent.trim().toLowerCase() === "quick task",
);
const gigSection =
  gigLabel?.closest("div")?.parentElement?.parentElement || null;
const gigRouteLine =
  gigSection?.querySelector("div.font-mono.text-\\[9px\\]") || null;
const gigTitle = gigSection?.querySelector("h5") || null;
const gigDetail = gigSection?.querySelector("p.font-mono.text-xs") || null;
const gigImpact =
  gigSection?.querySelector("p.font-mono.text-\\[10px\\]") || null;

const eventCard =
  $$("div.border-2").find((el) => el.querySelector("h3.font-display")) || null;
const eventTitle = eventCard?.querySelector("h3.font-display") || null;
const eventMeta = eventCard?.querySelector("div.font-mono.text-xs") || null;
const eventBest = eventCard?.querySelector("div.bg-black") || null;

const main = $("main");

// Utility functions
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
  $$("button").forEach(pressable);
  if (main) {
    Array.from(main.children).forEach((section, index) => {
      section.classList.add("animate-in");
      section.style.setProperty("--stagger", index);
    });
  }
  $$("main .rounded-xl, main .rounded-lg, main .shadow-neo").forEach((card) => {
    card.classList.add("interactive-card");
    pressable(card);
  });

  // Accessibility: Add aria-labels to icon-only buttons
  const iconButtonMap = {
    directions_run: "Tracklet home",
    notifications: "Notifications",
    person_outline: "Profile",
    map: "Map",
    open_in_full: "Expand route",
    add_circle_outline: "Offer a ride",
  };

  $$("button").forEach((btn) => {
    const icon = btn.querySelector(".material-icons-outlined");
    if (icon && !btn.textContent.trim().replace(/\s+/g, "")) {
      const iconName = icon.textContent?.trim();
      if (iconName && iconButtonMap[iconName]) {
        btn.setAttribute("aria-label", iconButtonMap[iconName]);
      }
    }
  });

  // Accessibility: Add role and aria-label to options grid
  if (optionsGrid) {
    optionsGrid.setAttribute("role", "group");
    optionsGrid.setAttribute("aria-label", "Transport options");
  }

  // Accessibility: Add aria-live to decision card
  if (decisionCard) {
    decisionCard.setAttribute("aria-live", "polite");
  }
};

// Distance-based recommendation engine
const recommend = (distanceKm, hourOfDay) => {
  if (distanceKm < 0.5) return "WALK";

  const isPeakHour = RELIABILITY_PEAK_HOURS.includes(hourOfDay);

  if (distanceKm >= 0.5 && distanceKm <= 1.8) {
    if (!isPeakHour) return "BUS";
    return distanceKm < 1.0 ? "WALK" : "POOL";
  }

  if (distanceKm > 1.8) {
    const isLateNight = [20, 21, 22, 23, 0].includes(hourOfDay);
    return isLateNight ? "AUTO" : "POOL";
  }

  return "WALK";
};

// State management
let currentState = null;

const buildState = (destinationInput) => {
  const destination = normalizeDestination(destinationInput);
  const start = randomItem(START_LOCATIONS);
  const distanceKm = distanceKmBetween(start, destination);
  const hourOfDay = new Date().getHours();

  // Use simple distance-based recommendation
  const recommended = recommend(distanceKm, hourOfDay);

  // Use weather API data or random fallback
  const weather =
    rainProbability !== null
      ? rainProbability > 40
        ? "RAIN LIKELY"
        : "CLEAR"
      : randomItem(["CLEAR", "RAIN LIKELY"]);

  return {
    destination,
    start,
    distanceKm,
    recommended,
    selectedMode: recommended,
    leaveWithin: randomInt(2, 10),
    etaSpread: randomInt(4, 8),
    delay: randomItem(["LOW", "MEDIUM", "HIGH"]),
    weather,
    hourOfDay,
    showAutopool: recommended === "AUTO" || Math.random() < 0.5,
    showGig: Math.random() < 0.4,
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

const setState = (patch) => {
  currentState = { ...currentState, ...patch };
  // For now, re-render everything. Could optimize to only render affected sections.
  render();
};

// Focused render functions
const renderDecision = () => {
  const state = currentState;
  const selectedMode = state.selectedMode;

  const now = new Date();
  const travelTimes = {
    WALK: Math.ceil((state.distanceKm / SPEEDS.WALK) * 60),
    BUS: Math.ceil((state.distanceKm / SPEEDS.BUS) * 60) + randomInt(2, 8),
    POOL: Math.ceil((state.distanceKm / SPEEDS.POOL) * 60),
    AUTO: Math.ceil((state.distanceKm / SPEEDS.AUTO) * 60),
  };
  const travelTime = travelTimes[selectedMode] || 15;

  const etaStart = new Date(
    now.getTime() + (state.leaveWithin + travelTime) * 60000,
  );
  const etaEnd = new Date(etaStart.getTime() + state.etaSpread * 60000);
  const distanceText = `${state.distanceKm.toFixed(1)} km`;

  if (decisionMode) {
    decisionMode.textContent = selectedMode;
  }

  // Update risk rationale from RATIONALES
  if (riskRationale) {
    const rationale = randomItem(RATIONALES[selectedMode] || []);
    riskRationale.textContent = rationale;
  }

  if (arrivalSummary) {
    arrivalSummary.textContent = `${distanceText} · ETA ${formatRange(
      etaStart,
      etaEnd,
    )} · leave within ${state.leaveWithin} min`;
  }
  if (delayChip) {
    delayChip.childNodes[delayChip.childNodes.length - 1].textContent =
      ` Delay risk: ${state.delay.toLowerCase()}`;
  }
  if (weatherChip) {
    weatherChip.childNodes[weatherChip.childNodes.length - 1].textContent =
      state.weather === "CLEAR" ? " Weather: clear" : " Rain: likely";
  }

  pulse(decisionCard);
};

const renderOptions = () => {
  const state = currentState;
  const selectedMode = state.selectedMode;

  // Calculate travel times for each mode
  const travelTimes = {
    WALK: Math.ceil((state.distanceKm / SPEEDS.WALK) * 60),
    BUS: Math.ceil((state.distanceKm / SPEEDS.BUS) * 60) + randomInt(2, 8),
    POOL: Math.ceil((state.distanceKm / SPEEDS.POOL) * 60),
    AUTO: Math.ceil((state.distanceKm / SPEEDS.AUTO) * 60),
  };

  Object.entries(optionMap).forEach(([mode, card]) => {
    const minutes = travelTimes[mode] || 15;
    updateOptionCard(card, minutes, mode === selectedMode);
  });

  if (recBadge && optionMap[selectedMode]) {
    optionMap[selectedMode].prepend(recBadge);
  } else if (recBadge && recBadgeHome) {
    recBadgeHome.appendChild(recBadge);
  }
  if (optionMap[selectedMode]) {
    Object.values(optionMap).forEach((c) => c.classList.remove("is-selected"));
    optionMap[selectedMode].classList.add("is-selected");
  }

  pulse(optionsGrid);
};

const renderRoute = () => {
  const state = currentState;
  const now = new Date();

  if (greetingTime) {
    greetingTime.textContent = formatTime(now);
  }
  if (destinationLine) {
    destinationLine.textContent = `Destination: ${state.destination}`;
  }
  if (optionsHeading) {
    optionsHeading.textContent = `Options to ${state.destination}`;
  }
  if (routeText) {
    routeText.textContent = `${state.start} → ${state.destination}`;
  }
  if (searchInput.value !== state.destination) {
    searchInput.value = state.destination;
  }

  pulse(routeSection);
};

const renderGig = () => {
  const state = currentState;

  if (gigSection) {
    gigSection.classList.toggle("hidden", !state.showGig);
    if (state.showGig) {
      if (gigRouteLine) {
        gigRouteLine.textContent = `On your route to ${state.destination}`;
      }
      if (gigTitle) {
        gigTitle.textContent = state.gig.title;
      }
      if (gigDetail) {
        gigDetail.textContent = `${state.gig.location} · ₹${state.gig.reward}`;
      }
      if (gigImpact) {
        gigImpact.textContent = `Adds ~${state.gig.impact} min to your route`;
      }
      pulse(gigSection);
    }
  }
};

const renderEvent = () => {
  const state = currentState;
  const now = new Date();

  const eventTime = new Date(now.getTime() + state.event.offset * 60000);
  const eventDistance = distanceKmBetween(
    state.destination,
    state.event.location,
  );

  // Default best mode (simplified)
  const bestMode = state.recommended;
  const eventBestTime = Math.ceil((eventDistance / SPEEDS[bestMode]) * 60);

  if (autopoolHeading) {
    autopoolHeading.textContent = `Autopool to ${state.destination}`;
  }
  if (state.showAutopool && autopoolCard) {
    if (autopoolName) autopoolName.textContent = state.autopool.name;
    if (autopoolSeats)
      autopoolSeats.textContent = `${state.autopool.seats} seats`;
    if (autopoolImpact)
      autopoolImpact.textContent = `+${state.autopool.impact} min`;
    autopoolCard.classList.add("is-selected");
    autopoolSection.classList.toggle("hidden", false);
  } else {
    autopoolSection.classList.toggle("hidden", true);
  }

  if (eventTitle) eventTitle.textContent = state.event.name;
  if (eventMeta) {
    eventMeta.textContent = `${state.event.location} · ${formatTime(
      eventTime,
    )} · ${eventDistance.toFixed(1)} km from ${state.destination}`;
  }
  if (eventBest) {
    eventBest.textContent = `Best way: ${bestMode} · ${eventBestTime} min from ${state.destination}`;
  }

  pulse(eventCard);
};

const render = () => {
  renderRoute();
  renderDecision();
  renderOptions();
  renderGig();
  renderEvent();

  hideSkeleton();
};

const applyState = () => {
  showSkeleton();
  currentState = buildState(searchInput.value);
  saveHistory(currentState.destination);
  render();
};

const setupSelection = () => {
  makeSelectableGroup(optionsGrid, (card) => {
    const label = card
      .querySelector("div.font-display")
      ?.textContent.trim()
      .toUpperCase();
    if (!label) return;
    setState({ selectedMode: label });
  });
  makeSelectableGroup(autopoolRow);
  if (routeSection) {
    routeSection.addEventListener("click", () => {
      const newStart = randomItem(START_LOCATIONS);
      const newDistanceKm = distanceKmBetween(
        newStart,
        currentState.destination,
      );
      const newRecommended = recommend(newDistanceKm, currentState.hourOfDay);

      setState({
        start: newStart,
        distanceKm: newDistanceKm,
        recommended: newRecommended,
        selectedMode: newRecommended,
      });
    });
  }

  // Task 10: Keyboard navigation for optionsGrid
  if (optionsGrid) {
    document.addEventListener("keydown", (event) => {
      const modes = Object.keys(optionMap);
      if (modes.length === 0) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        let currentIndex = modes.indexOf(currentState.selectedMode);
        currentIndex = (currentIndex - 1 + modes.length) % modes.length;
        setState({ selectedMode: modes[currentIndex] });
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        let currentIndex = modes.indexOf(currentState.selectedMode);
        currentIndex = (currentIndex + 1) % modes.length;
        setState({ selectedMode: modes[currentIndex] });
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const card = optionMap[currentState.selectedMode];
        if (card) {
          card.click();
        }
      }
    });
  }
};

setupInteractions();
setupSelection();
initAutocomplete();

// Initialize weather data and load state
fetchWeather().then(() => {
  currentState = buildState(searchInput.value);
  render();
});

goButton?.addEventListener("click", applyState);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyState();
  }
});
