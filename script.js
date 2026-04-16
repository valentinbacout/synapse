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
    const nestedSteps = Array.isArray(step.steps) ? step.steps : [];

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
          step.steps,
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
  const stepsMarkup = createStepTreeMarkup(event.steps, event.startDate ?? event.startMs);

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

const statsEls = {
  livedPlaces: document.getElementById("stat-lived-places"),
  countries: document.getElementById("stat-countries"),
  cities: document.getElementById("stat-cities"),
  travels: document.getElementById("stat-travels"),
  travelsMeta: document.getElementById("stat-travels-meta"),
  distance: document.getElementById("stat-distance"),
  longest: document.getElementById("stat-longest"),
  longestMeta: document.getElementById("stat-longest-meta"),
  bestYear: document.getElementById("stat-best-year"),
  bestYearMeta: document.getElementById("stat-best-year-meta"),
  topCountry: document.getElementById("stat-top-country"),
  topCountryMeta: document.getElementById("stat-top-country-meta"),
  artistsSeen: document.getElementById("stat-artists-seen"),
  artistsSeenMeta: document.getElementById("stat-artists-seen-meta"),
  themeParks: document.getElementById("stat-theme-parks"),
  themeParksMeta: document.getElementById("stat-theme-parks-meta"),
  years: document.getElementById("stat-years"),
  breakdown: document.getElementById("stats-breakdown")
};

const statCards = {
  countries: document.querySelector('[data-stat-key="countries"]') || null,
  livedPlaces: document.querySelector('[data-stat-key="livedPlaces"]') || null,
  cities: document.querySelector('[data-stat-key="cities"]') || null,
  travels: document.querySelector('[data-stat-key="travels"]') || null,
  distance: document.querySelector('[data-stat-key="distance"]') || null,
  longest: document.querySelector('[data-stat-key="longest"]') || null,
  bestYear: document.querySelector('[data-stat-key="bestYear"]') || null,
  topCountry: document.querySelector('[data-stat-key="topCountry"]') || null,
  artistsSeen: document.querySelector('[data-stat-key="artistsSeen"]') || null,
  themeParks: document.querySelector('[data-stat-key="themeParks"]') || null
};

let statsModalEl = null;
let statsModalTitleEl = null;
let statsModalSubtitleEl = null;
let statsModalBodyEl = null;
let statsModalCloseEl = null;
let activeStatDetailKey = null;
const statsDetailDefinitions = new Map();

