// main.js (Pure D3 + GitHub Pages friendly)

// -----------------------------
// CONFIG
// -----------------------------
const YEAR = 2026;
const MONTH = 0; // 0 = January, 1 = February, ...

const CATEGORY_COLORS = {
  Press: "#E74C3C",
  Policy: "#2E86C1",
  Meeting: "#27AE60",
  Travel: "#F39C12",
  Personal: "#8E44AD",
  Other: "#7F8C8D",
};

// If your CSV "Category" values are inconsistent, we map them into a small set
function mapCategory(csvCategory, details) {
  const c = (csvCategory || "").toLowerCase();
  const d = (details || "").toLowerCase();

  // Press-ish sources
  if (c.includes("press") || c.includes("pool") || d.includes("press")) return "Press";

  // Travel keywords
  if (d.includes("depart") || d.includes("arrive") || d.includes("travel") || d.includes("airport")) {
    return "Travel";
  }

  // Meetings / calls
  if (d.includes("meeting") || d.includes("call") || d.includes("meets with")) return "Meeting";

  // Policy / briefings / official schedule
  if (
    c.includes("official") ||
    c.includes("president schedule") ||
    d.includes("brief") ||
    d.includes("sign") ||
    d.includes("remarks") ||
    d.includes("statement")
  ) {
    return "Policy";
  }

  // Personal / leisure-ish keywords (optional)
  if (d.includes("dinner") || d.includes("lunch") || d.includes("breakfast") || d.includes("rest")) {
    return "Personal";
  }

  return "Other";
}

// -----------------------------
// DATA LOADING
// -----------------------------
Promise.all([
  d3.csv("data/Biden Calendar.csv"),
  d3.csv("data/Trump Calendar.csv"),
])
  .then(([bidenRaw, trumpRaw]) => {
    console.log("Biden columns:", bidenRaw.columns);
    console.log("Trump columns:", trumpRaw.columns);
    console.log("Sample Biden row:", bidenRaw[0]);

    const biden = bidenRaw
      .map((r) => processRow(r, "Biden"))
      .filter((d) => d !== null);

    const trump = trumpRaw
      .map((r) => processRow(r, "Trump"))
      .filter((d) => d !== null);

    const all = [...biden, ...trump];

    drawCalendar(all);
    setupModalClose();
  })
  .catch((err) => {
    console.error("DATA LOAD FAILED:", err);
  });

// -----------------------------
// ROW PROCESSING
// -----------------------------
function processRow(row, president) {
  // Your CSV headers:
  // Date, Time, Day of Week, Category, Details, Location, Press Pool, Daily Summary, Factba.se URL, ...
  const dateStr = (row["Date"] || "").trim();
  const timeStr = (row["Time"] || "").trim();
  const details = (row["Details"] || "").trim();
  const csvCategory = (row["Category"] || "").trim();
  const location = (row["Location"] || "").trim();

  // Skip totally empty rows
  if (!dateStr && !timeStr && !details && !csvCategory) return null;

  // If no details, still show something (but don’t crash)
  const title = details || "(no details)";

  // Parse datetime safely
  const dt = parseDateTime(dateStr, timeStr);
  if (!dt) {
    // If parsing fails, skip row (or keep it if you want)
    console.warn("Skipping row due to invalid date/time:", row);
    return null;
  }

  const cat = mapCategory(csvCategory, title);

  return {
    id: `${president}-${dateStr}-${timeStr}-${title}`.replace(/\s+/g, "_"),
    president,
    date: dt,
    dayKey: d3.timeFormat("%Y-%m-%d")(dt),
    title,
    category: cat,
    location,
    rawCategory: csvCategory,
  };
}

function parseDateTime(dateStr, timeStr) {
  // Your sample date: "1/20/2025"
  // Your sample time: "8:00:01"
  //
  // We'll parse as M/D/YYYY H:mm:ss (24h works too)
  // Some rows might not have seconds; handle that.

  const cleanTime = (timeStr || "").trim();

  // If time missing, assume midnight
  const t = cleanTime ? cleanTime : "00:00:00";

  // Try with seconds first, then without seconds
  const parseWithSeconds = d3.timeParse("%m/%d/%Y %H:%M:%S");
  const parseNoSeconds = d3.timeParse("%m/%d/%Y %H:%M");

  let dt = parseWithSeconds(`${dateStr} ${t}`);
  if (!dt) dt = parseNoSeconds(`${dateStr} ${t}`);

  return dt || null;
}

