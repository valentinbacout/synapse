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
  education: "Éducation",
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

function renderDrawerContent(event) {
  const location = getEventLocation(event);
  const embedUrl = normalizeYoutubeEmbed(event.youtubeUrl || event.youtube || event.videoUrl || "");
  const galleryItems = normalizeGalleryItems(event.gallery || event.photos || event.images);

  drawerContentEl.innerHTML = `
    <div class="drawer-meta-badges">
      <span class="drawer-badge">${escapeHtml(CATEGORY_LABELS[event.category] || event.category || "Événement")}</span>
      <span class="drawer-badge drawer-badge--date">${escapeHtml(formatEventDateRange(event))}</span>
    </div>
    <h2 class="event-drawer__title" id="event-drawer-title">${escapeHtml(event.title || "Sans titre")}</h2>
    ${location ? `<p class="event-drawer__location">📍 ${escapeHtml(location)}</p>` : ""}
    <div class="event-drawer__section">
      <h3>Description</h3>
      <p>${escapeHtml(event.description || "Aucune description disponible.")}</p>
    </div>
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
  distance: document.getElementById("stat-distance"),
  longest: document.getElementById("stat-longest"),
  longestMeta: document.getElementById("stat-longest-meta"),
  bestYear: document.getElementById("stat-best-year"),
  bestYearMeta: document.getElementById("stat-best-year-meta"),
  topCountry: document.getElementById("stat-top-country"),
  topCountryMeta: document.getElementById("stat-top-country-meta"),
  years: document.getElementById("stat-years"),
  breakdown: document.getElementById("stats-breakdown")
};

const statCards = {
  countries: statsEls.countries?.closest(".stat-card") || null,
  livedPlaces: statsEls.livedPlaces?.closest(".stat-card") || null,
  cities: statsEls.cities?.closest(".stat-card") || null,
  travels: statsEls.travels?.closest(".stat-card") || null,
  distance: statsEls.distance?.closest(".stat-card") || null,
  longest: statsEls.longest?.closest(".stat-card") || null,
  bestYear: statsEls.bestYear?.closest(".stat-card") || null,
  topCountry: statsEls.topCountry?.closest(".stat-card") || null
};

let statsModalEl = null;
let statsModalTitleEl = null;
let statsModalSubtitleEl = null;
let statsModalBodyEl = null;
let statsModalCloseEl = null;
let activeStatDetailKey = null;
const statsDetailDefinitions = new Map();

function escapeAttribute(value) {
  return escapeHtml(String(value ?? "")).replace(/`/g, "&#96;");
}