function titleCase(value) {
  const text = String(value || "").trim();
  if (!text) return "-";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizeLineupArtistEntry(entry) {
  if (typeof entry === "string") {
    const name = entry.trim();
    return name ? { name, rating: null, raw: entry } : null;
  }

  if (entry && typeof entry === "object") {
    const name = String(entry.name || entry.artist || entry.title || "").trim();
    if (!name) return null;

    const ratingValue = entry.rating;
    const numericRating = typeof ratingValue === "number"
      ? ratingValue
      : Number.parseFloat(String(ratingValue ?? "").replace(",", "."));

    return {
      name,
      rating: Number.isFinite(numericRating) ? numericRating : null,
      raw: entry
    };
  }

  const fallbackName = String(entry || "").trim();
  return fallbackName ? { name: fallbackName, rating: null, raw: entry } : null;
}

function normalizeLineup(lineup) {
  if (!Array.isArray(lineup)) return [];
  return lineup
    .map((entry) => normalizeLineupArtistEntry(entry))
    .filter(Boolean);
}

function formatArtistRating(rating) {
  if (!Number.isFinite(rating)) return "";
  const normalized = Number.isInteger(rating) ? String(rating) : String(rating).replace(/\.0+$/, "");
  return `${normalized}/10`;
}

function normalizeTagValue(tag) {
  return String(tag || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getEventTags(event) {
  const rawTags = event?.tags ?? event?.Tags ?? [];

  if (Array.isArray(rawTags)) {
    return rawTags.map((tag) => normalizeTagValue(tag)).filter(Boolean);
  }

  return String(rawTags || "")
    .split(/[,;|]/)
    .map((tag) => normalizeTagValue(tag))
    .filter(Boolean);
}

function eventHasAnyTag(event, ...targetTags) {
  const normalizedTags = getEventTags(event);
  if (!normalizedTags.length) return false;

  const targets = targetTags.map((tag) => normalizeTagValue(tag)).filter(Boolean);
  return targets.some((target) => normalizedTags.includes(target));
}

function formatThemeParkPlace(entry) {
  return [entry.country] || "Lieu non précisé";
}

function formatParkRating(rating) {
  if (!Number.isFinite(rating)) return "Non noté";
  const normalized = Number.isInteger(rating) ? String(rating) : String(rating).replace(/\.0+$/, "");
  return `${normalized}/10`;
}

function createThemeParksPodiumMarkup(entries = []) {
  if (!entries.length) return "";

  const top3 = entries.slice(0, 3);
  const podiumOrder = [1, 0, 2].filter((index) => index < top3.length);
  const placeClasses = ["silver", "gold", "bronze"];
  const heightClasses = ["is-second", "is-first", "is-third"];

  return `
    <section class="artists-podium-section artists-top10-section">
      <div class="artists-podium-section__header">
        <h4 class="artists-podium-section__title">Top 3 parcs d'attractions</h4>
      </div>
      <div class="artists-podium">
        ${podiumOrder.map((entryIndex, visualIndex) => {
          const entry = top3[entryIndex];
          return `
            <article class="artists-podium__item ${heightClasses[visualIndex]} ${placeClasses[visualIndex]}">
              <div class="artists-podium__card">
                <div class="artists-podium__place">#${entry.rank}</div>
                <div class="artists-podium__name">${escapeHtml(entry.title)}</div>
                <div class="artists-podium__event">${escapeHtml(formatThemeParkPlace(entry))}</div>
                <div class="artists-podium__meta">Note · ${escapeHtml(formatParkRating(entry.bestRating))}</div>
              </div>
              <div class="artists-podium__base"></div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function createThemeParksRankingMarkup(entries = []) {
  if (!entries.length) {
    return "<p class=\"stats-detail-empty\">Aucun parc d'attractions détecté.</p>";
  }

  return `
    <section class="artists-podium-section artists-top10-section">
      <div class="artists-podium-section__header">
      </div>
      <div class="artists-ranking-list">
        ${entries.map((entry) => `
          <article class="artists-ranking-item">
            <div class="artists-ranking-item__rank">#${entry.rank}</div>
            <div class="artists-ranking-item__main">
              <div class="artists-ranking-item__name">${escapeHtml(entry.title)}</div>
              <div class="artists-ranking-item__meta">${escapeHtml(formatThemeParkPlace(entry))} · Dernière visite ${escapeHtml(formatFullDate(entry.lastVisitMs))}</div>
            </div>
            <div class="artists-ranking-item__score">${escapeHtml(formatParkRating(entry.bestRating))}</div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

const COUNTRY_TO_CONTINENT = {
  "france": "Europe",
  "belgique": "Europe",
  "monaco": "Europe",
  "luxembourg": "Europe",
  "pays-bas": "Europe",
  "angleterre": "Europe",
  "royaume-uni": "Europe",
  "espagne": "Europe",
  "italie": "Europe",
  "malte": "Europe",
  "danemark": "Europe",
  "suede": "Europe",
  "finlande": "Europe",
  "russie": "Europe",
  "estonie": "Europe",
  "hongrie": "Europe",
  "slovaquie": "Europe",
  "autriche": "Europe",
  "republique tcheque": "Europe",
  "tchequie": "Europe",
  "allemagne": "Europe",
  "suisse": "Europe",
  "vatican": "Europe",
  "malaisie": "Asie",
  "singapour": "Asie",
  "emirats arabes unis": "Asie"
};

const CONTINENT_ORDER = ["Europe", "Asie", "Afrique", "Amérique du Nord", "Amérique du Sud", "Océanie", "Autres"];
const CONTINENT_TOTAL_COUNTRIES = {
  "Europe": 27,
  "Asie": 49,
  "Afrique": 54,
  "Amérique du Nord": 23,
  "Amérique du Sud": 12,
  "Océanie": 14,
  "Autres": 0
};

function normalizeCountryKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const COUNTRY_TO_FLAG_CODE = {
  "france": "FR",
  "belgique": "BE",
  "monaco": "MC",
  "luxembourg": "LU",
  "pays bas": "NL",
  "pays-bas": "NL",
  "angleterre": "GB",
  "royaume uni": "GB",
  "royaume-uni": "GB",
  "espagne": "ES",
  "italie": "IT",
  "malte": "MT",
  "danemark": "DK",
  "suede": "SE",
  "finlande": "FI",
  "russie": "RU",
  "estonie": "EE",
  "hongrie": "HU",
  "slovaquie": "SK",
  "autriche": "AT",
  "republique tcheque": "CZ",
  "tchequie": "CZ",
  "allemagne": "DE",
  "suisse": "CH",
  "vatican": "VA",
  "malaisie": "MY",
  "singapour": "SG",
  "emirats arabes unis": "AE"
};

function escapeAttribute(value) {
  return escapeHtml(String(value ?? "")).replace(/`/g, "&#96;");
}

function buildFlagSvg(countryCode, countryLabel = "") {
  const code = String(countryCode || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";

  const title = escapeAttribute(countryLabel || code);
  const defs = {
    FR: '<rect width="27" height="18" fill="#fff"/><rect width="9" height="18" fill="#1f4db6"/><rect x="18" width="9" height="18" fill="#d71f35"/>',
    IT: '<rect width="27" height="18" fill="#fff"/><rect width="9" height="18" fill="#1f8b4c"/><rect x="18" width="9" height="18" fill="#d71f35"/>',
    BE: '<rect width="27" height="18" fill="#ffd90c"/><rect width="9" height="18" fill="#111"/><rect x="18" width="9" height="18" fill="#d71f35"/>',
    MY: '<rect width="27" height="18" fill="#fff"/><rect y="0" width="27" height="2" fill="#c81e2b"/><rect y="4" width="27" height="2" fill="#c81e2b"/><rect y="8" width="27" height="2" fill="#c81e2b"/><rect y="12" width="27" height="2" fill="#c81e2b"/><rect y="16" width="27" height="2" fill="#c81e2b"/><rect width="13" height="10" fill="#153a8a"/><circle cx="5.7" cy="5" r="3" fill="#f7d046"/><circle cx="6.6" cy="5" r="2.4" fill="#153a8a"/><polygon points="9.6,2.2 10.2,4 12.1,4 10.6,5.1 11.2,6.9 9.6,5.8 8.1,6.9 8.7,5.1 7.2,4 9,4" fill="#f7d046"/>',
    SG: '<rect width="27" height="9" fill="#df1e35"/><rect y="9" width="27" height="9" fill="#fff"/><circle cx="6" cy="4.8" r="3.2" fill="#fff"/><circle cx="7.2" cy="4.8" r="2.6" fill="#df1e35"/><circle cx="9.4" cy="2.7" r=".6" fill="#fff"/><circle cx="10.6" cy="4.1" r=".6" fill="#fff"/><circle cx="10.1" cy="5.9" r=".6" fill="#fff"/><circle cx="8.7" cy="6.9" r=".6" fill="#fff"/><circle cx="7.3" cy="5.7" r=".6" fill="#fff"/>',
    MC: '<rect width="27" height="9" fill="#d71f35"/><rect y="9" width="27" height="9" fill="#fff"/>',
    ES: '<rect width="27" height="18" fill="#f1c40f"/><rect width="27" height="4" fill="#c81e2b"/><rect y="14" width="27" height="4" fill="#c81e2b"/>',
    MT: '<rect width="13.5" height="18" fill="#fff"/><rect x="13.5" width="13.5" height="18" fill="#d71f35"/><rect x="2" y="2" width="3.2" height="3.2" fill="#b4b4b4"/><rect x="3" y="1" width="1.2" height="5.2" fill="#b4b4b4"/><rect x="1" y="3" width="5.2" height="1.2" fill="#b4b4b4"/>',
    NL: '<rect width="27" height="6" fill="#ae1c28"/><rect y="6" width="27" height="6" fill="#fff"/><rect y="12" width="27" height="6" fill="#21468b"/>',
    LU: '<rect width="27" height="6" fill="#ef3340"/><rect y="6" width="27" height="6" fill="#fff"/><rect y="12" width="27" height="6" fill="#00a3e0"/>',
    DE: '<rect width="27" height="6" fill="#111"/><rect y="6" width="27" height="6" fill="#d71f35"/><rect y="12" width="27" height="6" fill="#f1c40f"/>',
    RU: '<rect width="27" height="6" fill="#fff"/><rect y="6" width="27" height="6" fill="#1f4db6"/><rect y="12" width="27" height="6" fill="#d71f35"/>',
    EE: '<rect width="27" height="6" fill="#4891d9"/><rect y="6" width="27" height="6" fill="#111"/><rect y="12" width="27" height="6" fill="#fff"/>',
    HU: '<rect width="27" height="6" fill="#d71f35"/><rect y="6" width="27" height="6" fill="#fff"/><rect y="12" width="27" height="6" fill="#1f8b4c"/>',
    SK: '<rect width="27" height="6" fill="#fff"/><rect y="6" width="27" height="6" fill="#1f4db6"/><rect y="12" width="27" height="6" fill="#d71f35"/>',
    AT: '<rect width="27" height="6" fill="#d71f35"/><rect y="6" width="27" height="6" fill="#fff"/><rect y="12" width="27" height="6" fill="#d71f35"/>',
    CZ: '<rect width="27" height="9" fill="#fff"/><rect y="9" width="27" height="9" fill="#d71f35"/><polygon points="0,0 11,9 0,18" fill="#1f4db6"/>',
    CH: '<rect width="27" height="18" fill="#d71f35"/><rect x="11" y="3" width="5" height="12" fill="#fff"/><rect x="7.5" y="6.5" width="12" height="5" fill="#fff"/>',
    VA: '<rect width="13.5" height="18" fill="#f1c40f"/><rect x="13.5" width="13.5" height="18" fill="#fff"/>',
    DK: '<rect width="27" height="18" fill="#c81e2b"/><rect x="8" width="2.4" height="18" fill="#fff"/><rect y="7.5" width="27" height="3" fill="#fff"/>',
    SE: '<rect width="27" height="18" fill="#1f4db6"/><rect x="8" width="2.6" height="18" fill="#f1c40f"/><rect y="7.5" width="27" height="3" fill="#f1c40f"/>',
    FI: '<rect width="27" height="18" fill="#fff"/><rect x="8" width="3" height="18" fill="#1f4db6"/><rect y="7.5" width="27" height="3" fill="#1f4db6"/>',
    GB: '<rect width="27" height="18" fill="#1f4db6"/><path d="M0,0 27,18 M27,0 0,18" stroke="#fff" stroke-width="4"/><path d="M0,0 27,18 M27,0 0,18" stroke="#d71f35" stroke-width="2"/><rect x="11" width="5" height="18" fill="#fff"/><rect y="6.5" width="27" height="5" fill="#fff"/><rect x="12" width="3" height="18" fill="#d71f35"/><rect y="7.5" width="27" height="3" fill="#d71f35"/>',
    AE: '<rect x="5.4" width="21.6" height="6" fill="#1f8b4c"/><rect x="5.4" y="6" width="21.6" height="6" fill="#fff"/><rect x="5.4" y="12" width="21.6" height="6" fill="#111"/><rect width="5.4" height="18" fill="#d71f35"/>'
  };

  const body = defs[code];
  if (!body) return "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 18" role="img" aria-label="Drapeau ${title}"><title>Drapeau ${title}</title><rect width="27" height="18" rx="2" fill="#dbe4ff"/>${body}<rect width="27" height="18" rx="2" fill="none" stroke="rgba(15,23,42,.18)"/></svg>`;
}

function getCountryFlag(country) {
  const code = COUNTRY_TO_FLAG_CODE[normalizeCountryKey(country)];
  return code ? buildFlagSvg(code, titleCase(country) || code) : "";
}

function getCountryFlagMarkup(country, className = "country-flag") {
  const svg = getCountryFlag(country);
  if (!svg) return "";
  const dataUri = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  const label = titleCase(country) || "Pays";
  return `<img class="${escapeAttribute(className)}" src="${dataUri}" alt="Drapeau ${escapeAttribute(label)}" loading="lazy" decoding="async">`;
}

function formatCountryLabelWithFlag(country) {
  const label = titleCase(country) || "-";
  const flagMarkup = getCountryFlagMarkup(country);
  return flagMarkup ? `${flagMarkup}<span>${escapeHtml(label)}</span>` : escapeHtml(label);
}

function getContinentForCountry(country) {
  const key = normalizeCountryKey(country);
  return COUNTRY_TO_CONTINENT[key] || "Autres";
}

function formatPercent(value, digits = 1) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number(value) || 0);
}

function formatLocationLabel(item = {}) {
  const city = item.city ? String(item.city).trim() : "";
  const country = item.country ? String(item.country).trim() : "";
  return [city, country].filter(Boolean).join(", ") || "Lieu non précisé";
}

function normalizePlaceLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function isSamePlaceLabel(a, b) {
  const left = normalizePlaceLabel(a);
  const right = normalizePlaceLabel(b);
  return Boolean(left) && left === right;
}

function formatDetailDateRange(startMs, endMs = startMs) {
  if (!Number.isFinite(startMs)) return "Date non précisée";
  if (!Number.isFinite(endMs) || startMs === endMs) {
    return formatFullDate(startMs);
  }
  return `${formatFullDate(startMs)} — ${formatFullDate(endMs)}`;
}

function buildDistanceDetailItems(distanceSegments = [], eventLookup = new Map()) {
  const visibleSegments = distanceSegments
    .filter((segment) => {
      const fromLabel = segment.from || "";
      const toLabel = segment.to || "";
      return Number.isFinite(Number(segment.distance)) && Number(segment.distance) > 0 && !isSamePlaceLabel(fromLabel, toLabel);
    })
    .sort((a, b) => a.startDate - b.startDate || a.endDate - b.endDate);

  if (!visibleSegments.length) return [];

  const groups = new Map();

  visibleSegments.forEach((segment, index) => {
    const key = segment.groupKey || segment.eventId || `segment_${index}`;
    if (!groups.has(key)) {
      groups.set(key, {
        eventId: segment.eventId || null,
        eventTitle: segment.eventTitle || "Trajet",
        segmentType: segment.segmentType || "event",
        segments: []
      });
    }
    groups.get(key).segments.push(segment);
  });

  const items = [];

  groups.forEach((group) => {
    const event = group.eventId ? eventLookup.get(group.eventId) : null;
    const groupSegments = group.segments.slice().sort((a, b) => a.startDate - b.startDate || a.endDate - b.endDate);

    if (!groupSegments.length) return;

    if (group.segmentType === "move") {
      groupSegments.forEach((segment) => {
        items.push({
          title: `${segment.from} → ${segment.to}`,
          meta: `${formatDetailDateRange(segment.startDate, segment.endDate)} · ${Math.round(segment.distance)} km`,
          chips: [group.eventTitle, "Déménagement"],
          eventId: segment.eventId || undefined
        });
      });
      return;
    }

    const isPointEvent = event?.visualType === "point" || groupSegments.every((segment) => segment.startDate === segment.endDate);

    if (
      isPointEvent &&
      groupSegments.length === 2 &&
      isSamePlaceLabel(groupSegments[0].from, groupSegments[1].to) &&
      isSamePlaceLabel(groupSegments[0].to, groupSegments[1].from)
    ) {
      const totalKm = Math.round(groupSegments[0].distance + groupSegments[1].distance);
      items.push({
        title: `${groupSegments[0].from} ↔ ${groupSegments[0].to}`,
        meta: `${formatDetailDateRange(groupSegments[0].startDate, groupSegments[1].endDate)} · ${totalKm} km`,
        chips: [group.eventTitle, "Aller-retour"],
        eventId: group.eventId || undefined
      });
      return;
    }

    const pathParts = [];

    groupSegments.forEach((segment, index) => {
      if (index === 0) {
        pathParts.push(segment.from);
      }
      pathParts.push(segment.to);
    });

    const totalKm = Math.round(
      groupSegments.reduce((sum, segment) => sum + Number(segment.distance || 0), 0)
    );

    items.push({
      title: pathParts.join(" → "),
      meta: `${formatDetailDateRange(groupSegments[0].startDate, groupSegments[groupSegments.length - 1].endDate)} · ${totalKm} km`,
      chips: [group.eventTitle].filter(Boolean),
      eventId: group.eventId || undefined
    });
  });

  return items;
}

function createStatDetailList(items = [], options = {}) {
  if (!items.length) {
    return '<p class="stats-detail-empty">Aucun détail disponible.</p>';
  }

  const listClassName = options.compact ? "stats-detail-list stats-detail-list--compact" : "stats-detail-list";

  return `
    <div class="${listClassName}">
      ${items.map((item) => {
    const title = escapeHtml(item.title || "Sans titre");
    const titleMarkup = typeof item.titleHtml === "string" && item.titleHtml.trim()
      ? item.titleHtml
      : `<span>${title}</span>`;
    const titlePrefix = item.titlePrefix ? `<span class="stats-detail-item__title-prefix" aria-hidden="true">${escapeHtml(item.titlePrefix)}</span>` : "";
    const meta = item.meta ? `
<div class="stats-detail-item__meta">
  ${item.chips && item.chips.length
        ? `<span class="stats-detail-item__event">${escapeHtml(item.chips[0])}</span>`
        : ""
      }
  <span class="stats-detail-item__meta-text">${escapeHtml(item.meta)}</span>
</div>
    ` : "";
    const chips = "";
    const action = "";

    return `
          <article class="stats-detail-item">
            <div class="stats-detail-item__main">
              <div class="stats-detail-item__title">${titlePrefix}${titleMarkup}</div>
              ${meta}
              ${chips}
            </div>
            ${action}
          </article>
        `;
  }).join("")}
    </div>
  `;
}


function createGroupedStatDetailList(groups = [], options = {}) {
  const visibleGroups = groups.filter((group) => Array.isArray(group.items) && group.items.length);
  const introHtml = typeof options.introHtml === "string" ? options.introHtml.trim() : "";

  if (!visibleGroups.length) {
    return introHtml || '<p class="stats-detail-empty">Aucun détail disponible.</p>';
  }

  return `
    ${introHtml}
    <div class="stats-detail-groups">
      ${visibleGroups.map((group) => `
        <section class="stats-detail-group">
          <div class="stats-detail-group__header">
            <h4 class="stats-detail-group__title">${escapeHtml(group.title || "Général")}</h4>
            ${group.meta ? `<span class="stats-detail-group__meta">${escapeHtml(group.meta)}</span>` : ""}
          </div>
          ${createStatDetailList(group.items, { compact: true })}
        </section>
      `).join("")}
    </div>
  `;
}

function rankArtistsByRating(entries = []) {
  return entries
    .filter((entry) => entry && Number.isFinite(entry.rating))
    .sort((a, b) => (
      b.rating - a.rating
      || (b.eventYear || 0) - (a.eventYear || 0)
      || a.name.localeCompare(b.name, "fr-FR")
      || (a.eventTitle || "").localeCompare(b.eventTitle || "", "fr-FR")
    ));
}

function createArtistsPodiumMarkup(entries = []) {
  const rankedEntries = rankArtistsByRating(entries);

  if (!rankedEntries.length) return "";

  const top3 = rankedEntries.slice(0, 3);
  const rest = rankedEntries.slice(3, 10);
  const podiumOrder = [1, 0, 2].filter((index) => index < top3.length);
  const placeClasses = ["silver", "gold", "bronze"];
  const heightClasses = ["is-second", "is-first", "is-third"];

  return `
    <section class="artists-podium-section artists-top10-section">
      <div class="artists-podium-section__header">
        <h4 class="artists-podium-section__title">Top 10 artistes</h4>
      </div>
      <div class="artists-podium">
        ${podiumOrder.map((entryIndex, visualIndex) => {
          const entry = top3[entryIndex];
          const eventLabel = [entry.eventTitle, entry.eventYear].filter(Boolean).join(" — ");

          return `
            <article class="artists-podium__item ${heightClasses[visualIndex]} ${placeClasses[visualIndex]}">
              <div class="artists-podium__card">
                <div class="artists-podium__name">${escapeHtml(entry.name)}</div>
                <div class="artists-podium__event">${escapeHtml(eventLabel)}</div>
                <div class="artists-podium__score">${escapeHtml(formatArtistRating(entry.rating))}</div>
              </div>
              <div class="artists-podium__base"></div>
            </article>
          `;
        }).join("")}
      </div>
      ${rest.length ? `
        <div class="artists-top10-rest">
          <div class="artists-ranking-list">
            ${rest.map((entry, index) => {
              const eventLabel = [entry.eventTitle, entry.eventYear].filter(Boolean).join(" — ");

              return `
                <article class="artists-ranking-item">
                  <div class="artists-ranking-item__rank">#${index + 4}</div>
                  <div class="artists-ranking-item__main">
                    <div class="artists-ranking-item__name">${escapeHtml(entry.name)}</div>
                    <div class="artists-ranking-item__event">${escapeHtml(eventLabel)}</div>
                  </div>
                  <div class="artists-ranking-item__score">${escapeHtml(formatArtistRating(entry.rating))}</div>
                </article>
              `;
            }).join("")}
          </div>
        </div>
      ` : ""}
    </section>
  `;
}

function ensureStatsModal() {
  if (statsModalEl) return;

  statsModalEl = document.createElement("div");
  statsModalEl.className = "stats-modal";
  statsModalEl.setAttribute("aria-hidden", "true");
  statsModalEl.innerHTML = `
    <div class="stats-modal__backdrop" data-stats-modal-close="true"></div>
    <div class="stats-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="stats-modal-title">
      <button type="button" class="stats-modal__close" id="stats-modal-close" aria-label="Fermer le détail">×</button>
      <div class="stats-modal__content">
        <p class="stats-modal__subtitle" id="stats-modal-subtitle"></p>
        <h3 class="stats-modal__title" id="stats-modal-title">Détail statistique</h3>
        <div class="stats-modal__body" id="stats-modal-body"></div>
      </div>
    </div>
  `;

  document.body.appendChild(statsModalEl);

  statsModalTitleEl = statsModalEl.querySelector("#stats-modal-title");
  statsModalSubtitleEl = statsModalEl.querySelector("#stats-modal-subtitle");
  statsModalBodyEl = statsModalEl.querySelector("#stats-modal-body");
  statsModalCloseEl = statsModalEl.querySelector("#stats-modal-close");

  statsModalEl.addEventListener("click", (event) => {
    const eventId = event.target.closest("[data-event-id]")?.dataset.eventId;
    if (eventId) {
      const linkedEvent = getEventById(eventId);
      if (linkedEvent) {
        closeStatsModal();
        openDrawer(linkedEvent);
      }
      return;
    }

    if (event.target.closest("[data-stats-modal-close='true']")) {
      closeStatsModal();
    }
  });

  statsModalCloseEl?.addEventListener("click", closeStatsModal);
}

function closeStatsModal() {
  ensureStatsModal();
  statsModalEl.classList.remove("is-open");
  statsModalEl.setAttribute("aria-hidden", "true");
  document.body.classList.remove("has-stats-modal-open");
  activeStatDetailKey = null;
}

function openStatsModal(detailKey) {
  const definition = statsDetailDefinitions.get(detailKey);
  if (!definition) return;

  ensureStatsModal();

  activeStatDetailKey = detailKey;
  statsModalTitleEl.textContent = definition.title || "Détail statistique";

  if (typeof definition.subtitleHtml === "string") {
    statsModalSubtitleEl.innerHTML = definition.subtitleHtml;
  } else {
    statsModalSubtitleEl.textContent = definition.subtitle || "";
  }

  statsModalBodyEl.innerHTML = definition.html || '<p class="stats-detail-empty">Aucun détail disponible.</p>';

  statsModalEl.classList.add("is-open");
  statsModalEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("has-stats-modal-open");
  requestAnimationFrame(() => statsModalCloseEl?.focus());
}

function bindStatCard(card, detailKey, metaText) {
  if (!card) return;

  card.dataset.detailKey = detailKey;
  card.classList.add("stat-card--interactive");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `${metaText}. Cliquer pour voir le détail.`);

  if (card.dataset.detailBound === "true") return;
  card.dataset.detailBound = "true";

  card.addEventListener("click", () => openStatsModal(detailKey));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openStatsModal(detailKey);
    }
  });
}

