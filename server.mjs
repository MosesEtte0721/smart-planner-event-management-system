import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { fallbackCountries } from "./modules/countryData.mjs";

loadLocalEnv();

const ROOT_DIR = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const DIST_DIR = join(ROOT_DIR, "dist");
const DB_PATH = join(ROOT_DIR, "data", "db.json");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://127.0.0.1:${PORT}/api/google/callback`;
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const REST_COUNTRIES_URL = "https://restcountries.com/v3.1/all?fields=name,cca2,flag,timezones,idd";
const REST_COUNTRIES_FALLBACK_URL = "https://restcountries.com/v3.1/all";

function loadLocalEnv() {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), ".env");
  if (!existsSync(envPath)) return;

  const contents = readFileSync(envPath, "utf8");
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ||= value;
  });
}

class JsonDatabase {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async read() {
    try {
      const contents = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(contents);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        googleCalendar: parsed.googleCalendar || { tokens: null, syncedEvents: {} }
      };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      return { users: [], googleCalendar: { tokens: null, syncedEvents: {} } };
    }
  }

  async write(data) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  }
}

class AuthService {
  constructor(database) {
    this.database = database;
  }

  async register(payload) {
    const name = this.clean(payload.name);
    const email = this.clean(payload.email).toLowerCase();
    const password = String(payload.password || "");
    const role = this.clean(payload.role) || "Member";
    const country = this.clean(payload.country);
    const countryName = this.clean(payload.countryName);
    const countryFlag = this.clean(payload.countryFlag);
    const countryCallingCode = this.clean(payload.countryCallingCode);
    const timezone = this.clean(payload.timezone);

    if (!name || !email || !password || !country) {
      return this.error(400, "Name, email, password, and country are required.");
    }

    if (password.length < 6) {
      return this.error(400, "Password must be at least 6 characters.");
    }

    const db = await this.database.read();
    if (db.users.some((user) => user.email === email)) {
      return this.error(409, "An account already exists for this email.");
    }

    const now = new Date().toISOString();
    const user = {
      id: randomUUID(),
      name,
      email,
      passwordHash: this.hashPassword(password),
      role,
      country,
      countryName,
      countryFlag,
      countryCallingCode,
      timezone,
      active: true,
      createdAt: now,
      lastLoginAt: now
    };

    db.users.push(user);
    await this.database.write(db);

    return {
      statusCode: 201,
      body: {
        message: "Registration complete.",
        user: this.publicUser(user),
        session: { isLoggedIn: true, email }
      }
    };
  }

  async login(payload) {
    const email = this.clean(payload.email).toLowerCase();
    const password = String(payload.password || "");

    if (!email || !password) {
      return this.error(400, "Email and password are required.");
    }

    const db = await this.database.read();
    const user = db.users.find((item) => item.email === email);

    if (!user || user.passwordHash !== this.hashPassword(password)) {
      return this.error(401, "Invalid email or password.");
    }

    user.active = true;
    user.lastLoginAt = new Date().toISOString();
    await this.database.write(db);

    return {
      statusCode: 200,
      body: {
        message: "Login successful.",
        user: this.publicUser(user),
        session: { isLoggedIn: true, email }
      }
    };
  }

  publicUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      country: user.country,
      countryName: user.countryName,
      countryFlag: user.countryFlag,
      countryCallingCode: user.countryCallingCode,
      timezone: user.timezone,
      active: user.active,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };
  }

  hashPassword(password) {
    return createHash("sha256").update(password).digest("hex");
  }

  clean(value = "") {
    return String(value).trim();
  }

  error(statusCode, message) {
    return {
      statusCode,
      body: { message }
    };
  }
}

class CountriesService {
  async list() {
    const data = await this.fetchCountries().catch(() => fallbackCountries);

    const countries = data
      .map((country) => country.callingCode ? country : this.normalize(country))
      .filter((country) => country.name && country.code)
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      statusCode: 200,
      body: { countries }
    };
  }

  async fetchCountries() {
    const primary = await this.fetchCountrySource(REST_COUNTRIES_URL);
    if (Array.isArray(primary)) return primary;

    const fallback = await this.fetchCountrySource(REST_COUNTRIES_FALLBACK_URL);
    if (Array.isArray(fallback)) return fallback;

    throw new Error("REST Countries did not return a country list.");
  }

  async fetchCountrySource(url) {
    const response = await fetch(url);
    const data = await response.json();
    return response.ok ? data : null;
  }

  normalize(country) {
    return {
      name: country.name?.common || country.cca2,
      code: country.cca2,
      callingCode: this.getCallingCode(country.idd),
      flag: country.flag || "",
      timezones: Array.isArray(country.timezones) ? country.timezones : []
    };
  }

  getCallingCode(idd = {}) {
    const root = idd.root || "";
    const suffix = Array.isArray(idd.suffixes) ? idd.suffixes[0] || "" : "";
    return root && suffix ? `${root}${suffix}` : root;
  }
}

