let networkGraphState = null;

function getNodeTypeLabel(type) {
  return ({
    event: "Élément",
    step: "Étape",
    category: "Catégorie",
    country: "Pays",
    artist: "Artiste",
    tag: "Tag"
  })[type] || "Nœud";
}

function normalizeEventLinkValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function getEventLinkTargets(event) {
  const rawLinks = event?.link ?? event?.links ?? [];

  if (Array.isArray(rawLinks)) {
    return rawLinks
      .map((value) => normalizeEventLinkValue(value))
      .filter(Boolean);
  }

  const normalizedValue = normalizeEventLinkValue(rawLinks);
  return normalizedValue ? [normalizedValue] : [];
}

function buildEventLookupMaps(normalizedEvents = []) {
  const byId = new Map();
  const byTitle = new Map();

  normalizedEvents.forEach((event) => {
    byId.set(String(event.id || "").trim(), event);

    const titleKey = normalizeTagValue(event.title || "");
    if (!titleKey) return;

    if (!byTitle.has(titleKey)) {
      byTitle.set(titleKey, []);
    }
    byTitle.get(titleKey).push(event);
  });

  return { byId, byTitle };
}

function resolveLinkedEvent(linkValue, sourceEvent, lookupMaps) {
  const normalizedLinkValue = normalizeEventLinkValue(linkValue);
  if (!normalizedLinkValue) return null;

  const directMatch = lookupMaps.byId.get(normalizedLinkValue);
  if (directMatch && directMatch.id !== sourceEvent.id) {
    return directMatch;
  }

  const titleMatches = lookupMaps.byTitle.get(normalizeTagValue(normalizedLinkValue)) || [];
  return titleMatches.find((candidate) => candidate.id !== sourceEvent.id) || null;
}

function buildNetworkGraphData(activeCategoriesSet = getActiveCategories()) {
  const normalized = normalizeEvents(events)
    .filter((event) => event.id !== "TODAY")
    .filter((event) => activeCategoriesSet.has(event.category));
  const eventLookupMaps = buildEventLookupMaps(normalized);

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

  const ensureCountryNode = (country) => {
    if (!country) return null;
    const countryNodeId = `country:${normalizeTagValue(country)}`;
    ensureNode(countryNodeId, {
      type: "country",
      label: country,
      color: "#38bdf8",
      meta: "Pays"
    });
    return countryNodeId;
  };

  const getStepNodeLabel = (step) => step.title || step.city || step.country || "Étape";

  const getStepNodeMeta = (step, event) => {
    const stepDates = getStepDateMs(step, event.startDate ?? event.startMs);
    const dateLabel = step.endDate
      ? `${formatFullDate(stepDates.startMs)} — ${formatFullDate(stepDates.endMs)}`
      : formatFullDate(stepDates.startMs);
    const locationLabel = [step.city, step.country].filter(Boolean).join(", ");
    return [event.title, locationLabel, dateLabel].filter(Boolean).join(" · ");
  };

  const linkStepTree = (steps, event, parentNodeId) => {
    if (!Array.isArray(steps) || !steps.length) return;

    steps.forEach((step, index) => {
      if (!step || typeof step !== "object") return;

      const stepNodeId = `step:${event.id}:${parentNodeId}:${index}`;
      ensureNode(stepNodeId, {
        type: "step",
        label: getStepNodeLabel(step),
        color: step.color || event.color || CATEGORY_COLORS[event.category] || "#60a5fa",
        eventId: event.id,
        event,
        meta: getStepNodeMeta(step, event)
      });
      ensureLink(parentNodeId, stepNodeId, "step");

      const countryNodeId = ensureCountryNode(step.country);
      if (countryNodeId) {
        ensureLink(stepNodeId, countryNodeId, "country");
      }

      const nestedSteps = Array.isArray(step.steps) ? step.steps : [];
      if (nestedSteps.length) {
        linkStepTree(nestedSteps, event, stepNodeId);
      }
    });
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

    const hasSteps = Array.isArray(event.steps) && event.steps.length > 0;

    if (hasSteps) {
      linkStepTree(event.steps, event, eventNodeId);
    } else if (event.country) {
      const countryNodeId = ensureCountryNode(event.country);
      if (countryNodeId) {
        ensureLink(eventNodeId, countryNodeId, "country");
      }
    }

    getEventTags(event).forEach((tag) => {
      const normalizedTag = normalizeTagValue(tag);
      const tagNodeId = `tag:${normalizedTag}`;
      ensureNode(tagNodeId, {
        type: "tag",
        label: titleCase(tag),
        color: "#a78bfa",
        meta: "Tag"
      });
      ensureLink(eventNodeId, tagNodeId, "tag");

      const matchingCountryNodeId = `country:${normalizedTag}`;
      if (nodeMap.has(matchingCountryNodeId)) {
        ensureLink(tagNodeId, matchingCountryNodeId, "country");
      }
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

  normalized.forEach((event) => {
    const sourceNodeId = `event:${event.id}`;
    getEventLinkTargets(event).forEach((linkValue) => {
      const linkedEvent = resolveLinkedEvent(linkValue, event, eventLookupMaps);
      if (!linkedEvent || !activeCategoriesSet.has(linkedEvent.category)) return;

      const targetNodeId = `event:${linkedEvent.id}`;
      if (sourceNodeId === targetNodeId) return;

      ensureLink(sourceNodeId, targetNodeId, "event-link");
    });
  });

  const radiusBase = {
    event: 7,
    step: 8,
    category: 12,
    country: 11,
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
    step: 78,
    country: 82,
    artist: 104,
    tag: 76,
    "event-link": 92
  };

  const relationStrengthBase = {
    category: 1.08,
    step: 1.02,
    country: 1.02,
    artist: 0.88,
    tag: 0.82,
    "event-link": 0.98
  };

  const simulation = d3.forceSimulation(data.nodes)
  .alpha(1)
  .alphaDecay(0.08)
  .alphaMin(0.02)
  .velocityDecay(0.5)
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
        const base = d.type === "event" ? -230 : d.type === "step" ? -195 : -175;
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
    .force("collide", d3.forceCollide().radius((d) => d.radius + (d.type === "event" ? 26 : d.type === "step" ? 20 : 18)).iterations(2));

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
    .style("cursor", (d) => (d.type === "event" || d.type === "step") ? "pointer" : "grab");

  node.append("circle")
    .attr("r", (d) => d.radius)
    .attr("fill", (d) => d.color || CATEGORY_COLORS[d.type] || CATEGORY_COLORS[d.category] || "#60a5fa")
    .attr("filter", "url(#network-node-glow)");

  node.append("text")
    .attr("class", "network-node__label is-always-visible")
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
      if ((d.type === "event" || d.type === "step") && d.event) {
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

