import {
  distanceKmBetween,
  normalizeDestination,
  normalizeOrigin,
} from "./data.js";
import { recommendRoute, scoreRoutes } from "./engine.js";
import {
  buildAutopoolOffer,
  buildEventSuggestion,
  buildGigOpportunity,
  buildSimulationContext,
} from "./simulation.js";

const minutesUntilNextHour = (date) => {
  const nextHour = new Date(date);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return Math.round((nextHour - date) / 60000);
};

export const buildAppState = (inputs = {}, previousState = null) => {
  const now = inputs.now ? new Date(inputs.now) : new Date();
  const origin = normalizeOrigin(inputs.origin ?? previousState?.origin);
  const destination = normalizeDestination(
    inputs.destination ?? previousState?.destination,
  );
  const history = Array.isArray(inputs.history)
    ? inputs.history
    : previousState?.history ?? [];
  const theme = inputs.theme ?? previousState?.theme ?? "light";

  const distanceKm = distanceKmBetween(origin, destination);
  const simulation = buildSimulationContext(
    origin,
    destination,
    now,
    inputs.weatherOverride,
  );
  const conditions = {
    ...simulation,
    distanceKm,
    hourOfDay: now.getHours(),
  };
  const routeScores = scoreRoutes(origin, destination, conditions);
  const recommendation = recommendRoute(routeScores, conditions);
  const recommendedMode = recommendation.mode;

  const preserveSelection =
    previousState &&
    previousState.origin === origin &&
    previousState.destination === destination;
  const selectedMode =
    inputs.selectedMode && routeScores[inputs.selectedMode]
      ? inputs.selectedMode
      : preserveSelection && routeScores[previousState.selectedMode]
        ? previousState.selectedMode
        : recommendedMode;

  const mainScore = routeScores[recommendedMode];
  const etaStart = new Date(
    now.getTime() + (conditions.leaveWithin + mainScore.minutes) * 60000,
  );
  const etaEnd = new Date(etaStart.getTime() + conditions.etaSpread * 60000);
  const spareMinutes = Math.max(
    0,
    minutesUntilNextHour(now) - conditions.leaveWithin - mainScore.minutes,
  );

  const autopool = buildAutopoolOffer({
    origin,
    destination,
    conditions,
    routeScores,
  });
  const gig = buildGigOpportunity({ origin, destination, conditions });

  const event = buildEventSuggestion(destination, now);
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
  const eventRouteScores = scoreRoutes(destination, event.location, eventConditions);
  const eventRecommendation = recommendRoute(eventRouteScores, eventConditions);

  return {
    origin,
    destination,
    hourBucket: conditions.hourBucket,
    generatedAt: now.toISOString(),
    conditions,
    routeScores,
    recommendedMode,
    selectedMode,
    recommendation,
    mainTrip: {
      distanceKm,
      leaveWithin: conditions.leaveWithin,
      etaStart: etaStart.toISOString(),
      etaEnd: etaEnd.toISOString(),
      spareMinutes,
      delayRisk: mainScore.delayRisk,
      routeProgress: Math.min(0.92, conditions.leaveWithin / 15),
    },
    history,
    theme,
    autopool,
    gig,
    event: {
      visible: true,
      name: event.name,
      location: event.location,
      label: event.label,
      startsAt: eventStart.toISOString(),
      distanceKm: eventDistanceKm,
      routeScores: eventRouteScores,
      recommendedMode: eventRecommendation.mode,
      recommendation: eventRecommendation,
      minutes: eventRouteScores[eventRecommendation.mode].minutes,
    },
  };
};
