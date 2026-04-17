const events = window.timelineEvents || [];

const stage = document.getElementById("stage");
const zoomEl = document.getElementById("zoom");
const scroller = document.getElementById("scroller");
const drawerEl = document.getElementById("event-drawer");
const drawerContentEl = document.getElementById("event-drawer-content");
const drawerCloseEl = document.getElementById("event-drawer-close");
const mapViewEl = document.getElementById("map-view");
const mapViewToggleEl = document.getElementById("map-view-toggle");
const mapPanelTitleEl = document.getElementById("map-panel-title");
const mapResetBtn = document.getElementById("map-reset-btn");
const heatmapToggleWrapEl = document.getElementById("heatmap-toggle-wrap");
const leftPanelCategoriesEl = document.getElementById("left-panel-categories");
const leftPanelInnerEl = document.querySelector(".timeline-left-panel__inner");
const networkCategoriesEl = document.getElementById("network-categories");
const tabButtons = Array.from(document.querySelectorAll("[data-tab-target]"));
const tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));
const networkGraphEl = document.getElementById("network-graph");
const networkFitBtnEl = document.getElementById("network-fit-btn");
const networkResetBtnEl = document.getElementById("network-reset-btn");
const networkRepulsionEl = document.getElementById("network-repulsion");
const networkRepulsionValueEl = document.getElementById("network-repulsion-value");
const networkLinkStrengthEl = document.getElementById("network-link-strength");
const networkLinkStrengthValueEl = document.getElementById("network-link-strength-value");
const networkLinkDistanceEl = document.getElementById("network-link-distance");
const networkLinkDistanceValueEl = document.getElementById("network-link-distance-value");
const networkCenterForceEl = document.getElementById("network-center-force");
const networkCenterForceValueEl = document.getElementById("network-center-force-value");
const NETWORK_CATEGORY_DISPLAY_STATES = ["full", "transparent", "hidden"];
const NETWORK_CATEGORY_DISPLAY_LABELS = {
  full: "Plein",
  transparent: "Transparent",
  hidden: "Masqué"
};

const DAY_MS = 24 * 60 * 60 * 1000;
const LABEL_COL = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--label-col")) || 0;
const ROW_H = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--row-h")) || 80;
const ROW_GAP = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--row-gap")) || 2;
const PX_BASE = 1 / DAY_MS;
const LABEL_MIN_W = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--event-label-min-w")) || 56;
const LABEL_MAX_W = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--event-label-max-w")) || 170;
const LABEL_H = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--event-label-h")) || 34;
const LANE_STEP = 12;
const LEVEL_STEP = 16;
const TOP_PAD = 8;
const BOTTOM_PAD = 8;
const LABEL_AXIS_GAP = 6;
const MARKER_ZONE = 12;
const LABEL_CLEARANCE = 10;
const OVERLAP = 20;
const TOTAL_COUNTRIES = 195;

const CATEGORY_ORDER = ["living_place", "education", "association", "event", "travel", "projects", "personal"];
const CATEGORY_LABELS = {
  education: "Éducation / Travail",
  living_place: "Lieux de vie",
  projects: "Projets",
  event: "Événement",
  travel: "Voyages / Vacances",
  association: "Association",
  personal: "Personnel",
  system: "Système"
};

const MAP_CATEGORY_LABELS = CATEGORY_LABELS;

const CATEGORY_COLORS = {
  education: "#DD2517",
  association: "#ffbdcb",
  event: "#FFD401",
  travel: "#22a6b3",
  projects: "#f0932b",
  personal: "#ffffff",
  living_place: "#00c3ff",
  system: "#ffffff"
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "today") {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
    }
    return new Date(value);
  }
  throw new Error(`Date invalide: ${value}`);
}

const toMs = (value) => toDate(value).getTime();

function formatShort(ms) {
  return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" })
    .format(new Date(ms))
    .replace(".", "");
}

function normalizeEvents(inputEvents) {
  return inputEvents.map((event) => {
    const normalized = { ...event };

    normalized.description = normalized.description ?? normalized.desc ?? "";
    normalized.details = normalized.details ?? normalized.detail ?? normalized.longDescription ?? "";
    normalized.category = normalized.category || normalized.type || "personal";

    const usesNewSchema = normalized.startDate !== undefined || normalized.endDate !== undefined;
    const startValue = usesNewSchema
      ? (normalized.startDate ?? normalized.endDate)
      : (normalized.start ?? normalized.time);
    const endValue = usesNewSchema
      ? normalized.endDate
      : (normalized.type === "range" ? normalized.end : undefined);

    normalized.visualType = endValue !== undefined ? "range" : "point";
    normalized.startMs = toMs(startValue);
    normalized.endMs = endValue !== undefined ? toMs(endValue) : normalized.startMs;

    if (normalized.endMs < normalized.startMs) {
      [normalized.startMs, normalized.endMs] = [normalized.endMs, normalized.startMs];
    }

    return normalized;
  });
}

