function render() {
  const previousScrollLeft = scroller ? scroller.scrollLeft : 0;
  const previousScrollTop = scroller ? scroller.scrollTop : 0;
  const previousLeftPanelScrollTop = leftPanelInnerEl ? leftPanelInnerEl.scrollTop : 0;

  stage.innerHTML = "";

  const visibleCategories = getActiveCategories();
  const normalized = normalizeEvents(events);
  const contentEvents = normalized.filter((event) => event.id !== "TODAY");
  const livingPlaceEvents = contentEvents
    .filter((event) => event.category === "living_place" && event.visualType === "range")
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  const todayEvent = normalized.find((event) => event.id === "TODAY");

  const minMsRaw = Math.min(...normalized.map((event) => event.startMs));
  const maxMsRaw = Math.max(...normalized.map((event) => event.endMs));
  const spanRaw = Math.max(1, maxMsRaw - minMsRaw);
  const pad = Math.max(DAY_MS * 20, Math.round(spanRaw * 0.03));
  const minMs = minMsRaw - pad;
  const maxMs = maxMsRaw + pad;

  const zoom = parseInt(zoomEl.value, 10) / 100;
  const pxPerMs = PX_BASE * zoom;
  const timelineWidth = Math.max(860, Math.round((maxMs - minMs) * pxPerMs));
  const totalWidth = LABEL_COL() + timelineWidth;

  stage.style.width = `${totalWidth}px`;

  const ticks = buildTicks(minMs, maxMs, timelineWidth);
  stage.appendChild(ticks);

  const globalLifeBands = buildGlobalLifeBands(livingPlaceEvents, minMs, pxPerMs);
  stage.appendChild(globalLifeBands);

  if (!visibleCategories.has("living_place")) {
    globalLifeBands.classList.add("is-muted");
  }

  const SAFE_ZONE = parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue("--life-band-safe-zone")) || 40;

  let previousRowBottomOverflow = 0;
  let isFirstVisibleTimelineRow = true;
  const INTER_ROW_GAP = 18;
  const FIRST_ROW_TOP_GAP = SAFE_ZONE;

  CATEGORY_ORDER.forEach((category) => {
    if (category === "living_place") return;
    const row = document.createElement("div");
    row.className = "category-row";
    row.dataset.category = category;

    const track = document.createElement("div");
    track.className = "row-track";

    const categoryEvents = contentEvents
      .filter((event) => event.category === category && category !== "living_place")
      .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

    categoryEvents.minMs = minMs;

    const { laneOf: initialLaneOf } = assignLanes(categoryEvents);
    const initialPlacementData = computeLabelPlacements(categoryEvents, pxPerMs, timelineWidth, initialLaneOf);
    const laneOf = adjustPointLanesInsideRanges(categoryEvents, initialLaneOf, initialPlacementData.placements);
    const placementData = computeLabelPlacements(categoryEvents, pxPerMs, timelineWidth, laneOf);
    const rowLayout = buildRowLayout(placementData.topLevelHeights, placementData.bottomLevelHeights);
    const rowExtents = computeRowExtents(
      categoryEvents,
      placementData.placements,
      rowLayout,
      laneOf
    );

    row.style.height = `${rowLayout.height}px`;

    const dynamicMarginTop = isFirstVisibleTimelineRow
      ? Math.max(FIRST_ROW_TOP_GAP, rowExtents.topOverflow + INTER_ROW_GAP)
      : Math.max(
        INTER_ROW_GAP,
        previousRowBottomOverflow + rowExtents.topOverflow + INTER_ROW_GAP
      );

    row.style.marginTop = `${dynamicMarginTop}px`;
    isFirstVisibleTimelineRow = false;

    const axis = document.createElement("div");
    axis.className = "row-axis";
    axis.style.top = `${rowLayout.axisY}px`;
    axis.style.transform = "translateY(-50%)";
    track.appendChild(axis);

    categoryEvents.forEach((event) => {
      const lane = laneOf.get(event.id) ?? 0;
      const yOffset = laneOffset(lane);
      track.appendChild(
        createEventEl(
          event,
          minMs,
          pxPerMs,
          placementData.placements.get(event.id),
          rowLayout,
          yOffset
        )
      );
    });

    row.appendChild(track);
    stage.appendChild(row);

    previousRowBottomOverflow = rowExtents.bottomOverflow;
  });

  if (todayEvent) {
    const todayX = LABEL_COL() + (todayEvent.startMs - minMs) * pxPerMs;

    const todayLine = document.createElement("div");
    todayLine.className = "today-line";
    todayLine.style.left = `${todayX}px`;
    todayLine.style.top = `${ticks.offsetHeight}px`;
    todayLine.style.height = `${Math.max(0, stage.scrollHeight - ticks.offsetHeight)}px`;
    todayLine.dataset.category = "system";
    todayLine.dataset.alwaysVisible = "true";
    stage.appendChild(todayLine);

    const todayLabel = document.createElement("div");
    todayLabel.className = "today-badge";
    todayLabel.style.left = `${todayX}px`;
    todayLabel.textContent = "Aujourd’hui";
    todayLabel.dataset.category = "system";
    todayLabel.dataset.alwaysVisible = "true";
    stage.appendChild(todayLabel);
  }

  if (isTimelineTabActive()) {
    renderLeftPanelCategories();
    setupSynchronizedVerticalScroll();
  }
  renderNetworkCategories();

  if (scroller) {
    scroller.scrollLeft = previousScrollLeft;
    scroller.scrollTop = previousScrollTop;
  }

  if (scroller && leftPanelInnerEl) {
    syncVerticalScroll(scroller, leftPanelInnerEl);
  }

  renderEventsMap(visibleCategories);
  renderKnowledgeGraph();
  updateMapPanelUi();
}

