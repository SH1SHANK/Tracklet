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
  "Tathva Workshop",
  "Ragam Cultural Event",
  "IEEE Student Meet",
  "Coding Club Session",
  "Robotics Club Meet",
  "Dance Club Practice",
  "Literary Club Meetup",
  "Quiz Club Event",
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
  "Rahul M.",
  "Ananya S.",
  "Arjun K.",
  "Neha P.",
  "Sarah K.",
  "Adithya R.",
];

export const MODES = ["WALK", "BUS", "POOL", "AUTO"];

export const SPEEDS = {
  WALK: 4.6,
  BUS: 12,
  POOL: 16,
  AUTO: 14,
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

export const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const normalizeDestination = (input) => {
  const needle = (input || "").trim().toLowerCase();
  if (!needle) return randomItem(DESTINATIONS);
  const exact = DESTINATIONS.find((item) => item.toLowerCase() === needle);
  if (exact) return exact;
  const partial = DESTINATIONS.find((item) =>
    item.toLowerCase().includes(needle),
  );
  return partial || "Central Library";
};

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

export const formatTime = (date) => {
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
    return `${sTime}–${eTime} ${sPeriod}`;
  }
  return `${sTime} ${sPeriod}–${eTime} ${ePeriod}`;
};