const activeCategories = new Set(
  events
    .map((event) => event.category)
    .filter((category) => category && category !== "system" && category !== "personal")
);

const networkCategoryDisplayStates = new Map(
  CATEGORY_ORDER
    .filter((category) => events.some((event) => event.category === category))
    .map((category) => [category, "full"])
);

function getActiveCategories() {
  return new Set(activeCategories);
}

function isCategoryVisible(category) {
  if (!category || category === "system") return true;
  return activeCategories.has(category);
}

function toggleCategoryVisibility(category) {
  if (!category || category === "system") return;

  if (activeCategories.has(category)) {
    activeCategories.delete(category);
  } else {
    activeCategories.add(category);
  }

  render();
}

function getNetworkCategoryDisplayState(category) {
  if (!category || category === "system") return "full";
  return networkCategoryDisplayStates.get(category) || "full";
}

function setNetworkCategoryDisplayState(category, nextState) {
  if (!category || category === "system") return;
  if (!NETWORK_CATEGORY_DISPLAY_STATES.includes(nextState)) return;

  networkCategoryDisplayStates.set(category, nextState);
  renderNetworkCategories();
  renderKnowledgeGraph();
}

function cycleNetworkCategoryDisplayState(category) {
  if (!category || category === "system") return;

  const currentState = getNetworkCategoryDisplayState(category);
  const currentIndex = NETWORK_CATEGORY_DISPLAY_STATES.indexOf(currentState);
  const nextState = NETWORK_CATEGORY_DISPLAY_STATES[(currentIndex + 1) % NETWORK_CATEGORY_DISPLAY_STATES.length];

  setNetworkCategoryDisplayState(category, nextState);
}

let activeTab = "timeline";

function isTimelineTabActive() {
  const timelinePanel = document.querySelector('[data-tab-panel="timeline"]');
  return Boolean(timelinePanel && !timelinePanel.hidden);
}

function switchTab(tabName) {
  if (!tabName) return;
  activeTab = tabName;

  tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === tabName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tabName;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });

  if (tabName === "timeline") {
    requestAnimationFrame(() => {
      render();
      if (leafletMap) leafletMap.invalidateSize({ pan: false });
      if (selectedEventId) updateMapSelectionHighlight();
    });
  }

  if (tabName === "network") {
    requestAnimationFrame(() => {
      renderKnowledgeGraph();
    });
  }
}

function buildTicks(minMs, maxMs, width) {
  const ticksEl = document.createElement("div");
  ticksEl.className = "time-ticks";

  const startYear = new Date(minMs).getFullYear();
  const endYear = new Date(maxMs).getFullYear();

  for (let year = startYear; year <= endYear; year += 1) {
    const ms = new Date(year, 0, 1).getTime();
    if (ms < minMs || ms > maxMs) continue;

    const x = (ms - minMs) * (width / (maxMs - minMs));
    const tick = document.createElement("div");
    tick.className = "tick";
    tick.style.left = `${x}px`;
    tick.textContent = year;
    ticksEl.appendChild(tick);
  }

  return ticksEl;
}

function assignLanes(categoryEvents) {
  const sorted = [...categoryEvents].sort(
    (a, b) => a.startMs - b.startMs || a.endMs - b.endMs
  );

  const laneEnds = [];
  const laneOf = new Map();

  const toSignedLane = (lane) => {
    if (lane === 0) return 0;
    const level = Math.ceil(lane / 2);
    return lane % 2 === 1 ? level : -level;
  };

  for (const event of sorted) {
    let placed = false;

    for (let lane = 0; lane < laneEnds.length; lane += 1) {
      if (laneEnds[lane] <= event.startMs) {
        laneEnds[lane] = event.endMs;
        laneOf.set(event.id, lane);
        placed = true;
        break;
      }
    }

    if (!placed) {
      laneEnds.push(event.endMs);
      laneOf.set(event.id, laneEnds.length - 1);
    }
  }

  for (const event of sorted) {
    laneOf.set(event.id, toSignedLane(laneOf.get(event.id) ?? 0));
  }

  return { laneOf, laneCount: laneEnds.length };
}