zoomEl?.addEventListener("input", render);

heatmapToggleEl?.addEventListener("change", (event) => {
  isHeatmapEnabled = event.target.checked;
  renderEventsMap(getActiveCategories());
});

window.addEventListener("resize", () => {
  render();
  requestAnimationFrame(() => switchTab(activeTab));
});

render();
renderStats();

tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tabTarget));
});

switchTab("timeline");

drawerCloseEl?.addEventListener("click", closeDrawer);
mapViewToggleEl?.addEventListener("click", () => {
  if (!selectedEventId) return;

  if (isDrawerOpen) {
    closeDrawer();
    return;
  }

  const selectedEvent = getEventById(selectedEventId);
  if (selectedEvent) {
    openDrawer(selectedEvent, { focusMap: false });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (activeStatDetailKey) {
    closeStatsModal();
    return;
  }
  if (isDrawerOpen) closeDrawer();
});

updateMapPanelUi();

requestAnimationFrame(() => {
  if (hasInitialTodayScroll) return;

  const today = normalizeEvents(events).find((event) => event.id === "TODAY");
  if (!today || !scroller) return;

  const normalized = normalizeEvents(events);
  const minMs = Math.min(...normalized.map((event) => event.startMs));
  const maxMs = Math.max(...normalized.map((event) => event.endMs));
  const spanRaw = Math.max(1, maxMs - minMs);
  const pad = Math.max(DAY_MS * 20, Math.round(spanRaw * 0.03));
  const zoom = parseInt(zoomEl.value, 10) / 100;
  const pxPerMs = PX_BASE * zoom;
  const x = LABEL_COL() + ((today.startMs - (minMs - pad)) * pxPerMs);
  scroller.scrollLeft = Math.max(0, x - scroller.clientWidth / 2);
  hasInitialTodayScroll = true;
});


if (mapResetBtn) {
  mapResetBtn.addEventListener("click", () => {
    selectedEventId = null;
    isDrawerOpen = false;
    lastFocusedEventId = null;
    shouldRestoreFocusedPopup = false;

    if (leafletMap) {
      leafletMap.closePopup();
    }

    updateMapSelectionHighlight();
    updateMapPanelUi();
    resetMapViewToInitial();
  });
}


[networkRepulsionEl, networkLinkStrengthEl, networkLinkDistanceEl, networkCenterForceEl]
  .filter(Boolean)
  .forEach((control) => {
    control.addEventListener("input", () => {
      updateNetworkControlLabels();
      renderKnowledgeGraph();
    });
  });

networkFitBtnEl?.addEventListener("click", () => {
  networkGraphState?.fitGraph?.(true);
});

networkResetBtnEl?.addEventListener("click", () => {
  if (networkRepulsionEl) networkRepulsionEl.value = String(NETWORK_DEFAULTS.repulsion);
  if (networkLinkStrengthEl) networkLinkStrengthEl.value = String(NETWORK_DEFAULTS.linkStrength);
  if (networkLinkDistanceEl) networkLinkDistanceEl.value = String(NETWORK_DEFAULTS.linkDistance);
  if (networkCenterForceEl) networkCenterForceEl.value = String(NETWORK_DEFAULTS.centerForce);
  updateNetworkControlLabels();
  networkGraphState?.destroy?.();
  renderKnowledgeGraph();
  networkGraphState?.resetPositions?.();
});
