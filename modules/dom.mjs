// Collects DOM nodes used across the planner so selectors live in one place.
export function getElements() {
  return {
    registerForm: document.querySelector("#registerForm"),
    registerCountry: document.querySelector("#registerCountry"),
    loginForm: document.querySelector("#loginForm"),
    logoutButton: document.querySelector("#logoutButton"),
    profileForm: document.querySelector("#profileForm"),
    settingsForm: document.querySelector("#settingsForm"),
    taskForm: document.querySelector("#taskForm"),
    eventForm: document.querySelector("#eventForm"),
    cancelTaskEdit: document.querySelector("#cancelTaskEdit"),
    cancelEventEdit: document.querySelector("#cancelEventEdit"),
    clearCompleted: document.querySelector("#clearCompleted"),
    removeInactive: document.querySelector("#removeInactive"),
    connectGoogleCalendar: document.querySelector("#connectGoogleCalendar"),
    syncCalendar: document.querySelector("#syncCalendar"),
    previousMonth: document.querySelector("#previousMonth"),
    nextMonth: document.querySelector("#nextMonth"),
    calendarGrid: document.querySelector("#calendarGrid"),
    themeToggle: document.querySelector("#themeToggle"),
    globalSearch: document.querySelector("#globalSearch"),
    statusFilter: document.querySelector("#statusFilter"),
    priorityFilter: document.querySelector("#priorityFilter"),
    categoryFilter: document.querySelector("#categoryFilter"),
    dateFilter: document.querySelector("#dateFilter"),
    countrySelect: document.querySelector("#countrySelect"),
    timezoneSelect: document.querySelector("#timezoneSelect")
  };
}