function adjustPointLanesInsideRanges(categoryEvents, laneOf = new Map(), placementMap = new Map()) {
  const adjustedLaneOf = new Map(laneOf);
  const sorted = [...categoryEvents].sort(
    (a, b) => a.startMs - b.startMs || a.endMs - b.endMs
  );

  const rangeEvents = sorted.filter((event) => event.visualType === "range");
  const alternationByRange = new Map();
  const signedLaneEndByRange = new Map();

  for (const event of sorted) {
    if (event.visualType !== "point") continue;

    const overlappingRanges = rangeEvents.filter((rangeEvent) => (
      rangeEvent.startMs <= event.startMs && event.startMs <= rangeEvent.endMs
    ));

    if (!overlappingRanges.length) continue;

    const primaryRange = overlappingRanges
      .slice()
      .sort((a, b) => a.startMs - b.startMs || b.endMs - a.endMs)[0];

    const rangePlacement = placementMap.get(primaryRange.id);
    const rangeLabelSide = rangePlacement?.side
      || ((adjustedLaneOf.get(primaryRange.id) ?? 0) > 0 ? "bottom" : "top");

    const firstPointLane = rangeLabelSide === "bottom" ? -1 : 1;
    const cursor = alternationByRange.get(primaryRange.id) ?? 0;
    const preferredLane = cursor % 2 === 0
      ? firstPointLane
      : -firstPointLane;
    alternationByRange.set(primaryRange.id, cursor + 1);

    const occupied = signedLaneEndByRange.get(primaryRange.id) ?? new Map();

    let signedLane = preferredLane;
    if ((occupied.get(signedLane) ?? -Infinity) > event.startMs) {
      const fallbackLane = -preferredLane;
      if ((occupied.get(fallbackLane) ?? -Infinity) <= event.startMs) {
        signedLane = fallbackLane;
      } else {
        let level = 2;
        while ((occupied.get(level) ?? -Infinity) > event.startMs && (occupied.get(-level) ?? -Infinity) > event.startMs) {
          level += 1;
        }

        const preferredLevel = firstPointLane > 0 ? level : -level;
        const fallbackLevel = -preferredLevel;
        signedLane = (occupied.get(preferredLevel) ?? -Infinity) <= event.startMs
          ? preferredLevel
          : fallbackLevel;
      }
    }

    occupied.set(signedLane, event.endMs);
    signedLaneEndByRange.set(primaryRange.id, occupied);
    adjustedLaneOf.set(event.id, signedLane);
  }

  return adjustedLaneOf;
}

function laneOffset(laneIndex) {
  if (laneIndex === 0) return 0;

  const sign = laneIndex > 0 ? 1 : -1;
  const level = Math.abs(laneIndex);

  return sign * level * LANE_STEP;
}

function createLabelMarkup(event) {
  const dateText = event.visualType === "point"
    ? formatShort(event.startMs)
    : `${formatShort(event.startMs)} - ${formatShort(event.endMs)}`;

  return `
      <div class="event-date">${escapeHtml(dateText)}</div>
      <div class="event-title">${escapeHtml(event.title)}</div>
      ${event.description ? `<div class="event-desc">${escapeHtml(event.description)}</div>` : ""}
    `;
}

let labelMeasureEl = null;

function getLabelMeasureEl() {
  if (!labelMeasureEl) {
    labelMeasureEl = document.createElement("div");
    labelMeasureEl.className = "event-label event-label-measure";
    document.body.appendChild(labelMeasureEl);
  }
  return labelMeasureEl;
}

function measureEventLabel(event, timelineWidth) {
  const el = getLabelMeasureEl();
  el.className = `event-label event-label-measure ${event.visualType === "range" ? "compact-range" : ""}`;
  el.innerHTML = createLabelMarkup(event);

  const minWidth = LABEL_MIN_W();
  const maxWidth = Math.max(minWidth, Math.min(LABEL_MAX_W(), timelineWidth - 8));

  el.style.width = "max-content";
  const measuredWidth = Math.ceil(el.getBoundingClientRect().width);
  const width = Math.max(minWidth, Math.min(maxWidth, measuredWidth));

  el.style.width = `${width}px`;
  const height = Math.ceil(el.getBoundingClientRect().height);

  return { width, height };
}

function placeOnSide(levels, xLeft, xRight) {
  for (let level = 0; level < levels.length; level += 1) {
    if (levels[level] <= xLeft + OVERLAP) {
      levels[level] = xRight + 8;
      return level;
    }
  }
  levels.push(xRight + 8);
  return levels.length - 1;
}

