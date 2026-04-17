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
    flattenStepTree(getEventSteps(event), { parentDate: event.startDate ?? event.startMs }).forEach((step) => pushLocation(step));

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
    const stepNodes = flattenStepTree(getEventSteps(event), {
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
      if (!getEventSteps(event).length) return false;

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

    const eventSteps = flattenStepTree(getEventSteps(event), { parentDate: event.startDate ?? event.startMs });
    if (eventSteps.length) {
      return eventSteps.some((step) => step.country && String(step.country).trim().toLowerCase() !== "france");
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

  flattenStepTree(getEventSteps(event), {
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
  return flattenStepTree(getEventSteps(event), {
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


function buildCategoryToggleMarkup(label, isVisible) {
  return `
      <span class="left-category-label__content">
        <span class="left-category-label__checkbox">
          <input type="checkbox" ${isVisible ? "checked" : ""} aria-label="Afficher ou masquer ${escapeHtml(label)}" />
        </span>
        <span class="left-category-label__text">${escapeHtml(label)}</span>
      </span>
    `;
}

function buildNetworkCategoryToggleMarkup(label, isVisible) {
  return `
      <span class="network-category-toggle__content">
        <span class="network-category-toggle__checkbox">
          <input type="checkbox" ${isVisible ? "checked" : ""} aria-label="Afficher ou masquer ${escapeHtml(label)}" />
        </span>
        <span class="network-category-toggle__text">${escapeHtml(label)}</span>
      </span>
    `;
}

function getAvailableCategories() {
  return CATEGORY_ORDER.filter((category) =>
    events.some((event) => event.category === category)
  );
}

