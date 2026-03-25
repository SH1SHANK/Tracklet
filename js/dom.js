const byId = (id) => document.getElementById(id);

const optionCards = Array.from(document.querySelectorAll("[data-mode]"));

export const elements = {
  originSelect: byId("origin-select"),
  destinationInput: byId("destination-search"),
  goButton: byId("go-button"),
  autocompleteList: byId("autocomplete-list"),
  historyStrip: byId("history-strip"),
  historyChips: byId("history-chips"),
  liveClock: byId("live-clock"),
  destLabel: byId("dest-label"),
  decisionCard: byId("decision-card"),
  decisionMode: byId("decision-mode"),
  arrivalSummary: byId("arrival-summary"),
  spareTimeBadge: byId("spare-time-badge"),
  riskRationale: byId("risk-rationale"),
  delayChipText: byId("delay-chip-text"),
  weatherChipText: byId("weather-chip-text"),
  confidenceSegments: Array.from(
    document.querySelectorAll(".confidence-segment"),
  ),
  optionsHeading: byId("options-heading"),
  optionsGrid: byId("options-grid"),
  optionCards,
  optionMap: optionCards.reduce((map, card) => {
    const mode = card.getAttribute("data-mode");
    if (mode) map[mode] = card;
    return map;
  }, {}),
  autopoolSection: byId("autopool-section"),
  autopoolHeading: byId("autopool-heading"),
  autopoolStatusBadge: byId("autopool-status-badge"),
  autopoolName: byId("autopool-name"),
  autopoolMeta: byId("autopool-meta"),
  autopoolPickup: byId("autopool-pickup"),
  autopoolSeats: byId("autopool-seats"),
  autopoolImpact: byId("autopool-impact"),
  autopoolOfferList: byId("autopool-offer-list"),
  gigSection: byId("gig-section"),
  gigRouteLine: byId("gig-route-line"),
  gigTitle: byId("gig-title"),
  gigDetail: byId("gig-detail"),
  gigImpact: byId("gig-impact"),
  eventSection: byId("event-section"),
  eventTitle: byId("event-title"),
  eventTag: byId("event-tag"),
  eventMeta: byId("event-meta"),
  eventBest: byId("event-best"),
  themeToggle: byId("theme-toggle"),
  main: document.querySelector("main"),
};