function computeLabelPlacements(categoryEvents, pxPerMs, timelineWidth, laneOf = new Map()) {
  const placements = new Map();
  const MIN_NEXT_EVENT_GAP = 12;

  const positionedEvents = categoryEvents.map((event) => {
    const anchorX = Math.max(4, (event.startMs - categoryEvents.minMs) * pxPerMs);
    const measured = measureEventLabel(event, timelineWidth);
    const naturalWidth = Math.max(LABEL_MIN_W(), Math.min(measured.width, timelineWidth - 8));

    return {
      event,
      anchorX,
      height: measured.height,
      naturalWidth,
      width: naturalWidth,
      xLeft: Math.min(anchorX, Math.max(4, timelineWidth - naturalWidth - 4)),
      side: null,
      level: 0,
      lane: laneOf.get(event.id) ?? 0
    };
  });

  const topLevelsEndPass1 = [];
  const bottomLevelsEndPass1 = [];

  let lastFreeSide = "top";
  let lastFreeAnchorX = -Infinity;
  let lastPointSide = null;
  let lastPointIndex = -Infinity;

  positionedEvents.forEach((item, index) => {
    const { xLeft, naturalWidth, lane, anchorX, event } = item;
    const xRight = xLeft + naturalWidth;
    const forcedSide = lane > 0 ? "bottom" : lane < 0 ? "top" : null;
    const isPoint = event.visualType === "point";
    const followsPointSequence = isPoint && index === lastPointIndex + 1;

    const simulatedTopLevel = (() => {
      const slot = topLevelsEndPass1.findIndex((end) => end <= xLeft);
      return slot === -1 ? topLevelsEndPass1.length : slot;
    })();

    const simulatedBottomLevel = (() => {
      const slot = bottomLevelsEndPass1.findIndex((end) => end <= xLeft);
      return slot === -1 ? bottomLevelsEndPass1.length : slot;
    })();

    let side;

    if (forcedSide) {
      side = forcedSide;
    } else if (followsPointSequence && lastPointSide) {
      side = lastPointSide === "top" ? "bottom" : "top";
    } else if (simulatedTopLevel < simulatedBottomLevel) {
      side = "top";
    } else if (simulatedBottomLevel < simulatedTopLevel) {
      side = "bottom";
    } else {
      const isCloseToPreviousFreeLabel = anchorX - lastFreeAnchorX < 220;
      side = isCloseToPreviousFreeLabel ? lastFreeSide : "top";
    }

    item.side = side;

    if (isPoint) {
      lastPointSide = side;
      lastPointIndex = index;
    } else {
      lastPointSide = null;
      lastPointIndex = -Infinity;
    }

    if (!forcedSide) {
      lastFreeSide = side;
      lastFreeAnchorX = anchorX;
    }

    if (side === "top") {
      placeOnSide(topLevelsEndPass1, xLeft, xRight);
    } else {
      placeOnSide(bottomLevelsEndPass1, xLeft, xRight);
    }
  });

  ["top", "bottom"].forEach((side) => {
    const items = positionedEvents
      .filter((item) => item.side === side)
      .sort((a, b) => a.xLeft - b.xLeft);

    items.forEach((item, idx) => {
      const nextItem = items[idx + 1];
      let width = item.naturalWidth;

      if (nextItem) {
        const nextLeftEdge = nextItem.xLeft;
        const availableWidth = nextLeftEdge - item.xLeft - MIN_NEXT_EVENT_GAP;

        if (availableWidth > 0) {
          width = Math.min(width, availableWidth);
        }
      }

      item.width = Math.max(LABEL_MIN_W(), Math.min(width, timelineWidth - 8));
      item.xLeft = Math.min(item.anchorX, Math.max(4, timelineWidth - item.width - 4));
    });
  });

  const topLevelsEnd = [];
  const bottomLevelsEnd = [];
  const topLevelHeights = [];
  const bottomLevelHeights = [];

  positionedEvents.forEach((item) => {
    const xRight = item.xLeft + item.width;
    const level = item.side === "top"
      ? placeOnSide(topLevelsEnd, item.xLeft, xRight)
      : placeOnSide(bottomLevelsEnd, item.xLeft, xRight);

    item.level = level;

    if (item.side === "top") {
      topLevelHeights[level] = Math.max(topLevelHeights[level] || 0, item.height);
    } else {
      bottomLevelHeights[level] = Math.max(bottomLevelHeights[level] || 0, item.height);
    }

    placements.set(item.event.id, {
      side: item.side,
      level: item.level,
      xLeft: item.xLeft,
      width: item.width,
      height: item.height,
      anchorX: item.anchorX,
      lane: item.lane
    });
  });

  return {
    placements,
    topCount: topLevelsEnd.length,
    bottomCount: bottomLevelsEnd.length,
    topLevelHeights,
    bottomLevelHeights
  };
}