function titleCase(value) {
  const text = String(value || "").trim();
  if (!text) return "-";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatLocationLabel(item = {}) {
  const city = item.city ? String(item.city).trim() : "";
  const country = item.country ? String(item.country).trim() : "";
  return [city, country].filter(Boolean).join(", ") || "Lieu non précisé";
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
    const meta = item.meta ? `<div class="stats-detail-item__meta">${escapeHtml(item.meta)}</div>` : "";
    const chips = Array.isArray(item.chips) && item.chips.length
      ? `<div class="stats-detail-item__chips">${item.chips.map((chip) => `<span class="stats-detail-chip">${escapeHtml(chip)}</span>`).join("")}</div>`
      : "";
    const action = item.eventId
      ? `<button type="button" class="stats-detail-item__action" data-event-id="${escapeAttribute(item.eventId)}">Voir</button>`
      : "";

    return `
          <article class="stats-detail-item">
            <div class="stats-detail-item__main">
              <div class="stats-detail-item__title">${title}</div>
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
  statsModalSubtitleEl.textContent = definition.subtitle || "";
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

    if (Array.isArray(event.steps)) {
      event.steps.forEach((step) => pushLocation(step));
    }

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

  const distancePoints = normalized
    .flatMap((event) => {
      const points = [];

      const pushPoint = (item, fallbackDate, fallbackLabel) => {
        const lat = Number(item?.latitude);
        const lon = Number(item?.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        const dateValue = item?.date ?? item?.startDate ?? fallbackDate;
        if (!dateValue) return;

        points.push({
          lat,
          lon,
          date: toMs(dateValue),
          label: item?.city || item?.title || item?.country || fallbackLabel || "Lieu",
          country: item?.country || "",
          city: item?.city || "",
          eventId: event.id,
          eventTitle: event.title || fallbackLabel || "Événement"
        });
      };

      pushPoint(event, event.startDate, event.title);

      if (Array.isArray(event.steps)) {
        event.steps.forEach((step) => pushPoint(step, event.startDate, event.title));
      }

      return points;
    })
    .sort((a, b) => a.date - b.date)
    .filter((point, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1];

      return !(
        prev.lat === point.lat &&
        prev.lon === point.lon &&
        prev.date === point.date
      );
    });

  let totalDistance = 0;
  let longestDistance = 0;
  let longestTrip = null;
  const distanceSegments = [];

  for (let i = 1; i < distancePoints.length; i += 1) {
    const prev = distancePoints[i - 1];
    const curr = distancePoints[i];

    const d = distanceKm(prev.lat, prev.lon, curr.lat, curr.lon);

    totalDistance += d;

    const segment = {
      from: prev.city || prev.country || prev.label || "Lieu précédent",
      to: curr.city || curr.country || curr.label || "Lieu suivant",
      distance: d,
      startDate: prev.date,
      endDate: curr.date,
      eventId: curr.eventId,
      eventTitle: curr.eventTitle
    };

    distanceSegments.push(segment);

    if (d > longestDistance) {
      longestDistance = d;
      longestTrip = segment;
    }
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

  const countriesList = Array.from(uniqueCountriesMap.values()).sort((a, b) => a.localeCompare(b, "fr-FR"));
  const citiesList = Array.from(uniqueCitiesMap.values()).sort((a, b) => formatLocationLabel(a).localeCompare(formatLocationLabel(b), "fr-FR"));
  const livedPlacesList = Array.from(uniqueLivedPlacesMap.values()).sort((a, b) => formatLocationLabel(a).localeCompare(formatLocationLabel(b), "fr-FR"));
  const livedPlacesPeriods = normalized
    .filter((event) => event.category === "living_place")
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  if (statsEls.livedPlaces) statsEls.livedPlaces.textContent = String(uniqueLivedPlacesMap.size);
  if (statsEls.countries) statsEls.countries.textContent = `${uniqueCountriesMap.size} / ${TOTAL_COUNTRIES}`;
  if (statsEls.cities) statsEls.cities.textContent = String(uniqueCitiesMap.size);
  if (statsEls.travels) statsEls.travels.textContent = String(travelEvents.length);
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
  if (statsEls.topCountry) statsEls.topCountry.textContent = formatCountry(topCountry);
  if (statsEls.topCountryMeta) {
    statsEls.topCountryMeta.textContent = `${topCountryCount} événement${topCountryCount > 1 ? "s" : ""}`;
  }
  if (statsEls.years) statsEls.years.textContent = String(years.size);
  if (statsEls.breakdown) statsEls.breakdown.innerHTML = breakdownItems;

  setStatDetail("countries", {
    title: "Pays visités",
    subtitle: `${countriesList.length} pays distincts référencés dans la timeline`,
    html: createStatDetailList(
      countriesList.map((country) => ({
        title: titleCase(country)
      })),
      { compact: true }
    )
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
    title: "Voyages hors France",
    subtitle: `${travelEvents.length} voyage${travelEvents.length > 1 ? "s" : ""} détecté${travelEvents.length > 1 ? "s" : ""}`,
    html: createStatDetailList(
      travelEvents.map((event) => ({
        title: event.title || "Voyage",
        meta: formatEventDateRange(event)
      }))
    )
  });

  setStatDetail("distance", {
    title: "Distance parcourue",
    subtitle: `${Math.round(totalDistance)} km cumulés sur ${distanceSegments.length} trajet${distanceSegments.length > 1 ? "s" : ""}`,
    html: createStatDetailList(
      distanceSegments
        .slice()
        .sort((a, b) => a.startDate - b.startDate) // 👉 tri chronologique
        .map((segment) => ({
          title: `${segment.from} → ${segment.to}`,
          meta: `${formatFullDate(segment.startDate)} · ${Math.round(segment.distance)} km`,
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


  bindStatCard(statCards.countries, "countries", "Afficher la liste des pays visités");
  bindStatCard(statCards.livedPlaces, "livedPlaces", "Afficher le détail des endroits vécus");
  bindStatCard(statCards.cities, "cities", "Afficher la liste des villes référencées");
  bindStatCard(statCards.travels, "travels", "Afficher le détail des voyages hors France");
  bindStatCard(statCards.distance, "distance", "Afficher le détail des trajets cumulés");
  bindStatCard(statCards.longest, "longest", "Afficher le détail du plus long trajet");
  bindStatCard(statCards.bestYear, "bestYear", "Afficher tous les événements de l'année la plus active");
  bindStatCard(statCards.topCountry, "topCountry", "Afficher les événements liés au pays le plus visité");
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

  if (Array.isArray(event.steps)) {
    event.steps.forEach((step, index) => {
      const lat = Number(step.latitude);
      const lng = Number(step.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const dates = getStepDateMs(step, event.startDate);

      points.push({
        id: `${event.id}__step_${index}`,
        parentEventId: event.id,
        kind: "step",
        stepType: step.type || "step",
        title: step.title || step.city || event.title,
        description: step.description || "",
        visualType: step.endDate ? "range" : "point",
        startMs: dates.startMs,
        endMs: dates.endMs,
        category: event.category,
        mapCategory: getMapCategory(step, getMapCategory(event, event.category)),
        color: step.color || event.color,
        city: step.city,
        country: step.country,
        latitude: lat,
        longitude: lng
      });
    });
  }

  return points;
}

function getEventRoutePoints(event, activeCategoriesSet = getActiveCategories()) {
  if (!Array.isArray(event.steps)) return [];

  return event.steps
    .filter((step) => {
      const lat = Number(step.latitude);
      const lng = Number(step.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

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
renderEventsMap();

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
