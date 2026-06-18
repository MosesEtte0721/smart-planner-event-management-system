import { emptyState, escapeHtml, isoDate, parseDate, startOfDay } from "./utils.mjs";

// Notifications: task alerts, event reminders, overdue notices, and system messages.

export function renderNotificationModule(app) {
  const list = document.querySelector("#notificationsList");
  const notifications = getNotifications(app);
  document.querySelector("#notificationCount").textContent = notifications.length;
  list.innerHTML = "";

  if (notifications.length === 0) {
    list.append(emptyState("No notifications right now."));
    return;
  }

  notifications.forEach((message) => {
    const row = document.createElement("article");
    row.className = "compact-row";
    row.innerHTML = `<strong>${escapeHtml(message.title)}</strong><p>${escapeHtml(message.body)}</p>`;
    list.append(row);
  });
}

// Builds notification messages from saved preferences and planner records.
function getNotifications(app) {
  const now = startOfDay(new Date());
  const tomorrow = isoDate(1);
  const messages = [];

  if (app.state.settings.taskAlerts) {
    app.state.tasks
      .filter((task) => task.status !== "Completed" && parseDate(task.dueDate) < now)
      .forEach((task) => messages.push({ title: "Overdue task", body: task.title }));

    app.state.tasks
      .filter((task) => task.status !== "Completed" && task.dueDate === tomorrow)
      .forEach((task) => messages.push({ title: "Task due soon", body: task.title }));
  }

  if (app.state.settings.eventReminders) {
    app.state.events
      .filter((item) => item.date === tomorrow)
      .forEach((item) => messages.push({ title: "Event reminder", body: `${item.name} is tomorrow at ${item.time}` }));
  }

  app.state.systemMessages.slice(0, 2).forEach((body) => messages.push({ title: "System message", body }));
  return messages;
}
