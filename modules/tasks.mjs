import { emptyState, escapeHtml, formatDate, makeId, parseDate } from "./utils.mjs";

// Tasks: create, read, update, delete, filter, and complete tasks.

let editingTaskId = null;

// Registers task form, edit cancel, and clear-completed events.
export function initTaskModule(app) {
  app.elements.taskForm.addEventListener("submit", (event) => saveTask(event, app));
  app.elements.cancelTaskEdit.addEventListener("click", () => resetTaskForm(app));
  app.elements.clearCompleted.addEventListener("click", () => clearCompletedTasks(app));
}

// Applies search, status, priority, category, and date filters.
export function filteredTasks(app) {
  const query = app.elements.globalSearch.value.trim().toLowerCase();
  const status = app.elements.statusFilter.value;
  const priority = app.elements.priorityFilter.value;
  const category = app.elements.categoryFilter.value.trim().toLowerCase();
  const date = app.elements.dateFilter.value;

  return [...app.state.tasks]
    .filter((task) => {
      const matchesQuery = !query || `${task.title} ${task.description} ${task.category}`.toLowerCase().includes(query);
      const matchesStatus = status === "all" || task.status === status;
      const matchesPriority = priority === "all" || task.priority === priority;
      const matchesCategory = !category || task.category.toLowerCase().includes(category);
      const matchesDate = !date || task.dueDate === date;
      return matchesQuery && matchesStatus && matchesPriority && matchesCategory && matchesDate;
    })
    .sort((a, b) => parseDate(a.dueDate) - parseDate(b.dueDate));
}

// Renders the filtered task list.
export function renderTaskModule(app) {
  const list = document.querySelector("#taskList");
  const tasks = filteredTasks(app);
  list.innerHTML = "";

  if (tasks.length === 0) {
    list.append(emptyState("No matching tasks found."));
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement("article");
    item.className = `planner-item${task.status === "Completed" ? " completed" : ""}`;
    item.innerHTML = `
      <div class="item-topline">
        <div>
          <strong>${escapeHtml(task.title)}</strong>
          <p>Due ${formatDate(task.dueDate)} • ${escapeHtml(task.category)}</p>
        </div>
        <div class="badge-row">
          <span class="badge ${task.priority.toLowerCase()}">${task.priority}</span>
          <span class="badge ${task.status === "In Progress" ? "progress" : ""}">${task.status}</span>
        </div>
      </div>
      ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ""}
      <div class="item-actions">
        <button class="small-button" data-action="toggle-task" data-id="${task.id}">${task.status === "Completed" ? "Mark Pending" : "Mark Complete"}</button>
        <button class="small-button secondary-button" data-action="edit-task" data-id="${task.id}">Edit</button>
        <button class="small-button delete-button" data-action="delete-task" data-id="${task.id}">Delete</button>
      </div>
    `;
    list.append(item);
  });
}

// Handles task-specific actions triggered from task row buttons.
export function handleTaskAction(action, id, app) {
  if (action === "toggle-task") {
    const task = app.state.tasks.find((item) => item.id === id);
    if (task) task.status = task.status === "Completed" ? "Pending" : "Completed";
    app.persist();
    return true;
  }

  if (action === "edit-task") {
    editTask(id, app);
    return true;
  }

  if (action === "delete-task") {
    app.state.tasks = app.state.tasks.filter((task) => task.id !== id);
    app.persist();
    return true;
  }

  return false;
}

// Creates a new task or updates the task currently being edited.
function saveTask(event, app) {
  event.preventDefault();

  const task = {
    id: editingTaskId || makeId(),
    title: document.querySelector("#taskTitle").value.trim(),
    dueDate: document.querySelector("#taskDueDate").value,
    priority: document.querySelector("#taskPriority").value,
    category: document.querySelector("#taskCategory").value.trim() || "General",
    status: document.querySelector("#taskStatus").value,
    description: document.querySelector("#taskDescription").value.trim(),
    createdAt: new Date().toISOString()
  };

  if (editingTaskId) {
    app.state.tasks = app.state.tasks.map((item) => item.id === editingTaskId ? task : item);
  } else {
    app.state.tasks.push(task);
  }

  resetTaskForm(app);
  app.persist();
}

// Loads a task into the form for editing.
function editTask(id, app) {
  const task = app.state.tasks.find((item) => item.id === id);
  if (!task) return;

  editingTaskId = id;
  document.querySelector("#taskTitle").value = task.title;
  document.querySelector("#taskDueDate").value = task.dueDate;
  document.querySelector("#taskPriority").value = task.priority;
  document.querySelector("#taskCategory").value = task.category;
  document.querySelector("#taskStatus").value = task.status;
  document.querySelector("#taskDescription").value = task.description || "";
  app.elements.cancelTaskEdit.classList.remove("hidden");
  document.querySelector("#tasks").scrollIntoView({ behavior: "smooth" });
}

// Restores the task form to create mode.
function resetTaskForm(app) {
  editingTaskId = null;
  app.elements.taskForm.reset();
  document.querySelector("#taskPriority").value = "Medium";
  document.querySelector("#taskStatus").value = "Pending";
  app.elements.cancelTaskEdit.classList.add("hidden");
}

// Removes completed tasks from local storage.
function clearCompletedTasks(app) {
  app.state.tasks = app.state.tasks.filter((task) => task.status !== "Completed");
  app.persist();
}
