// Admin area: user counts, inactive-user cleanup, and activity monitoring.

export function initAdminModule(app) {
  app.elements.removeInactive.addEventListener("click", () => {
    app.state.users = app.state.users.filter((user) => user.active);
    app.state.systemMessages.unshift("Inactive users removed.");
    app.persist();
  });
}

// Renders simple system statistics for the admin area.
export function renderAdminModule(app) {
  const active = app.state.users.filter((user) => user.active).length;
  const inactive = app.state.users.length - active;
  const list = document.querySelector("#adminStats");
  list.innerHTML = "";

  [
    `Users: ${app.state.users.length}`,
    `Active users: ${active}`,
    `Inactive users: ${inactive}`,
    `Activities monitored: ${app.state.tasks.length + app.state.events.length}`
  ].forEach((text) => {
    const row = document.createElement("article");
    row.className = "compact-row";
    row.textContent = text;
    list.append(row);
  });
}
