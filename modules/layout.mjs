// Layout helpers for the app shell.

export function renderHeader(appHeader = "#appHeader") {
  const target = document.querySelector(appHeader);
  if (!target) return;

  target.innerHTML = `
    <header class="topbar">
      <div class="header-identity">
        <strong>PlanIt Smart Planner and Event Management System</strong>
      </div>

      <label class="search-box" for="globalSearch">
        <span>⌕</span>
        <input id="globalSearch" type="search" placeholder="Search tasks, events...">
      </label>

      <div class="top-actions">
        <a class="icon-button" href="/notifications" data-route="notifications" aria-label="Notifications">♢<span id="notificationCount">0</span></a>
        <button id="themeToggle" class="icon-button" type="button" aria-label="Toggle theme">☾</button>
        <div class="profile">
          <div id="profileAvatar" class="avatar">JD</div>
          <div>
            <strong id="profileNameTop">Jane Doe</strong>
            <span id="profileRoleTop">Event Planner</span>
          </div>
        </div>
      </div>
    </header>
  `;
}

export function renderFooter(appFooter = "#appFooter") {
  const target = document.querySelector(appFooter);
  if (!target) return;
  const currentDate = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  target.innerHTML = `
    <footer class="app-footer">
      <a href="https://www.linkedin.com/in/mosesette" target="_blank" rel="noreferrer">https://www.linkedin.com/in/mosesette</a>
      <span>BYU Pathway</span>
      <span>${currentDate}</span>
    </footer>
  `;
}
