import { isoDate, makeId } from "./utils.mjs";
import { fallbackCountries } from "./countryData.mjs";

// Browser storage key for saved planner data.
export const STORAGE_KEY = "smartPlannerData.v2";

// Short country list used while the full country list loads.
export const countries = [
  { name: "United States", code: "US", flag: "🇺🇸", timezones: ["America/New_York", "America/Chicago", "America/Los_Angeles"] },
  { name: "Nigeria", code: "NG", flag: "🇳🇬", timezones: ["Africa/Lagos"] },
  { name: "Ghana", code: "GH", flag: "🇬🇭", timezones: ["Africa/Accra"] },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧", timezones: ["Europe/London"] },
  { name: "Canada", code: "CA", flag: "🇨🇦", timezones: ["America/Toronto", "America/Vancouver"] }
];

// Creates the initial app data used on first load.
export function defaultState() {
  return {
    session: { isLoggedIn: true, email: "jane@example.com" },
    users: [
      { name: "Jane Doe", email: "jane@example.com", password: "password123", role: "Event Planner", country: "US", countryName: "United States", countryFlag: "🇺🇸", countryCallingCode: "+1", timezone: "America/New_York", active: true },
      { name: "Alex Morgan", email: "alex@example.com", password: "password123", role: "Employee", country: "CA", countryName: "Canada", countryFlag: "🇨🇦", countryCallingCode: "+1", timezone: "America/Toronto", active: true },
      { name: "Sam Taylor", email: "sam@example.com", password: "password123", role: "Self-employed", country: "NG", countryName: "Nigeria", countryFlag: "🇳🇬", countryCallingCode: "+234", timezone: "Africa/Lagos", active: false }
    ],
    profile: {
      name: "Jane Doe",
      role: "Event Planner",
      country: "US",
      countryName: "United States",
      countryFlag: "🇺🇸",
      countryCallingCode: "+1",
      timezone: "America/New_York",
      bio: "Planning corporate events, vendor meetings, and team schedules."
    },
    settings: {
      darkMode: false,
      taskAlerts: true,
      eventReminders: true
    },
    authMessage: "",
    googleCalendar: {
      configured: false,
      connected: false,
      syncedEvents: 0
    },
    availableCountries: fallbackCountries,
    tasks: seedTasks(),
    events: seedEvents(),
    systemMessages: ["Planner ready: your data is saved in this browser."]
  };
}

// Loads saved state and fills in any missing fields from defaults.
export function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const initialState = defaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
    return initialState;
  }

  try {
    const parsed = JSON.parse(saved);
    const defaults = defaultState();
    return {
      ...defaults,
      ...parsed,
      profile: { ...defaults.profile, ...parsed.profile },
      settings: { ...defaults.settings, ...parsed.settings },
      session: { ...defaults.session, ...parsed.session },
      authMessage: typeof parsed.authMessage === "string" ? parsed.authMessage : defaults.authMessage,
      googleCalendar: { ...defaults.googleCalendar, ...parsed.googleCalendar },
      availableCountries: Array.isArray(parsed.availableCountries) ? parsed.availableCountries : defaults.availableCountries,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : defaults.tasks,
      events: Array.isArray(parsed.events) ? parsed.events : defaults.events,
      users: normalizeUsers(Array.isArray(parsed.users) ? parsed.users : defaults.users),
      systemMessages: Array.isArray(parsed.systemMessages) ? parsed.systemMessages : defaults.systemMessages
    };
  } catch {
    return defaultState();
  }
}

// Persists the current app state in the browser.
export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeUsers(users) {
  return users.map((user) => ({
    password: "password123",
    active: false,
    role: "Employee",
    country: "US",
    countryName: "United States",
    countryFlag: "🇺🇸",
    countryCallingCode: "+1",
    timezone: "America/New_York",
    ...user
  }));
}

// Starter task records make the dashboard useful before the user adds data.
function seedTasks() {
  return [
    createTask("Prepare event proposal", 0, "High", "Planning", "Pending", "Draft the proposal for the annual corporate event."),
    createTask("Send meeting invites", 0, "Medium", "Communication", "Completed", "Send agenda and meeting link to vendors."),
    createTask("Review vendor contracts", 1, "High", "Logistics", "In Progress", "Confirm venue, catering, and audiovisual contracts."),
    createTask("Update event timeline", -1, "Low", "Scheduling", "Pending", "Adjust activity order and milestone dates.")
  ];
}

// Starter event records for the calendar and activity feed.
function seedEvents() {
  return [
    createEvent("Corporate Annual Event", 1, "09:00", "Corporate", "Main Conference Hall", "Opening session, keynote, and networking lunch."),
    createEvent("Vendor Meeting", 2, "11:00", "Meeting", "Online Meeting", "Finalize vendor responsibilities."),
    createEvent("Client Presentation", 5, "14:00", "Client", "Zoom Meeting", "Present updated event concept.")
  ];
}

function createTask(title, dueOffset, priority, category, status, description) {
  return {
    id: makeId(),
    title,
    dueDate: isoDate(dueOffset),
    priority,
    category,
    status,
    description,
    createdAt: new Date().toISOString()
  };
}

function createEvent(name, dateOffset, time, category, location, notes) {
  return {
    id: makeId(),
    name,
    date: isoDate(dateOffset),
    time,
    category,
    location,
    notes,
    createdAt: new Date().toISOString()
  };
}
