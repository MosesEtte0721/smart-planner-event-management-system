import { fallbackCountries } from "./countryData.mjs";
import { getSelectedCountry, renderCountryOptions } from "./countries.mjs";
import { initials } from "./utils.mjs";
import { renderLocalizationModule, updateTimezoneOptions } from "./localization.mjs";

// Profile settings: display details, role, country, and timezone.

export function initProfileModule(app) {
  populateCountryOptions(app);
  app.elements.profileForm.addEventListener("submit", (event) => saveProfile(event, app));
  app.elements.countrySelect.addEventListener("change", () => updateTimezoneOptions(app));
}

// Keeps the profile panel, greeting, and topbar user card in sync.
export function renderProfileModule(app) {
  const firstName = app.state.profile.name.split(" ")[0] || "User";
  const roleSelect = document.querySelector("#profileRole");
  const role = hasRoleOption(roleSelect, app.state.profile.role) ? app.state.profile.role : "Event Planner";
  document.querySelector("#welcomeName").textContent = firstName;
  document.querySelector("#profileNameTop").textContent = app.state.profile.name;
  document.querySelector("#profileRoleTop").textContent = role;
  document.querySelector("#profileAvatar").textContent = initials(app.state.profile.name);
  document.querySelector("#profileName").value = app.state.profile.name;
  roleSelect.value = role;
  document.querySelector("#profileBio").value = app.state.profile.bio || "";
  renderCountryOptions(app.elements.countrySelect, app.state.availableCountries || fallbackCountries, app.state.profile.country);
  app.elements.countrySelect.value = app.state.profile.country;
  updateTimezoneOptions(app);
  app.elements.timezoneSelect.value = app.state.profile.timezone;
  renderLocalizationModule(app);
}

function hasRoleOption(select, role) {
  return [...select.options].some((option) => option.value === role);
}

// Saves profile changes and mirrors them onto the active user record.
function saveProfile(event, app) {
  event.preventDefault();
  const selectedCountry = getSelectedCountry(app.elements.countrySelect);

  app.state.profile.name = document.querySelector("#profileName").value.trim();
  app.state.profile.role = document.querySelector("#profileRole").value.trim();
  app.state.profile.country = selectedCountry.code;
  app.state.profile.countryName = selectedCountry.name;
  app.state.profile.countryFlag = selectedCountry.flag;
  app.state.profile.countryCallingCode = selectedCountry.callingCode;
  app.state.profile.timezone = app.elements.timezoneSelect.value;
  app.state.profile.bio = document.querySelector("#profileBio").value.trim();

  const currentUser = app.state.users.find((user) => user.email === app.state.session.email);
  if (currentUser) {
    currentUser.name = app.state.profile.name;
    currentUser.role = app.state.profile.role;
    currentUser.country = app.state.profile.country;
    currentUser.countryName = app.state.profile.countryName;
    currentUser.countryFlag = app.state.profile.countryFlag;
    currentUser.countryCallingCode = app.state.profile.countryCallingCode;
    currentUser.timezone = app.state.profile.timezone;
  }

  app.persist();
}

// Creates the country dropdown from the shared country list.
function populateCountryOptions(app) {
  renderCountryOptions(app.elements.countrySelect, app.state.availableCountries || fallbackCountries, app.state.profile.country);
  updateTimezoneOptions(app);
}