function setVisualMarkup(elementId, markup) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.innerHTML = markup || "";
}

function createMiniBarsMarkup(entries = [], options = {}) {
  if (!entries.length) {
    return '<p class="stat-visual-empty">Pas assez de données.</p>';
  }

  const customMaxValue = Number(options.maxValue);
  const maxValue = Number.isFinite(customMaxValue) && customMaxValue > 0
    ? customMaxValue
    : Math.max(...entries.map((entry) => Number(entry.value) || 0), 1);
  const formatter = typeof options.valueFormatter === "function"
    ? options.valueFormatter
    : (value) => String(value);
  const labelPrefix = typeof options.labelPrefix === "function"
    ? options.labelPrefix
    : () => "";
  const labelPrefixHtml = typeof options.labelPrefixHtml === "function"
    ? options.labelPrefixHtml
    : () => "";

  return `
    <div class="mini-bars">
      ${entries.map((entry) => {
        const ratio = Math.max(6, Math.round(((Number(entry.value) || 0) / maxValue) * 100));
        const prefix = labelPrefix(entry);
        const prefixHtml = labelPrefixHtml(entry);
        return `
          <div class="mini-bar-row">
            <div class="mini-bar-row__top">
              <span class="mini-bar-row__label">${prefixHtml || (prefix ? `<span class="mini-bar-row__prefix" aria-hidden="true">${escapeHtml(prefix)}</span>` : "")}<span>${escapeHtml(entry.label || "-")}</span></span>
              <span class="mini-bar-row__value">${escapeHtml(formatter(entry.value, entry))}</span>
            </div>
            <div class="mini-bar-row__track"><span class="mini-bar-row__fill" style="width:${ratio}%"></span></div>
            ${entry.meta ? `<div class="mini-bar-row__meta">${escapeHtml(entry.meta)}</div>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function createMiniPodiumMarkup(entries = []) {
  if (!entries.length) {
    return '<p class="stat-visual-empty">Pas assez de données.</p>';
  }

  const placeClasses = ["gold", "silver", "bronze"];

  return `
    <div class="mini-podium">
      ${entries.slice(0, 3).map((entry, index) => `
        <div class="mini-podium__item mini-podium__item--${placeClasses[index] || "default"}">
          <span class="mini-podium__rank">#${index + 1}</span>
          <span class="mini-podium__name">${escapeHtml(entry.name || entry.title || "-")}</span>
          <span class="mini-podium__meta">${escapeHtml(entry.meta || "")}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function createKpiStripMarkup(items = []) {
  if (!items.length) return "";
  return `
    <div class="kpi-strip">
      ${items.map((item) => `
        <div class="kpi-strip__item">
          <span class="kpi-strip__label">${escapeHtml(item.label || "")}</span>
          <strong class="kpi-strip__value">${escapeHtml(item.value || "-")}</strong>
        </div>
      `).join("")}
    </div>
  `;
}


function setStatDetail(detailKey, config) {
  statsDetailDefinitions.set(detailKey, config);
}

function renderStats() {
  const normalized = normalizeEvents(events).filter((event) => event.id !== "TODAY");

  const getEventAndStepLocations = (event) => {
    const locations = [];

    const pushLocation = (location) => {
      if (!location) return;

      const country = location.country ? String(location.country).trim() : "";
      const city = location.city ? String(location.city).trim() : "";

      if (!country && !city) return;

      locations.push({ city, country });
    };

    pushLocation(event);
    flattenStepTree(event.steps, { parentDate: event.startDate ?? event.startMs }).forEach((step) => pushLocation(step));

    return locations;
  };

  const allLocations = normalized.flatMap((event) => getEventAndStepLocations(event));

  const uniqueCountriesMap = new Map();
  allLocations.forEach((location) => {
    const country = location.country ? String(location.country).trim() : "";
    if (!country) return;
    const key = country.toLowerCase();
    if (!uniqueCountriesMap.has(key)) {
      uniqueCountriesMap.set(key, country);
    }
  });

  const uniqueCitiesMap = new Map();
  allLocations.forEach((location) => {
    const city = location.city ? String(location.city).trim() : "";
    const country = location.country ? String(location.country).trim() : "";
    const key = [city, country].filter(Boolean).join(" | ").toLowerCase();
    if (!key) return;
    if (!uniqueCitiesMap.has(key)) {
      uniqueCitiesMap.set(key, { city, country });
    }
  });

  const uniqueLivedPlacesMap = new Map();
  normalized
    .filter((event) => event.category === "living_place")
    .forEach((event) => {
      const city = event.city ? String(event.city).trim() : "";
      const country = event.country ? String(event.country).trim() : "";
      const key = [city, country].filter(Boolean).join(" | ").toLowerCase();
      if (!key) return;
      if (!uniqueLivedPlacesMap.has(key)) {
        uniqueLivedPlacesMap.set(key, { city, country, title: event.title, eventId: event.id });
      }
    });

  const years = new Set();
  normalized.forEach((event) => {
    years.add(new Date(event.startMs).getFullYear());
    years.add(new Date(event.endMs).getFullYear());
  });

  const categoryCounts = {};
  normalized.forEach((event) => {
    categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
  });

  const breakdownItems = Object.entries(categoryCounts)
    .sort((a, b) => {
      const aIndex = CATEGORY_ORDER.indexOf(a[0]);
      const bIndex = CATEGORY_ORDER.indexOf(b[0]);
      const safeA = aIndex === -1 ? 999 : aIndex;
      const safeB = bIndex === -1 ? 999 : bIndex;
      return safeA - safeB || a[0].localeCompare(b[0]);
    })
    .map(([category, count]) => {
      const label = CATEGORY_LABELS[category] || category;
      return `<span class="stats-pill"><span>${escapeHtml(label)}</span><span class="stats-pill-value">${count}</span></span>`;
    })
    .join("");

  const toRad = (deg) => deg * (Math.PI / 180);

  const distanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const livingPlaceEvents = normalized
    .filter((event) => event.category === "living_place")
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  const getActiveLivingPlaceForDate = (dateMs) => {
    const exactMatch = livingPlaceEvents.find((livingPlace) => (
      livingPlace.startMs <= dateMs && dateMs <= livingPlace.endMs
    ));

    if (exactMatch) return exactMatch;

    const previousPlaces = livingPlaceEvents.filter((livingPlace) => livingPlace.startMs <= dateMs);
    if (previousPlaces.length) {
      return previousPlaces[previousPlaces.length - 1];
    }

    const nextPlace = livingPlaceEvents.find((livingPlace) => livingPlace.startMs > dateMs);
    return nextPlace || livingPlaceEvents[0] || null;
  };

  const normalizeDistanceNode = (item, fallbackDate, fallbackLabel, meta = {}) => {
    const lat = Number(item?.latitude);
    const lon = Number(item?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const startValue = item?.date ?? item?.startDate ?? fallbackDate;
    const endValue = item?.endDate ?? item?.date ?? item?.startDate ?? startValue;
    if (startValue === undefined || startValue === null) return null;

    const startMs = toMs(startValue);
    const endMs = toMs(endValue);

    return {
      lat,
      lon,
      startMs,
      endMs,
      date: startMs,
      label: item?.city || item?.title || item?.country || fallbackLabel || "Lieu",
      country: item?.country || "",
      city: item?.city || "",
      ...meta
    };
  };

  const getDistanceOccurrences = (event, otherEvents = []) => {
    const stepNodes = flattenStepTree(event.steps, {
      parentDate: event.startDate ?? event.startMs,
      parentColor: event.color,
      parentCategory: event.category,
      parentTitle: event.title,
      returnToParentAfterChildren: true
    })
      .map((step, index) => normalizeDistanceNode(step, event.startDate ?? event.startMs, event.title, {
        stepIndex: index,
        stepPath: Array.isArray(step._path) ? [...step._path] : [],
        stepType: step?.type || "step"
      }))
      .filter(Boolean)
      .filter((node, index, array) => {
        if (index === 0) return true;
        const prev = array[index - 1];
        return !(prev.lat === node.lat && prev.lon === node.lon && prev.startMs === node.startMs && prev.endMs === node.endMs);
      });

    if (stepNodes.length) {
      const hasInterferingEventBetween = (leftMs, rightMs) => {
        if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs) || rightMs <= leftMs) return false;

        return otherEvents.some((otherEvent) => {
          if (otherEvent.id === event.id) return false;
          const bounds = getDistanceBounds(otherEvent);
          return bounds.startMs > leftMs && bounds.startMs < rightMs;
        });
      };

      const clusters = [];
      let currentCluster = [];

      stepNodes.forEach((node, index) => {
        currentCluster.push(node);

        const nextNode = stepNodes[index + 1];
        if (!nextNode) {
          clusters.push(currentCluster);
          return;
        }

        if (hasInterferingEventBetween(node.startMs, nextNode.startMs)) {
          clusters.push(currentCluster);
          currentCluster = [];
        }
      });

      return clusters
        .filter((cluster) => cluster.length)
        .map((cluster, clusterIndex) => ({
          groupKey: `${event.id}__steps_${clusterIndex + 1}`,
          eventId: event.id,
          eventTitle: event.title || "Événement",
          segmentType: "event",
          useSteps: true,
          startMs: cluster[0].startMs,
          endMs: cluster[cluster.length - 1].endMs,
          nodes: cluster
        }));
    }

    const mainNode = normalizeDistanceNode(event, event.startMs, event.title);
    if (!mainNode) return [];

    return [{
      groupKey: `${event.id}__main`,
      eventId: event.id,
      eventTitle: event.title || "Événement",
      segmentType: "event",
      useSteps: false,
      startMs: event.startMs,
      endMs: event.endMs,
      nodes: [mainNode]
    }];
  };

  const getDistanceBounds = (event) => {
    const occurrences = getDistanceOccurrences(event, []);
    if (occurrences.length) {
      return {
        startMs: Math.min(...occurrences.map((occurrence) => occurrence.startMs)),
        endMs: Math.max(...occurrences.map((occurrence) => occurrence.endMs))
      };
    }

    return {
      startMs: event.startMs,
      endMs: event.endMs
    };
  };

  let totalDistance = 0;
  let longestDistance = 0;
  let longestTrip = null;
  const distanceSegments = [];

  const registerDistanceSegment = (segment) => {
    const d = Number(segment?.distance);
    if (!Number.isFinite(d) || d <= 0) return;

    totalDistance += d;
    distanceSegments.push(segment);

    if (d > longestDistance) {
      longestDistance = d;
      longestTrip = segment;
    }
  };

  const nonLivingEvents = normalized
    .filter((event) => event.category !== "living_place")
    .filter((event) => !shouldExcludeEventFromDistanceStats(event))
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  const registerJourneyOccurrence = (occurrence) => {
    const startHome = getActiveLivingPlaceForDate(occurrence.startMs);
    const endHome = getActiveLivingPlaceForDate(occurrence.endMs);
    const firstNode = occurrence.nodes[0];
    const lastNode = occurrence.nodes[occurrence.nodes.length - 1];

    const startHomeLat = Number(startHome?.latitude);
    const startHomeLon = Number(startHome?.longitude);
    const endHomeLat = Number(endHome?.latitude);
    const endHomeLon = Number(endHome?.longitude);

    if (Number.isFinite(startHomeLat) && Number.isFinite(startHomeLon)) {
      const startsAtHome = firstNode && firstNode.lat === startHomeLat && firstNode.lon === startHomeLon;
      if (!startsAtHome) {
        registerDistanceSegment({
          from: startHome?.city || startHome?.country || startHome?.title || "Lieu de vie départ",
          to: firstNode.city || firstNode.country || firstNode.label || "Lieu suivant",
          distance: distanceKm(startHomeLat, startHomeLon, firstNode.lat, firstNode.lon),
          startDate: occurrence.startMs,
          endDate: firstNode.startMs,
          eventId: occurrence.eventId,
          eventTitle: occurrence.eventTitle,
          groupKey: occurrence.groupKey,
          segmentType: occurrence.segmentType
        });
      }
    }

    for (let index = 1; index < occurrence.nodes.length; index += 1) {
      const prev = occurrence.nodes[index - 1];
      const curr = occurrence.nodes[index];

      registerDistanceSegment({
        from: prev.city || prev.country || prev.label || "Lieu précédent",
        to: curr.city || curr.country || curr.label || "Lieu suivant",
        distance: distanceKm(prev.lat, prev.lon, curr.lat, curr.lon),
        startDate: prev.startMs,
        endDate: curr.startMs,
        eventId: occurrence.eventId,
        eventTitle: occurrence.eventTitle,
        groupKey: occurrence.groupKey,
        segmentType: occurrence.segmentType
      });
    }

    if (Number.isFinite(endHomeLat) && Number.isFinite(endHomeLon)) {
      const endsAtHome = lastNode && lastNode.lat === endHomeLat && lastNode.lon === endHomeLon;
      if (!endsAtHome) {
        registerDistanceSegment({
          from: lastNode.city || lastNode.country || lastNode.label || "Lieu précédent",
          to: endHome?.city || endHome?.country || endHome?.title || "Lieu de vie arrivée",
          distance: distanceKm(lastNode.lat, lastNode.lon, endHomeLat, endHomeLon),
          startDate: lastNode.endMs,
          endDate: occurrence.endMs,
          eventId: occurrence.eventId,
          eventTitle: occurrence.eventTitle,
          groupKey: occurrence.groupKey,
          segmentType: occurrence.segmentType
        });
      }
    }
  };

  nonLivingEvents.forEach((event) => {
    const occurrences = getDistanceOccurrences(event, nonLivingEvents);
    occurrences.forEach((occurrence) => registerJourneyOccurrence(occurrence));
  });

  for (let i = 1; i < livingPlaceEvents.length; i += 1) {
    const prevHome = livingPlaceEvents[i - 1];
    const nextHome = livingPlaceEvents[i];
    const prevLat = Number(prevHome?.latitude);
    const prevLon = Number(prevHome?.longitude);
    const nextLat = Number(nextHome?.latitude);
    const nextLon = Number(nextHome?.longitude);

    if (![prevLat, prevLon, nextLat, nextLon].every(Number.isFinite)) continue;

    const moveStartMs = Math.min(prevHome.endMs, nextHome.startMs);
    const moveEndMs = Math.max(prevHome.endMs, nextHome.startMs);

    const overlapsEventWithSteps = nonLivingEvents.some((event) => {
      if (!Array.isArray(event.steps) || !event.steps.length) return false;

      const occurrences = getDistanceOccurrences(event, nonLivingEvents);
      return occurrences.some((occurrence) => {
        const overlapStart = Math.max(moveStartMs, occurrence.startMs);
        const overlapEnd = Math.min(moveEndMs, occurrence.endMs);
        return overlapStart <= overlapEnd;
      });
    });

    if (overlapsEventWithSteps) continue;

    registerDistanceSegment({
      from: prevHome.city || prevHome.country || prevHome.title || "Lieu de vie précédent",
      to: nextHome.city || nextHome.country || nextHome.title || "Nouveau lieu de vie",
      distance: distanceKm(prevLat, prevLon, nextLat, nextLon),
      startDate: moveStartMs,
      endDate: moveEndMs,
      eventId: nextHome.id,
      eventTitle: `Déménagement : ${prevHome.title || prevHome.city || "Lieu de vie"} → ${nextHome.title || nextHome.city || "Lieu de vie"}`,
      groupKey: `move_${nextHome.id}`,
      segmentType: "move"
    });
  }

  const eventsPerYear = {};
  normalized.forEach((event) => {
    const year = new Date(event.startMs).getFullYear();
    eventsPerYear[year] = (eventsPerYear[year] || 0) + 1;
  });

  let bestYear = null;
  let bestYearCount = 0;

  Object.entries(eventsPerYear).forEach(([year, count]) => {
    if (count > bestYearCount) {
      bestYear = year;
      bestYearCount = count;
    }
  });

  const countryCount = {};
  normalized.forEach((event) => {
    const locations = getEventAndStepLocations(event);

    locations.forEach((location) => {
      if (!location.country) return;

      const country = String(location.country).trim().toLowerCase();
      if (country === "france") return;

      countryCount[country] = (countryCount[country] || 0) + 1;
    });
  });

  let topCountry = null;
  let topCountryCount = 0;

  Object.entries(countryCount).forEach(([country, count]) => {
    if (count > topCountryCount) {
      topCountry = country;
      topCountryCount = count;
    }
  });

  const formatCountry = (value) => value
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : "-";

  const travelEvents = normalized.filter((event) => {
    if (event.category !== "travel") return false;

    if (event.country && String(event.country).trim().toLowerCase() !== "france") {
      return true;
    }

    if (Array.isArray(event.steps)) {
      return event.steps.some((step) => step.country && String(step.country).trim().toLowerCase() !== "france");
    }

    return false;
  });

  const bestYearEvents = bestYear
    ? normalized
      .filter((event) => String(new Date(event.startMs).getFullYear()) === String(bestYear))
      .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
    : [];

  const topCountryEvents = topCountry
    ? normalized
      .filter((event) => getEventAndStepLocations(event).some((location) => String(location.country || "").trim().toLowerCase() === topCountry))
      .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
    : [];

  const artistsMap = new Map();
  normalized.forEach((event) => {
    const artists = normalizeLineup(event.lineup);
    if (!artists.length) return;

    artists.forEach((artist) => {
      const key = artist.name.toLocaleLowerCase("fr-FR");
      if (!artistsMap.has(key)) {
        artistsMap.set(key, {
          name: artist.name,
          events: [],
          ratings: []
        });
      }

      const entry = artistsMap.get(key);
      entry.events.push(event);
      if (Number.isFinite(artist.rating)) {
        entry.ratings.push(artist.rating);
      }
    });
  });

  const artistsList = Array.from(artistsMap.values()).map((entry) => ({
    ...entry,
    eventCount: entry.events.length,
    ratedAppearances: entry.ratings.length,
    bestRating: entry.ratings.length ? Math.max(...entry.ratings) : null,
    averageRating: entry.ratings.length
      ? entry.ratings.reduce((sum, rating) => sum + rating, 0) / entry.ratings.length
      : null
  }));
  const ratedArtistPerformances = normalized.flatMap((event) => (
    normalizeLineup(event.lineup)
      .filter((artist) => Number.isFinite(artist.rating))
      .map((artist) => ({
        name: artist.name,
        rating: artist.rating,
        eventTitle: event.title || "Événement",
        eventYear: new Date(event.startMs).getFullYear(),
        eventId: event.id,
        date: event.startMs
      }))
  ));
  const rankedArtistPerformances = rankArtistsByRating(ratedArtistPerformances);
  const topArtistEntry = rankedArtistPerformances[0] || null;
  const artistsPodiumMarkup = createArtistsPodiumMarkup(rankedArtistPerformances);
  const lineupEvents = normalized
    .filter((event) => normalizeLineup(event.lineup).length)
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  const artistsGroupedByEvent = lineupEvents.map((event) => {
    const artists = normalizeLineup(event.lineup);
    const ratedCount = artists.filter((artist) => Number.isFinite(artist.rating)).length;

    return {
      title: `${event.title || "Événement"} (${new Date(event.startMs).getFullYear()})`,
      meta: ` ${formatEventDateRange(event)}`,
      items: artists.map((artist) => ({
        title: artist.name,
      }))
    };
  });

  const themeParkEvents = normalized
    .filter((event) => eventHasAnyTag(event, "theme park", "theme parc"))
    .sort((a, b) => b.startMs - a.startMs || a.title.localeCompare(b.title, "fr-FR"));

  const themeParkMap = new Map();
  themeParkEvents.forEach((event) => {
    const key = [String(event.title || "").trim().toLocaleLowerCase("fr-FR"), formatLocationLabel(event).toLocaleLowerCase("fr-FR")].join("|");
    const parsedRating = typeof event.rating === "number"
      ? event.rating
      : Number.parseFloat(String(event.rating ?? "").replace(",", "."));
    const normalizedRating = Number.isFinite(parsedRating) ? parsedRating : null;

    if (!themeParkMap.has(key)) {
      themeParkMap.set(key, {
        title: event.title || "Parc d'attractions",
        city: event.city || "",
        country: event.country || "",
        lastVisitMs: event.startMs,
        firstVisitMs: event.startMs,
        visitCount: 1,
        events: [event],
        latestEventId: event.id,
        ratings: normalizedRating !== null ? [normalizedRating] : [],
        bestRating: normalizedRating,
        averageRating: normalizedRating
      });
      return;
    }

    const entry = themeParkMap.get(key);
    entry.visitCount += 1;
    entry.events.push(event);
    entry.lastVisitMs = Math.max(entry.lastVisitMs, event.startMs);
    entry.firstVisitMs = Math.min(entry.firstVisitMs, event.startMs);
    if (event.startMs >= entry.lastVisitMs) {
      entry.latestEventId = event.id;
    }

    if (normalizedRating !== null) {
      entry.ratings.push(normalizedRating);
    }

    entry.bestRating = entry.ratings.length ? Math.max(...entry.ratings) : null;
    entry.averageRating = entry.ratings.length
      ? entry.ratings.reduce((sum, rating) => sum + rating, 0) / entry.ratings.length
      : null;
  });

  const themeParkList = Array.from(themeParkMap.values())
    .sort((a, b) => (
      (b.bestRating ?? -Infinity) - (a.bestRating ?? -Infinity)
      || (b.averageRating ?? -Infinity) - (a.averageRating ?? -Infinity)
      || b.lastVisitMs - a.lastVisitMs
      || a.title.localeCompare(b.title, "fr-FR")
    ))
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

  const topThemeParkEntry = themeParkList[0] || null;
  const themeParksPodiumMarkup = createThemeParksPodiumMarkup(themeParkList);
  const themeParksRankingMarkup = createThemeParksRankingMarkup(themeParkList);

  const countriesList = Array.from(uniqueCountriesMap.values());
  const countriesCoveragePct = uniqueCountriesMap.size ? (uniqueCountriesMap.size / TOTAL_COUNTRIES) * 100 : 0;
  const countriesGroupedByContinent = CONTINENT_ORDER
    .map((continent) => {
      const items = countriesList
        .filter((country) => getContinentForCountry(country) === continent)
        .map((country) => ({
          title: titleCase(country),
          titleHtml: formatCountryLabelWithFlag(country),
          flagMarkup: getCountryFlagMarkup(country, "country-flag country-flag--mini")
        }));

      const continentTotal = CONTINENT_TOTAL_COUNTRIES[continent] || 0;
      const continentCoveragePct = continentTotal > 0
        ? (items.length / continentTotal) * 100
        : 0;

      return {
        title: continent,
        meta: continentTotal > 0
          ? `${items.length} pays · ${formatPercent(continentCoveragePct)} %`
          : `${items.length} pays`,
        items
      };
    })
    .filter((group) => group.items.length);
  const citiesList = Array.from(uniqueCitiesMap.values()).sort((a, b) => formatLocationLabel(a).localeCompare(formatLocationLabel(b), "fr-FR"));
  const livedPlacesList = Array.from(uniqueLivedPlacesMap.values()).sort((a, b) => formatLocationLabel(a).localeCompare(formatLocationLabel(b), "fr-FR"));
  const eventLookup = new Map(normalized.map((event) => [event.id, event]));
  const distanceDetailItems = buildDistanceDetailItems(distanceSegments, eventLookup);
  const livedPlacesPeriods = normalized
    .filter((event) => event.category === "living_place")
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  if (statsEls.livedPlaces) statsEls.livedPlaces.textContent = String(uniqueLivedPlacesMap.size);
  if (statsEls.countries) statsEls.countries.textContent = `${uniqueCountriesMap.size} (${formatPercent(countriesCoveragePct)} %)`;
  if (statsEls.cities) statsEls.cities.textContent = String(uniqueCitiesMap.size);
  const travelYearsWithTrips = Array.from(new Set(travelEvents.map((event) => new Date(event.startMs).getFullYear()))).sort((a, b) => a - b);
  const averageTravelPerYear = travelYearsWithTrips.length
    ? travelEvents.length / travelYearsWithTrips.length
    : 0;
  if (statsEls.travels) statsEls.travels.textContent = formatPercent(averageTravelPerYear);
  if (statsEls.travelsMeta) {
    statsEls.travelsMeta.textContent = travelYearsWithTrips.length
      ? `${travelEvents.length} voyage${travelEvents.length > 1 ? "s" : ""} sur ${travelYearsWithTrips.length} an${travelYearsWithTrips.length > 1 ? "s" : ""}`
      : "Basé sur les voyages hors France";
  }
  if (statsEls.distance) statsEls.distance.textContent = `${Math.round(totalDistance)} km`;
  if (statsEls.longest) statsEls.longest.textContent = `${Math.round(longestDistance)} km`;
  if (statsEls.longestMeta) {
    statsEls.longestMeta.textContent = longestTrip
      ? `${longestTrip.from} → ${longestTrip.to}`
      : "-";
  }
  if (statsEls.bestYear) statsEls.bestYear.textContent = bestYear || "-";
  if (statsEls.bestYearMeta) {
    statsEls.bestYearMeta.textContent = `${bestYearCount} événement${bestYearCount > 1 ? "s" : ""}`;
  }
  if (statsEls.topCountry) statsEls.topCountry.innerHTML = formatCountryLabelWithFlag(topCountry);
  if (statsEls.topCountryMeta) {
    statsEls.topCountryMeta.textContent = `${topCountryCount} événement${topCountryCount > 1 ? "s" : ""}`;
  }
  if (statsEls.artistsSeen) statsEls.artistsSeen.textContent = String(artistsList.length);
  if (statsEls.artistsSeenMeta) {
    statsEls.artistsSeenMeta.textContent = topArtistEntry
      ? `${topArtistEntry.name} · ${topArtistEntry.eventTitle} (${topArtistEntry.eventYear}) · ${formatArtistRating(topArtistEntry.rating)}`
      : "Basé sur les lineups renseignés";
  }
  if (statsEls.themeParks) statsEls.themeParks.textContent = String(themeParkList.length);
  if (statsEls.themeParksMeta) {
    statsEls.themeParksMeta.textContent = topThemeParkEntry
      ? `${topThemeParkEntry.title} · ${formatThemeParkPlace(topThemeParkEntry)} · ${formatParkRating(topThemeParkEntry.bestRating)}`
      : "Basé sur le tag theme park et la note";
  }
  if (statsEls.years) statsEls.years.textContent = String(years.size);
  if (statsEls.breakdown) statsEls.breakdown.innerHTML = breakdownItems;

  const countryEntries = Object.entries(countryCount)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr-FR"));
  const cityVisitCounts = new Map();
  allLocations.forEach((location) => {
    const label = formatLocationLabel(location);
    if (!label || label === "Lieu non précisé") return;
    cityVisitCounts.set(label, (cityVisitCounts.get(label) || 0) + 1);
  });
  const topCities = Array.from(cityVisitCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr-FR"))
    .slice(0, 3)
    .map(([label, value]) => ({ label, value, meta: `${value} occurrence${value > 1 ? "s" : ""}` }));
  const countryContinentEntries = countriesGroupedByContinent
    .map((group) => ({
      label: group.title,
      value: group.items.length,
      totalCountries: CONTINENT_TOTAL_COUNTRIES[group.title] || group.items.length || 1,
      meta: group.meta
    }))
    .slice(0, 3);
  const topCountriesBars = countryEntries.slice(0, 3).map(([country, value]) => ({
    label: formatCountry(country),
    country,
    value,
    meta: `${value} événement${value > 1 ? "s" : ""}`,
    flagMarkup: getCountryFlagMarkup(country, "country-flag country-flag--mini")
  }));
  const topCountryShare = topCountryCount > 0
    ? `${formatPercent((topCountryCount / Math.max(countryEntries.reduce((sum, [, count]) => sum + count, 0), 1)) * 100)} % des visites hors France`
    : "Aucune visite hors France";
  const bestYearsBars = Object.entries(eventsPerYear)
    .sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]))
    .slice(0, 3)
    .map(([year, value]) => ({ label: String(year), value, meta: `${value} événement${value > 1 ? "s" : ""}` }));
  const travelEventsPerYear = travelEvents.reduce((acc, event) => {
    const year = new Date(event.startMs).getFullYear();
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {});
  const travelYearsBars = Object.entries(travelEventsPerYear)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .slice(-3)
    .map(([year, value]) => ({
      label: String(year),
      value,
      meta: `${value} voyage${value > 1 ? "s" : ""}`
    }));

  setVisualMarkup("stat-distance-visual", createKpiStripMarkup([
    { label: "Trajets", value: String(distanceDetailItems.length) },
    { label: "Plus long", value: `${Math.round(longestDistance)} km` }
  ]));
  setVisualMarkup("stat-countries-visual", createMiniBarsMarkup(countryContinentEntries, {
    maxValue: Math.max(...countryContinentEntries.map((entry) => Number(entry.totalCountries) || 0), 1),
    valueFormatter: (value, entry) => `${value}/${entry.totalCountries}`
  }));
  setVisualMarkup("stat-top-country-visual", topCountry
    ? `${createMiniBarsMarkup(topCountriesBars, {
        valueFormatter: (value) => `${value}`,
        labelPrefixHtml: (entry) => entry.flagMarkup || ""
      })}<div class="stat-hero-caption">${escapeHtml(topCountryShare)}</div>`
    : '<p class="stat-visual-empty">Aucune donnée hors France.</p>');
  setVisualMarkup("stat-travels-visual", travelYearsBars.length
    ? createMiniBarsMarkup(travelYearsBars, {
        valueFormatter: (value) => `${value}`
      })
    : '<p class="stat-visual-empty">Aucun voyage détecté.</p>');
  setVisualMarkup("stat-best-year-visual", createMiniBarsMarkup(bestYearsBars, {
    valueFormatter: (value) => `${value}`
  }));
  setVisualMarkup("stat-cities-visual", createMiniBarsMarkup(topCities, {
    valueFormatter: (value) => `${value}`
  }));
  setVisualMarkup("stat-longest-visual", longestTrip
    ? createKpiStripMarkup([{ label: "Départ", value: longestTrip.from }, { label: "Arrivée", value: longestTrip.to }])
    : '<p class="stat-visual-empty">Aucun trajet détecté.</p>');
  setVisualMarkup("stat-artists-visual", createMiniPodiumMarkup(
    rankedArtistPerformances.slice(0, 3).map((entry) => ({
      name: entry.name,
      meta: `${entry.eventTitle} · ${formatArtistRating(entry.rating)}`
    }))
  ));
  setVisualMarkup("stat-theme-parks-visual", createMiniPodiumMarkup(
    themeParkList.slice(0, 3).map((entry) => ({
      name: entry.title,
      meta: `${formatThemeParkPlace(entry)} · ${formatParkRating(entry.bestRating)}`
    }))
  ));

  setStatDetail("countries", {
    title: "Pays visités — Général",
    subtitle: `${countriesList.length} pays / ${TOTAL_COUNTRIES} · ${formatPercent(countriesCoveragePct)} % du monde`,
    html: createGroupedStatDetailList(countriesGroupedByContinent)
  });



  setStatDetail("livedPlaces", {
    title: "Endroits vécus",
    subtitle: `${livedPlacesPeriods.length} période${livedPlacesPeriods.length > 1 ? "s" : ""} de vie · ${livedPlacesList.length} lieu${livedPlacesList.length > 1 ? "x" : ""} unique${livedPlacesList.length > 1 ? "s" : ""}`,
    html: createStatDetailList(
      livedPlacesPeriods.map((event) => {
        const isOngoing = String(event.endDate || "").trim().toLowerCase() === "today";
        const dateRange = isOngoing
          ? `${formatFullDate(event.startMs)} — Aujourd'hui`
          : formatEventDateRange(event);

        return {
          title: event.title || formatLocationLabel(event),
          meta: `${formatLocationLabel(event)} · ${dateRange}`,
          chips: [formatDurationBetween(event.startMs, event.endMs), ...(isOngoing ? ["En cours"] : [])],
        };
      })
    )
  });

  setStatDetail("travels", {
    title: "Moyenne de voyages par an",
    subtitle: travelYearsWithTrips.length
      ? `${formatPercent(averageTravelPerYear)} voyage${averageTravelPerYear > 1 ? "s" : ""} / an · ${travelEvents.length} voyage${travelEvents.length > 1 ? "s" : ""} sur ${travelYearsWithTrips.length} an${travelYearsWithTrips.length > 1 ? "s" : ""}`
      : "Aucun voyage détecté",
    html: createGroupedStatDetailList([
      {
        title: "Liste des voyages",
        meta: `${travelEvents.length} entrée${travelEvents.length > 1 ? "s" : ""}`,
        items: travelEvents.map((event) => ({
          title: event.title || "Voyage",
          meta: formatEventDateRange(event)
        }))
      }
    ],)
  });

  setStatDetail("distance", {
    title: "Distance parcourue",
    subtitle: `${Math.round(totalDistance)} km cumulés · ${distanceDetailItems.length} ligne${distanceDetailItems.length > 1 ? "s" : ""} affichée${distanceDetailItems.length > 1 ? "s" : ""}`,
    html: createStatDetailList(distanceDetailItems)
  });

  setStatDetail("longest", {
    title: "Plus long trajet",
    subtitle: longestTrip
      ? `${Math.round(longestDistance)} km · ${longestTrip.from} → ${longestTrip.to}`
      : "Aucun trajet détecté",
    html: longestTrip
      ? createStatDetailList([{ title: `${longestTrip.from} → ${longestTrip.to}`, meta: `${formatDetailDateRange(longestTrip.startDate, longestTrip.endDate)} · ${Math.round(longestDistance)} km`, chips: [longestTrip.eventTitle || "Trajet"] }])
      : '<p class="stats-detail-empty">Aucun trajet détecté.</p>'
  });

  setStatDetail("cities", {
    title: "Villes référencées",
    subtitle: `${citiesList.length} ville${citiesList.length > 1 ? "s" : ""} unique${citiesList.length > 1 ? "s" : ""}`,
    html: createStatDetailList(
      citiesList.map((city) => ({
        title: formatLocationLabel(city)
      }))
    )
  });

  setStatDetail("topCountry", {
    title: "Pays le plus visité",
    subtitle: topCountry
      ? `${titleCase(topCountry)} · ${topCountryCount} événement${topCountryCount > 1 ? "s" : ""}`
      : "Aucun pays détecté",
    subtitleHtml: topCountry
      ? `${formatCountryLabelWithFlag(topCountry)} · ${topCountryCount} événement${topCountryCount > 1 ? "s" : ""}`
      : "Aucun pays détecté",
    html: createStatDetailList(
      topCountryEvents.map((event) => ({
        title: event.title || "Sans titre",
        meta: formatEventDateRange(event)
      }))
    )
  });

  setStatDetail("bestYear", {
    title: "Année la plus active",
    subtitle: bestYear
      ? `${bestYear} · ${bestYearCount} événement${bestYearCount > 1 ? "s" : ""}`
      : "Aucune année détectée",
    html: createStatDetailList(
      bestYearEvents.map((event) => ({
        title: event.title || "Sans titre"
      }))
    )
  });

  setStatDetail("artistsSeen", {
    title: "Artistes vus",
    subtitle: artistsList.length
      ? `${artistsList.length} artiste${artistsList.length > 1 ? "s" : ""} unique${artistsList.length > 1 ? "s" : ""} · ${rankedArtistPerformances.length} performance${rankedArtistPerformances.length > 1 ? "s" : ""} notée${rankedArtistPerformances.length > 1 ? "s" : ""} sur ${lineupEvents.length} événement${lineupEvents.length > 1 ? "s" : ""}`
      : "Aucun lineup détecté",
    html: createGroupedStatDetailList(artistsGroupedByEvent, {
      introHtml: artistsPodiumMarkup
    })
  });

  const ratedThemeParkCount = themeParkList.filter((entry) => Number.isFinite(entry.bestRating)).length;

  setStatDetail("themeParks", {
    title: "Parcs d'attractions",
    subtitle: themeParkList.length
      ? `${themeParkEvents.length} visite${themeParkEvents.length > 1 ? "s" : ""}`
      : "Aucun parc d'attractions détecté",
    html: `${themeParksPodiumMarkup}${themeParksRankingMarkup}`
  });

  bindStatCard(statCards.countries, "countries", "Afficher la liste des pays visités");
  bindStatCard(statCards.livedPlaces, "livedPlaces", "Afficher le détail des endroits vécus");
  bindStatCard(statCards.cities, "cities", "Afficher la liste des villes référencées");
  bindStatCard(statCards.travels, "travels", "Afficher le détail des voyages hors France");
  bindStatCard(statCards.distance, "distance", "Afficher le détail des trajets cumulés");
  bindStatCard(statCards.longest, "longest", "Afficher le détail du plus long trajet");
  bindStatCard(statCards.bestYear, "bestYear", "Afficher tous les événements de l'année la plus active");
  bindStatCard(statCards.topCountry, "topCountry", "Afficher les événements liés au pays le plus visité");
  bindStatCard(statCards.artistsSeen, "artistsSeen", "Afficher la liste des artistes vus");
  bindStatCard(statCards.themeParks, "themeParks", "Afficher la liste des parcs d'attractions");
}

