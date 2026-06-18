const DEFAULT_PAGE = "dashboard";

export function goToPage(pageName) {
  history.pushState(null, "", pageName === DEFAULT_PAGE ? "/" : `/${pageName}`);
  window.dispatchEvent(new CustomEvent("planner:navigate", { detail: { pageName } }));
}

export function initRouter() {
  const pages = [...document.querySelectorAll("[data-page]")];
  const pageNames = new Set(pages.map((page) => page.dataset.page));
  const routeLinks = [...document.querySelectorAll("[data-route]")];

  function getRequestedPage() {
    const cleanPath = window.location.pathname.replace(/^\/+/, "");
    return cleanPath || DEFAULT_PAGE;
  }

  function showPage(pageName = getRequestedPage(), shouldReplace = false) {
    const activePage = pageNames.has(pageName) ? pageName : DEFAULT_PAGE;

    pages.forEach((page) => {
      page.classList.toggle("active-page", page.dataset.page === activePage);
    });

    routeLinks.forEach((item) => {
      item.classList.toggle("active", item.dataset.route === activePage);
    });

    const cleanUrl = activePage === DEFAULT_PAGE ? "/" : `/${activePage}`;
    if (window.location.pathname !== cleanUrl) {
      const historyMethod = shouldReplace ? "replaceState" : "pushState";
      history[historyMethod](null, "", cleanUrl);
    }

    window.scrollTo(0, 0);
  }

  routeLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showPage(link.dataset.route);
    });
  });

  window.addEventListener("popstate", () => showPage(getRequestedPage(), true));
  window.addEventListener("planner:navigate", (event) => showPage(event.detail?.pageName || getRequestedPage(), true));
  showPage(getRequestedPage(), true);
}
