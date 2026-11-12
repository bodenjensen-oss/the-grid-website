/**
 * Quote request: pure rules and text. No DOM here, so it runs under `node --test`.
 */

export const QUOTE_EMAIL = "TheGrid@beyondlights.net";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LENGTHS = { name: 80, email: 120, venue: 120, crowd: 12, notes: 800 };

/**
 * @typedef {Object} QuoteValues
 * @property {string} name
 * @property {string} email
 * @property {string} date ISO date, yyyy-mm-dd
 * @property {string} venue
 * @property {string} service
 * @property {string} setting
 * @property {string} crowd
 * @property {string} rig
 * @property {string} notes
 */

/**
 * @typedef {Object} FieldError
 * @property {keyof QuoteValues} field
 * @property {string} message what to enter, in plain words
 */

/**
 * Trims every value and cuts it to its limit. Returns a new object.
 * @param {Record<string, unknown>} raw
 * @returns {QuoteValues}
 */
export function cleanValues(raw) {
  const text = (key) => {
    const value = typeof raw[key] === "string" ? raw[key].trim() : "";
    const limit = MAX_LENGTHS[key];
    return limit ? value.slice(0, limit) : value;
  };
  return {
    name: text("name"),
    email: text("email"),
    date: text("date"),
    venue: text("venue"),
    service: text("service"),
    setting: text("setting"),
    crowd: text("crowd"),
    rig: text("rig"),
    notes: text("notes"),
  };
}

/**
 * @param {QuoteValues} values
 * @param {string} todayIso today's date in the visitor's time zone, yyyy-mm-dd
 * @returns {FieldError[]} empty when the request can be sent
 */
export function validateQuote(values, todayIso) {
  const errors = [];
  if (!values.name) {
    errors.push({ field: "name", message: "Enter your name." });
  }
  if (!EMAIL_PATTERN.test(values.email)) {
    errors.push({ field: "email", message: "Enter a full email address, like name@venue.com." });
  }
  if (!ISO_DATE_PATTERN.test(values.date)) {
    errors.push({ field: "date", message: "Choose the event date." });
  } else if (values.date < todayIso) {
    errors.push({ field: "date", message: "Choose a date that has not passed." });
  }
  if (!values.venue) {
    errors.push({ field: "venue", message: "Enter the venue and city." });
  }
  return errors;
}

/**
 * @param {string} isoDate yyyy-mm-dd
 * @returns {string} for example "Saturday, March 14, 2027"
 */
export function formatEventDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * @param {QuoteValues} values
 * @returns {string} the request as plain text, one fact per line
 */
export function buildMessage(values) {
  return [
    "Quote request for The Grid",
    "",
    `Name: ${values.name}`,
    `Email: ${values.email}`,
    `Event date: ${formatEventDate(values.date)}`,
    `Venue and city: ${values.venue}`,
    `What you need: ${values.service || "Not given"}`,
    `Indoor or outdoor: ${values.setting || "Not given"}`,
    `Expected crowd: ${values.crowd || "Not given"}`,
    `Laser rig size: ${values.rig || "Not given"}`,
    `About the show: ${values.notes || "Nothing added"}`,
  ].join("\n");
}

/**
 * @param {QuoteValues} values
 * @returns {string}
 */
export function buildSubject(values) {
  return `Quote request: ${formatEventDate(values.date)}, ${values.venue}`;
}

/**
 * @param {QuoteValues} values
 * @returns {string} a mailto link with the subject and body filled in
 */
export function buildMailto(values) {
  const subject = encodeURIComponent(buildSubject(values));
  const body = encodeURIComponent(buildMessage(values).replace(/\n/g, "\r\n"));
  return `mailto:${QUOTE_EMAIL}?subject=${subject}&body=${body}`;
}

/**
 * @param {Date} now
 * @returns {string} the local calendar date as yyyy-mm-dd
 */
export function localIsoDate(now) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