function getStepDateMs(step, fallbackDate) {
  const startValue = step.date ?? step.startDate ?? fallbackDate;
  const endValue = step.endDate ?? step.date ?? step.startDate ?? fallbackDate;

  return {
    startMs: toMs(startValue),
    endMs: toMs(endValue)
  };
}

function getMapCategory(item, fallbackCategory) {
  return item?.mapCategory || item?.category || fallbackCategory;
}

function isMapPointVisible(point, activeCategoriesSet) {
  return activeCategoriesSet.has(getMapCategory(point, point.category));
}

function getEventMapPoints(event) {
  const points = [];
  const hasMainCoordinates =
    Number.isFinite(Number(event.latitude)) &&
    Number.isFinite(Number(event.longitude));

  if (hasMainCoordinates) {
    points.push({
      id: `${event.id}__main`,
      parentEventId: event.id,
      kind: "main",
      stepType: "main",
      title: event.title,
      description: event.description || "",
      visualType: event.visualType,
      startMs: event.startMs,
      endMs: event.endMs,
      category: event.category,
      mapCategory: getMapCategory(event, event.category),
      color: event.color,
      city: event.city,
      country: event.country,
      latitude: Number(event.latitude),
      longitude: Number(event.longitude)
    });
  }

  flattenStepTree(event.steps, {
    parentDate: event.startDate,
    parentColor: event.color,
    parentCategory: getMapCategory(event, event.category),
    parentTitle: event.title
  }).forEach((step) => {
    if (!step._hasCoordinates) return;

    points.push({
      id: `${event.id}__step_${step._path.join("_")}`,
      parentEventId: event.id,
      kind: "step",
      stepType: step.type || "step",
      title: step._stepTitle || step.title || step.city || event.title,
      description: step.description || "",
      visualType: step.visualType,
      startMs: step.startMs,
      endMs: step.endMs,
      category: event.category,
      mapCategory: getMapCategory(step, getMapCategory(event, event.category)),
      color: step.color || step._inheritedColor || event.color,
      city: step.city,
      country: step.country,
      latitude: Number(step.latitude),
      longitude: Number(step.longitude)
    });
  });

  return points;
}

