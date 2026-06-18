import { getElements } from "./modules/dom.mjs";
import { loadState, saveState } from "./modules/state.mjs";
import { initAuthModule, renderAuthModule } from "./modules/auth.mjs";
import { initProfileModule, renderProfileModule } from "./modules/profile.mjs";
import { initTaskModule, renderTaskModule, handleTaskAction } from "./modules/tasks.mjs";
import { initEventModule, renderEventModule, handleEventAction } from "./modules/events.mjs";
import { initDashboardModule, renderDashboardModule } from "./modules/dashboard.mjs";
import { initCalendarModule, renderCalendarModule } from "./modules/calendar.mjs";
import { renderNotificationModule } from "./modules/notifications.mjs";
import { renderReportsModule } from "./modules/reports.mjs";
import { initSettingsModule, applySettings, renderSettingsModule } from "./modules/settings.mjs";
import { initAdminModule, renderAdminModule } from "./modules/admin.mjs";
import { renderHeader, renderFooter } from "./modules/layout.mjs";
import { initRouter } from "./modules/router.mjs";

// Render exported layout sections before querying DOM elements.
renderHeader();
renderFooter();

// Central app object shared with each feature module.
const app = {
  state: loadState(),
  elements: getElements(),
  persist() {
    saveState(this.state);
    this.render();
  },
  render() {
    renderAuthModule(this);
    renderProfileModule(this);
    renderSettingsModule(this);
    renderDashboardModule(this);
    renderTaskModule(this);
    renderEventModule(this);
    renderCalendarModule(this);
    renderNotificationModule(this);
    renderReportsModule(this);
    renderAdminModule(this);
  }
};

// Register event listeners for each project module.
initAuthModule(app);
initProfileModule(app);
initTaskModule(app);
initEventModule(app);
initDashboardModule(app);
initCalendarModule(app);
initSettingsModule(app);
initAdminModule(app);
initRouter();

// Route list button clicks to the module that owns the action.
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  if (handleTaskAction(action, id, app)) return;
  handleEventAction(action, id, app);
});

// Apply saved preferences and draw the first screen.
applySettings(app);
app.render();
