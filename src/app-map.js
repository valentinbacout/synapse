const mapEl = document.getElementById("events-map");
const heatmapToggleEl = document.getElementById("heatmap-toggle");
let leafletMap = null;
let leafletMarkersLayer = null;
let leafletHeatLayer = null;
let leafletRoutesLayer = null;
let isHeatmapEnabled = false;
const markersByEventId = new Map();
const markerEntries = [];
const routeEntries = [];
let pendingMapFocusToken = 0;
let lastFocusedEventId = null;
let shouldRestoreFocusedPopup = false;

let selectedEventId = null;
let isDrawerOpen = false;

function getEventById(eventId) {
  return normalizeEvents(events).find((event) => event.id === eventId) || null;
}

function updateMapPanelUi() {
  const selectedEvent = selectedEventId ? getEventById(selectedEventId) : null;
  const hasSelection = Boolean(selectedEvent);

  if (mapResetBtn) {
    mapResetBtn.hidden = !hasSelection;
  }
  const isMapVisible = !isDrawerOpen;

  if (mapViewToggleEl) {
    mapViewToggleEl.hidden = !hasSelection;
    mapViewToggleEl.textContent = isDrawerOpen ? "Voir la carte" : "Voir la fiche";
    mapViewToggleEl.setAttribute("aria-pressed", isDrawerOpen ? "true" : "false");
  }

  if (heatmapToggleWrapEl) {
    heatmapToggleWrapEl.hidden = !isMapVisible;
    heatmapToggleWrapEl.style.display = isMapVisible ? "" : "none";
  }

  if (heatmapToggleEl) {
    heatmapToggleEl.disabled = !isMapVisible;
  }

  if (mapPanelTitleEl) {
    mapPanelTitleEl.textContent = isDrawerOpen
      ? "Fiche détail événement"
      : "Carte des lieux";
  }

  if (mapViewEl) {
    mapViewEl.classList.toggle("is-active", isMapVisible);
    mapViewEl.setAttribute("aria-hidden", isMapVisible ? "false" : "true");
  }

  if (drawerEl) {
    drawerEl.classList.toggle("is-open", isDrawerOpen);
    drawerEl.setAttribute("aria-hidden", isDrawerOpen ? "false" : "true");
  }

  if (isMapVisible && leafletMap) {
    requestAnimationFrame(() => {
      leafletMap.invalidateSize({ pan: false });
    });
  }
}

function selectEvent(event, options = {}) {
  if (!event || event.id === "TODAY") return;

  selectedEventId = event.id;
  renderDrawerContent(event);
  updateMapSelectionHighlight();

  if (options.openDrawer !== false) {
    isDrawerOpen = true;
  }

  updateMapPanelUi();

  if (options.focusMap !== false) {
    focusMapOnEvent(event);
  }
}

