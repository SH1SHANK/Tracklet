import { formatRange, formatTime } from "./data.js";
import { elements } from "./dom.js";

const pulse = (element) => {
  if (!element) return;
  element.classList.remove("pulse-update");
  void element.offsetWidth;
  element.classList.add("pulse-update");
};

const setReliabilitySegments = (confidence) => {
  const filled = confidence === "HIGH" ? 5 : confidence === "MODERATE" ? 3 : 1;
  elements.confidenceSegments.forEach((segment, index) => {
    segment.classList.toggle("bg-black", index < filled);
    segment.classList.toggle("dark:bg-white", index < filled);
    segment.classList.toggle("bg-gray-200", index >= filled);
    segment.classList.toggle("dark:bg-gray-600", index >= filled);
  });
};

const setSpareBadge = (spareMinutes) => {
  const badge = elements.spareTimeBadge;
  if (!badge) return;

  badge.classList.remove("bg-green-400", "bg-secondary", "bg-red-400");
  if (spareMinutes <= 0) {
    badge.textContent = "TIGHT";
    badge.classList.add("bg-red-400");
    return;
  }

  badge.textContent = `${spareMinutes} MIN SPARE`;
  badge.classList.add(spareMinutes <= 5 ? "bg-secondary" : "bg-green-400");
};

const renderHistory = (state) => {
  if (!elements.historyStrip || !elements.historyChips) return;

  elements.historyChips.innerHTML = "";
  if (!state.history.length) {
    elements.historyStrip.classList.add("hidden");
    return;
  }

  elements.historyStrip.classList.remove("hidden");
  state.history.slice(0, 4).forEach((destination) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.historyDestination = destination;
    button.className =
      "pressable border-2 border-black dark:border-white rounded-md bg-white dark:bg-neo-card-dark px-3 py-1.5 font-mono text-[10px] uppercase shadow-neo-sm";
    button.textContent = destination;
    elements.historyChips.appendChild(button);
  });
};

const renderTopline = (state) => {
  if (elements.originSelect && elements.originSelect.value !== state.origin) {
    elements.originSelect.value = state.origin;
  }
  if (
    elements.destinationInput &&
    document.activeElement !== elements.destinationInput &&
    elements.destinationInput.value !== state.destination
  ) {
    elements.destinationInput.value = state.destination;
  }
  if (elements.liveClock) {
    elements.liveClock.textContent = formatTime(state.generatedAt);
  }
  if (elements.destLabel) {
    elements.destLabel.textContent = `${state.origin} to ${state.destination}`;
  }
  renderHistory(state);
};

const renderDecision = (state) => {
  const mode = state.recommendedMode;
  const mainScore = state.routeScores[mode];

  if (elements.decisionMode) elements.decisionMode.textContent = mode;
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
    const sourceLabel =
      state.conditions.weatherSource === "live" ? "live" : "sim";
    elements.weatherChipText.textContent = `Weather: ${state.conditions.weather.toLowerCase()} (${sourceLabel})`;
  }

  setSpareBadge(state.mainTrip.spareMinutes);
  setReliabilitySegments(state.recommendation.confidence);
  pulse(elements.decisionCard);
};

const renderOptions = (state) => {
  if (elements.optionsHeading) {
    elements.optionsHeading.textContent = `Options to ${state.destination}`;
  }

  Object.entries(elements.optionMap).forEach(([mode, card]) => {
    const score = state.routeScores[mode];
    const timeNode = card.querySelector("[data-role='time']");
    const reliabilityFill = card.querySelector(
      "[data-role='reliability-fill']",
    );
    const badge = card.querySelector("[data-role='rec-badge']");
    const selected = mode === state.selectedMode;

    if (timeNode) timeNode.textContent = `${score.minutes} MIN`;
    if (reliabilityFill) {
      reliabilityFill.style.width = `${Math.round(score.reliability * 100)}%`;
    }

    card.classList.toggle("option-card-selected", selected);
    card.classList.toggle("opacity-70", !selected);
    card.classList.toggle("dark:opacity-60", !selected);
    card.setAttribute("aria-checked", selected ? "true" : "false");
    card.tabIndex = selected ? 0 : -1;

    if (badge) {
      badge.classList.toggle("hidden", mode !== state.recommendedMode);
    }
  });

  pulse(elements.optionsGrid);
};