function getEventRoutePoints(event, activeCategoriesSet = getActiveCategories()) {
  return flattenStepTree(event.steps, {
    parentDate: event.startDate,
    parentColor: event.color,
    parentCategory: getMapCategory(event, event.category),
    parentTitle: event.title,
    returnToParentAfterChildren: true
  })
    .filter((step) => {
      if (!step._hasCoordinates) return false;

      const stepCategory = getMapCategory(step, getMapCategory(event, event.category));
      return activeCategoriesSet.has(stepCategory);
    })
    .map((step) => [Number(step.latitude), Number(step.longitude)]);
}

function createEventPopup(event) {
  const dateText = event.visualType === "range"
    ? `Du ${formatFullDate(event.startMs)} au ${formatFullDate(event.endMs)}`
    : formatFullDate(event.startMs);

  const location = [event.city, event.country].filter(Boolean).join(", ");
  const stepTypeLabels = {
    main: "Destination principale",
    departure: "Départ",
    layover: "Escale",
    arrival: "Arrivée",
    stay: "Séjour",
    transfer: "Correspondance",
    port_stop: "Escale",
    step: "Étape"
  };
  const typeLabel = event.kind === "step"
    ? (stepTypeLabels[event.stepType] || "Étape")
    : "Voyage";

  return `
    <div class="map-popup">
      <div class="map-popup-date">${escapeHtml(dateText)}</div>
      <div class="map-popup-title">${escapeHtml(event.title)}</div>
      <div class="map-popup-location">${escapeHtml(typeLabel)}${location ? ` · ${escapeHtml(location)}` : ""}</div>
      ${event.description ? `<div class="map-popup-desc">${escapeHtml(event.description)}</div>` : ""}
    </div>
  `;
}

