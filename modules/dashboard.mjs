import { emptyState, escapeHtml, formatDate, isoDate, parseDate, startOfDay, addDays } from "./utils.mjs";

// summary cards, upcoming activity feed, and today's tasks.

export function initDashboardModule(app) {
  document.querySelector("#todayDate").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  [app.elements.globalSearch, app.elements.statusFilter, app.elements.priorityFilter, app.elements.categoryFilter, app.elements.dateFilter]
    .forEach((element) => element.addEventListener("input", app.render));
}

// Refreshes all dashboard-only display areas.
export function renderDashboardModule(app) {
  renderStats(app);
  renderActivities(app);
  renderTodayTasks(app);
}

// Calculates the four dashboard statistics.
function renderStats(app) {
  const now = startOfDay(new Date());
  const weekAhead = addDays(now, 7);
  const completed = app.state.tasks.filter((task) => task.status === "Completed");
  const upcoming = app.state.events.filter((item) => {
    const date = parseDate(item.date);
    return date >= now && date <= weekAhead;
  });
  const overdue = app.state.tasks.filter((task) => task.status !== "Completed" && parseDate(task.dueDate) < now);

  document.querySelector("#totalTasks").textContent = app.state.tasks.length;
  document.querySelector("#upcomingEvents").textContent = upcoming.length;
  document.querySelector("#completedTasks").textContent = completed.length;
  document.querySelector("#overdueTasks").textContent = overdue.length;
}

// Combines tasks and events into one upcoming activity timeline.
function renderActivities(app) {
  const list = document.querySelector("#activityList");
  const today = startOfDay(new Date());
  const activities = [
    ...app.state.tasks
      .filter((task) => task.status !== "Completed")
      .map((task) => ({ type: "Task", title: task.title, detail: task.category, date: task.dueDate, time: "Task due" })),
    ...app.state.events.map((event) => ({ type: "Event", title: event.name, detail: event.location, date: event.date, time: event.time }))
  ]
    .filter((activity) => parseDate(activity.date) >= today)
    .sort((a, b) => parseDate(a.date) - parseDate(b.date))
    .slice(0, 7);

  list.innerHTML = "";
  if (activities.length === 0) {
    list.append(emptyState("No upcoming activities."));
    return;
  }

  activities.forEach((activity) => {
    const row = document.createElement("article");
    row.className = "activity-row";
    row.innerHTML = `
      <div class="activity-icon">${activity.type === "Event" ? "□" : "✓"}</div>
      <div>
        <strong>${escapeHtml(activity.title)}</strong>
        <p>${escapeHtml(activity.detail)}</p>
      </div>
      <div class="meta">${formatDate(activity.date)}<br>${escapeHtml(activity.time)}</div>
    `;
    list.append(row);
  });
}

// Shows tasks due today in the compact dashboard panel.
function renderTodayTasks(app) {
  const list = document.querySelector("#todayTaskList");
  const today = isoDate(0);
  const tasks = app.state.tasks.filter((task) => task.dueDate === today).slice(0, 5);
  list.innerHTML = "";

  if (tasks.length === 0) {
    list.append(emptyState("No tasks due today."));
    return;
  }

  tasks.forEach((task) => {
    const row = document.createElement("article");
    row.className = "compact-row";
    row.innerHTML = `
      <strong>${escapeHtml(task.title)}</strong>
      <p>${task.priority} priority • ${task.status}</p>
    `;
    list.append(row);
  });
}
