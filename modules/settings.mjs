// Settings: theme, notification preferences, and user preferences.

export function initSettingsModule(app) {
  app.elements.settingsForm.addEventListener("submit", (event) => saveSettings(event, app));
  app.elements.themeToggle.addEventListener("click", () => toggleTheme(app));
}

// Applies the saved theme to the document.
export function applySettings(app) {
  document.body.classList.toggle("dark", app.state.settings.darkMode);
}

// Keeps settings controls aligned with saved state.
export function renderSettingsModule(app) {
  document.querySelector("#darkModeSetting").checked = app.state.settings.darkMode;
  document.querySelector("#taskAlertsSetting").checked = app.state.settings.taskAlerts;
  document.querySelector("#eventRemindersSetting").checked = app.state.settings.eventReminders;
}

// Saves notification and theme preferences.
function saveSettings(event, app) {
  event.preventDefault();
  app.state.settings.darkMode = document.querySelector("#darkModeSetting").checked;
  app.state.settings.taskAlerts = document.querySelector("#taskAlertsSetting").checked;
  app.state.settings.eventReminders = document.querySelector("#eventRemindersSetting").checked;
  app.state.systemMessages.unshift("Settings saved.");
  app.persist();
  applySettings(app);
}

// Quick topbar theme toggle.
function toggleTheme(app) {
  app.state.settings.darkMode = !app.state.settings.darkMode;
  app.persist();
  applySettings(app);
}
