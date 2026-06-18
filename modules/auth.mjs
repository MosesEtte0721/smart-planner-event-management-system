// Account access: registration, login, logout, and local persistence.
import { loginAccount, registerAccount } from "./api.mjs";
import { getSelectedCountry, loadCountryOptions, normalizeCountryFlag } from "./countries.mjs";

export function initAuthModule(app) {
  loadCountryOptions(app, (message) => setStatus(app, "#registerStatus", message));
  app.elements.registerForm.addEventListener("submit", (event) => registerUser(event, app));
  app.elements.loginForm.addEventListener("submit", (event) => loginUser(event, app));
  app.elements.logoutButton.addEventListener("click", () => logout(app));
}

// Shows the current session state on both authentication pages.
export function renderAuthModule(app) {
  const sessionText = app.state.session.isLoggedIn
    ? `Active session: ${app.state.session.email}`
    : "No active session. Please log in.";
  const statusText = app.state.authMessage || sessionText;

  document.querySelector("#registerStatus").textContent = statusText;
  document.querySelector("#loginStatus").textContent = statusText;
}

async function registerUser(event, app) {
  event.preventDefault();

  const name = document.querySelector("#registerName").value.trim();
  const email = document.querySelector("#registerEmail").value.trim().toLowerCase();
  const password = document.querySelector("#registerPassword").value;
  const role = document.querySelector("#registerRole").value.trim() || "Event Planner";
  const selectedCountry = getSelectedCountry(app.elements.registerCountry);

  if (!isValidPassword(password, "#registerStatus")) return;

  try {
    const result = await registerAccount({
      name,
      email,
      password,
      role,
      country: selectedCountry.code,
      countryName: selectedCountry.name,
      countryFlag: selectedCountry.flag,
      countryCallingCode: selectedCountry.callingCode,
      timezone: selectedCountry.timezone
    });
    syncAuthenticatedUser(app, result.user, result.session);
    document.querySelector("#registerForm").reset();
    setStatus(app, "#registerStatus", "Registration complete. User saved to the backend database and local storage.");
    app.persist();
  } catch (error) {
    setStatus(app, "#registerStatus", error.message);
    return;
  }
}

async function loginUser(event, app) {
  event.preventDefault();

  const email = document.querySelector("#loginEmail").value.trim().toLowerCase();
  const password = document.querySelector("#loginPassword").value;

  if (!isValidPassword(password, "#loginStatus")) return;

  try {
    const result = await loginAccount({ email, password });
    syncAuthenticatedUser(app, result.user, result.session);
    document.querySelector("#loginForm").reset();
    setStatus(app, "#loginStatus", "Login successful. Session saved to local storage.");
    app.persist();
  } catch (error) {
    setStatus(app, "#loginStatus", error.message);
    return;
  }
}

// Ends the local session without deleting planner data.
function logout(app) {
  app.state.session.isLoggedIn = false;
  app.state.authMessage = "Logged out successfully.";
  app.state.systemMessages.unshift("User logged out successfully.");
  app.persist();
}

function isValidPassword(password, statusSelector) {
  if (password.length >= 6) return true;
  document.querySelector(statusSelector).textContent = "Password must be at least 6 characters.";
  return false;
}

function syncAuthenticatedUser(app, user, session) {
  const localUser = {
    ...user,
    password: ""
  };

  const existingIndex = app.state.users.findIndex((item) => item.email === user.email);
  if (existingIndex >= 0) {
    app.state.users[existingIndex] = { ...app.state.users[existingIndex], ...localUser };
  } else {
    app.state.users.push(localUser);
  }

  app.state.session = session;
  app.state.profile.name = user.name;
  app.state.profile.role = user.role;
  app.state.profile.country = user.country || app.state.profile.country;
  app.state.profile.countryName = user.countryName || app.state.profile.countryName;
  app.state.profile.countryFlag = normalizeCountryFlag(user.countryFlag || app.state.profile.countryFlag, app.state.profile.country);
  app.state.profile.countryCallingCode = formatCallingCode(user.countryCallingCode, app.state.profile.countryCallingCode);
  app.state.profile.timezone = user.timezone || app.state.profile.timezone;
}

function formatCallingCode(userCode = "", fallbackCode = "") {
  return userCode.startsWith("+") ? userCode : fallbackCode;
}

// Adds auth feedback to the UI and notification stream.
function setStatus(app, selector, message) {
  app.state.authMessage = message;
  app.state.systemMessages.unshift(message);
  document.querySelector(selector).textContent = message;
}