const renderAutopool = (state) => {
  if (!elements.autopoolSection) return;
  const isPoolSelected = state.selectedMode === "POOL";
  elements.autopoolSection.classList.toggle("hidden", !isPoolSelected);
  if (!isPoolSelected) return;

  if (elements.autopoolHeading) {
    elements.autopoolHeading.textContent = `Autopool to ${state.destination}`;
  }

  const offers =
    Array.isArray(state.autopool.offers) && state.autopool.offers.length
      ? state.autopool.offers
      : [
          {
            driverName: state.autopool.driverName,
            driverLabel: state.autopool.driverLabel,
            pickupPoint: state.autopool.pickupPoint,
            vehicle: state.autopool.vehicle,
            etaMinutes: state.autopool.etaMinutes,
            seats: state.autopool.seats,
            impactMinutes: state.autopool.impactMinutes,
          },
        ].filter((offer) => Boolean(offer.driverName));
  const hasOffer = offers.length > 0;
  const primaryOffer = offers[0];

  if (elements.autopoolStatusBadge) {
    const countLabel = `${offers.length} ${offers.length === 1 ? "ride" : "rides"} available`;
    elements.autopoolStatusBadge.textContent = hasOffer
      ? countLabel
      : "0 available";
    elements.autopoolStatusBadge.classList.toggle("bg-primary", hasOffer);
    elements.autopoolStatusBadge.classList.toggle("bg-secondary", !hasOffer);
  }
  if (elements.autopoolName) {
    elements.autopoolName.textContent = hasOffer
      ? primaryOffer.driverName
      : "Auto-pooling";
  }
  if (elements.autopoolMeta) {
    elements.autopoolMeta.textContent = hasOffer
      ? primaryOffer.driverLabel
      : "Create the first ride on this route";
  }
  if (elements.autopoolPickup) {
    elements.autopoolPickup.textContent = hasOffer
      ? `${primaryOffer.vehicle} | pickup in ${primaryOffer.etaMinutes} min at ${primaryOffer.pickupPoint}`
      : "Add your own ride details below";
  }
  if (elements.autopoolSeats) {
    elements.autopoolSeats.textContent = hasOffer
      ? `${primaryOffer.seats} seats`
      : "0 seats";
  }
  if (elements.autopoolImpact) {
    elements.autopoolImpact.textContent = hasOffer
      ? `+${primaryOffer.impactMinutes} min`
      : "--";
  }

  if (elements.autopoolOfferList) {
    elements.autopoolOfferList.innerHTML = "";
    offers.slice(0, 2).forEach((offer) => {
      const item = document.createElement("div");
      item.className =
        "shrink-0 snap-start w-[210px] border-2 border-black dark:border-white bg-[#FFF9EF] dark:bg-[#1f1f1f] px-2 py-2 rounded-md";
      item.innerHTML = `
        <p class="font-mono text-[10px] uppercase font-bold text-black dark:text-white">${offer.driverName} | ${offer.driverLabel}</p>
        <p class="font-mono text-[9px] uppercase text-gray-600 dark:text-gray-300 mt-1">${offer.vehicle} | ${offer.seats} seats | +${offer.impactMinutes} min</p>
        <p class="font-mono text-[9px] uppercase text-gray-600 dark:text-gray-300">Pickup in ${offer.etaMinutes} min at ${offer.pickupPoint}</p>
      `;
      elements.autopoolOfferList.appendChild(item);
    });

    const addCard = document.createElement("button");
    addCard.type = "button";
    addCard.className =
      "pressable shrink-0 snap-start w-[210px] border-2 border-dashed border-black dark:border-white bg-white dark:bg-[#1f1f1f] px-2 py-2 rounded-md text-left";
    addCard.innerHTML = `
      <p class="font-mono text-[10px] uppercase font-bold text-black dark:text-white">Add pool by you</p>
      <p class="font-mono text-[9px] uppercase text-gray-600 dark:text-gray-300 mt-1">Create your own ride on this route</p>
      <p class="font-mono text-[9px] uppercase text-gray-600 dark:text-gray-300">Set pickup, seats and ETA</p>
    `;
    elements.autopoolOfferList.appendChild(addCard);
  }

  pulse(elements.autopoolSection);
};

const renderGig = (state) => {
  if (!elements.gigSection) return;
  elements.gigSection.classList.toggle("hidden", !state.gig.visible);
  if (!state.gig.visible) return;

  if (elements.gigRouteLine) {
    elements.gigRouteLine.textContent = `Can be done while going to ${state.destination}`;
  }
  if (elements.gigTitle) {
    elements.gigTitle.textContent = state.gig.title;
  }
  if (elements.gigDetail) {
    elements.gigDetail.textContent = `${state.gig.location} | Rs ${state.gig.reward}`;
  }
  if (elements.gigImpact) {
    elements.gigImpact.textContent = `Optional add-on: about ${state.gig.impactMinutes} extra min`;
  }

  pulse(elements.gigSection);
};

const renderEvent = (state) => {
  if (elements.eventTitle) {
    elements.eventTitle.textContent = state.event.name;
  }
  if (elements.eventTag) {
    elements.eventTag.textContent = state.event.label;
  }
  if (elements.eventMeta) {
    elements.eventMeta.textContent = `${state.event.location} | ${formatTime(
      state.event.startsAt,
    )} | ${state.event.distanceKm.toFixed(1)} km from ${state.destination}`;
  }
  if (elements.eventBest) {
    elements.eventBest.textContent = `Best way: ${state.event.recommendedMode} | ${state.event.minutes} min from ${state.destination}`;
  }

  pulse(elements.eventSection);
};

export const renderApp = (state) => {
  renderTopline(state);
  renderDecision(state);
  renderOptions(state);
  renderAutopool(state);
  renderGig(state);
  renderEvent(state);
};
