
const YEAR = 2026;
const MONTH = 0; // starts at Jan

const CATEGORY_COLORS = {
  Press: "#E74C3C",
  Policy: "#2E86C1",
  Meeting: "#27AE60",
  Travel: "#F39C12",
  Personal: "#8E44AD",
  Other: "#7F8C8D",
};

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

  return "Other";
}

// DATA LOADING
d3.csv("data/Trump Calendar.csv")
  .then((trumpRaw) => {
    console.log("Trump columns:", trumpRaw.columns);

    const trump = trumpRaw
      .map((r) => processRow(r, "Trump"))
      .filter((d) => d !== null);

    const all = [...trump];

    drawAnalysis(all);
    drawCalendar(all);
    drawKey();
    setupModalClose();
  })
  .catch((err) => {
    console.error("DATA LOAD FAILED:", err);
  });

// ROW PROCESSING
function processRow(row, president) {
  const dateStr = (row["Date"] || "").trim();
  const timeStr = (row["Time"] || "").trim();
  const details = (row["Details"] || "").trim();
  const csvCategory = (row["Category"] || "").trim();
  const location = (row["Location"] || "").trim();


  // If no details, still show something (but don’t crash)
  const title = details || "(no details)";

  // Parse datetime safely
  const dt = parseDateTime(dateStr, timeStr);

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

  const cleanTime = (timeStr || "").trim();

  const t = cleanTime ? cleanTime : "00:00:00";
  const parseWithSeconds = d3.timeParse("%m/%d/%Y %H:%M:%S");

  let dt = parseWithSeconds(`${dateStr} ${t}`);
  if (!dt) dt = parseNoSeconds(`${dateStr} ${t}`);

  return dt || null;
}

// ANALYSIS DRAWING
function drawAnalysis(data) {
  // simple stats about Trump's schedule
  const analysis = d3.select("#analysis");
  analysis.html("");

  // total events
  analysis.append("div").attr("class","stat-box")
    .html(`<div class="stat-label">Total Trump Events</div><div class="stat-value">${data.length}</div>`);

  // unique locations
  const uniqueLocs = new Set(data.map(d=>d.location)).size;
  analysis.append("div").attr("class","stat-box")
    .html(`<div class="stat-label">Unique Locations</div><div class="stat-value">${uniqueLocs}</div>`);

  // busiest day
  const byDate = d3.rollups(data, v => v.length, e => e.dayKey);

  if (byDate.length) {
    // sort descending 
    byDate.sort((a, b) => b[1] - a[1]);
    const busiest = byDate[0];
    const dateStr = busiest[0];
    const count = busiest[1];
    const parseDay = d3.timeParse("%Y-%m-%d");
    const formatted = d3.timeFormat("%B %d, %Y")(parseDay(dateStr));

      //busiest date
    analysis.append("div").attr("class","stat-box")
      .html(`<div class="stat-label">Busiest Date (by event count)</div><div class="stat-value">${formatted} (${count})</div>`);
    console.log("rendering busiest date", formatted, count);

    // next two busiest dates for context
    if (byDate.length > 1) {
      const topThree = byDate.slice(0, 3);
      const list = analysis.append("div").attr("class","stat-section");
      list.append("div").attr("class","stat-section-title").text("Top 3 Dates by Event Count");
      topThree.forEach(([dStr, cnt], idx) => {
        const fmt = d3.timeFormat("%b %d")(parseDay(dStr));
        const rankLabel = idx === 0 ? "(1st) " : idx === 1 ? "(2nd) " : "(3rd) ";
        list.append("div").attr("class","stat-item")
          .html(`<span class="stat-name">${rankLabel}${fmt}</span><span class="stat-count trump" style="color:#f57c00">${cnt}</span>`);
      });
    }
  }

  // weekday distribution
  const weekdays = d3.rollups(data, v=>v.length, e=>d3.timeFormat("%A")(e.date));
  if (weekdays.length) {
    const distSection = analysis.append("div").attr("class","stat-section");
    distSection.append("div").attr("class","stat-section-title").text("Weekday Breakdown (total events)");
    weekdays.sort((a,b)=>{
      const order = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    }).forEach(([day,count])=>{
      distSection.append("div").attr("class","stat-item")
        .html(`<span class="stat-name">${day}</span><span class="stat-count trump" style="color:#f57c00">${count}</span>`);
    });
  }

  // categorize by location and category
  const byLocation = d3.rollups(data, v=>v.length, e=>e.location);
  const byCategory = d3.rollups(data, v=>v.length, e=>e.category);

  // top locations
  if (byLocation.length) {
    const locSection = analysis.append("div").attr("class","stat-section");
    locSection.append("div").attr("class","stat-section-title").text("Top Locations");
    byLocation.sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([loc,count])=>{
      locSection.append("div").attr("class","stat-item")
        .html(`<span class="stat-name">${loc || "(unknown)"}</span><span class="stat-count trump" style="color:#f57c00">${count}</span>`);
    });
  }

  // categories
  if (byCategory.length) {
    const catSection = analysis.append("div").attr("class","stat-section");
    catSection.append("div").attr("class","stat-section-title").text("Event Categories");
    byCategory.sort((a,b)=>b[1]-a[1]).forEach(([cat,count])=>{
      const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
      catSection.append("div").attr("class","stat-item")
        .html(`<span class="stat-name" style="color:${color}">${cat}</span><span class="stat-count trump" style="color:${color}">${count}</span>`);
    });
  }
}


