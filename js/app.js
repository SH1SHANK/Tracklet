import { elements } from "./dom.js";
import { setupInteractions } from "./interactions.js";
import { renderApp } from "./render.js";
import { buildAppState } from "./state.js";
import { createStore } from "./store.js";

const HISTORY_KEY = "tracklet-history";
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=11.3218&longitude=75.9349&hourly=precipitation_probability&forecast_days=1&timezone=Asia%2FKolkata";

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

const readTheme = () =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

const controlInputs = () => ({
  origin: elements.originSelect?.value,
  destination: elements.destinationInput?.value,
});

let latestWeatherProbability = null;

const store = createStore(
  buildAppState({
    ...controlInputs(),
    history: readHistory(),
    theme: readTheme(),
  }),
);

store.subscribe((state) => {
  renderApp(state);
});

const refreshCurrentRoute = ({ selectedMode } = {}) => {
  const current = store.getState();
  store.setState(
    buildAppState(
      {
        origin: current.origin,
        destination: current.destination,
        selectedMode: selectedMode ?? current.selectedMode,
        history: readHistory(),
        theme: readTheme(),
        weatherOverride: latestWeatherProbability,
      },
      current,
    ),
  );
};

const commitControls = () => {
  const preview = buildAppState(
    {
      ...controlInputs(),
      history: readHistory(),
      theme: readTheme(),
      weatherOverride: latestWeatherProbability,
    },
    store.getState(),
  );
  const history = writeHistory(preview.destination);
  store.setState(
    buildAppState(
      {
        origin: preview.origin,
        destination: preview.destination,
        history,
        theme: readTheme(),
        weatherOverride: latestWeatherProbability,
      },
      store.getState(),
    ),
  );
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

renderApp(store.getState());

setupInteractions({
  onApplyRoute: commitControls,
  onHistoryRoute: commitControls,
  onModeSelect: (mode) => refreshCurrentRoute({ selectedMode: mode }),
  onThemeChange: () => refreshCurrentRoute(),
});

window.setInterval(() => {
  refreshCurrentRoute();
}, 30000);

fetchWeather().then((probability) => {
  if (typeof probability !== "number") return;
  latestWeatherProbability = probability;
  refreshCurrentRoute();
});