// -----------------------------
// CALENDAR DRAWING
// -----------------------------
function drawCalendar(data) {
  const grouped = d3.group(data, (d) => d.dayKey);

  const firstDay = new Date(YEAR, MONTH, 1);
  const lastDay = new Date(YEAR, MONTH + 1, 0);

  const days = d3.timeDays(firstDay, d3.timeDay.offset(lastDay, 1));

  d3.select("#month-label").text(d3.timeFormat("%B %Y")(firstDay));

  const calendar = d3.select("#calendar");
  calendar.html(""); // clear

  calendar
    .selectAll(".day")
    .data(days)
    .enter()
    .append("div")
    .attr("class", "day")
    .on("click", (event, d) => {
      const key = d3.timeFormat("%Y-%m-%d")(d);
      const events = grouped.get(key) || [];
      openModal(d, events);
    })
    .each(function (d) {
      const dayKey = d3.timeFormat("%Y-%m-%d")(d);
      const events = grouped.get(dayKey) || [];

      d3.select(this).append("div").attr("class", "day-number").text(d.getDate());

      // Compute category counts for tiny bars
      const counts = d3.rollups(
        events,
        (v) => v.length,
        (e) => e.category
      )
      .sort((a, b) => b[1] - a[1]) // most frequent first
      .slice(0, 4); // up to 4 bars

      counts.forEach(([cat, n]) => {
        d3.select(this)
          .append("div")
          .attr("class", "bar")
          .style("background", CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other)
          .attr("title", `${cat}: ${n}`);
      });

      // Optional: show totals (small)
      const bidenCount = events.filter((e) => e.president === "Biden").length;
      const trumpCount = events.filter((e) => e.president === "Trump").length;

      d3.select(this)
        .append("div")
        .style("position", "absolute")
        .style("bottom", "6px")
        .style("left", "8px")
        .style("font-size", "11px")
        .style("opacity", 0.75)
        .text(`B:${bidenCount} T:${trumpCount}`);
    });
}

// -----------------------------
// MODAL
// -----------------------------
function openModal(date, events) {
  d3.select("#modal").classed("hidden", false);

  d3.select("#modal-date").text(d3.timeFormat("%B %d, %Y")(date));

  const bidenEvents = events
    .filter((d) => d.president === "Biden")
    .sort((a, b) => a.date - b.date);

  const trumpEvents = events
    .filter((d) => d.president === "Trump")
    .sort((a, b) => a.date - b.date);

  renderEvents("#biden-events", bidenEvents);
  renderEvents("#trump-events", trumpEvents);
}

function renderEvents(container, events) {
  const div = d3.select(container);
  div.html("");

  if (events.length === 0) {
    div.append("div")
      .style("opacity", 0.7)
      .style("font-size", "13px")
      .text("No events recorded.");
    return;
  }

  events.forEach((e) => {
    const timeLabel = d3.timeFormat("%-I:%M %p")(e.date); // e.g. 8:00 AM

    const row = div
      .append("div")
      .attr("class", "event")
      .style("border-left-color", CATEGORY_COLORS[e.category] || CATEGORY_COLORS.Other);

    row.append("div")
      .style("display", "flex")
      .style("justify-content", "space-between")
      .style("gap", "10px");

    row.select("div")
      .append("strong")
      .style("font-size", "13px")
      .text(e.title);

    row.select("div")
      .append("span")
      .style("font-size", "12px")
      .style("opacity", 0.8)
      .text(timeLabel);

    // Optional metadata line
    const meta = [];
    if (e.category) meta.push(e.category);
    if (e.location) meta.push(e.location);
    if (e.rawCategory && e.rawCategory !== e.category) meta.push(`Source: ${e.rawCategory}`);

    if (meta.length) {
      row.append("div")
        .style("font-size", "12px")
        .style("opacity", 0.75)
        .style("margin-top", "3px")
        .text(meta.join(" • "));
    }
  });
}

function setupModalClose() {
  // Close button
  d3.select("#close").on("click", () => {
    d3.select("#modal").classed("hidden", true);
  });

  // Click outside modal-content closes
  d3.select("#modal").on("mousedown", (event) => {
    // If click hits the overlay (not the content), close
    if (event.target.id === "modal") {
      d3.select("#modal").classed("hidden", true);
    }
  });

  // Escape key closes
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      d3.select("#modal").classed("hidden", true);
    }
  });
}