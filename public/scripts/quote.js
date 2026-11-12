/** Quote form: checks the fields, then hands the request to the visitor's email app. */

import { buildMailto, buildMessage, cleanValues, localIsoDate, validateQuote } from "./quote-model.js";

const INVALID_CLASS = "is-invalid";
const RIG_PARAM = "rig";
const COPIED_TEXT = "Copied.";
const COPY_FAILED_TEXT = "Copy did not work. Select the text above and copy it.";

/** @returns {void} */
export function initQuote() {
  /** @type {HTMLFormElement | null} */
  const form = document.querySelector("[data-quote-form]");
  const result = document.querySelector("[data-quote-result]");
  if (!form || !result) return;

  // The page's own checks take over from the browser's. With scripts off the browser still checks the required fields.
  form.noValidate = true;
  const summary = form.querySelector("[data-form-summary]");
  const dateInput = form.elements.namedItem("date");
  if (dateInput instanceof HTMLInputElement) dateInput.min = localIsoDate(new Date());

  selectRigFromUrl(form);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = cleanValues(Object.fromEntries(new FormData(form)));
    const errors = validateQuote(values, localIsoDate(new Date()));
    showErrors(form, summary, errors);
    if (errors.length > 0) return;

    showResult(form, result, buildMessage(values), buildMailto(values));
    // Opening the email app is a click on the panel's own link, so it stays one code path with the manual button.
    result.querySelector("[data-quote-mailto]")?.click();
  });

  form.addEventListener("input", (event) => {
    const field = event.target instanceof Element ? event.target.closest(".field") : null;
    if (!field || !field.classList.contains(INVALID_CLASS)) return;
    clearFieldError(field);
    showSummary(summary, form.querySelectorAll(`.field.${INVALID_CLASS}`).length);
  });

  result.querySelector("[data-quote-copy]")?.addEventListener("click", () => copyRequest(result));
  result.querySelector("[data-quote-edit]")?.addEventListener("click", () => {
    result.hidden = true;
    form.hidden = false;
    form.querySelector(".field__control")?.focus();
  });
}

/**
 * "Quote this rig" links on the lasers page arrive as /?rig=8%20lasers#quote; carry the size into the form.
 * @param {HTMLFormElement} form
 */
function selectRigFromUrl(form) {
  const rigSelect = form.elements.namedItem("rig");
  if (!(rigSelect instanceof HTMLSelectElement)) return;
  const wanted = new URLSearchParams(window.location.search).get(RIG_PARAM);
  const option = [...rigSelect.options].find((candidate) => candidate.value === wanted);
  if (option) rigSelect.value = option.value;
}

/**
 * @param {HTMLFormElement} form
 * @param {Element | null} summary
 * @param {import("./quote-model.js").FieldError[]} errors
 */
function showErrors(form, summary, errors) {
  for (const field of form.querySelectorAll(`.field.${INVALID_CLASS}`)) clearFieldError(field);

  for (const error of errors) {
    const control = form.elements.namedItem(error.field);
    if (!(control instanceof HTMLElement)) continue;
    const field = control.closest(".field");
    if (!field) continue;
    const message = document.createElement("p");
    message.className = "field__error";
    message.id = `${control.id}-error`;
    message.textContent = error.message;
    field.append(message);
    field.classList.add(INVALID_CLASS);
    control.setAttribute("aria-invalid", "true");
    control.setAttribute("aria-describedby", message.id);
  }

  showSummary(summary, errors.length);
  if (errors.length > 0) {
    const first = form.elements.namedItem(errors[0].field);
    if (first instanceof HTMLElement) first.focus();
  }
}

/**
 * The line above the send button: how many fields are still flagged. Hidden when none are.
 * @param {Element | null} summary
 * @param {number} count
 */
function showSummary(summary, count) {
  if (!summary) return;
  summary.hidden = count === 0;
  summary.textContent = count === 0 ? "" : summaryText(count);
}

/**
 * @param {number} count
 * @returns {string}
 */
function summaryText(count) {
  return count === 1 ? "1 field needs a fix before this can be sent." : `${count} fields need a fix before this can be sent.`;
}

/** @param {Element} field */
function clearFieldError(field) {
  field.classList.remove(INVALID_CLASS);
  field.querySelector(".field__error")?.remove();
  const control = field.querySelector(".field__control");
  control?.removeAttribute("aria-invalid");
  control?.removeAttribute("aria-describedby");
}

/**
 * @param {HTMLFormElement} form
 * @param {Element} result
 * @param {string} message
 * @param {string} mailto
 */
function showResult(form, result, message, mailto) {
  const text = result.querySelector("[data-quote-text]");
  const link = result.querySelector("[data-quote-mailto]");
  const status = result.querySelector("[data-quote-status]");
  if (text) text.textContent = message;
  if (link) link.setAttribute("href", mailto);
  if (status) status.textContent = "";
  form.hidden = true;
  result.hidden = false;
  const title = result.querySelector("[data-quote-result-title]");
  if (title instanceof HTMLElement) title.focus();
}

/** @param {Element} result */
async function copyRequest(result) {
  const text = result.querySelector("[data-quote-text]")?.textContent ?? "";
  const status = result.querySelector("[data-quote-status]");
  try {
    await navigator.clipboard.writeText(text);
    if (status) status.textContent = COPIED_TEXT;
  } catch {
    // No clipboard permission (or an insecure page): tell the visitor how to copy by hand.
    if (status) status.textContent = COPY_FAILED_TEXT;
  }
}
