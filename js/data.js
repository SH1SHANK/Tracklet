export const DESTINATIONS = [
  "Central Library",
  "Main Building",
  "Mechanical Block",
  "Electrical Block",
  "Civil Block",
  "Computer Science Department",
  "Architecture Department",
  "Auditorium",
  "Central Plaza",
  "Open Air Theatre",
  "SAC",
  "MBH I",
  "MBH II",
  "MBH III",
  "LH",
  "GH",
  "Mega Hostel",
  "Sports Complex",
  "Health Centre",
  "Canteen Area",
];

export const START_LOCATIONS = [
  "MBH I",
  "MBH II",
  "LH",
  "GH",
  "Main Building",
  "SAC",
  "Central Plaza",
];

export const EVENTS = [
  { name: "Tathva Workshop", location: "Main Building", label: "Workshop" },
  {
    name: "Ragam Cultural Event",
    location: "Open Air Theatre",
    label: "Live",
  },
  { name: "IEEE Student Meet", location: "Electrical Block", label: "Meetup" },
  {
    name: "Coding Club Session",
    location: "Computer Science Department",
    label: "Club",
  },
  { name: "Robotics Club Meet", location: "Mechanical Block", label: "Lab" },
  { name: "Dance Club Practice", location: "Auditorium", label: "Practice" },
  { name: "Literary Club Meetup", location: "Central Library", label: "Talk" },
  { name: "Quiz Club Event", location: "SAC", label: "Event" },
];

export const MICRO_GIGS = [
  { title: "Deliver coffee", location: "Central Library" },
  { title: "Return library book", location: "Central Library" },
  { title: "Pick up printouts", location: "Computer Science Department" },
  { title: "Drop documents", location: "Main Building" },
  { title: "Carry equipment", location: "SAC" },
  { title: "Help set up event posters", location: "Central Plaza" },
];

export const AUTOPOOL_USERS = [
  { name: "Rahul M.", label: "Mechanical 26" },
  { name: "Ananya S.", label: "ECE 25" },
  { name: "Arjun K.", label: "CS 27" },
  { name: "Neha P.", label: "Civil 26" },
  { name: "Sarah K.", label: "Biology 26" },
  { name: "Adithya R.", label: "Architecture 25" },
];

export const AUTOPOOL_MOCK_OFFERS = [
  {
    name: "Rahul M.",
    label: "Mechanical 26",
    vehicle: "Hatchback",
    pickup: "MBH Gate",
  },
  {
    name: "Ananya S.",
    label: "ECE 25",
    vehicle: "Scooter",
    pickup: "SAC Signal",
  },
  {
    name: "Arjun K.",
    label: "CS 27",
    vehicle: "Sedan",
    pickup: "Main Building Steps",
  },
  {
    name: "Neha P.",
    label: "Civil 26",
    vehicle: "SUV",
    pickup: "Central Plaza East",
  },
  {
    name: "Sarah K.",
    label: "Biology 26",
    vehicle: "Hatchback",
    pickup: "Library Side Gate",
  },
  {
    name: "Adithya R.",
    label: "Architecture 25",
    vehicle: "EV Scooter",
    pickup: "LH Junction",
  },
];

export const MODES = ["WALK", "BUS", "POOL", "AUTO"];

export const SPEEDS = {
  WALK: 4.6,
  BUS: 12,
  POOL: 16,
  AUTO: 14,
};

export const RELIABILITY_PEAK_HOURS = [8, 9, 17, 18];

export const MODE_COSTS = {
  WALK: 0,
  BUS: 1,
  POOL: 2,
  AUTO: 3,
};

export const RATIONALES = {
  WALK: {
    short:
      "Walking wins here because the route is short and timing stays predictable.",
    wet: "Walking is still viable, but rain trims comfort and reliability on this route.",
    steady:
      "Walking avoids waiting entirely, which keeps this route dependable.",
  },
  BUS: {
    fast: "The bus stays faster than walking here, even after accounting for wait time.",
    peak: "The bus can work, but peak-hour headways add some timing risk right now.",
    covered:
      "The bus gives you a steadier trip when you want a more sheltered option.",
  },
  POOL: {
    efficient:
      "Pooling gives the best balance of speed and reliability on this distance.",
    reroute:
      "Nearby riders line up with your route, so pooling stays efficient here.",
    recovery:
      "Pooling beats the bus on reliability when road demand is uneven.",
  },
  AUTO: {
    late: "Auto keeps the trip reliable when other shared options are less dependable.",
    direct: "Auto is the most direct road option for this route right now.",
    fallback:
      "Auto works as the safest fallback when timing confidence drops elsewhere.",
  },
};

export const COORDS = {
  "Central Library": { lat: 11.3218, lon: 75.9349 },
  "Main Building": { lat: 11.321, lon: 75.934 },
  "Mechanical Block": { lat: 11.3217, lon: 75.9355 },
  "Electrical Block": { lat: 11.3221, lon: 75.935 },
  "Civil Block": { lat: 11.3212, lon: 75.9352 },
  "Computer Science Department": { lat: 11.3206, lon: 75.9345 },
  "Architecture Department": { lat: 11.3209, lon: 75.9337 },
  Auditorium: { lat: 11.3224, lon: 75.9342 },
  "Central Plaza": { lat: 11.3214, lon: 75.9347 },
  "Open Air Theatre": { lat: 11.322, lon: 75.9338 },
  SAC: { lat: 11.3208, lon: 75.9349 },
  "MBH I": { lat: 11.3198, lon: 75.934 },
  "MBH II": { lat: 11.3196, lon: 75.9346 },
  "MBH III": { lat: 11.3193, lon: 75.935 },
  LH: { lat: 11.3194, lon: 75.9336 },
  GH: { lat: 11.3191, lon: 75.9342 },
  "Mega Hostel": { lat: 11.3188, lon: 75.9356 },
  "Sports Complex": { lat: 11.3228, lon: 75.9358 },
  "Health Centre": { lat: 11.3213, lon: 75.9333 },
  "Canteen Area": { lat: 11.321, lon: 75.935 },
};

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeLocation = (list, input, fallback) => {
  const needle = (input || "").trim().toLowerCase();
  if (!needle) return fallback;

  const exact = list.find((item) => item.toLowerCase() === needle);
  if (exact) return exact;

  const partial = list.find((item) => item.toLowerCase().includes(needle));
  return partial || fallback;
};

export const normalizeDestination = (input) =>
  normalizeLocation(DESTINATIONS, input, "Central Library");

export const normalizeOrigin = (input) =>
  normalizeLocation(START_LOCATIONS, input, START_LOCATIONS[0]);

const toRad = (value) => (value * Math.PI) / 180;

export const distanceKmBetween = (from, to) => {
  const a = COORDS[from] || COORDS["Central Library"];
  const b = COORDS[to] || COORDS["Central Library"];
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

export const formatTime = (dateInput) => {
  const date = new Date(dateInput);
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  const mm = minutes.toString().padStart(2, "0");
  return `${hours12}:${mm} ${period}`;
};

export const formatRange = (start, end) => {
  const startStr = formatTime(start);
  const endStr = formatTime(end);
  const [sTime, sPeriod] = startStr.split(" ");
  const [eTime, ePeriod] = endStr.split(" ");
  if (sPeriod === ePeriod) {
    return `${sTime}-${eTime} ${sPeriod}`;
  }
  return `${sTime} ${sPeriod}-${eTime} ${ePeriod}`;
};
