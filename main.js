(function () {
  "use strict";

  var state = {
    data: null,
    activeDay: null,
    hiddenCategories: new Set(),
  };

  function parseTimeRange(timeStr) {
    if (!timeStr) return null;
    var m = /^(\d{1,2})-(\d{1,2})$/.exec(timeStr.trim());
    if (!m) return null;
    return { startHour: parseInt(m[1], 10), endHour: parseInt(m[2], 10) };
  }

  function isCurrentRow(timeStr, day, now) {
    var range = parseTimeRange(timeStr);
    if (!range || !day || !day.date) return false;
    var dayDate = new Date(day.date + "T00:00:00");
    if (dayDate.getFullYear() !== now.getFullYear() ||
        dayDate.getMonth() !== now.getMonth() ||
        dayDate.getDate() !== now.getDate()) {
      return false;
    }
    var h = now.getHours();
    return h >= range.startHour && h < range.endHour;
  }

  function findTodayDay(days, now) {
    for (var i = 0; i < days.length; i++) {
      var d = new Date(days[i].date + "T00:00:00");
      if (d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()) {
        return days[i].id;
      }
    }
    return null;
  }

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function renderHeader(data) {
    document.getElementById("event-name").textContent = data.event.name;
    document.getElementById("event-meta").textContent =
      data.event.venue + " · " + data.event.dates;
    document.getElementById("event-dates").textContent = data.event.dates;
  }

  function renderTabs(data, now) {
    var root = document.getElementById("day-tabs");
    root.innerHTML = "";
    var todayId = findTodayDay(data.days, now);
    data.days.forEach(function (day) {
      var btn = el("button", "day-tab", day.label);
      btn.type = "button";
      btn.dataset.dayId = day.id;
      if (day.id === state.activeDay) btn.classList.add("active");
      if (day.id === todayId) btn.classList.add("is-today");
      btn.addEventListener("click", function () {
        state.activeDay = day.id;
        renderAll(data);
      });
      root.appendChild(btn);
    });
  }

  function renderFilters(data) {
    var root = document.getElementById("filters");
    root.innerHTML = "";
    Object.keys(data.categories).forEach(function (catId) {
      var cat = data.categories[catId];
      var chip = el("button", "filter-chip");
      chip.type = "button";
      if (state.hiddenCategories.has(catId)) chip.classList.add("off");
      var swatch = el("span", "swatch");
      swatch.style.background = cat.color;
      chip.appendChild(swatch);
      chip.appendChild(document.createTextNode(cat.label));
      chip.addEventListener("click", function () {
        if (state.hiddenCategories.has(catId)) {
          state.hiddenCategories.delete(catId);
        } else {
          state.hiddenCategories.add(catId);
        }
        renderAll(data);
      });
      root.appendChild(chip);
    });
  }

  function makeEventCard(ev, hidden, marker) {
    var card = el("div", "event-card cat-" + ev.category);
    if (hidden) card.classList.add("hidden-by-filter");
    if (marker) card.classList.add("is-" + marker);
    card.appendChild(el("span", "title", ev.title));
    if (ev.note) {
      card.appendChild(el("span", "note", ev.note));
    }
    return card;
  }

  function findNextRowIndex(rows, day, now) {
    if (!day.date) return -1;
    var dayDate = new Date(day.date + "T00:00:00");
    if (dayDate.getFullYear() !== now.getFullYear() ||
        dayDate.getMonth() !== now.getMonth() ||
        dayDate.getDate() !== now.getDate()) {
      return -1;
    }
    var currentHour = now.getHours();
    var bestIdx = -1, bestStart = Infinity;
    rows.forEach(function (row, idx) {
      if (!row.cells[day.id]) return;
      var range = parseTimeRange(row.time);
      if (!range) return;
      if (range.startHour > currentHour && range.startHour < bestStart) {
        bestStart = range.startHour;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }

  function renderSchedule(data, now) {
    var root = document.getElementById("schedule-root");
    root.innerHTML = "";
    var day = data.days.find(function (d) { return d.id === state.activeDay; });
    if (!day) return;

    var currentCardToScroll = null;
    var hasCurrent = data.rows.some(function (row) {
      return row.cells[day.id] && isCurrentRow(row.time, day, now);
    });
    var nextRowIndex = hasCurrent ? -1 : findNextRowIndex(data.rows, day, now);

    data.rows.forEach(function (row, rowIndex) {
      var dayCells = row.cells[day.id];
      if (!dayCells) return;

      var isTwoTrack = day.tracks.length > 1;
      var rowEl = el("div", "row" + (isTwoTrack ? " two-track" : ""));
      rowEl.appendChild(el("div", "row-time", row.label || row.time || ""));

      var current = isCurrentRow(row.time, day, now);
      var isNext = !hasCurrent && rowIndex === nextRowIndex;

      function addCard(cellData, cellEl) {
        if (!cellData) return;
        var hidden = state.hiddenCategories.has(cellData.category);
        var marker = current ? "current" : (isNext ? "next" : null);
        var card = makeEventCard(cellData, hidden, marker);
        if (marker && !hidden) {
          currentCardToScroll = card;
        }
        cellEl.appendChild(card);
      }

      if (dayCells.category) {
        // full-width cell for the day: one cell spanning every track column
        var fullCellEl = el("div", "cell");
        if (isTwoTrack) fullCellEl.style.gridColumn = "2 / -1";
        addCard(dayCells, fullCellEl);
        rowEl.appendChild(fullCellEl);
      } else {
        day.tracks.forEach(function (trackId) {
          var cellEl = el("div", "cell");
          addCard(dayCells[trackId], cellEl);
          rowEl.appendChild(cellEl);
        });
      }

      root.appendChild(rowEl);
    });

    if (currentCardToScroll && !state.scrolledOnce) {
      state.scrolledOnce = true;
      setTimeout(function () {
        currentCardToScroll.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }

  function renderAll(data) {
    var now = new Date();
    renderTabs(data, now);
    renderFilters(data);
    renderSchedule(data, now);
  }

  function init(data) {
    state.data = data;
    var now = new Date();
    state.activeDay = findTodayDay(data.days, now) || data.days[0].id;
    renderAll(data);
    setInterval(function () { renderAll(data); }, 60000);
  }

  fetch("data/schedule.yaml")
    .then(function (res) { return res.text(); })
    .then(function (text) {
      var data = jsyaml.load(text);
      init(data);
    })
    .catch(function (err) {
      document.getElementById("schedule-root").innerHTML =
        '<p class="loading">Failed to load schedule: ' + err + "</p>";
    });
})();
