const API_BASE_URL = "/api";

export async function registerAccount(account) {
  return sendRequest("/auth/register", account);
}

export async function loginAccount(credentials) {
  return sendRequest("/auth/login", credentials);
}

export async function getCountries() {
  return sendRequest("/countries", null, "GET");
}

export async function getGoogleCalendarStatus() {
  return sendRequest("/google/status", null, "GET");
}

export async function syncGoogleCalendar(events, timezone) {
  return sendRequest("/google/sync", { events, timezone });
}

async function sendRequest(path, payload, method = "POST") {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: payload ? JSON.stringify(payload) : undefined
    });
  } catch {
    throw new Error("Backend is not running. Start it with npm run backend.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}