function buildRowLayout(topLevelHeights = [], bottomLevelHeights = []) {
  const defaultHeight = LABEL_H();
  const topStack = topLevelHeights.length
    ? topLevelHeights.reduce((sum, height, index) => sum + (index > 0 ? LEVEL_STEP : 0) + Math.max(defaultHeight, height), 0)
    : 0;
  const bottomStack = bottomLevelHeights.length
    ? bottomLevelHeights.reduce((sum, height, index) => sum + (index > 0 ? LEVEL_STEP : 0) + Math.max(defaultHeight, height), 0)
    : 0;

  const axisY = TOP_PAD + topStack + LABEL_AXIS_GAP + MARKER_ZONE / 2;
  const topBase = axisY - LABEL_AXIS_GAP;
  const bottomBase = axisY + LABEL_AXIS_GAP;
  const height = Math.max(ROW_H(), bottomBase + bottomStack + BOTTOM_PAD);

  return { defaultHeight, axisY, topBase, bottomBase, height, topLevelHeights, bottomLevelHeights };
}

function computeRowExtents(categoryEvents, placementMap, rowLayout, laneOf = new Map()) {
  let topOverflow = 0;
  let bottomOverflow = 0;

  categoryEvents.forEach((event) => {
    if (event.id === "TODAY") return;

    const placement = placementMap.get(event.id);
    if (!placement) return;

    const lane = laneOf.get(event.id) ?? 0;
    const yOffset = laneOffset(lane);
    const axisY = rowLayout.axisY + yOffset;

    const levelHeights = placement.side === "top"
      ? rowLayout.topLevelHeights
      : rowLayout.bottomLevelHeights;

    const levelOffset = getLevelOffset(
      levelHeights,
      placement.level,
      rowLayout.defaultHeight
    );

    const levelHeight = Math.max(
      rowLayout.defaultHeight,
      levelHeights[placement.level] || 0
    );

    const labelTop = placement.side === "top"
      ? axisY - LABEL_AXIS_GAP - LABEL_CLEARANCE - levelOffset - levelHeight
      : axisY + LABEL_AXIS_GAP + LABEL_CLEARANCE + levelOffset;

    const labelBottom = labelTop + placement.height;

    if (labelTop < 0) {
      topOverflow = Math.max(topOverflow, -labelTop);
    }

    if (labelBottom > rowLayout.height) {
      bottomOverflow = Math.max(bottomOverflow, labelBottom - rowLayout.height);
    }
  });

  return { topOverflow, bottomOverflow };
}

function getLevelOffset(levelHeights = [], level, defaultHeight = LABEL_H()) {
  let offset = 0;
  for (let i = 0; i < level; i += 1) {
    offset += Math.max(defaultHeight, levelHeights[i] || 0) + LEVEL_STEP;
  }
  return offset;
}

function createLifeBand(event, minMs, pxPerMs) {
  const band = document.createElement("div");
  band.className = "life-band";

  const xStart = (event.startMs - minMs) * pxPerMs;
  const xEnd = (event.endMs - minMs) * pxPerMs;

  band.style.left = `${xStart}px`;
  band.style.width = `${Math.max(8, xEnd - xStart)}px`;

  const label = document.createElement("div");
  label.className = "life-band-label";
  label.textContent = event.title;
  band.appendChild(label);

  return band;
}

function buildGlobalLifeBands(livingPlaceEvents, minMs, pxPerMs) {
  const layer = document.createElement("div");
  layer.className = "life-band-global";
  layer.dataset.category = "living_place";

  livingPlaceEvents.forEach((event) => {
    layer.appendChild(createLifeBand(event, minMs, pxPerMs));
  });

  return layer;
}