class GoogleCalendarService {
  constructor({ database, clientId, clientSecret, redirectUri, frontendUrl }) {
    this.database = database;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.frontendUrl = frontendUrl;
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  async status() {
    const db = await this.database.read();
    return {
      statusCode: 200,
      body: {
        configured: this.isConfigured(),
        connected: Boolean(db.googleCalendar.tokens?.refresh_token || db.googleCalendar.tokens?.access_token),
        syncedEvents: Object.keys(db.googleCalendar.syncedEvents || {}).length
      }
    };
  }

  getAuthUrl() {
    if (!this.isConfigured()) {
      return null;
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: GOOGLE_CALENDAR_SCOPE,
      access_type: "offline",
      prompt: "consent"
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(code) {
    if (!code) {
      return `${this.frontendUrl}/calendar`;
    }

    const tokenData = await this.exchangeCodeForTokens(code);
    const db = await this.database.read();
    db.googleCalendar.tokens = this.normalizeTokens(tokenData, db.googleCalendar.tokens);
    db.googleCalendar.syncedEvents ||= {};
    await this.database.write(db);
    return `${this.frontendUrl}/calendar`;
  }

  async syncEvents(payload) {
    if (!this.isConfigured()) {
      return this.error(400, "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    }

    const events = Array.isArray(payload.events) ? payload.events : [];
    if (events.length === 0) {
      return this.error(400, "No events are available to sync.");
    }

    const timezone = payload.timezone || "UTC";
    const db = await this.database.read();
    const accessToken = await this.getAccessToken(db);
    const syncedEvents = db.googleCalendar.syncedEvents || {};
    let created = 0;
    let updated = 0;

    for (const plannerEvent of events) {
      const googleEvent = this.toGoogleEvent(plannerEvent, timezone);
      const existingGoogleId = syncedEvents[plannerEvent.id];

      if (existingGoogleId) {
        const updateResult = await this.saveGoogleEvent(accessToken, googleEvent, existingGoogleId);
        if (updateResult.recreated) {
          created += 1;
        } else {
          updated += 1;
        }
        syncedEvents[plannerEvent.id] = updateResult.id;
      } else {
        const createResult = await this.saveGoogleEvent(accessToken, googleEvent);
        syncedEvents[plannerEvent.id] = createResult.id;
        created += 1;
      }
    }

    db.googleCalendar.syncedEvents = syncedEvents;
    db.googleCalendar.lastSyncedAt = new Date().toISOString();
    await this.database.write(db);

    return {
      statusCode: 200,
      body: {
        message: `Google Calendar sync complete. Created ${created}, updated ${updated}.`,
        created,
        updated,
        lastSyncedAt: db.googleCalendar.lastSyncedAt
      }
    };
  }

  async getAccessToken(db) {
    const tokens = db.googleCalendar.tokens;
    if (!tokens) {
      throw new Error("Google Calendar is not connected. Connect your Google account first.");
    }

    if (tokens.access_token && Date.now() < Number(tokens.expires_at || 0) - 60_000) {
      return tokens.access_token;
    }

    if (!tokens.refresh_token) {
      throw new Error("Google Calendar access expired. Reconnect your Google account.");
    }

    const refreshed = await this.refreshTokens(tokens.refresh_token);
    db.googleCalendar.tokens = this.normalizeTokens(refreshed, tokens);
    await this.database.write(db);
    return db.googleCalendar.tokens.access_token;
  }

  async exchangeCodeForTokens(code) {
    return this.postGoogleToken({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: "authorization_code"
    });
  }

  async refreshTokens(refreshToken) {
    return this.postGoogleToken({
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "refresh_token"
    });
  }

  async postGoogleToken(payload) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.error || "Google token request failed.");
    }

    return data;
  }

  async saveGoogleEvent(accessToken, googleEvent, googleEventId = null) {
    const encodedCalendarId = encodeURIComponent("primary");
    const encodedEventId = googleEventId ? encodeURIComponent(googleEventId) : "";
    const url = googleEventId
      ? `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events/${encodedEventId}`
      : `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events`;
    const method = googleEventId ? "PATCH" : "POST";
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(googleEvent)
    });
    const data = await response.json();

    if (response.status === 404 && googleEventId) {
      const recreated = await this.saveGoogleEvent(accessToken, googleEvent);
      return { ...recreated, recreated: true };
    }

    if (!response.ok) {
      throw new Error(data.error?.message || "Google Calendar event sync failed.");
    }

    return { id: data.id, recreated: false };
  }

  toGoogleEvent(plannerEvent, timezone) {
    const start = this.toLocalDateTime(plannerEvent.date, plannerEvent.time || "09:00");
    const end = this.addHoursToLocalDateTime(start, 1);

    return {
      summary: plannerEvent.name,
      location: plannerEvent.location || "",
      description: plannerEvent.notes || "",
      start: {
        dateTime: start,
        timeZone: timezone
      },
      end: {
        dateTime: end,
        timeZone: timezone
      },
      extendedProperties: {
        private: {
          planItEventId: plannerEvent.id
        }
      }
    };
  }

