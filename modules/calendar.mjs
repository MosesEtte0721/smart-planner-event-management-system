import { emptyState, escapeHtml, formatDate, parseDate, startOfDay } from "./utils.mjs";
import { getGoogleCalendarStatus, syncGoogleCalendar } from "./api.mjs";
import { goToPage } from "./router.mjs";

// Calendar: schedule view and Google Calendar sync.

let visibleMonth = new Date();

export function initCalendarModule(app) {
  app.elements.previousMonth.addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    app.render();
  });

  app.elements.nextMonth.addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    app.render();
  });

  app.elements.connectGoogleCalendar.addEventListener("click", () => {
    window.location.href = "/api/google/connect";
  });

  app.elements.syncCalendar.addEventListener("click", () => syncAllEventsToGoogle(app));
  refreshGoogleCalendarStatus(app);

  document.addEventListener("click", (event) => {
    const calendarAction = event.target.closest("[data-calendar-create]");
    if (calendarAction) {
      prepareCalendarItem(calendarAction.dataset.calendarCreate, calendarAction.dataset.date);
      return;
    }

    const button = event.target.closest("[data-google-event-id]");
    if (!button) return;

    const plannerEvent = app.state.events.find((item) => item.id === button.dataset.googleEventId);
    if (!plannerEvent) return;

    syncSingleEventToGoogle(app, plannerEvent);
  });
}

// Renders the month grid and upcoming scheduled events.
export function renderCalendarModule(app) {
  renderMonthGrid(app);
  renderUpcomingEvents(app);
}

function renderMonthGrid(app) {
  const grid = app.elements.calendarGrid;
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
  const startOffset = monthStart.getDay();
  const totalCells = Math.ceil((startOffset + monthEnd.getDate()) / 7) * 7;
  const todayKey = toDateKey(new Date());
  const eventsByDate = groupEventsByDate(app.state.events);

  document.querySelector("#calendarMonth").textContent = monthStart.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });

  grid.innerHTML = "";
  for (let index = 0; index < totalCells; index += 1) {
    const date = new Date(monthStart);
    date.setDate(index - startOffset + 1);
    const dateKey = toDateKey(date);
    const dayEvents = eventsByDate.get(dateKey) || [];
    const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
    const isToday = dateKey === todayKey;

    const cell = document.createElement("article");
    cell.className = [
      "calendar-day",
      isCurrentMonth ? "" : "muted-day",
      isToday ? "today" : "",
      dayEvents.length ? "has-events" : ""
    ].filter(Boolean).join(" ");
    cell.setAttribute("aria-label", `${formatDate(dateKey)}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""}`);
    cell.innerHTML = `
      <span>${date.getDate()}</span>
      <div class="calendar-day-events">
        ${dayEvents.slice(0, 2).map((item) => `<small>${escapeHtml(item.name)}</small>`).join("")}
        ${dayEvents.length > 2 ? `<small>+${dayEvents.length - 2} more</small>` : ""}
      </div>
      <div class="calendar-day-actions">
        <button class="calendar-day-action" type="button" data-calendar-create="event" data-date="${dateKey}">Event</button>
        <button class="calendar-day-action" type="button" data-calendar-create="task" data-date="${dateKey}">Task</button>
      </div>
    `;
    grid.append(cell);
  }
}

function prepareCalendarItem(type, date) {
  if (type === "event") {
    document.querySelector("#eventDate").value = date;
    document.querySelector("#eventTime").value ||= "09:00";
    goToPage("events");
    document.querySelector("#eventName").focus();
    return;
  }

  if (type === "task") {
    document.querySelector("#taskDueDate").value = date;
    goToPage("tasks");
    document.querySelector("#taskTitle").focus();
  }
}

function renderUpcomingEvents(app) {
  const list = document.querySelector("#calendarList");
  const today = startOfDay(new Date());
  const schedule = [...app.state.events]
    .filter((item) => parseDate(item.date) >= today)
    .sort((a, b) => parseDate(a.date) - parseDate(b.date))
    .slice(0, 5);
  list.innerHTML = "";

  if (schedule.length === 0) {
    list.append(emptyState("No scheduled events."));
    return;
  }

  schedule.forEach((item) => {
    const row = document.createElement("article");
    row.className = "compact-row";
    row.innerHTML = `
      <strong>${escapeHtml(item.name)}</strong>
      <p>${formatDate(item.date)} at ${item.time}</p>
      <button class="small-button secondary-button google-event-button" type="button" data-google-event-id="${item.id}" ${app.state.googleCalendar?.connected ? "" : "disabled"}>Sync Event</button>
    `;
    list.append(row);
  });
}

async function refreshGoogleCalendarStatus(app) {
  try {
    const status = await getGoogleCalendarStatus();
    app.state.googleCalendar = {
      connected: status.connected,
      configured: status.configured,
      syncedEvents: status.syncedEvents
    };
    const message = status.connected
      ? `Google Calendar connected. ${status.syncedEvents} event${status.syncedEvents === 1 ? "" : "s"} synced.`
      : status.configured
        ? "Google Calendar is ready. Connect your Google account to sync events."
        : "Google Calendar needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the backend.";
    updateGoogleCalendarControls(status);
    setSyncStatus(app, message);
  } catch (error) {
    updateGoogleCalendarControls({ configured: false, connected: false });
    setSyncStatus(app, error.message);
  }
}

async function syncAllEventsToGoogle(app) {
  if (!canSyncGoogleCalendar(app)) return;

  try {
    const result = await syncGoogleCalendar(app.state.events, app.state.profile.timezone);
    setSyncStatus(app, result.message);
    refreshGoogleCalendarStatus(app);
  } catch (error) {
    setSyncStatus(app, error.message);
  }
}

async function syncSingleEventToGoogle(app, plannerEvent) {
  if (!canSyncGoogleCalendar(app)) return;

  try {
    const result = await syncGoogleCalendar([plannerEvent], app.state.profile.timezone);
    setSyncStatus(app, result.message);
    refreshGoogleCalendarStatus(app);
  } catch (error) {
    setSyncStatus(app, error.message);
  }
}

function canSyncGoogleCalendar(app) {
  if (!app.state.googleCalendar?.configured) {
    setSyncStatus(app, "Google Calendar cannot sync until .env has GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then the backend is restarted.");
    return false;
  }

  if (!app.state.googleCalendar?.connected) {
    setSyncStatus(app, "Connect Google Calendar first, then sync events.");
    return false;
  }

  return true;
}

function updateGoogleCalendarControls(status) {
  const connectButton = document.querySelector("#connectGoogleCalendar");
  const syncButton = document.querySelector("#syncCalendar");
  const eventButtons = [...document.querySelectorAll("[data-google-event-id]")];

  connectButton.disabled = !status.configured;
  syncButton.disabled = !status.connected;
  eventButtons.forEach((button) => {
    button.disabled = !status.connected;
  });
}

function setSyncStatus(app, message) {
  document.querySelector("#calendarSyncStatus").textContent = message;
  app.state.systemMessages.unshift(message);
  app.persist();
}

function groupEventsByDate(events) {
  return events.reduce((groups, event) => {
    if (!groups.has(event.date)) groups.set(event.date, []);
    groups.get(event.date).push(event);
    return groups;
  }, new Map());
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