function createEventEl(event, minMs, pxPerMs, placement, rowLayout, yOffset = 0) {
  const eventLayer = document.createElement("div");
  eventLayer.className = "event";
  eventLayer.dataset.category = event.category;
  eventLayer.dataset.alwaysVisible = event.id === "TODAY" ? "true" : "false";

  const isVisibleCategory = isCategoryVisible(event.category);
  if (!isVisibleCategory) {
    eventLayer.classList.add("event--muted");
  }

  const isInteractive = event.id !== "TODAY";
  if (isInteractive) {
    eventLayer.classList.add("event--interactive");
  }

  const makeInteractive = (targetEl) => {
    if (!isInteractive || !targetEl) return;
    targetEl.tabIndex = 0;
    targetEl.setAttribute("role", "button");
    targetEl.setAttribute("aria-label", `Centrer la carte sur ${event.title || "cet événement"}`);
    targetEl.addEventListener("click", (evt) => {
      evt.stopPropagation();
      selectEvent(event, { openDrawer: false });
    });
    targetEl.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        selectEvent(event, { openDrawer: false });
      }
    });
  };

  const xStart = (event.startMs - minMs) * pxPerMs;
  const xEnd = (event.endMs - minMs) * pxPerMs;
  const markerX = xStart;
  const axisY = rowLayout.axisY + yOffset;

  if (event.visualType === "range") {
    const bar = document.createElement("div");
    bar.className = "event-bar";
    bar.style.left = `${xStart}px`;
    bar.style.width = `${Math.max(5, xEnd - xStart)}px`;
    bar.style.top = `${axisY}px`;
    bar.style.transform = "translateY(-50%)";
    bar.style.background = event.color || "#8ab4ff";
    eventLayer.appendChild(bar);
    makeInteractive(bar);
  } else {
    const dot = document.createElement("div");
    dot.className = "event-dot";
    dot.style.left = `${markerX}px`;
    dot.style.top = `${axisY}px`;
    dot.style.transform = "translate(-50%, -50%)";
    dot.style.background = event.color || "#8ab4ff";
    eventLayer.appendChild(dot);
    makeInteractive(dot);
  }

  if (event.id !== "TODAY") {
    const label = document.createElement("div");
    label.className = `event-label ${event.visualType === "range" ? "compact-range" : ""}`;
    if (!isVisibleCategory) {

    }
    label.style.setProperty("--event-color", event.color || "#8ab4ff");
    label.style.left = `${placement.xLeft}px`;
    label.style.width = `${placement.width}px`;
    label.innerHTML = createLabelMarkup(event);

    const levelHeights = placement.side === "top" ? rowLayout.topLevelHeights : rowLayout.bottomLevelHeights;
    const levelOffset = getLevelOffset(levelHeights, placement.level, rowLayout.defaultHeight);

    const levelHeight = Math.max(
      rowLayout.defaultHeight,
      (placement.side === "top" ? rowLayout.topLevelHeights : rowLayout.bottomLevelHeights)[placement.level] || 0
    );

    const labelTop = placement.side === "top"
      ? axisY - LABEL_AXIS_GAP - LABEL_CLEARANCE - levelOffset - levelHeight
      : axisY + LABEL_AXIS_GAP + LABEL_CLEARANCE + levelOffset;

    label.style.top = `${labelTop}px`;
    eventLayer.appendChild(label);
    makeInteractive(label);

    const vertical = document.createElement("div");
    vertical.className = "event-connector-v";
    vertical.style.left = `${placement.anchorX}px`;

    const MIN_CONNECTOR = 12;

    if (placement.side === "top") {
      const h = axisY - (labelTop + placement.height);
      vertical.style.top = `${labelTop + placement.height}px`;
      vertical.style.height = `${Math.max(MIN_CONNECTOR, h)}px`;
    } else {
      const h = labelTop - axisY;
      vertical.style.top = `${axisY}px`;
      vertical.style.height = `${Math.max(MIN_CONNECTOR, h)}px`;
    }
    eventLayer.appendChild(vertical);
  }

  return eventLayer;
}

function formatEventDateRange(event) {
  if (event.visualType === "range") {
    return `${formatFullDate(event.startMs)} — ${formatFullDate(event.endMs)}`;
  }
  return formatFullDate(event.startMs);
}

function getEventLocation(event) {
  return [event.city, event.country].filter(Boolean).join(", ");
}

function normalizeYoutubeEmbed(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.href);
    const videoId = parsed.searchParams.get("v");
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace(/^\/+/, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (parsed.pathname.includes("/embed/")) return parsed.toString();
  } catch (error) {
    return "";
  }
  return "";
}

function normalizeGalleryItems(gallery) {
  if (!Array.isArray(gallery)) return [];
  return gallery
    .map((item) => typeof item === "string" ? { src: item, alt: "", caption: "" } : item)
    .filter((item) => item && item.src)
    .map((item) => ({
      src: item.src,
      alt: item.alt || item.caption || "Photo liée à l'événement",
      caption: item.caption || ""
    }));
}

function getNestedStepCollections(step) {
  if (!step || typeof step !== "object") return [];

  return [
    ...(Array.isArray(step.steps) ? step.steps : []),
    ...(Array.isArray(step.steps_bis) ? step.steps_bis : [])
  ];
}

function getEventSteps(event, options = {}) {
  const includeRegularSteps = options.includeRegularSteps ?? true;
  const includeBisSteps = options.includeBisSteps ?? true;
  return [
    ...(includeRegularSteps && Array.isArray(event?.steps) ? event.steps : []),
    ...(includeBisSteps && Array.isArray(event?.steps_bis) ? event.steps_bis : [])
  ];
}