  toLocalDateTime(date, time) {
    return `${date}T${time.length === 5 ? `${time}:00` : time}`;
  }

  addHoursToLocalDateTime(value, hours) {
    const date = new Date(value);
    date.setHours(date.getHours() + hours);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  normalizeTokens(newTokens, existingTokens = {}) {
    return {
      ...existingTokens,
      ...newTokens,
      expires_at: Date.now() + Number(newTokens.expires_in || 0) * 1000
    };
  }

  error(statusCode, message) {
    return {
      statusCode,
      body: { message }
    };
  }
}

class PlanItApiServer {
  constructor({ authService, countriesService, googleCalendarService, port }) {
    this.authService = authService;
    this.countriesService = countriesService;
    this.googleCalendarService = googleCalendarService;
    this.port = port;
    this.server = createServer((request, response) => this.handle(request, response));
  }

  start() {
    this.server.listen(this.port, HOST, () => {
      console.log(`PlanIt server running at http://${HOST}:${this.port}`);
    });
  }

  async handle(request, response) {
    this.setCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const route = `${request.method} ${url.pathname}`;

      if (route === "GET /api/health") {
        this.sendJson(response, 200, { ok: true, message: "PlanIt backend is running." });
        return;
      }

      if (route === "GET /api/countries") {
        const result = await this.countriesService.list();
        this.sendJson(response, result.statusCode, result.body);
        return;
      }

      if (route === "GET /api/google/status") {
        const result = await this.googleCalendarService.status();
        this.sendJson(response, result.statusCode, result.body);
        return;
      }

      if (route === "GET /api/google/connect") {
        const authUrl = this.googleCalendarService.getAuthUrl();
        if (!authUrl) {
          this.sendJson(response, 400, { message: "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
          return;
        }
        response.writeHead(302, { Location: authUrl });
        response.end();
        return;
      }

      if (route === "GET /api/google/callback") {
        const redirectUrl = await this.googleCalendarService.handleCallback(url.searchParams.get("code"));
        response.writeHead(302, { Location: redirectUrl });
        response.end();
        return;
      }

      if (route === "POST /api/auth/register") {
        const result = await this.authService.register(await this.readJsonBody(request));
        this.sendJson(response, result.statusCode, result.body);
        return;
      }

      if (route === "POST /api/auth/login") {
        const result = await this.authService.login(await this.readJsonBody(request));
        this.sendJson(response, result.statusCode, result.body);
        return;
      }

      if (route === "POST /api/google/sync") {
        const result = await this.googleCalendarService.syncEvents(await this.readJsonBody(request));
        this.sendJson(response, result.statusCode, result.body);
        return;
      }

      if (url.pathname.startsWith("/api")) {
        this.sendJson(response, 404, { message: "API route not found." });
        return;
      }

      await this.serveFrontend(url, response);
    } catch (error) {
      this.sendJson(response, 500, { message: "Server error.", detail: error.message });
    }
  }

  async readJsonBody(request) {
    let body = "";

    for await (const chunk of request) {
      body += chunk;
      if (body.length > 1_000_000) throw new Error("Request body is too large.");
    }

    return body ? JSON.parse(body) : {};
  }

  setCorsHeaders(response) {
    response.setHeader("Access-Control-Allow-Origin", FRONTEND_URL);
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, { "Content-Type": "application/json" });
    response.end(JSON.stringify(payload));
  }

  async serveFrontend(url, response) {
    const assetPath = await this.resolveFrontendAsset(url.pathname);

    if (!assetPath) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Build the frontend first with npm run build.");
      return;
    }

    const contents = await readFile(assetPath);
    response.writeHead(200, {
      "Content-Type": this.contentTypeFor(assetPath)
    });
    response.end(contents);
  }

  async resolveFrontendAsset(pathname) {
    const requestedPath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
    const assetPath = normalize(join(DIST_DIR, requestedPath));
    const relativePath = relative(DIST_DIR, assetPath);
    const isInsideDist = relativePath && !relativePath.startsWith("..") && !relativePath.includes(":");

    if (isInsideDist && await this.isFile(assetPath)) {
      return assetPath;
    }

    const fallbackPath = join(DIST_DIR, "index.html");
    return await this.isFile(fallbackPath) ? fallbackPath : null;
  }

  async isFile(filePath) {
    try {
      return (await stat(filePath)).isFile();
    } catch {
      return false;
    }
  }

  contentTypeFor(filePath) {
    const types = {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".webp": "image/webp"
    };

    return types[extname(filePath)] || "application/octet-stream";
  }
}

const database = new JsonDatabase(DB_PATH);
const authService = new AuthService(database);
const countriesService = new CountriesService();
const googleCalendarService = new GoogleCalendarService({
  database,
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: GOOGLE_REDIRECT_URI,
  frontendUrl: FRONTEND_URL
});
const apiServer = new PlanItApiServer({ authService, countriesService, googleCalendarService, port: PORT });

apiServer.start();