function getHeatWeight(event) {
  const weights = {
    event: 1.0,
    travel: 0.85,
    association: 0.7,
    education: 0.6,
    projects: 0.5,
    living_place: 0.35,
    personal: 0.3,
    system: 0
  };

  return weights[event.category] ?? 0.4;
}

function getEventFocusZoom() {
  if (!leafletMap) return 8;
  const currentZoom = leafletMap.getZoom();
  if (!Number.isFinite(currentZoom)) return 8;
  return Math.max(8, Math.min(10, currentZoom));
}

function eventHasMainMapLocation(event) {
  if (!event) return false;
  return Number.isFinite(Number(event.latitude)) && Number.isFinite(Number(event.longitude));
}

function getPopupAwareCenter(lat, lng, targetZoom) {
  if (!leafletMap) return L.latLng(lat, lng);

  const mapSize = leafletMap.getSize();
  const markerLatLng = L.latLng(lat, lng);
  const markerPoint = leafletMap.project(markerLatLng, targetZoom);

  const verticalOffset = Math.round(mapSize.y * 0.14);
  const adjustedPoint = markerPoint.subtract([0, verticalOffset]);

  return leafletMap.unproject(adjustedPoint, targetZoom);
}

function getEventFocusLatLngs(event, activeCategoriesSet = getActiveCategories()) {
  const visiblePoints = getEventMapPoints(event)
    .filter((point) => isMapPointVisible(point, activeCategoriesSet));

  const mainPoint = visiblePoints.find((point) => point.kind === "main");

  if (mainPoint) {
    return [L.latLng(Number(mainPoint.latitude), Number(mainPoint.longitude))];
  }

  return visiblePoints.map((point) => L.latLng(Number(point.latitude), Number(point.longitude)));
}

function focusMapOnEvent(event) {
  if (!leafletMap) return;

  const focusLatLngs = getEventFocusLatLngs(event);
  if (!focusLatLngs.length) return;

  const marker = markersByEventId.get(event.id);
  const focusToken = ++pendingMapFocusToken;

  lastFocusedEventId = event.id;
  shouldRestoreFocusedPopup = false;
  leafletMap.stop();
  leafletMap.closePopup();
  leafletMap.invalidateSize({ pan: false });

  const finalizeFocus = () => {
    if (focusToken !== pendingMapFocusToken) return;

    markerEntries.forEach(({ eventId, marker: entryMarker }) => {
      if (eventId === event.id && typeof entryMarker.bringToFront === "function") {
        entryMarker.bringToFront();
      }
    });

    if (marker && typeof marker.bringToFront === "function") {
      marker.bringToFront();
    }
  };

  leafletMap.once("moveend", finalizeFocus);

  if (focusLatLngs.length > 1) {
    const focusBounds = L.latLngBounds(focusLatLngs);
    leafletMap.flyToBounds(focusBounds, {
      animate: true,
      duration: 0.85,
      easeLinearity: 0.2,
      padding: [36, 36],
      maxZoom: 8
    });
    return;
  }

  const focusPoint = focusLatLngs[0];
  const targetZoom = getEventFocusZoom();
  const targetCenter = getPopupAwareCenter(focusPoint.lat, focusPoint.lng, targetZoom);

  leafletMap.flyTo(targetCenter, targetZoom, {
    animate: true,
    duration: 0.85,
    easeLinearity: 0.2,
    noMoveStart: false
  });
}