function flattenStepTree(steps, options = {}) {
  if (!Array.isArray(steps) || !steps.length) return [];

  const includeContainersWithoutCoordinates = options.includeContainersWithoutCoordinates ?? false;
  const returnToParentAfterChildren = options.returnToParentAfterChildren ?? false;
  const parentPath = Array.isArray(options.parentPath) ? options.parentPath : [];
  const parentDate = options.parentDate;
  const parentColor = options.parentColor;
  const parentCategory = options.parentCategory;
  const parentTitle = options.parentTitle || "";

  const flattened = [];

  steps.forEach((step, index) => {
    if (!step || typeof step !== "object") return;

    const lat = Number(step.latitude);
    const lng = Number(step.longitude);
    const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);
    const dates = getStepDateMs(step, parentDate);
    const stepPath = [...parentPath, index];
    const stepTitle = step.title || step.city || parentTitle || "Étape";
    const nestedSteps = getNestedStepCollections(step);

    const createFlatStep = (sourceStep, extra = {}) => ({
      ...sourceStep,
      ...extra,
      latitude: hasCoordinates ? lat : sourceStep.latitude,
      longitude: hasCoordinates ? lng : sourceStep.longitude,
      startMs: dates.startMs,
      endMs: dates.endMs,
      visualType: sourceStep.endDate ? "range" : "point",
      _path: stepPath,
      _hasCoordinates: hasCoordinates,
      _level: parentPath.length,
      _stepTitle: stepTitle,
      _parentTitle: parentTitle || "",
      _inheritedColor: sourceStep.color || parentColor,
      _inheritedCategory: getMapCategory(sourceStep, parentCategory)
    });

    if (hasCoordinates || includeContainersWithoutCoordinates) {
      flattened.push(createFlatStep(step));
    }

    if (nestedSteps.length) {
      flattened.push(
        ...flattenStepTree(nestedSteps, {
          includeContainersWithoutCoordinates,
          returnToParentAfterChildren,
          parentPath: stepPath,
          parentDate: step.date ?? step.startDate ?? parentDate,
          parentColor: step.color || parentColor,
          parentCategory: getMapCategory(step, parentCategory),
          parentTitle: stepTitle
        })
      );

      if (returnToParentAfterChildren && hasCoordinates) {
        flattened.push(createFlatStep(step, {
          _returnsToParent: true,
          _stepTitle: `${stepTitle} (retour)`
        }));
      }
    }
  });

  return flattened;
}

function createStepTreeMarkup(steps, fallbackDate, depth = 0) {
  if (!Array.isArray(steps) || !steps.length) return "";

  return `
    <ul class="event-steps-list${depth > 0 ? " event-steps-list--nested" : ""}">
      ${steps.map((step) => {
        if (!step || typeof step !== "object") return "";

        const dates = getStepDateMs(step, fallbackDate);
        const title = step.title || step.city || "Étape";
        const location = [step.city, step.country].filter(Boolean).join(", ");
        const childrenMarkup = createStepTreeMarkup(
          getNestedStepCollections(step),
          step.date ?? step.startDate ?? fallbackDate,
          depth + 1
        );

        return `
          <li class="event-steps-list__item">
            <div class="event-steps-list__card">
              <div class="event-steps-list__header">
                <span class="event-steps-list__title">${escapeHtml(title)}</span>
                <span class="event-steps-list__date">${escapeHtml(
                  step.endDate
                    ? `${formatFullDate(dates.startMs)} — ${formatFullDate(dates.endMs)}`
                    : formatFullDate(dates.startMs)
                )}</span>
              </div>
              ${location ? `<div class="event-steps-list__meta">📍 ${escapeHtml(location)}</div>` : ""}
              ${step.description ? `<div class="event-steps-list__meta">${escapeHtml(step.description)}</div>` : ""}
              ${childrenMarkup}
            </div>
          </li>
        `;
      }).join("")}
    </ul>
  `;
}

