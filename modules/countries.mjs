import { getCountries } from "./api.mjs";
import { fallbackCountries } from "./countryData.mjs";
import { escapeHtml } from "./utils.mjs";

const REST_COUNTRIES_URL = "https://restcountries.com/v3.1/all?fields=name,cca2,flag,timezones,idd";
const REST_COUNTRIES_FALLBACK_URL = "https://restcountries.com/v3.1/all";

export async function loadCountryOptions(app, statusCallback = null) {
  setPlannerCountries(app, fallbackCountries);

  try {
    const result = await getCountries();
    setPlannerCountries(app, result.countries);
    statusCallback?.(`Loaded ${result.countries.length} countries.`);
    return;
  } catch {
    try {
      const directCountries = await fetchRestCountriesDirectly();
      setPlannerCountries(app, directCountries);
      statusCallback?.(`Loaded ${directCountries.length} countries.`);
      return;
    } catch {
      setPlannerCountries(app, fallbackCountries);
      statusCallback?.(`Loaded ${fallbackCountries.length} countries.`);
    }
  }
}

export function renderCountryOptions(select, countryList, selectedCode = "") {
  select.innerHTML = [
    `<option value="">Select country</option>`,
    ...countryList.map((country) => {
      const timezone = country.timezones?.[0] || "";
      const callingCode = country.callingCode || "";
      const flag = getCountryFlag(country);
      const countryLabel = formatCountryLabel(country, flag, callingCode);
      return [
        `<option value="${escapeHtml(country.code)}"`,
        ` data-name="${escapeHtml(country.name)}"`,
        ` data-flag="${escapeHtml(flag)}"`,
        ` data-calling-code="${escapeHtml(callingCode)}"`,
        ` data-timezone="${escapeHtml(timezone)}">`,
        `${escapeHtml(countryLabel)}`,
        `</option>`
      ].join("");
    })
  ].join("");
  select.value = selectedCode || "";
}

export function getSelectedCountry(select) {
  const selectedCountry = select.selectedOptions[0];

  return {
    code: select.value,
    name: selectedCountry?.dataset.name || "",
    flag: selectedCountry?.dataset.flag || flagForCountryCode(select.value),
    callingCode: selectedCountry?.dataset.callingCode || "",
    timezone: selectedCountry?.dataset.timezone || ""
  };
}

export function flagForCountryCode(code = "") {
  const countryCode = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) return "";

  return [...countryCode]
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}

export function normalizeCountryFlag(flag = "", code = "") {
  return isFlagEmoji(flag) ? flag : flagForCountryCode(code);
}

function getCountryFlag(country) {
  return normalizeCountryFlag(country.flag, country.code);
}

function formatCountryLabel(country, flag, callingCode) {
  const flagLabel = flag ? `${flag} ` : "";
  const callingCodeLabel = callingCode ? ` (${callingCode})` : "";
  return `${flagLabel}${country.name}${callingCodeLabel}`;
}

function isFlagEmoji(value = "") {
  return /^[\u{1F1E6}-\u{1F1FF}]{2}$/u.test(value);
}

function setPlannerCountries(app, countryList) {
  app.state.availableCountries = countryList;
  renderCountryOptions(app.elements.registerCountry, countryList, app.state.profile.country);
  renderCountryOptions(app.elements.countrySelect, countryList, app.state.profile.country);
}

async function fetchRestCountriesDirectly() {
  const apiCountries = await fetchCountrySource(REST_COUNTRIES_URL) || await fetchCountrySource(REST_COUNTRIES_FALLBACK_URL);
  if (!Array.isArray(apiCountries)) throw new Error("Countries request failed.");

  return apiCountries
    .map((country) => ({
      name: country.name?.common || country.cca2,
      code: country.cca2,
      callingCode: getCallingCode(country.idd),
      flag: country.flag || "",
      timezones: Array.isArray(country.timezones) ? country.timezones : []
    }))
    .filter((country) => country.name && country.code)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchCountrySource(url) {
  const response = await fetch(url);
  const data = await response.json();
  return response.ok && Array.isArray(data) ? data : null;
}

function getCallingCode(idd = {}) {
  const root = idd.root || "";
  const suffix = Array.isArray(idd.suffixes) ? idd.suffixes[0] || "" : "";
  return root && suffix ? `${root}${suffix}` : root;
}