function resetMapViewToInitial(activeCategoriesSet = getActiveCategories()) {
  if (!leafletMap) return;

  const normalizedEvents = normalizeEvents(events);
  const mappedEvents = normalizedEvents
    .flatMap((event) => getEventMapPoints(event))
    .filter((point) => isMapPointVisible(point, activeCategoriesSet));

  const bounds = [];

  normalizedEvents.forEach((event) => {
    if (isHeatmapEnabled) return;

    const routePoints = getEventRoutePoints(event, activeCategoriesSet);
    if (routePoints.length < 2) return;

    routePoints.forEach((point) => bounds.push(point));
  });

  mappedEvents.forEach((event) => {
    bounds.push([Number(event.latitude), Number(event.longitude)]);
  });

  leafletMap.stop();
  leafletMap.closePopup();
  leafletMap.invalidateSize({ pan: false });

  if (bounds.length === 1) {
    leafletMap.flyTo(bounds[0], Math.max(6, leafletMap.getMinZoom()), {
      animate: true,
      duration: 0.85,
      easeLinearity: 0.2
    });
    return;
  }

  if (bounds.length > 1) {
    const latLngBounds = L.latLngBounds(bounds);
    leafletMap.flyToBounds(latLngBounds, {
      animate: true,
      duration: 0.85,
      easeLinearity: 0.2,
      padding: [30, 30],
      maxZoom: 8
    });
    return;
  }

  leafletMap.flyTo([46.603354, 1.888334], Math.max(5, leafletMap.getMinZoom()), {
    animate: true,
    duration: 0.85,
    easeLinearity: 0.2
  });
}

function renderEventsMap(activeCategoriesSet = getActiveCategories()) {
  if (!mapEl || typeof L === "undefined") return;

  const normalizedEvents = normalizeEvents(events)
    ;
  const mappedEvents = normalizedEvents
    .flatMap((event) => getEventMapPoints(event))
    .filter((point) => isMapPointVisible(point, activeCategoriesSet));

  let currentCenter = null;
  let currentZoom = null;
  const hadExistingView = Boolean(leafletMap && leafletMap._loaded);

  if (hadExistingView) {
    currentCenter = leafletMap.getCenter();
    currentZoom = leafletMap.getZoom();
  }

  if (!leafletMap) {
    const worldBounds = L.latLngBounds(
      L.latLng(-85, -200),
      L.latLng(85, 200)
    );

    leafletMap = L.map(mapEl, {
      scrollWheelZoom: true,
      minZoom: 1,
      maxBounds: worldBounds,
      maxBoundsViscosity: 1.0
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap);

    leafletMarkersLayer = L.layerGroup().addTo(leafletMap);
    leafletRoutesLayer = L.layerGroup().addTo(leafletMap);
  }

  leafletMarkersLayer.clearLayers();
  markersByEventId.clear();
  markerEntries.length = 0;

  if (leafletRoutesLayer) {
    leafletRoutesLayer.clearLayers();
    routeEntries.length = 0;
  }

  if (leafletHeatLayer) {
    leafletMap.removeLayer(leafletHeatLayer);
    leafletHeatLayer = null;
  }

  const bounds = [];

  normalizedEvents.forEach((event) => {
    if (!leafletRoutesLayer || isHeatmapEnabled) return;

    const routePoints = getEventRoutePoints(event, activeCategoriesSet);
    if (routePoints.length < 2) return;

    const polyline = L.polyline(routePoints, {
      color: event.color || "#8ab4ff",
      weight: 2,
      opacity: 0.7,
      dashArray: "6, 8"
    });

    polyline.addTo(leafletRoutesLayer);
    routeEntries.push({ eventId: event.id, layer: polyline });
    routePoints.forEach((point) => bounds.push(point));
  });

  if (isHeatmapEnabled && typeof L.heatLayer === "function") {
    const heatPoints = mappedEvents.map((event) => {
      const lat = Number(event.latitude);
      const lng = Number(event.longitude);
      bounds.push([lat, lng]);
      return [lat, lng, getHeatWeight(event)];
    });

    leafletHeatLayer = L.heatLayer(heatPoints, {
      radius: 28,
      blur: 22,
      maxZoom: 10,
      minOpacity: 0.35
    }).addTo(leafletMap);
  } else {
    mappedEvents.forEach((event) => {
      const lat = Number(event.latitude);
      const lng = Number(event.longitude);
      bounds.push([lat, lng]);

      const isStep = event.kind === "step";
      const marker = L.circleMarker([lat, lng], {
        radius: (event.visualType === "range" ? 7 : 8),
        color: event.color || "#8ab4ff",
        fillColor: event.color || "#8ab4ff",
        fillOpacity: isStep ? 0.75 : 0.9,
        weight: isStep ? 1.5 : 2
      });

      marker.bindPopup(createEventPopup(event));
      marker.on("click", () => {
        pendingMapFocusToken += 1;
        lastFocusedEventId = event.parentEventId || event.id;
        shouldRestoreFocusedPopup = true;
        const parentEvent = getEventById(event.parentEventId || event.id);
        if (parentEvent) {
          selectEvent(parentEvent, { openDrawer: false, focusMap: false });
        }
      });

      marker.on("dblclick", () => {
        const parentEvent = getEventById(event.parentEventId || event.id);
        if (parentEvent) {
          openDrawer(parentEvent, { focusMap: false });
        }
      });
      marker.addTo(leafletMarkersLayer);
      markerEntries.push({
        eventId: event.parentEventId || event.id,
        marker,
        isStep,
        pointKind: event.kind || "main"
      });
      markersByEventId.set(event.id, marker);

      if (event.parentEventId && !markersByEventId.has(event.parentEventId)) {
        markersByEventId.set(event.parentEventId, marker);
      }
    });
  }

  if (hadExistingView && currentCenter && Number.isFinite(currentZoom)) {
    leafletMap.setView(currentCenter, Math.max(currentZoom, leafletMap.getMinZoom()), { animate: false });
  } else if (bounds.length === 1) {
    leafletMap.setView(bounds[0], Math.max(6, leafletMap.getMinZoom()));
  } else if (bounds.length > 1) {
    const latLngBounds = L.latLngBounds(bounds);
    leafletMap.fitBounds(latLngBounds, { padding: [30, 30] });
    const boundsZoom = leafletMap.getBoundsZoom(latLngBounds, false, [30, 30]);
    leafletMap.setMinZoom(Math.max(2, boundsZoom));
    leafletMap.fitBounds(latLngBounds, { padding: [30, 30] });
  } else {
    leafletMap.setView([46.603354, 1.888334], Math.max(5, leafletMap.getMinZoom()));
  }

  if (!isHeatmapEnabled && hadExistingView && shouldRestoreFocusedPopup && lastFocusedEventId && markersByEventId.has(lastFocusedEventId)) {
    const marker = markersByEventId.get(lastFocusedEventId);
    requestAnimationFrame(() => {
      if (marker) {
        marker.openPopup();
        if (typeof marker.bringToFront === "function") {
          marker.bringToFront();
        }
      }
    });
  }

  updateMapSelectionHighlight();

  requestAnimationFrame(() => {
    leafletMap.invalidateSize();
  });
}


function renderLeftPanelCategories() {
  if (!leftPanelCategoriesEl) return;

  const rowsByCategory = new Map(
    Array.from(stage.querySelectorAll(".category-row")).map((row) => [row.dataset.category, row])
  );
  const lifeBandLabel = stage.querySelector(".life-band-global .life-band-label");
  const stageRect = stage.getBoundingClientRect();

  const availableCategories = CATEGORY_ORDER.filter((category) =>
    events.some((event) => event.category === category)
  );

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

    item.innerHTML = `
      <span class="left-category-label__content">
        <span class="left-category-label__checkbox">
          <input type="checkbox" ${isVisible ? "checked" : ""} aria-label="Afficher ou masquer ${escapeHtml(label)}" />
        </span>
        <span class="left-category-label__text">${escapeHtml(label)}</span>
      </span>
    `;

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


let networkGraphState = null;

function getNodeTypeLabel(type) {
  return ({
    event: "Élément",
    category: "Catégorie",
    city: "Ville",
    artist: "Artiste",
    tag: "Tag"
  })[type] || "Nœud";
}

function buildNetworkGraphData(activeCategoriesSet = getActiveCategories()) {
  const normalized = normalizeEvents(events)
    .filter((event) => event.id !== "TODAY")
    .filter((event) => activeCategoriesSet.has(event.category));

  const nodeMap = new Map();
  const linkMap = new Map();

  const ensureNode = (id, payload) => {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, { id, degree: 0, ...payload });
    }
    return nodeMap.get(id);
  };

  const ensureLink = (source, target, relation) => {
    const ordered = [source, target].sort();
    const key = `${ordered[0]}__${ordered[1]}__${relation}`;
    if (!linkMap.has(key)) {
      linkMap.set(key, { source, target, relation });
      const sourceNode = nodeMap.get(source);
      const targetNode = nodeMap.get(target);
      if (sourceNode) sourceNode.degree += 1;
      if (targetNode) targetNode.degree += 1;
    }
  };

  normalized.forEach((event) => {
    const categoryLabel = CATEGORY_LABELS[event.category] || titleCase(event.category || "autre");
    const eventNodeId = `event:${event.id}`;
    ensureNode(eventNodeId, {
      type: "event",
      label: event.title || "Sans titre",
      color: event.color || CATEGORY_COLORS[event.category] || "#60a5fa",
      eventId: event.id,
      event,
      meta: [categoryLabel, formatEventDateRange(event)].filter(Boolean).join(" · ")
    });

    const categoryNodeId = `category:${event.category}`;
    ensureNode(categoryNodeId, {
      type: "category",
      label: categoryLabel,
      color: CATEGORY_COLORS[event.category] || "#f59e0b",
      meta: "Catégorie"
    });
    ensureLink(eventNodeId, categoryNodeId, "category");

    if (event.city) {
      const cityNodeId = `city:${normalizeTagValue(`${event.city}|${event.country || ""}`)}`;
      ensureNode(cityNodeId, {
        type: "city",
        label: event.city,
        color: "#22c55e",
        meta: [event.city, event.country].filter(Boolean).join(", ")
      });
      ensureLink(eventNodeId, cityNodeId, "city");
    }

    getEventTags(event).forEach((tag) => {
      const tagNodeId = `tag:${tag}`;
      ensureNode(tagNodeId, {
        type: "tag",
        label: titleCase(tag),
        color: "#a78bfa",
        meta: "Tag"
      });
      ensureLink(eventNodeId, tagNodeId, "tag");
    });

    normalizeLineup(event.lineup).forEach((artistEntry) => {
      const artistNodeId = `artist:${normalizeTagValue(artistEntry.name)}`;
      ensureNode(artistNodeId, {
        type: "artist",
        label: artistEntry.name,
        color: "#f472b6",
        meta: artistEntry.rating != null ? `Note live ${formatArtistRating(artistEntry.rating)}` : "Artiste"
      });
      ensureLink(eventNodeId, artistNodeId, "artist");
    });
  });

  const radiusBase = {
    event: 7,
    category: 12,
    city: 9,
    artist: 8,
    tag: 7
  };

  const nodes = Array.from(nodeMap.values()).map((node) => {
    const base = radiusBase[node.type] || 8;
    const radius = Math.max(base, base + Math.min(16, Math.sqrt(Math.max(1, node.degree)) * 2.25));
    return {
      ...node,
      radius,
      isPeripheralCandidate: node.degree <= 1,
      massFactor: 1 + Math.min(1.6, node.degree * 0.08)
    };
  });

  const links = Array.from(linkMap.values()).map((link) => ({ ...link }));
  return { nodes, links };
}

function getNodeTypeLabel(type) {
  return {
    event: "Élément",
    category: "Catégorie",
    city: "Ville",
    artist: "Artiste",
    tag: "Tag"
  }[type] || "Nœud";
}

const NETWORK_DEFAULTS = {
  repulsion: 2.2,
  linkStrength: 0.45,
  linkDistance: 1.0,
  centerForce: 0.16
};

const NETWORK_RANGES = {
  repulsion: { min: 1.55, max: 2.85, step: 0.05 },
  linkStrength: { min: 0.3, max: 0.6, step: 0.01 },
  linkDistance: { min: 0.7, max: 1.3, step: 0.02 },
  centerForce: { min: 0.1, max: 0.22, step: 0.005 }
};

