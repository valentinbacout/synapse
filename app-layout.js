function renderLeftPanelCategories() {
  if (!leftPanelCategoriesEl) return;

  const rowsByCategory = new Map(
    Array.from(stage.querySelectorAll(".category-row")).map((row) => [row.dataset.category, row])
  );
  const lifeBandLabel = stage.querySelector(".life-band-global .life-band-label");
  const stageRect = stage.getBoundingClientRect();
  const availableCategories = getAvailableCategories();

  leftPanelCategoriesEl.innerHTML = "";
  leftPanelCategoriesEl.style.gap = "0px";

  let previousBottom = 0;

  availableCategories.forEach((category) => {
    const row = rowsByCategory.get(category);
    const label = CATEGORY_LABELS[category] || category || "";
    const markerColor = CATEGORY_COLORS[category] || "#94a3b8";
    const isVisible = isCategoryVisible(category);

    const item = document.createElement("button");
    item.type = "button";
    item.className = `left-category-label ${isVisible ? "is-active" : "is-inactive"}`;
    item.dataset.category = category;
    item.setAttribute("aria-pressed", isVisible ? "true" : "false");
    item.setAttribute("title", isVisible ? "Masquer dans la timeline" : "Afficher dans la timeline");

    let blockTop = previousBottom;
    let blockHeight = ROW_H();

    if (category === "living_place" && lifeBandLabel) {
      const labelRect = lifeBandLabel.getBoundingClientRect();
      blockTop = Math.max(0, labelRect.top - stageRect.top);
      blockHeight = Math.max(24, labelRect.height);
    } else if (row) {
      const rowRect = row.getBoundingClientRect();
      blockTop = Math.max(0, rowRect.top - stageRect.top);
      blockHeight = rowRect.height;
    }

    const marginTop = Math.max(0, blockTop - previousBottom);
    item.style.marginTop = `${marginTop}px`;
    item.style.height = `${blockHeight}px`;

    previousBottom = blockTop + blockHeight;

    item.style.setProperty("--category-accent", markerColor);
    item.innerHTML = buildCategoryToggleMarkup(label, isVisible);

    const checkbox = item.querySelector('input[type="checkbox"]');
    checkbox?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleCategoryVisibility(category);
    });

    item.addEventListener("click", () => toggleCategoryVisibility(category));
    leftPanelCategoriesEl.appendChild(item);
  });
}

function renderNetworkCategories() {
  if (!networkCategoriesEl) return;

  const availableCategories = getAvailableCategories();
  networkCategoriesEl.innerHTML = "";

  availableCategories.forEach((category) => {
    const label = CATEGORY_LABELS[category] || category || "";
    const markerColor = CATEGORY_COLORS[category] || "#94a3b8";
    const isVisible = isCategoryVisible(category);

    const item = document.createElement("button");
    item.type = "button";
    item.className = `network-category-toggle ${isVisible ? "is-active" : "is-inactive"}`;
    item.dataset.category = category;
    item.setAttribute("aria-pressed", isVisible ? "true" : "false");
    item.setAttribute("title", isVisible ? "Masquer dans le network" : "Afficher dans le network");
    item.style.setProperty("--category-accent", markerColor);
    item.innerHTML = buildNetworkCategoryToggleMarkup(label, isVisible);

    const checkbox = item.querySelector('input[type="checkbox"]');
    checkbox?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleCategoryVisibility(category);
    });

    item.addEventListener("click", () => toggleCategoryVisibility(category));
    networkCategoriesEl.appendChild(item);
  });
}


let isSyncingScroll = false;
let hasInitialTodayScroll = false;

function syncVerticalScroll(source, target) {
  if (!source || !target) return;
  if (isSyncingScroll) return;

  const sourceMaxScroll = Math.max(0, source.scrollHeight - source.clientHeight);
  const targetMaxScroll = Math.max(0, target.scrollHeight - target.clientHeight);
  const progress = sourceMaxScroll === 0 ? 0 : source.scrollTop / sourceMaxScroll;

  isSyncingScroll = true;
  target.scrollTop = progress * targetMaxScroll;

  requestAnimationFrame(() => {
    isSyncingScroll = false;
  });
}

function setupSynchronizedVerticalScroll() {
  if (!scroller || !leftPanelInnerEl) return;
  if (setupSynchronizedVerticalScroll.initialized) return;

  scroller.addEventListener("scroll", () => {
    syncVerticalScroll(scroller, leftPanelInnerEl);
  }, { passive: true });

  leftPanelInnerEl.addEventListener("scroll", () => {
    syncVerticalScroll(leftPanelInnerEl, scroller);
  }, { passive: true });

  setupSynchronizedVerticalScroll.initialized = true;
}