function renderDrawerContent(event) {
  const location = getEventLocation(event);
  const embedUrl = normalizeYoutubeEmbed(event.youtubeUrl || event.youtube || event.videoUrl || "");
  const galleryItems = normalizeGalleryItems(event.gallery || event.photos || event.images);
  const stepsMarkup = createStepTreeMarkup(getEventSteps(event), event.startDate ?? event.startMs);

  drawerContentEl.innerHTML = `
    <div class="drawer-meta-badges">
      <span class="drawer-badge">${escapeHtml(CATEGORY_LABELS[event.category] || event.category || "Événement")}</span>
      <span class="drawer-badge drawer-badge--date">${escapeHtml(formatEventDateRange(event))}</span>
    </div>
    <h2 class="event-drawer__title" id="event-drawer-title">${escapeHtml(event.title || "Sans titre")}</h2>
    ${location ? `<p class="event-drawer__location">📍 ${escapeHtml(location)}</p>` : ""}
${event.details ? `
  <div class="event-drawer__section">
    <p>${escapeHtml(event.details)}</p>
  </div>
` : ""}
    ${embedUrl ? `
      <div class="event-drawer__section">
        <h3>Vidéo</h3>
        <div class="event-video-wrap">
          <iframe src="${escapeHtml(embedUrl)}" title="Vidéo YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
      </div>` : ""}
    ${galleryItems.length ? `
      <div class="event-drawer__section">
        <h3>Photos</h3>
        <div class="event-gallery">
          ${galleryItems.map((item) => `
            <figure class="event-gallery__item">
              <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" loading="lazy" />
              ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ""}
            </figure>
          `).join("")}
        </div>
      </div>` : ""}
    ${stepsMarkup ? `
      <div class="event-drawer__section">
        <h3>Étapes</h3>
        ${stepsMarkup}
      </div>` : ""}
  `;
}

function openDrawer(event, options = {}) {
  selectEvent(event, { ...options, openDrawer: true });
}

function closeDrawer() {
  isDrawerOpen = false;
  updateMapPanelUi();
}

function updateMapSelectionHighlight() {
  if (!leafletMap) return;

  const selectedEvent = selectedEventId ? getEventById(selectedEventId) : null;
  const hasSelection = Boolean(selectedEvent);
  const hasMapFocusSelection = hasSelection && getEventFocusLatLngs(selectedEvent).length > 0;
  const selectedEventHasMainLocation = hasMapFocusSelection && eventHasMainMapLocation(selectedEvent);

  markerEntries.forEach(({ eventId, marker, isStep, pointKind }) => {
    const belongsToSelectedEvent = hasSelection && eventId === selectedEventId;
    const shouldHighlightMarker = belongsToSelectedEvent &&
      !(selectedEventHasMainLocation && (isStep || pointKind !== "main"));

    const baseRadius = isStep ? 7 : 8;
    const dimOpacity = isStep ? 0.14 : 0.18;
    const normalFill = isStep ? 0.75 : 0.9;

    marker.setStyle({
      radius: hasMapFocusSelection ? (shouldHighlightMarker ? baseRadius + 2 : baseRadius) : baseRadius,
      opacity: hasMapFocusSelection ? (shouldHighlightMarker ? 1 : dimOpacity) : 1,
      fillOpacity: hasMapFocusSelection ? (shouldHighlightMarker ? 0.98 : dimOpacity) : normalFill,
      weight: hasMapFocusSelection ? (shouldHighlightMarker ? 3 : (isStep ? 1 : 1.5)) : (isStep ? 1.5 : 2)
    });

    if (shouldHighlightMarker && typeof marker.bringToFront === "function") {
      marker.bringToFront();
    }
  });

  routeEntries.forEach(({ eventId, layer }) => {
    const belongsToSelectedEvent = hasSelection && eventId === selectedEventId;
    const shouldHighlightRoute = belongsToSelectedEvent && !selectedEventHasMainLocation;

    layer.setStyle({
      opacity: hasMapFocusSelection ? (shouldHighlightRoute ? 0.95 : 0.08) : 0.7,
      weight: hasMapFocusSelection ? (shouldHighlightRoute ? 4 : 2) : 2
    });

    if (shouldHighlightRoute && typeof layer.bringToFront === "function") {
      layer.bringToFront();
    }
  });
}

function formatFullDate(ms) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(ms));
}

const DISTANCE_EXCLUDED_EDUCATION_TITLES = new Set([
  "Maternelle",
  "Primaire",
  "Collège Montaigne Poix du nord",
  "Lycée Dupleix Landrecies",
  "INSA Hauts-de-France",
  "Ingénieur Conception Mécanique"
]);

function shouldExcludeEventFromDistanceStats(event) {
  if (!event || event.category !== "education") return false;
  return DISTANCE_EXCLUDED_EDUCATION_TITLES.has(String(event.title || "").trim());
}

function formatDurationBetween(startMs, endMs) {
  const startDate = toDate(startMs);
  const endDate = toDate(endMs);

  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  let days = endDate.getDate() - startDate.getDate();

  if (days < 0) {
    months -= 1;
    const previousMonthLastDay = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      0
    ).getDate();
    days += previousMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} an${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mois`);
  if (days > 0) parts.push(`${days} jour${days > 1 ? "s" : ""}`);

  if (!parts.length) {
    const totalDays = Math.max(1, Math.round((endMs - startMs) / DAY_MS));
    return `${totalDays} jour${totalDays > 1 ? "s" : ""}`;
  }

  return parts.slice(0, 2).join(" ");
}