function drawKey() {
  const key = d3.select("#event-key");
  key.html("");
  key.append("div").attr("class","stat-section-title").text("Event types");
  const list = key.append("div").attr("class","key-list");
  Object.entries(CATEGORY_COLORS).forEach(([cat,color]) => {
    const item = list.append("div").attr("class","stat-item key-item");
    item.append("span").attr("class","stat-name").text(cat).style("color",color);
    item.append("span").attr("class","stat-count").style("background",color);
  });
}

// CALENDAR DRAWING
function drawCalendar(data) {
  const grouped = d3.group(data, (d) => d.dayKey);

  const calendarsContainer = d3.select("#calendars");
  calendarsContainer.html("");

  // render jan and feb
  for (let offset = 0; offset <= 1; offset++) {
    const firstDay = new Date(YEAR, MONTH + offset, 1);
    const lastDay = new Date(YEAR, MONTH + offset + 1, 0);
    const days = d3.timeDays(firstDay, d3.timeDay.offset(lastDay, 1));

    const monthBlock = calendarsContainer.append("div").attr("class", "month-block");
    monthBlock.append("div").attr("class", "month-label").text(d3.timeFormat("%B %Y")(firstDay));

    const calendar = monthBlock.append("div").attr("id", `calendar-${offset}`).attr("class","calendar");

    // add blank slots for first weekday
    const startWd = firstDay.getDay();
    const blanks = Array.from({length: startWd}, () => null);

    calendar
      .selectAll(".day")
      .data(blanks.concat(days))
      .enter()
      .append("div")
      .attr("class", (d) => (d === null ? "day blank" : "day"))
      .each(function (d) {
        if (d === null) return; // leave blank cell
        const key = d3.timeFormat("%Y-%m-%d")(d);
        const events = grouped.get(key) || [];

        d3.select(this).append("div").attr("class", "day-number").text(d.getDate());

        // Compute category counts for key
        const counts = d3.rollups(
          events,
          (v) => v.length,
          (e) => e.category
        )
        .sort((a, b) => b[1] - a[1]) // most frequent first
        .slice(0, 4);

        counts.forEach(([cat, n]) => {
          d3.select(this)
            .append("div")
            .attr("class", "bar")
            .style("background", CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other)
            .attr("title", `${cat}: ${n}`);
        });

        //tooltip showing category breakdown for this day
        const allCounts = d3.rollups(
          events,
          (v) => v.length,
          (e) => e.category
        )
        .sort((a, b) => b[1] - a[1]);
        
        const dateLabel = d3.timeFormat("%b %d, %Y")(d);
        const tooltipLines = [
          dateLabel,
          `${events.length} total events`,
          "",
          ...allCounts.map(([cat, n]) => `${cat}: ${n}`)
        ];
        const tooltipText = tooltipLines.join("\n");
        
        d3.select(this).attr("title", tooltipText);

        d3.select(this).on("click", (event) => {
          renderDetails(d, events);
        });
      });
  }
}

function renderDetails(date, events) {
  const details = d3.select("#details");
  details.html("");
  details.append("div").attr("class","stat-section-title").text(d3.timeFormat("%A, %B %d, %Y")(date));
  if (events.length === 0) {
    details.append("div").style("opacity",0.7).text("No events recorded.");
    return;
  }
  const section = details.append("div").attr("class","president-section trump");
  section.append("div").attr("class","president-title").text("Trump Events");
  events.sort((a,b)=>a.date-b.date).forEach((e)=>renderEvent(section,e));
}

function renderEvent(container, e) {
  const timeLabel = d3.timeFormat("%-I:%M %p")(e.date);
  const row = container
    .append("div")
    .attr("class", "event")
    .style("border-left-color", CATEGORY_COLORS[e.category] || CATEGORY_COLORS.Other);

  row.append("div").attr("class", "event-time").text(timeLabel);
  row.append("div").attr("class", "event-title").text(e.title);

  const meta = [];
  if (e.category) meta.push(e.category);
  if (e.location) meta.push(e.location);

  if (meta.length) {
    row.append("div").attr("class", "event-meta").text(meta.join(" • "));
  }
}