function formatNetworkRelativePercent(value, baseline) {
  return `${Math.round((value / baseline) * 100)}%`;
}

function getNetworkSettings() {
  return {
    repulsion: Number.parseFloat(networkRepulsionEl?.value || String(NETWORK_DEFAULTS.repulsion)),
    linkStrength: Number.parseFloat(networkLinkStrengthEl?.value || String(NETWORK_DEFAULTS.linkStrength)),
    linkDistance: Number.parseFloat(networkLinkDistanceEl?.value || String(NETWORK_DEFAULTS.linkDistance)),
    centerForce: Number.parseFloat(networkCenterForceEl?.value || String(NETWORK_DEFAULTS.centerForce))
  };
}

function updateNetworkControlLabels() {
  const settings = getNetworkSettings();
  if (networkRepulsionValueEl) networkRepulsionValueEl.textContent = formatNetworkRelativePercent(settings.repulsion, NETWORK_DEFAULTS.repulsion);
  if (networkLinkStrengthValueEl) networkLinkStrengthValueEl.textContent = formatNetworkRelativePercent(settings.linkStrength, NETWORK_DEFAULTS.linkStrength);
  if (networkLinkDistanceValueEl) networkLinkDistanceValueEl.textContent = formatNetworkRelativePercent(settings.linkDistance, NETWORK_DEFAULTS.linkDistance);
  if (networkCenterForceValueEl) networkCenterForceValueEl.textContent = formatNetworkRelativePercent(settings.centerForce, NETWORK_DEFAULTS.centerForce);
}

function renderKnowledgeGraph(activeCategoriesSet = getActiveCategories()) {
  if (!networkGraphEl) return;

  networkGraphState?.destroy?.();
  networkGraphState = null;

  if (!window.d3) {
    networkGraphEl.innerHTML = `<div class="network-panel__empty">La librairie du graphe n'a pas pu être chargée.</div>`;
    networkGraphState = null;
    return;
  }

  const settings = getNetworkSettings();
  updateNetworkControlLabels();

  const data = buildNetworkGraphData(activeCategoriesSet);
  networkGraphEl.innerHTML = "";

  if (!data.nodes.length || !data.links.length) {
    networkGraphEl.innerHTML = '<div class="network-panel__empty">Aucune relation disponible pour les catégories actuellement actives.</div>';
    networkGraphState = null;
    return;
  }

  const width = Math.max(networkGraphEl.clientWidth || 0, 320);
  const height = Math.max(networkGraphEl.clientHeight || 0, 420);
  const d3 = window.d3;
  const centerX = width / 2;
  const centerY = height / 2;
  const peripheralRadius = Math.max(190, Math.min(width, height) * 0.34);

  data.nodes.forEach((node, index) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      const angle = (Math.PI * 2 * index) / Math.max(1, data.nodes.length);
      const radialBias = node.isPeripheralCandidate ? peripheralRadius : Math.min(width, height) * 0.16;
      node.x = centerX + Math.cos(angle) * radialBias;
      node.y = centerY + Math.sin(angle) * radialBias;
    }
  });

  const svg = d3.select(networkGraphEl)
    .append("svg")
    .attr("class", "network-svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const defs = svg.append("defs");
  const glow = defs.append("filter")
    .attr("id", "network-node-glow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");

  glow.append("feGaussianBlur")
    .attr("stdDeviation", "4")
    .attr("result", "coloredBlur");

  const glowMerge = glow.append("feMerge");
  glowMerge.append("feMergeNode").attr("in", "coloredBlur");
  glowMerge.append("feMergeNode").attr("in", "SourceGraphic");

  const root = svg.append("g");
  const linkLayer = root.append("g").attr("class", "network-links");
  const nodeLayer = root.append("g").attr("class", "network-nodes");

  const tooltip = document.createElement("div");
  tooltip.className = "network-tooltip";
  tooltip.hidden = true;
  networkGraphEl.appendChild(tooltip);

  const adjacency = new Map();
  const addAdjacent = (a, b) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a).add(b);
  };

  data.links.forEach((link) => {
    addAdjacent(link.source, link.target);
    addAdjacent(link.target, link.source);
  });

  const relationDistanceBase = {
    category: 80,
    city: 92,
    artist: 104,
    tag: 76
  };

  const relationStrengthBase = {
    category: 1.08,
    city: 0.92,
    artist: 0.88,
    tag: 0.82
  };

  const simulation = d3.forceSimulation(data.nodes)
    .alpha(0.9)
    .alphaDecay(0.035)
    .velocityDecay(0.28)
    .force("link", d3.forceLink(data.links)
      .id((d) => d.id)
      .distance((d) => {
        const base = relationDistanceBase[d.relation] || 88;
        const sourceDegree = (d.source.degree || 1);
        const targetDegree = (d.target.degree || 1);
        const hubSlack = (Math.sqrt(sourceDegree) + Math.sqrt(targetDegree)) * 4;
        return (base + hubSlack) * settings.linkDistance;
      })
      .strength((d) => (relationStrengthBase[d.relation] || 0.9) * settings.linkStrength))
    .force("charge", d3.forceManyBody()
      .theta(0.82)
      .distanceMax(Math.max(width, height) * 0.72)
      .strength((d) => {
        const base = d.type === "event" ? -230 : -175;
        const degreeBoost = Math.min(170, d.degree * 18);
        const peripheralBoost = d.isPeripheralCandidate ? 95 : 0;
        return -(Math.abs(base) + degreeBoost + peripheralBoost) * settings.repulsion;
      }))
    .force("center", d3.forceCenter(centerX, centerY))
    .force("x", d3.forceX(centerX).strength(settings.centerForce))
    .force("y", d3.forceY(centerY).strength(settings.centerForce))
    .force("periphery", d3.forceRadial(
      (d) => d.isPeripheralCandidate ? peripheralRadius : Math.max(22, peripheralRadius * 0.38),
      centerX,
      centerY
    ).strength((d) => d.isPeripheralCandidate ? 0.065 : 0.018))
    .force("collide", d3.forceCollide().radius((d) => d.radius + (d.type === "event" ? 26 : 18)).iterations(2));

  const link = linkLayer
    .selectAll("line")
    .data(data.links)
    .enter()
    .append("line")
    .attr("class", (d) => `network-link network-link--${d.relation}`)
    .attr("stroke-width", (d) => d.relation === "category" ? 1.5 : 1.15);

  const node = nodeLayer
    .selectAll("g")
    .data(data.nodes)
    .enter()
    .append("g")
    .attr("class", (d) => `network-node network-node--${d.type}`)
    .style("cursor", (d) => d.type === "event" ? "pointer" : "grab");

  node.append("circle")
    .attr("r", (d) => d.radius)
    .attr("fill", (d) => d.color || CATEGORY_COLORS[d.type] || CATEGORY_COLORS[d.category] || "#60a5fa")
    .attr("filter", "url(#network-node-glow)");

  node.append("text")
    .attr("class", (d) => `network-node__label ${d.type === "event" || d.degree >= 5 ? "is-always-visible" : ""}`)
    .attr("x", (d) => d.radius + 8)
    .attr("y", 4)
    .text((d) => d.label);

  const drag = d3.drag()
    .on("start", (event) => {
      svg.classed("is-dragging", true);
      if (!event.active) simulation.alphaTarget(0.22).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    })
    .on("drag", (event) => {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    })
    .on("end", (event) => {
      svg.classed("is-dragging", false);
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    });

  node.call(drag);

  const updateTooltip = (d) => {
    tooltip.hidden = false;
    tooltip.innerHTML = `
      <div class="network-tooltip__eyebrow">${escapeHtml(getNodeTypeLabel(d.type))}</div>
      <div class="network-tooltip__title">${escapeHtml(d.label)}</div>
      <div class="network-tooltip__meta">${escapeHtml(d.meta || `${d.degree} lien${d.degree > 1 ? "s" : ""}`)}</div>
      <div class="network-tooltip__meta">${escapeHtml(`${d.degree} connexion${d.degree > 1 ? "s" : ""}`)}</div>
    `;
  };

  const clearHighlight = () => {
    node.classed("is-faded", false).classed("is-highlighted", false).classed("is-neighbor", false);
    link.classed("is-faded", false).classed("is-highlighted", false);
    tooltip.hidden = true;
  };

  const highlightNode = (activeNode) => {
    const neighbors = adjacency.get(activeNode.id) || new Set();

    node
      .classed("is-highlighted", (d) => d.id === activeNode.id)
      .classed("is-neighbor", (d) => d.id !== activeNode.id && neighbors.has(d.id))
      .classed("is-faded", (d) => d.id !== activeNode.id && !neighbors.has(d.id));

    link
      .classed("is-highlighted", (d) => d.source.id === activeNode.id || d.target.id === activeNode.id)
      .classed("is-faded", (d) => d.source.id !== activeNode.id && d.target.id !== activeNode.id);

    updateTooltip(activeNode);
  };

  node
    .on("mouseenter", function(event, d) {
      highlightNode(d);
    })
    .on("mouseleave", function() {
      clearHighlight();
    })
    .on("click", function(event, d) {
      if (d.type === "event" && d.event) {
        selectEvent(d.event, { openDrawer: true, focusMap: true });
      }
      highlightNode(d);
    });

  const zoom = d3.zoom()
    .scaleExtent([0.28, 4.2])
    .on("zoom", (event) => {
      root.attr("transform", event.transform);
    });

  svg.call(zoom);
  svg.on("dblclick.zoom", null);

  const ticked = () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("transform", (d) => `translate(${d.x},${d.y})`);
  };

  simulation.on("tick", ticked);

  const fitGraph = (animate = true) => {
    const xs = data.nodes.map((d) => d.x).filter(Number.isFinite);
    const ys = data.nodes.map((d) => d.y).filter(Number.isFinite);
    if (!xs.length || !ys.length) return;

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const graphWidth = Math.max(1, maxX - minX);
    const graphHeight = Math.max(1, maxY - minY);
    const padding = 84;
    const scale = Math.max(0.28, Math.min(1.7, 0.92 / Math.max(graphWidth / Math.max(1, width - padding), graphHeight / Math.max(1, height - padding))));
    const translateX = width / 2 - ((minX + maxX) / 2) * scale;
    const translateY = height / 2 - ((minY + maxY) / 2) * scale;
    const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
    const selection = animate ? svg.transition().duration(420) : svg;
    selection.call(zoom.transform, transform);
  };

  const resetPositions = () => {
    data.nodes.forEach((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, data.nodes.length);
      const radialBias = node.isPeripheralCandidate ? peripheralRadius : Math.min(width, height) * 0.16;
      node.x = centerX + Math.cos(angle) * radialBias;
      node.y = centerY + Math.sin(angle) * radialBias;
      node.vx = 0;
      node.vy = 0;
      node.fx = null;
      node.fy = null;
    });
    simulation.alpha(0.95).restart();
    setTimeout(() => fitGraph(true), 220);
  };

  simulation.on("end", () => fitGraph(true));
  setTimeout(() => fitGraph(false), 260);

  networkGraphState = {
    svg,
    zoom,
    simulation,
    fitGraph,
    resetPositions,
    destroy() {
      simulation.stop();
    }
  };
}

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

  renderLeftPanelCategories();
  setupSynchronizedVerticalScroll();

  if (scroller) {
    scroller.scrollLeft = previousScrollLeft;
    scroller.scrollTop = previousScrollTop;
  }

  if (scroller && leftPanelInnerEl) {
    syncVerticalScroll(scroller, leftPanelInnerEl);
  }

  renderEventsMap(visibleCategories);
  renderKnowledgeGraph(visibleCategories);
  updateMapPanelUi();
}

zoomEl?.addEventListener("input", render);

heatmapToggleEl?.addEventListener("change", (event) => {
  isHeatmapEnabled = event.target.checked;
  renderEventsMap(getActiveCategories());
});

window.addEventListener("resize", () => {
  render();
});

render();
renderStats();

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
      renderKnowledgeGraph(getActiveCategories());
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
  renderKnowledgeGraph(getActiveCategories());
  networkGraphState?.resetPositions?.();
});
