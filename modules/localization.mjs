import { fallbackCountries } from "./countryData.mjs";
import { normalizeCountryFlag } from "./countries.mjs";

// Location details: country flags, calling codes, and timezone suggestions.

export function updateTimezoneOptions(app) {
  const countryList = app.state.availableCountries || fallbackCountries;
  const country = countryList.find((item) => item.code === app.elements.countrySelect.value) || countryList[0];
  const timezones = country.timezones?.length ? country.timezones : [app.state.profile.timezone || "UTC"];
  app.elements.timezoneSelect.innerHTML = timezones
    .map((timezone) => `<option value="${timezone}">${timezone}</option>`)
    .join("");

  if (timezones.includes(app.state.profile.timezone)) {
    app.elements.timezoneSelect.value = app.state.profile.timezone;
  }
}

// Updates the visible localization card from the selected profile country.
export function renderLocalizationModule(app) {
  const countryList = app.state.availableCountries || fallbackCountries;
  const country = countryList.find((item) => item.code === app.state.profile.country) || countryList[0];
  const flag = normalizeCountryFlag(app.state.profile.countryFlag, country.code) || normalizeCountryFlag(country.flag, country.code);
  const callingCode = formatCallingCode(app.state.profile.countryCallingCode, country.callingCode);

  document.querySelector("#countryFlag").textContent = flag;
  document.querySelector("#countryName").textContent = app.state.profile.countryName || country.name;
  document.querySelector("#countryCode").textContent = callingCode;
  document.querySelector("#timezoneSuggestion").textContent = `Suggested timezone: ${app.state.profile.timezone}`;
}

function formatCallingCode(profileCode = "", countryCode = "") {
  return profileCode.startsWith("+") ? profileCode : countryCode || "";
}
