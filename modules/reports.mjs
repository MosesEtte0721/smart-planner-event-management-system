// Reports: productivity metrics, task statistics, event statistics, and progress.

export function renderReportsModule(app) {
  const total = app.state.tasks.length;
  const completed = app.state.tasks.filter((task) => task.status === "Completed").length;
  const rate = total ? Math.round((completed / total) * 100) : 0;
  const eventCount = app.state.events.length;
  const highPriority = app.state.tasks.filter((task) => task.priority === "High").length;

  document.querySelector("#completionRate").textContent = `${rate}%`;
  document.querySelector("#completionBar").style.width = `${rate}%`;

  const list = document.querySelector("#reportList");
  list.innerHTML = "";
  [
    `Completed tasks: ${completed} of ${total}`,
    `High priority tasks: ${highPriority}`,
    `Total events scheduled: ${eventCount}`,
    `Progress tracking: ${rate >= 70 ? "Strong productivity" : "Needs focus"}`
  ].forEach((text) => {
    const row = document.createElement("article");
    row.className = "compact-row";
    row.textContent = text;
    list.append(row);
  });
}
