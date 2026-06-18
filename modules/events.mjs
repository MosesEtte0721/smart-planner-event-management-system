import { emptyState, escapeHtml, formatDate, makeId, parseDate } from "./utils.mjs";

// Events: create, read, update, delete, categorize, and filter event records.

let editingEventId = null;

// Registers event form and edit cancel events.
export function initEventModule(app) {
  app.elements.eventForm.addEventListener("submit", (event) => saveEvent(event, app));
  app.elements.cancelEventEdit.addEventListener("click", () => resetEventForm(app));
}

// Applies global search, category, and date filters to events.
export function filteredEvents(app) {
  const query = app.elements.globalSearch.value.trim().toLowerCase();
  const category = app.elements.categoryFilter.value.trim().toLowerCase();
  const date = app.elements.dateFilter.value;

  return [...app.state.events]
    .filter((item) => {
      const matchesQuery = !query || `${item.name} ${item.notes} ${item.category} ${item.location}`.toLowerCase().includes(query);
      const matchesCategory = !category || item.category.toLowerCase().includes(category);
      const matchesDate = !date || item.date === date;
      return matchesQuery && matchesCategory && matchesDate;
    })
    .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
}

// Renders the filtered event list.
export function renderEventModule(app) {
  const list = document.querySelector("#eventList");
  const events = filteredEvents(app);
  list.innerHTML = "";

  if (events.length === 0) {
    list.append(emptyState("No matching events found."));
    return;
  }

  events.forEach((plannerEvent) => {
    const item = document.createElement("article");
    item.className = "planner-item";
    item.innerHTML = `
      <div class="item-topline">
        <div>
          <strong>${escapeHtml(plannerEvent.name)}</strong>
          <p>${formatDate(plannerEvent.date)} at ${plannerEvent.time} • ${escapeHtml(plannerEvent.location)}</p>
        </div>
        <span class="badge">${escapeHtml(plannerEvent.category)}</span>
      </div>
      ${plannerEvent.notes ? `<p>${escapeHtml(plannerEvent.notes)}</p>` : ""}
      <div class="item-actions">
        <button class="small-button secondary-button" data-action="edit-event" data-id="${plannerEvent.id}">Edit</button>
        <button class="small-button delete-button" data-action="delete-event" data-id="${plannerEvent.id}">Delete</button>
      </div>
    `;
    list.append(item);
  });
}

// Handles event-specific row actions.
export function handleEventAction(action, id, app) {
  if (action === "edit-event") {
    editEvent(id, app);
    return true;
  }

  if (action === "delete-event") {
    app.state.events = app.state.events.filter((plannerEvent) => plannerEvent.id !== id);
    app.persist();
    return true;
  }

  return false;
}

// Creates a new event or updates the event currently being edited.
function saveEvent(event, app) {
  event.preventDefault();

  const plannerEvent = {
    id: editingEventId || makeId(),
    name: document.querySelector("#eventName").value.trim(),
    date: document.querySelector("#eventDate").value,
    time: document.querySelector("#eventTime").value,
    category: document.querySelector("#eventCategory").value.trim() || "General",
    location: document.querySelector("#eventLocation").value.trim() || "No location added",
    notes: document.querySelector("#eventNotes").value.trim(),
    createdAt: new Date().toISOString()
  };

  if (editingEventId) {
    app.state.events = app.state.events.map((item) => item.id === editingEventId ? plannerEvent : item);
  } else {
    app.state.events.push(plannerEvent);
  }

  resetEventForm(app);
  app.persist();
}

// Loads an event into the form for editing.
function editEvent(id, app) {
  const plannerEvent = app.state.events.find((item) => item.id === id);
  if (!plannerEvent) return;

  editingEventId = id;
  document.querySelector("#eventName").value = plannerEvent.name;
  document.querySelector("#eventDate").value = plannerEvent.date;
  document.querySelector("#eventTime").value = plannerEvent.time;
  document.querySelector("#eventCategory").value = plannerEvent.category || "";
  document.querySelector("#eventLocation").value = plannerEvent.location;
  document.querySelector("#eventNotes").value = plannerEvent.notes || "";
  app.elements.cancelEventEdit.classList.remove("hidden");
  document.querySelector("#events").scrollIntoView({ behavior: "smooth" });
}

// Restores the event form to create mode.
function resetEventForm(app) {
  editingEventId = null;
  app.elements.eventForm.reset();
  app.elements.cancelEventEdit.classList.add("hidden");
}
