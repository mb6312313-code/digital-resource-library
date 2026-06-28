(function () {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const categoryGlyphs = {
    AI: "AI",
    Business: "$",
    Courses: "C",
    Design: "D",
    Guides: "G",
    Marketing: "M",
    Programming: "</>",
    Resources: "R",
    Templates: "T",
    Tools: "W",
    "Video Editing": "V"
  };

  document.addEventListener("DOMContentLoaded", () => {
    initReveals();
    initLogin();
    initApp();
  });

  function initLogin() {
    const form = $("#loginForm");
    if (!form) return;

    const password = $("#passwordInput");
    const toggle = $("#togglePassword");
    const error = $("#loginError");

    toggle.addEventListener("click", () => {
      const isHidden = password.type === "password";
      password.type = isHidden ? "text" : "password";
      toggle.textContent = isHidden ? "Hide" : "Show";
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "";
      const submit = form.querySelector("button[type='submit']");
      submit.disabled = true;
      submit.textContent = "Checking...";

      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: password.value })
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || "Wrong password. Please try again.");
        }
        window.location.href = "/";
      } catch (err) {
        error.textContent = err.message;
      } finally {
        submit.disabled = false;
        submit.textContent = "Open Website";
      }
    });
  }

  function initApp() {
    const resources = window.RESOURCE_LIBRARY || [];
    const grid = $("#resourceGrid");
    if (!grid) return;

    const state = { query: "", category: "All", sort: "az" };
    const categories = ["All", ...new Set(resources.map((item) => item.category))].sort((a, b) => a === "All" ? -1 : a.localeCompare(b));
    const sources = new Set(resources.map((item) => item.source));
    const hosts = new Set(resources.map((item) => item.host));

    fillStats(resources, categories.length - 1, sources.size, hosts.size);
    fillHero(resources, categories);
    fillCategoryFilter(categories);
    renderCategories(resources);
    renderFeatures(resources);
    bindControls(resources, state);
    bindScrollUi();
    renderResources(resources, state);

    window.addEventListener("load", () => setTimeout(() => $("#loader")?.classList.add("hidden"), 300));
    $("#logoutBtn")?.addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST" }).catch(() => {});
      window.location.href = "/login.html";
    });
  }

  function fillStats(resources, categoryCount, sourceCount, hostCount) {
    const values = {
      statResources: resources.length,
      statCategories: categoryCount,
      statSources: sourceCount,
      statHosts: hostCount
    };
    Object.entries(values).forEach(([id, value]) => {
      const el = $("#" + id);
      if (el) animateCounter(el, value);
    });
  }

  function fillHero(resources, categories) {
    $("#heroTotal").textContent = resources.length.toLocaleString();
    const chips = $("#heroChips");
    categories.filter((cat) => cat !== "All").slice(0, 4).forEach((cat) => {
      const count = resources.filter((item) => item.category === cat).length;
      const chip = document.createElement("span");
      chip.textContent = `${cat} · ${count}`;
      chips.appendChild(chip);
    });
  }

  function fillCategoryFilter(categories) {
    const select = $("#categoryFilter");
    select.innerHTML = categories.map((cat) => `<option value="${escapeAttr(cat)}">${cat}</option>`).join("");
  }

  function bindControls(resources, state) {
    const search = $("#searchInput");
    const category = $("#categoryFilter");
    const sort = $("#sortSelect");
    const clear = $("#clearFilters");
    const suggestions = $("#suggestions");

    search.addEventListener("input", () => {
      state.query = search.value.trim();
      renderSuggestions(resources, state.query, suggestions, search);
      renderResources(resources, state);
    });
    search.addEventListener("blur", () => setTimeout(() => suggestions.classList.remove("active"), 160));
    category.addEventListener("change", () => {
      state.category = category.value;
      renderResources(resources, state);
    });
    sort.addEventListener("change", () => {
      state.sort = sort.value;
      renderResources(resources, state);
    });
    clear.addEventListener("click", () => {
      state.query = "";
      state.category = "All";
      state.sort = "az";
      search.value = "";
      category.value = "All";
      sort.value = "az";
      suggestions.classList.remove("active");
      renderResources(resources, state);
    });
  }

  function renderSuggestions(resources, query, container, input) {
    if (query.length < 2) {
      container.classList.remove("active");
      container.innerHTML = "";
      return;
    }
    const q = query.toLowerCase();
    const matches = resources
      .filter((item) => `${item.title} ${item.category} ${item.host}`.toLowerCase().includes(q))
      .slice(0, 6);
    container.innerHTML = matches.map((item) => `<button type="button">${escapeHtml(item.title)}</button>`).join("");
    container.classList.toggle("active", matches.length > 0);
    $$("button", container).forEach((button) => {
      button.addEventListener("mousedown", () => {
        input.value = button.textContent;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        container.classList.remove("active");
      });
    });
  }

  function renderResources(resources, state) {
    const grid = $("#resourceGrid");
    const empty = $("#emptyState");
    const resultCount = $("#resultCount");
    const filtered = filterResources(resources, state);

    resultCount.textContent = `${filtered.length.toLocaleString()} resources`;
    empty.classList.toggle("active", filtered.length === 0);
    grid.innerHTML = filtered.map(resourceCard).join("");
  }

  function filterResources(resources, state) {
    const q = state.query.toLowerCase();
    let output = resources.filter((item) => {
      const inCategory = state.category === "All" || item.category === state.category;
      const inSearch = !q || `${item.title} ${item.description} ${item.category} ${item.host} ${item.source}`.toLowerCase().includes(q);
      return inCategory && inSearch;
    });

    if (state.sort === "latest") {
      output = output.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified) || a.title.localeCompare(b.title));
    } else if (state.sort === "popular") {
      output = output.sort((a, b) => Number(b.popular) - Number(a.popular) || a.title.localeCompare(b.title));
    } else {
      output = output.sort((a, b) => a.title.localeCompare(b.title));
    }
    return output;
  }

  function resourceCard(item) {
    const glyph = categoryGlyphs[item.category] || "R";
    const download = item.type === "Download" || item.url.includes("drive.google.com/file") || item.url.includes("mediafire.com") || item.url.includes("mega.nz");
    return `
      <article class="resource-card reveal visible">
        <div class="card-top">
          <span class="icon-badge">${escapeHtml(glyph)}</span>
          <span class="pill">${escapeHtml(item.type)}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
        <div class="pill-row">
          <span class="pill">${escapeHtml(item.category)}</span>
          <span class="pill">${escapeHtml(item.host)}</span>
        </div>
        <div class="card-actions">
          <a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer">Open</a>
          ${download ? `<a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer">Download</a>` : `<a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer">Visit</a>`}
        </div>
      </article>
    `;
  }

  function renderFeatures(resources) {
    const latest = [...resources].sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified)).slice(0, 3);
    const featured = resources.filter((item) => item.popular).slice(0, 3);
    $("#latestResources").innerHTML = latest.map(featureCard).join("");
    $("#featuredResources").innerHTML = featured.map(featureCard).join("");
  }

  function featureCard(item) {
    return `
      <a class="feature-card reveal visible" href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer">
        <span class="icon-badge">${escapeHtml(categoryGlyphs[item.category] || "R")}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.category)} · ${escapeHtml(item.host)}</p>
      </a>
    `;
  }

  function renderCategories(resources) {
    const counts = resources.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
    $("#categoryGrid").innerHTML = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => `
        <button class="category-card reveal visible" type="button" data-category="${escapeAttr(category)}">
          <span class="icon-badge">${escapeHtml(categoryGlyphs[category] || "R")}</span>
          <h3>${escapeHtml(category)}</h3>
          <p>${count.toLocaleString()} resources</p>
        </button>
      `).join("");
    $$(".category-card").forEach((button) => {
      button.addEventListener("click", () => {
        $("#categoryFilter").value = button.dataset.category;
        $("#categoryFilter").dispatchEvent(new Event("change", { bubbles: true }));
        $("#library").scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  function bindScrollUi() {
    const progress = $("#scrollProgress");
    const back = $("#backToTop");
    window.addEventListener("scroll", () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : "0";
      back.classList.toggle("visible", window.scrollY > 600);
    });
    back.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function initReveals() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    }, { threshold: 0.12 });
    $$(".reveal").forEach((el) => observer.observe(el));
  }

  function animateCounter(el, target) {
    const duration = 1000;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.floor(target * progress).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
})();
