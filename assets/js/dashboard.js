/* ==========================================================================
   Stackly role-based dashboard SPA (customer build)
   - Hash router, chart adapter (ApexCharts -> Chart.js fallback), views.
   - Reads session/user + demo data from store.js (window.StacklyStore).
   - The shell (sidebar/topbar/charts/drawer/toast) is reusable by the future
     Agent dashboard. Customer-only logic lives under CUSTOMER_VIEWS.
   Security: client-side role guard only. Real auth must be enforced server-side.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var Store = window.StacklyStore;
  var app = doc.querySelector("[data-dash-app]");
  var viewEl = doc.querySelector("[data-dash-view]");

  if (!Store) {
    console.error("[Stackly] store.js must load before dashboard.js");
    return;
  }

  /* Shared utilities are always defined so the Agent dashboard (agent.js) can
     reuse the shell, chart adapter, drawer, and formatters. The customer app
     only boots when its own shell elements are present. */
  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var rootApp = app;
  var state = {
    user: null,
    data: null,
    route: "",
    charts: [],
    libMode: null,
    libPromise: null,
    booted: false
  };

  /* ====================================================================== *
   * Utilities
   * ====================================================================== */
  function esc(value) {
    return String(value === null || value === undefined ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function qs(selector, root) { return (root || doc).querySelector(selector); }
  function qsa(selector, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(selector)); }
  function rep(str, times) { return new Array((times || 0) + 1).join(str); }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function sum(list, map) { return list.reduce(function (acc, item) { return acc + (map ? map(item) : item); }, 0); }
  function money(n) { return "$" + Math.round(Number(n) || 0).toLocaleString("en-US"); }
  function moneyShort(n) {
    n = Number(n) || 0;
    if (n >= 1000000) return "$" + (n / 1000000).toFixed(1).replace(".0", "") + "M";
    if (n >= 1000) return "$" + (n / 1000).toFixed(1).replace(".0", "") + "k";
    return "$" + Math.round(n);
  }
  function fmtDate(value, opts) {
    var d = new Date(value);
    if (isNaN(d.getTime())) return "\u2014";
    return d.toLocaleDateString("en-US", opts || { month: "short", day: "numeric", year: "numeric" });
  }
  function monthKey(value) {
    var d = new Date(value);
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2);
  }
  function relTime(value) {
    var diff = Date.now() - new Date(value).getTime();
    if (isNaN(diff)) return "";
    var mins = Math.round(diff / 60000);
    if (mins < 60) return mins <= 1 ? "Just now" : mins + " min ago";
    var hours = Math.round(mins / 60);
    if (hours < 24) return hours + " hr" + (hours === 1 ? "" : "s") + " ago";
    var days = Math.round(hours / 24);
    if (days < 30) return days + " day" + (days === 1 ? "" : "s") + " ago";
    return fmtDate(value, { month: "short", day: "numeric" });
  }
  function monthsBack(n) {
    var out = [];
    var base = new Date();
    base.setDate(1);
    for (var i = n - 1; i >= 0; i -= 1) {
      out.push(new Date(base.getFullYear(), base.getMonth() - i, 1));
    }
    return out;
  }
  function sameMonth(iso, date) {
    var d = new Date(iso);
    return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
  }
  function typeColor(type) {
    return ({ Auto: "#5f8bb0", Home: "#4d9b76", Health: "#c2606b", Life: "#8e7cc3", Travel: "#e0a96d", Business: "#356867" })[type] || "#4d9b76";
  }
  function typeImage(type) {
    return "assets/images/dashboard/policy-" + String(type || "home").toLowerCase() + ".webp";
  }

  /* Deterministic small trend for KPI sparklines. */
  function seededTrend(seedText, base, points, variance) {
    var h = 2166136261;
    for (var i = 0; i < seedText.length; i += 1) {
      h ^= seedText.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    var s = h >>> 0 || 1;
    var out = [];
    var value = base;
    for (var p = 0; p < points; p += 1) {
      s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
      value += (s / 4294967296 - 0.5) * variance;
      out.push(Math.max(0, Math.round(value)));
    }
    return out;
  }

  /* ====================================================================== *
   * Icons
   * ====================================================================== */
  var ICONS = {
    grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    shield: '<path d="m12 3 7 3v5c0 4.7-3 8-7 10-4-2-7-5.3-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/>',
    clipboard: '<path d="M9 4h6v3H9zM7 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1"/><path d="m9 13 2 2 4-4"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    folder: '<path d="M4 7a2 2 0 0 1 2-2h3.5l2 2H18a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
    chat: '<path d="M20 15a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2z"/>',
    user: '<circle cx="12" cy="9" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10.5 19a2 2 0 0 0 3 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5 3.6 3.6M20.4 20.4 19 19M19 5l1.4-1.4M3.6 20.4 5 19"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 12H4M7 8l-3 4 3 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M12 4v11M8 11l4 4 4-4M5 20h14"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    edit: '<path d="M4 20h16M13.5 5.5l3 3L8 17l-4 1 1-4z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    trend: '<path d="M4 16l5-5 3 3 7-8"/><path d="M15 6h4v4"/>',
    bolt: '<path d="M13 3 5 13h5l-1 8 8-10h-5z"/>',
    dollar: '<path d="M12 3v18M8 7h6a3 3 0 0 1 0 6H8m0 0h6a3 3 0 0 1 0 6H8"/>',
    file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
    life: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M5.6 5.6 10 10M18.4 5.6 14 10M5.6 18.4 10 14M18.4 18.4 14 14"/>'
  };
  function icon(name, cls) {
    return '<svg viewBox="0 0 24 24"' + (cls ? ' class="' + cls + '"' : "") + ' aria-hidden="true" focusable="false">' + (ICONS[name] || ICONS.grid) + "</svg>";
  }

  /* ====================================================================== *
   * Chart adapter (ApexCharts primary, Chart.js fallback, SVG last resort)
   * ====================================================================== */
  var PALETTE = ["#4d9b76", "#356867", "#e0a96d", "#9db7d0", "#c77d8a", "#7fb6a4", "#c98a5c", "#8e7cc3"];

  function chartTheme() {
    var dark = rootApp && rootApp.getAttribute("data-theme") === "dark";
    return {
      dark: dark,
      text: dark ? "#c7d6d2" : "#5b6b69",
      grid: dark ? "rgba(255,255,255,0.08)" : "#e6ebe6",
      bg: dark ? "#102224" : "#ffffff"
    };
  }

  /* Secondary chart library, loaded only if ApexCharts is unavailable. */
  function loadChartJs() {
    return new Promise(function (resolve) {
      var settled = false;
      var finish = function (mode) {
        if (settled) { return; }
        settled = true;
        state.libMode = mode;
        resolve(mode);
      };
      if (window.Chart) { finish("chartjs"); return; }
      var s = doc.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.js";
      s.async = true;
      s.onload = function () { finish(window.Chart ? "chartjs" : "none"); };
      s.onerror = function () { finish("none"); };
      doc.head.appendChild(s);
      window.setTimeout(function () { finish(window.Chart ? "chartjs" : "none"); }, 9000);
    });
  }

  var Charts = {
    ensureLib: function () {
      if (state.libPromise) return state.libPromise;
      state.libPromise = new Promise(function (resolve) {
        var settled = false;
        var finish = function (mode) {
          if (settled) { return; }
          settled = true;
          state.libMode = mode;
          resolve(mode);
        };
        if (window.ApexCharts) { finish("apex"); return; }
        var s = doc.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/apexcharts@3/dist/apexcharts.min.js";
        s.async = true;
        s.onload = function () { finish(window.ApexCharts ? "apex" : "none"); };
        s.onerror = function () { loadChartJs().then(finish); };
        doc.head.appendChild(s);
        /* Never block the dashboard on a slow or blocked CDN. */
        window.setTimeout(function () { finish(window.ApexCharts ? "apex" : "none"); }, 9000);
      });
      return state.libPromise;
    },
    track: function (instance) { if (instance) state.charts.push(instance); return instance; },
    destroyAll: function () {
      state.charts.forEach(function (instance) {
        try { if (instance && typeof instance.destroy === "function") instance.destroy(); } catch (e) { /* noop */ }
      });
      state.charts = [];
    },

    spark: function (elm, data, color) {
      return build("spark", elm, { data: data, color: color, opts: {} });
    },
    area: function (elm, categories, series, opts) { return build("area", elm, { categories: categories, series: series, opts: opts || {} }); },
    bar: function (elm, categories, series, opts) { return build("bar", elm, { categories: categories, series: series, opts: opts || {} }); },
    hbar: function (elm, categories, data, opts) { return build("hbar", elm, { categories: categories, data: data, opts: opts || {} }); },
    donut: function (elm, labels, series, opts) { return build("donut", elm, { labels: labels, series: series, opts: opts || {} }); },
    radial: function (elm, value, opts) { return build("radial", elm, { value: value, opts: opts || {} }); }
  };

  function build(kind, elm, payload) {
    if (!elm) return null;
    try {
      if (state.libMode === "apex") {
        var inst = apexBuild(kind, elm, payload);
        if (inst && typeof inst.render === "function") inst.render();
        return Charts.track(inst);
      }
      if (state.libMode === "chartjs") {
        return Charts.track(chartjsBuild(kind, elm, payload));
      }
    } catch (error) {
      if (window.console && console.warn) {
        console.warn("[Stackly] chart render failed, using SVG fallback:", kind, error);
      }
    }
    return svgFallback(kind, elm, payload);
  }

  /* Dependency-free SVG charts so a card is never left empty. */
  function svgFallback(kind, elm, payload) {
    if (kind === "radial") { return svgRadial(elm, payload.value, payload.opts); }
    if (kind === "spark") { svgSpark(elm, payload.data, payload.color); return null; }
    if (kind === "area") { svgArea(elm, payload.categories, payload.series, payload.opts); return null; }
    if (kind === "hbar") { svgHBar(elm, payload.categories, payload.data, payload.opts); return null; }
    if (kind === "bar") {
      var series = payload.series || [{ name: (payload.opts && payload.opts.name) || "Value", data: payload.data }];
      svgBar(elm, payload.categories, series, payload.opts);
      return null;
    }
    if (kind === "donut") { svgDonut(elm, payload.labels, payload.series, payload.opts); return null; }
    elm.innerHTML = '<div class="chart-fallback">A text summary is available below.</div>';
    return null;
  }

  function canvasIn(elm) {
    var canvas = doc.createElement("canvas");
    elm.appendChild(canvas);
    return canvas;
  }

  function apexBuild(kind, elm, payload) {
    var t = chartTheme();
    var base = {
      chart: {
        type: kind === "radial" ? "radialBar" : kind === "donut" ? "donut" : kind === "bar" || kind === "hbar" ? "bar" : "area",
        height: payload.opts.height || 280,
        fontFamily: "'DM Sans', sans-serif",
        foreColor: t.text,
        toolbar: { show: false },
        animations: { enabled: !reduceMotionQuery.matches },
        parentHeightOffset: 0
      },
      colors: payload.opts.colors || PALETTE,
      dataLabels: { enabled: false },
      tooltip: { theme: t.dark ? "dark" : "light" }
    };

    if (kind === "spark") {
      base.chart.type = "area";
      base.chart.height = 46;
      base.chart.sparkline = { enabled: true };
      base.chart.animations = { enabled: !reduceMotionQuery.matches };
      base.series = [{ data: payload.data }];
      base.stroke = { curve: "smooth", width: 2 };
      base.colors = [payload.color];
      base.fill = { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.04, stops: [0, 100] } };
      base.tooltip = { enabled: false };
      base.grid = { show: false };
      base.xaxis = { labels: { show: false }, axisTicks: { show: false }, axisBorder: { show: false } };
      base.yaxis = { show: false };
      return new window.ApexCharts(elm, base);
    }
    if (kind === "area") {
      base.series = payload.series;
      base.stroke = { curve: "smooth", width: 2.5 };
      base.fill = { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.34, opacityTo: 0.02, stops: [0, 95] } };
      base.xaxis = { categories: payload.categories, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: t.text, fontSize: "11px" } } };
      base.yaxis = { labels: { style: { colors: t.text, fontSize: "11px" }, formatter: payload.opts.yFormatter || moneyShort } };
      base.grid = { borderColor: t.grid, strokeDashArray: 4 };
      base.legend = { show: payload.series.length > 1, position: "top", horizontalAlign: "right", labels: { colors: t.text }, markers: { radius: 4 } };
      base.markers = { size: 0, hover: { size: 5 } };
      base.tooltip = { theme: t.dark ? "dark" : "light", y: { formatter: payload.opts.tooltipFormatter || payload.opts.yFormatter || money } };
      return new window.ApexCharts(elm, base);
    }
    if (kind === "bar" || kind === "hbar") {
      var horizontal = kind === "hbar";
      var valueFormatter = payload.opts.yFormatter || moneyShort;
      base.series = horizontal ? [{ name: (payload.opts.name || "Coverage"), data: payload.data }] : payload.series;
      base.plotOptions = { bar: { horizontal: horizontal, columnWidth: payload.opts.stacked ? "62%" : "50%", barHeight: "54%", borderRadius: 6, borderRadiusApplication: "end", borderRadiusWhenStacked: "last", distributed: horizontal && payload.opts.distributed !== false } };
      base.xaxis = { categories: payload.categories, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: t.text, fontSize: "11px" }, formatter: horizontal ? (payload.opts.xFormatter || valueFormatter) : undefined } };
      base.yaxis = { labels: { style: { colors: t.text, fontSize: "11px" }, formatter: horizontal ? undefined : valueFormatter } };
      base.grid = { borderColor: t.grid, strokeDashArray: 4 };
      base.legend = { show: !horizontal && payload.series.length > 1, position: "top", horizontalAlign: "right", labels: { colors: t.text } };
      base.tooltip = { theme: t.dark ? "dark" : "light", y: { formatter: payload.opts.tooltipFormatter || payload.opts.yFormatter || money } };
      return new window.ApexCharts(elm, base);
    }
    if (kind === "donut") {
      base.series = payload.series;
      base.labels = payload.labels;
      base.stroke = { width: 2, colors: [t.bg] };
      var donutValue = payload.opts.valueFormatter || moneyShort;
      base.legend = { show: true, position: "bottom", labels: { colors: t.text }, markers: { radius: 4 }, itemMargin: { horizontal: 8, vertical: 4 } };
      base.plotOptions = { pie: { donut: { size: "70%", labels: { show: true, total: { show: true, label: (payload.opts.totalLabel || "Total"), color: t.text, formatter: function (w) { return (payload.opts.totalFormatter || donutValue)(sum(w.globals.seriesTotals, function (v) { return v; })); } }, value: { fontSize: "20px", fontWeight: 700, color: t.text, formatter: function (v) { return donutValue(Number(v)); } }, name: { color: t.text } } } } };
      base.tooltip = { theme: t.dark ? "dark" : "light", y: { formatter: function (v) { return (payload.opts.tooltipFormatter || payload.opts.valueFormatter || function (x) { return money(Number(x)); })(v); } } };
      return new window.ApexCharts(elm, base);
    }
    if (kind === "radial") {
      base.series = [payload.value];
      base.labels = [payload.opts.label || "Score"];
      base.colors = [payload.opts.color || PALETTE[0]];
      base.plotOptions = { radialBar: { hollow: { size: "64%" }, track: { background: t.grid, strokeWidth: "100%" }, dataLabels: { name: { fontSize: "13px", color: t.text, offsetY: 20 }, value: { fontSize: "30px", fontWeight: 800, color: t.text, offsetY: -14, formatter: function (v) { return Math.round(v) + (payload.opts.suffix || "%"); } } } } };
      base.stroke = { lineCap: "round" };
      base.tooltip = { enabled: false };
      return new window.ApexCharts(elm, base);
    }
    return null;
  }

  function chartjsBuild(kind, elm, payload) {
    var t = chartTheme();
    var tick = payload.opts.yFormatter || function (v) { return moneyShort(v); };
    var valueTooltip = payload.opts.tooltipFormatter || payload.opts.yFormatter || function (v) { return money(v); };
    var common = {
      responsive: true,
      maintainAspectRatio: false,
      animation: reduceMotionQuery.matches ? false : { duration: 700 },
      plugins: { legend: { display: false } }
    };
    if (kind === "spark") {
      common.plugins = { legend: { display: false }, tooltip: { enabled: false } };
      common.scales = { x: { display: false }, y: { display: false } };
      return new window.Chart(canvasIn(elm).getContext("2d"), {
        type: "line",
        data: { labels: payload.data.map(function (_, i) { return i; }), datasets: [{ data: payload.data, borderColor: payload.color, borderWidth: 2, fill: true, backgroundColor: hexA(payload.color, 0.14), tension: 0.4, pointRadius: 0 }] },
        options: common
      });
    }
    if (kind === "area") {
      common.plugins.legend = { display: payload.series.length > 1, position: "top", labels: { color: t.text } };
      common.scales = {
        x: { grid: { display: false }, ticks: { color: t.text } },
        y: { grid: { color: t.grid }, ticks: { color: t.text, callback: tick } }
      };
      common.plugins.tooltip = { callbacks: { label: function (c) { return c.dataset.label + ": " + valueTooltip(c.parsed.y); } } };
      return new window.Chart(canvasIn(elm).getContext("2d"), {
        type: "line",
        data: { labels: payload.categories, datasets: payload.series.map(function (s, i) { return { label: s.name, data: s.data, borderColor: PALETTE[i % PALETTE.length], backgroundColor: hexA(PALETTE[i % PALETTE.length], 0.18), borderWidth: 2, tension: 0.35, fill: true, pointRadius: 0 }; }) },
        options: common
      });
    }
    if (kind === "bar" || kind === "hbar") {
      var horiz = kind === "hbar";
      common.plugins.legend = { display: !horiz && payload.series.length > 1, position: "top", labels: { color: t.text } };
      common.indexAxis = horiz ? "y" : "x";
      common.scales = {
        x: { stacked: !!payload.opts.stacked, grid: { color: t.grid }, ticks: { color: t.text, callback: function (v) { return horiz ? tick(v) : v; } } },
        y: { stacked: !!payload.opts.stacked, grid: { display: !horiz }, ticks: { color: t.text, callback: function (v) { return horiz ? v : tick(v); } } }
      };
      common.plugins.tooltip = { callbacks: { label: function (c) { return (c.dataset.label || "Value") + ": " + valueTooltip(horiz ? c.parsed.x : c.parsed.y); } } };
      var datasets = horiz
        ? [{ label: payload.opts.name || "Coverage", data: payload.data, backgroundColor: payload.data.map(function (_, i) { return PALETTE[i % PALETTE.length]; }), borderRadius: 6 }]
        : payload.series.map(function (s, i) { return { label: s.name, data: s.data, backgroundColor: PALETTE[i % PALETTE.length], borderRadius: 5, stack: payload.opts.stacked ? "s" : undefined }; });
      return new window.Chart(canvasIn(elm).getContext("2d"), { type: "bar", data: { labels: payload.categories, datasets: datasets }, options: common });
    }
    if (kind === "donut") {
      common.cutout = "70%";
      common.plugins.legend = { display: true, position: "bottom", labels: { color: t.text, boxWidth: 10, usePointStyle: true } };
      var donutTip = payload.opts.tooltipFormatter || payload.opts.valueFormatter || function (v) { return money(v); };
      common.plugins.tooltip = { callbacks: { label: function (c) { return c.label + ": " + donutTip(c.parsed); } } };
      return new window.Chart(canvasIn(elm).getContext("2d"), { type: "doughnut", data: { labels: payload.labels, datasets: [{ data: payload.series, backgroundColor: payload.opts.colors || PALETTE, borderWidth: 2, borderColor: t.bg }] }, options: common });
    }
    if (kind === "radial") {
      svgRadial(elm, payload.value, payload.opts);
      return null;
    }
    return null;
  }

  function hexA(hex, alpha) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function svgSpark(elm, data, color) {
    var max = Math.max.apply(null, data.concat([1]));
    var min = Math.min.apply(null, data.concat([0]));
    var span = max - min || 1;
    var pts = data.map(function (v, i) {
      var x = (i / (data.length - 1 || 1)) * 100;
      var y = 100 - ((v - min) / span) * 100;
      return x.toFixed(2) + "," + y.toFixed(2);
    }).join(" ");
    elm.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="3" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  function svgRadial(elm, value, opts) {
    opts = opts || {};
    var color = opts.color || PALETTE[0];
    var r = 42;
    var c = 2 * Math.PI * r;
    var offset = c * (1 - clamp(value, 0, 100) / 100);
    elm.innerHTML =
      '<div style="position:relative;display:grid;place-items:center;height:100%;">' +
      '<svg viewBox="0 0 100 100" width="150" height="150" aria-hidden="true"><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="rgba(120,140,136,0.2)" stroke-width="9"/><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" transform="rotate(-90 50 50)"/></svg>' +
      '<span style="position:absolute;font-family:Manrope,sans-serif;font-weight:800;font-size:26px;">' + Math.round(value) + (opts.suffix || "%") + "</span></div>";
  }

  var svgUid = 0;

  function svgArea(elm, categories, series, opts) {
    opts = opts || {};
    series = series || [];
    var data = (series[0] && series[0].data) || [];
    var w = 300;
    var h = 160;
    var min = Math.min.apply(null, data.concat([0]));
    var max = Math.max.apply(null, data.concat([1]));
    var span = (max - min) || 1;
    var count = data.length || 1;
    var color = (opts.colors && opts.colors[0]) || PALETTE[0];
    svgUid += 1;
    var gid = "stackly-area-" + svgUid;
    var points = data.map(function (v, i) {
      var x = (i / (count - 1 || 1)) * w;
      var y = h - 6 - ((v - min) / span) * (h - 20);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    elm.innerHTML =
      '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" height="100%" preserveAspectRatio="none" role="img">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + color + '" stop-opacity="0.35"/>' +
      '<stop offset="1" stop-color="' + color + '" stop-opacity="0"/>' +
      "</linearGradient></defs>" +
      '<polygon points="0,' + h + " " + points + " " + w + "," + h + '" fill="url(#' + gid + ')"></polygon>' +
      '<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"></polyline>' +
      "</svg>";
  }

  function svgBar(elm, categories, series, opts) {
    opts = opts || {};
    series = series || [];
    var w = 300;
    var h = 160;
    var pad = 6;
    var colors = opts.colors || PALETTE;
    var groups = (categories || []).length || 1;
    var seriesCount = series.length || 1;
    var stacked = !!opts.stacked;
    var max = 1;

    if (stacked) {
      for (var i = 0; i < groups; i += 1) {
        var stackTotal = 0;
        for (var j = 0; j < seriesCount; j += 1) {
          stackTotal += (series[j].data[i] || 0);
        }
        if (stackTotal > max) { max = stackTotal; }
      }
    } else {
      series.forEach(function (s) {
        s.data.forEach(function (v) { if (v > max) { max = v; } });
      });
    }

    var slot = w / groups;
    var rects = "";

    if (stacked) {
      for (var g = 0; g < groups; g += 1) {
        var bx = g * slot + slot * 0.2;
        var bw = slot * 0.6;
        var cursor = h - pad;
        for (var k = 0; k < seriesCount; k += 1) {
          var val = series[k].data[g] || 0;
          var bh = (val / max) * (h - pad * 2);
          cursor -= bh;
          if (bh > 0.5) {
            rects += '<rect x="' + bx.toFixed(1) + '" y="' + cursor.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" fill="' + colors[k % colors.length] + '"></rect>';
          }
        }
      }
    } else {
      var inner = slot * 0.72;
      var barW = inner / seriesCount;
      for (var g2 = 0; g2 < groups; g2 += 1) {
        for (var k2 = 0; k2 < seriesCount; k2 += 1) {
          var v2 = series[k2].data[g2] || 0;
          var bh2 = (v2 / max) * (h - pad * 2);
          var x2 = g2 * slot + (slot - inner) / 2 + k2 * barW;
          rects += '<rect x="' + x2.toFixed(1) + '" y="' + (h - pad - bh2).toFixed(1) + '" width="' + (barW * 0.84).toFixed(1) + '" height="' + Math.max(0, bh2).toFixed(1) + '" rx="2" fill="' + colors[k2 % colors.length] + '"></rect>';
        }
      }
    }

    elm.innerHTML = '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" height="100%" preserveAspectRatio="none" role="img">' + rects + "</svg>";
  }

  function svgHBar(elm, categories, data, opts) {
    opts = opts || {};
    data = data || [];
    var w = 300;
    var h = 160;
    var colors = opts.colors || PALETTE;
    var max = Math.max.apply(null, data.concat([1]));
    var rows = data.length || 1;
    var rowH = h / rows;
    var rects = data.map(function (v, i) {
      var bw = (v / max) * (w - 4);
      var y = i * rowH + rowH * 0.2;
      var bh = rowH * 0.6;
      return '<rect x="0" y="' + y.toFixed(1) + '" width="' + Math.max(2, bw).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" fill="' + colors[i % colors.length] + '"></rect>';
    }).join("");
    elm.innerHTML = '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" height="100%" preserveAspectRatio="none" role="img">' + rects + "</svg>";
  }

  function svgDonut(elm, labels, series, opts) {
    opts = opts || {};
    labels = labels || [];
    series = series || [];
    var colors = opts.colors || PALETTE;
    var total = sum(series, function (v) { return v; }) || 1;
    var r = 60;
    var c = 2 * Math.PI * r;
    var offset = 0;
    var segments = series.map(function (v, i) {
      var frac = v / total;
      var seg = '<circle cx="80" cy="80" r="' + r + '" fill="none" stroke="' + colors[i % colors.length] + '" stroke-width="20" stroke-dasharray="' + (c * frac).toFixed(2) + " " + c.toFixed(2) + '" stroke-dashoffset="' + (-c * offset).toFixed(2) + '" transform="rotate(-90 80 80)"></circle>';
      offset += frac;
      return seg;
    }).join("");
    var legend = labels.map(function (l, i) {
      return '<span class="legend-item"><span class="legend-swatch" style="background:' + colors[i % colors.length] + '"></span>' + esc(l) + "</span>";
    }).join("");
    var display = (opts.totalFormatter || opts.valueFormatter || moneyShort)(total);
    elm.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;">' +
      '<div style="position:relative;width:160px;height:160px;">' +
      '<svg viewBox="0 0 160 160" width="160" height="160" role="img">' + segments + "</svg>" +
      '<span style="position:absolute;inset:0;display:grid;place-items:center;font-family:Manrope,sans-serif;font-weight:800;font-size:20px;">' + esc(String(display)) + "</span>" +
      "</div>" +
      '<div class="legend">' + legend + "</div>" +
      "</div>";
  }

  /* ====================================================================== *
   * Data accessors
   * ====================================================================== */
  function policies() { return state.data.policies || []; }
  function claims() { return state.data.claims || []; }
  function payments() { return state.data.payments || []; }
  function documents() { return state.data.documents || []; }
  function notifications() { return state.data.notifications || []; }
  function tickets() { return state.data.tickets || []; }
  function activity() { return state.data.activity || []; }
  function agent() { return state.data.agent || {}; }

  function activePolicies() { return policies().filter(function (p) { return p.status === "Active"; }); }
  function totalCoverage() { return sum(activePolicies(), function (p) { return p.coverage; }); }
  function monthlyPremium() { return sum(activePolicies(), function (p) { return p.premium; }); }
  function openClaims() { return claims().filter(function (c) { return ["Submitted", "In Review", "Approved"].indexOf(c.status) !== -1; }); }
  function payoutsReceived() { return sum(payments().filter(function (p) { return p.kind === "payout"; }), function (p) { return p.amount; }); }
  function nextDue() {
    return payments().filter(function (p) { return p.status !== "Paid"; }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); })[0] || null;
  }
  function premiumSeries() {
    return monthsBack(12).map(function (m) {
      return Math.round(sum(payments().filter(function (p) { return p.kind === "premium" && sameMonth(p.date, m); }), function (p) { return p.amount; }));
    });
  }
  function payoutSeries() {
    return monthsBack(12).map(function (m) {
      return Math.round(sum(payments().filter(function (p) { return p.kind === "payout" && sameMonth(p.date, m); }), function (p) { return p.amount; }));
    });
  }
  function coverageByType() {
    var map = {};
    activePolicies().forEach(function (p) { map[p.type] = (map[p.type] || 0) + p.coverage; });
    return map;
  }
  function claimsMonthlySplit() {
    var months = monthsBack(6);
    return {
      labels: months.map(function (m) { return m.toLocaleDateString("en-US", { month: "short" }); }),
      approved: months.map(function (m) { return claims().filter(function (c) { return sameMonth(c.filedAt, m) && ["Approved", "Paid"].indexOf(c.status) !== -1; }).length; }),
      pending: months.map(function (m) { return claims().filter(function (c) { return sameMonth(c.filedAt, m) && ["Approved", "Paid"].indexOf(c.status) === -1; }).length; })
    };
  }
  function profileCompletion() {
    var u = state.user;
    var p = u.profile || {};
    var fields = [u.fullName, u.email, u.phone, u.country, p.dateOfBirth, p.address, p.city, p.postalCode, p.occupation];
    var filled = fields.filter(function (v) { return v && String(v).trim(); }).length;
    return Math.round((filled / fields.length) * 100);
  }
  function statusClass(status) {
    return "status status--" + String(status || "").toLowerCase().replace(/\s+/g, "-");
  }

  /* ====================================================================== *
   * Shared components
   * ====================================================================== */
  /* Integer formatting for count-based charts. */
  function countFmt(v) { return String(Math.round(v)); }

  /* Responsive table cell carrying a label for the stacked mobile layout. */
  function cell(label, content, num) {
    return '<td' + (num ? ' class="is-num"' : "") + ' data-label="' + esc(label) + '">' + content + "</td>";
  }

  function statCard(o) {
    return '<article class="stat">' +
      '<p class="stat-label"><span class="stat-ico">' + icon(o.icon) + "</span>" + esc(o.label) + "</p>" +
      '<p class="stat-value">' + esc(o.value) + "</p>" +
      (o.delta ? '<span class="stat-delta' + (o.dir === "down" ? " is-down" : "") + '">' + (o.dir === "down" ? "\u25BE" : "\u25B4") + " " + esc(o.delta) + "</span>" : "") +
      (o.spark ? '<div class="chart chart--spark" id="' + o.spark + '"></div>' : "") +
      "</article>";
  }

  function chartCard(o) {
    return '<article class="dash-card dash-card-pad' + (o.span ? " " + o.span : "") + '">' +
      '<div class="dash-card-head"><div><h3>' + esc(o.title) + "</h3>" + (o.subtitle ? "<p>" + esc(o.subtitle) + "</p>" : "") + "</div>" + (o.aside || "") + "</div>" +
      '<div class="chart ' + (o.chartClass || "") + '" id="' + o.id + '" role="img" aria-label="' + esc(o.aria) + '"></div>' +
      (o.summary ? '<p class="sr-only">' + esc(o.summary) + "</p>" : "") +
      "</article>";
  }

  function avatarMarkup(user, sizeClass, imgClass) {
    var initials = Store.initials(user.fullName);
    if (user.avatar) {
      return '<span class="dash-avatar ' + (sizeClass || "") + '"><img src="' + esc(user.avatar) + '" alt="' + esc(user.fullName) + '" width="84" height="84" loading="lazy"></span>';
    }
    return '<span class="dash-avatar ' + (sizeClass || "") + (imgClass ? " " + imgClass : "") + '" aria-hidden="true">' + esc(initials) + "</span>";
  }

  /* ====================================================================== *
   * Views - shared header helper
   * ====================================================================== */
  function pageHead(o) {
    return '<header class="page-head">' +
      "<div><h1>" + esc(o.title) + "</h1>" + (o.subtitle ? "<p>" + esc(o.subtitle) + "</p>" : "") + "</div>" +
      (o.actions ? '<div class="page-head-actions">' + o.actions + "</div>" : "") +
      "</header>";
  }

  /* ====================================================================== *
   * CUSTOMER VIEWS
   * ====================================================================== */

  /* ---- Overview ---- */
  function renderOverview() {
    var user = state.user;
    var first = esc(Store.firstName(user));
    var months = monthsBack(12).map(function (m) { return m.toLocaleDateString("en-US", { month: "short" }); });
    var cov = coverageByType();
    var covLabels = Object.keys(cov);
    var covData = covLabels.map(function (k) { return cov[k]; });
    var split = claimsMonthlySplit();
    var premium = premiumSeries();

    var renewals = activePolicies().slice().sort(function (a, b) { return new Date(a.renewalDate) - new Date(b.renewalDate); }).slice(0, 5);
    var renewalRows = renewals.map(function (p) {
      var days = Math.max(0, Math.round((new Date(p.renewalDate) - Date.now()) / 86400000));
      var pct = clamp(100 - (days / 365) * 100, 6, 100);
      return '<li class="drawer-list-li" style="display:block;padding:12px 0;border-bottom:1px solid var(--dash-line);">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:7px;"><span class="v">' + esc(p.type) + " " + esc(p.name.split(" ").slice(-1)[0]) + '</span><span style="color:var(--dash-muted);font-size:12px;">' + (days === 0 ? "Today" : "in " + days + " days") + "</span></div>" +
        '<div class="progress"><span style="width:' + pct.toFixed(0) + "%;background:" + typeColor(p.type) + ';"></span></div></li>';
    }).join("");

    var factors = [
      { label: "Coverage breadth", value: clamp(activePolicies().length * 22, 30, 100) },
      { label: "Claims health", value: clamp(100 - openClaims().length * 12, 40, 100) },
      { label: "Payment consistency", value: 96 },
      { label: "Profile completeness", value: profileCompletion() }
    ];
    var factorHtml = factors.map(function (f) {
      return '<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--dash-muted);margin-bottom:6px;"><span>' + esc(f.label) + "</span><strong style=\"color:var(--dash-text);\">" + f.value + '%</strong></div><div class="progress"><span style="width:' + f.value + '%;"></span></div></div>';
    }).join("");

    var notifRows = notifications().slice(0, 4).map(function (n) {
      return '<li class="activity-item"><span class="activity-ico">' + icon(n.type === "claim" ? "clipboard" : n.type === "payment" ? "dollar" : n.type === "document" ? "file" : "shield") + '</span><div><p>' + esc(n.title) + " \u2014 " + esc(n.body) + "</p><time>" + esc(relTime(n.time)) + "</time></div></li>";
    }).join("");

    var activityRows = activity().slice(0, 5).map(function (a) {
      return '<li class="activity-item"><span class="activity-ico">' + icon(a.type === "payment" ? "dollar" : a.type === "claim" ? "clipboard" : a.type === "document" ? "file" : a.type === "policy" ? "shield" : "gear") + '</span><div><p>' + esc(a.text) + "</p><time>" + esc(relTime(a.time)) + "</time></div></li>";
    }).join("");

    var active = activePolicies().length;
    var next = nextDue();
    var doughnutColors = covLabels.map(typeColor);

    return pageHead({
      title: "Good to see you, " + Store.firstName(user) + ".",
      subtitle: "Here is the calm overview of your cover, claims, and what is coming up next.",
      actions: '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="Your statement is being prepared and will download shortly.">' + icon("download") + "Download statement</button>" +
        '<a class="dbtn dbtn--primary" href="#/claims">' + icon("plus") + "File a claim</a>"
    }) +
      '<div class="dash-grid dash-grid--2" style="margin-bottom:18px;">' +
        '<article class="dash-card dash-card-pad ov-welcome-card">' +
          '<div class="ov-welcome">' +
            '<img src="assets/images/dashboard/overview-welcome.webp" alt="Family relaxing together at home" width="760" height="520" loading="lazy">' +
            '<div class="ov-welcome-body">' +
              '<span class="role-badge">' + icon("shield") + "Customer</span>" +
              '<h2 class="ov-welcome-title">Your cover is looking healthy.</h2>' +
              '<p class="ov-welcome-copy">' + active + " active " + (active === 1 ? "policy" : "policies") + " protecting " + money(totalCoverage()) + " of what matters. " + (next ? "Your next premium of " + money(next.amount) + " is due " + fmtDate(next.date, { month: "short", day: "numeric" }) + "." : "You are all paid up.") + "</p>" +
              '<div class="ov-welcome-stats">' +
                '<span><small>Member since</small><strong>' + esc(fmtDate(user.createdAt, { month: "long", year: "numeric" })) + "</strong></span>" +
                '<span><small>Open claims</small><strong>' + openClaims().length + "</strong></span>" +
                '<span><small>Payouts received</small><strong>' + money(payoutsReceived()) + "</strong></span>" +
              "</div>" +
            "</div>" +
          "</div>" +
        "</article>" +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Protection score</h3><p>How well your cover matches your life</p></div></div>' +
          '<div class="chart chart--radial" id="ov-score" role="img" aria-label="Protection score ' + state.data.protectionScore + ' out of 100"></div>' +
          "<div>" + factorHtml + "</div></article>" +
      "</div>" +
      '<div class="dash-kpis dash-stagger">' +
        statCard({ icon: "shield", label: "Active policies", value: String(active), delta: "+1 this year", spark: "ov-sp-policies" }) +
        statCard({ icon: "trend", label: "Coverage amount", value: moneyShort(totalCoverage()), delta: "+6.4% vs last year", spark: "ov-sp-coverage" }) +
        statCard({ icon: "clock", label: "Next premium due", value: next ? money(next.amount) : "$0", delta: next ? fmtDate(next.date, { month: "short", day: "numeric" }) : "Paid up", spark: "ov-sp-due" }) +
        statCard({ icon: "clipboard", label: "Open claims", value: String(openClaims().length), dir: openClaims().length ? "down" : "up", delta: openClaims().length ? "1 in review" : "All resolved", spark: "ov-sp-claims" }) +
        statCard({ icon: "dollar", label: "Payouts received", value: moneyShort(payoutsReceived()), delta: "Lifetime", spark: "ov-sp-payouts" }) +
      "</div>" +
      '<div class="dash-grid dash-grid--3" style="margin-bottom:18px;">' +
        chartCard({ id: "ov-donut", title: "Coverage overview", subtitle: "Cover by policy type", chartClass: "chart--donut", aria: "Doughnut chart of coverage by policy type", aside: '<span class="chip">' + covLabels.length + " types</span>", summary: covLabels.map(function (l, i) { return l + " " + moneyShort(covData[i]); }).join(", ") }) +
        chartCard({ id: "ov-area", title: "Premium spend", subtitle: "Your monthly premium over the last 12 months", chartClass: "chart--area", span: "dash-span-2", aria: "Area chart of monthly premium spend over twelve months", summary: "Twelve month premium trend." }) +
      "</div>" +
      '<div class="dash-grid dash-grid--3" style="margin-bottom:18px;">' +
        chartCard({ id: "ov-claims", title: "Claims activity", subtitle: "Approved vs pending claims by month", chartClass: "chart--bar", span: "dash-span-2", aria: "Stacked bar chart of approved and pending claims by month", summary: "Approved and pending claims over six months." }) +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Renewal timeline</h3><p>Next policies to renew</p></div></div><ul style="list-style:none;margin:0;padding:0;">' + (renewalRows || '<li style="color:var(--dash-muted);font-size:13px;">Nothing renewing in the next year.</li>') + "</ul></article>" +
      "</div>" +
      '<div class="dash-grid dash-grid--2">' +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Recent activity</h3><p>What has happened on your account</p></div></div><ul class="activity-list" style="list-style:none;margin:0;padding:0;">' + activityRows + "</ul></article>" +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Notifications</h3><p>Updates worth knowing</p></div></div><ul class="activity-list" style="list-style:none;margin:0;padding:0;">' + notifRows + "</ul></article>" +
      "</div>";
  }

  function mountOverview(el) {
    Charts.spark(qs("#ov-sp-policies", el), seededTrend(state.user.id + "pol", activePolicies().length, 8, 0.6), PALETTE[0]);
    Charts.spark(qs("#ov-sp-coverage", el), seededTrend(state.user.id + "cov", 40, 8, 6), PALETTE[1]);
    Charts.spark(qs("#ov-sp-due", el), premiumSeries(), PALETTE[2]);
    Charts.spark(qs("#ov-sp-claims", el), seededTrend(state.user.id + "clm", openClaims().length + 1, 8, 0.7), PALETTE[4]);
    Charts.spark(qs("#ov-sp-payouts", el), payoutSeries(), PALETTE[5]);

    var cov = coverageByType();
    var labels = Object.keys(cov);
    Charts.donut(qs("#ov-donut", el), labels, labels.map(function (k) { return cov[k]; }), { colors: labels.map(typeColor), totalLabel: "Covered" });
    Charts.area(qs("#ov-area", el), monthsBack(12).map(function (m) { return m.toLocaleDateString("en-US", { month: "short" }); }), [{ name: "Premium", data: premiumSeries() }], { colors: [PALETTE[0]] });
    var split = claimsMonthlySplit();
    Charts.bar(qs("#ov-claims", el), split.labels, [{ name: "Approved", data: split.approved }, { name: "Pending", data: split.pending }], { stacked: true, colors: [PALETTE[0], PALETTE[2]] });
    Charts.radial(qs("#ov-score", el), state.data.protectionScore, { label: "Score", color: PALETTE[0] });
  }

  /* ---- Policies ---- */
  function renderPolicies() {
    var list = policies();
    var types = ["All"].concat(Object.keys(list.reduce(function (m, p) { m[p.type] = 1; return m; }, {})));
    var chips = types.map(function (t, i) {
      return '<button class="chip' + (i === 0 ? " is-active" : "") + '" type="button" data-policy-filter="' + esc(t) + '">' + esc(t) + "</button>";
    }).join("");

    var cards = list.map(function (p) {
      return '<article class="dash-card policy-card" data-policy-card data-type="' + esc(p.type) + '" data-name="' + esc((p.name + " " + p.policyNumber).toLowerCase()) + '" data-status="' + esc(p.status) + '">' +
        '<div class="policy-media"><img src="' + typeImage(p.type) + '" alt="' + esc(p.type) + ' insurance" width="420" height="300" loading="lazy"><span class="' + statusClass(p.status) + '">' + esc(p.status) + '</span><span class="policy-type">' + esc(p.type) + " cover</span></div>" +
        '<div class="policy-body"><h3 class="policy-name">' + esc(p.name) + "</h3>" +
        '<div class="policy-stats"><span><small>Coverage</small><strong>' + moneyShort(p.coverage) + "</strong></span><span><small>Premium</small><strong>" + money(p.premium) + "/mo</strong></span><span><small>Renews</small><strong>" + esc(fmtDate(p.renewalDate, { month: "short", day: "numeric" })) + "</strong></span><span><small>Policy</small><strong>" + esc(p.policyNumber) + "</strong></span></div>" +
        '<button class="dbtn dbtn--ghost dbtn--full" type="button" data-policy-detail="' + esc(p.id) + '">View details ' + icon("arrow") + "</button></div></article>";
    }).join("");

    return pageHead({
      title: "My policies",
      subtitle: "Every policy, premium, and renewal date in one clear place.",
      actions: '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="Comparison view is ready in your next statement.">' + icon("trend") + "Compare cover</button>" +
        '<button class="dbtn dbtn--primary" type="button" data-toast-btn="A Stackly guide will help you add cover quickly.">' + icon("plus") + "New policy</button>"
    }) +
      '<div class="dash-toolbar">' +
        '<div class="dash-search">' + icon("search") + '<input type="search" placeholder="Search policies\u2026" aria-label="Search policies" data-policy-search></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + chips + "</div>" +
        "<select class=\"dash-select\" style=\"max-width:170px;\" data-policy-status aria-label=\"Filter by status\"><option value=\"All\">All statuses</option><option>Active</option><option>Pending</option><option>Expired</option></select>" +
      "</div>" +
      chartCard({ id: "pol-hbar", title: "Coverage by policy", subtitle: "How your protection is spread across policies", chartClass: "chart--hbar", aria: "Horizontal bar chart comparing coverage amount per policy", aside: '<span class="chip">' + moneyShort(totalCoverage()) + " total</span>", summary: "Coverage per policy." }) +
      '<div class="dash-grid dash-grid--3 dash-stagger" style="margin-top:18px;" data-policy-grid>' + cards + "</div>";
  }

  function mountPolicies(el) {
    var list = activePolicies().concat(policies().filter(function (p) { return p.status !== "Active"; }));
    var names = list.map(function (p) { return p.type + " " + p.policyNumber; });
    var values = list.map(function (p) { return p.coverage; });
    Charts.hbar(qs("#pol-hbar", el), names, values, { name: "Coverage", xFormatter: function (v) { return moneyShort(v); } });

    var search = qs("[data-policy-search]", el);
    var statusFilter = qs("[data-policy-status]", el);
    var chips = qsa("[data-policy-filter]", el);
    var cards = qsa("[data-policy-card]", el);
    var activeType = "All";

    function apply() {
      var term = search ? search.value.trim().toLowerCase() : "";
      var status = statusFilter ? statusFilter.value : "All";
      cards.forEach(function (card) {
        var matchType = activeType === "All" || card.dataset.type === activeType;
        var matchStatus = status === "All" || card.dataset.status === status;
        var matchTerm = !term || card.dataset.name.indexOf(term) !== -1;
        card.style.display = matchType && matchStatus && matchTerm ? "" : "none";
      });
    }
    if (search) search.addEventListener("input", apply);
    if (statusFilter) statusFilter.addEventListener("change", apply);
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.classList.remove("is-active"); });
        chip.classList.add("is-active");
        activeType = chip.dataset.policyFilter;
        apply();
      });
    });

    qsa("[data-policy-detail]", el).forEach(function (btn) {
      btn.addEventListener("click", function () { openPolicyDrawer(btn.dataset.policyDetail); });
    });
  }

  function openPolicyDrawer(id) {
    var p = policies().filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var body =
      '<div class="drawer-hero"><img src="' + typeImage(p.type) + '" alt="' + esc(p.type) + ' cover" width="460" height="300" loading="lazy"></div>' +
      '<span class="' + statusClass(p.status) + '">' + esc(p.status) + '</span>' +
      '<h3 style="margin:14px 0 18px;font-family:var(--display);font-size:20px;">' + esc(p.name) + "</h3>" +
      '<div class="chart chart--radial" id="pol-drawer-donut" role="img" aria-label="Coverage breakdown for this policy"></div>' +
      '<ul class="drawer-list" style="margin-top:16px;"><li><span class="k">Policy number</span><span class="v">' + esc(p.policyNumber) + "</span></li>" +
      '<li><span class="k">Provider</span><span class="v">' + esc(p.provider) + "</span></li>" +
      '<li><span class="k">Coverage</span><span class="v">' + money(p.coverage) + "</span></li>" +
      '<li><span class="k">Premium</span><span class="v">' + money(p.premium) + " / month</span></li>" +
      '<li><span class="k">Deductible</span><span class="v">' + money(p.deductible) + "</span></li>" +
      '<li><span class="k">Started</span><span class="v">' + esc(fmtDate(p.startDate)) + "</span></li>" +
      '<li><span class="k">Renews</span><span class="v">' + esc(fmtDate(p.renewalDate)) + "</span></li>" +
      (p.beneficiaries && p.beneficiaries.length ? '<li><span class="k">Beneficiary</span><span class="v">' + esc(p.beneficiaries.join(", ")) + "</span></li>" : "") +
      "</ul>" +
      '<h4 style="margin:20px 0 10px;font-family:var(--display);">What is included</h4>' +
      '<ul class="drawer-list">' + p.features.map(function (f) { return '<li><span class="k">' + icon("check") + " " + esc(f) + "</span></li>"; }).join("") + "</ul>" +
      '<div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap;"><button class="dbtn dbtn--primary" type="button" data-toast-btn="Your policy documents are downloading.">' + icon("download") + "Download documents</button>" +
      '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="A Stackly guide will be in touch about changes.">' + icon("edit") + "Request a change</button></div>";

    openDrawer(p.type + " policy", body, function (drawerEl) {
      Charts.donut(qs("#pol-drawer-donut", drawerEl), ["Coverage", "Deductible", "Annual premium"],
        [p.coverage, p.deductible, Math.round(p.premium * 12)],
        { totalLabel: "Covered" });
    });
  }

  /* ---- Claims ---- */
  function renderClaims() {
    var list = claims().slice().sort(function (a, b) { return new Date(b.filedAt) - new Date(a.filedAt); });
    var statuses = ["Submitted", "In Review", "Approved", "Paid", "Rejected"];
    var counts = statuses.map(function (s) { return list.filter(function (c) { return c.status === s; }).length; });
    var split = claimsMonthlySplit();

    var funnel = statuses.map(function (s, i) {
      var max = Math.max.apply(null, counts.concat([1]));
      var w = clamp((counts[i] / max) * 100, 4, 100);
      return '<div class="funnel-row"><span>' + esc(s) + '</span><span class="funnel-bar" style="width:' + w + "%;background:" + PALETTE[i % PALETTE.length] + ';opacity:0.85;"></span><span class="funnel-count">' + counts[i] + "</span></div>";
    }).join("");

    var rows = list.map(function (c) {
      return "<tr>" +
        cell("Claim", '<div class="dash-table__cell-main"><span class="dash-table__thumb"><img src="' + typeImage(c.type) + '" alt="" width="38" height="38" loading="lazy"></span><span><strong>' + esc(c.reference) + "</strong><br><small style=\"color:var(--dash-muted);\">" + esc(c.title) + "</small></span></div>") +
        cell("Type", esc(c.type)) +
        cell("Amount", money(c.amount), true) +
        cell("Filed", esc(fmtDate(c.filedAt, { month: "short", day: "numeric", year: "numeric" }))) +
        cell("Status", '<span class="' + statusClass(c.status) + '">' + esc(c.status) + "</span>") +
        cell("Action", '<button class="dbtn dbtn--ghost dbtn--sm" type="button" data-claim-detail="' + esc(c.id) + '">View</button>', true) +
        "</tr>";
    }).join("");

    return pageHead({
      title: "Claims",
      subtitle: "Track every claim from first note to final payout.",
      actions: '<button class="dbtn dbtn--primary" type="button" data-toast-btn="Your new claim form is opening.">' + icon("plus") + "File new claim</button>"
    }) +
      '<div class="dash-grid dash-grid--4 dash-stagger" style="margin-bottom:18px;">' +
        statCard({ icon: "clipboard", label: "Open claims", value: String(openClaims().length) }) +
        statCard({ icon: "check", label: "Approved", value: String(list.filter(function (c) { return c.status === "Approved" || c.status === "Paid"; }).length) }) +
        statCard({ icon: "dollar", label: "Total paid out", value: moneyShort(payoutsReceived()) }) +
        statCard({ icon: "clock", label: "Avg. decision", value: "24h" }) +
      "</div>" +
      '<div class="dash-grid dash-grid--2" style="margin-bottom:18px;">' +
        chartCard({ id: "clm-donut", title: "Claim status mix", subtitle: "Where your claims stand right now", chartClass: "chart--donut", aria: "Doughnut chart of claims by status", aside: '<span class="chip">' + list.length + " claims</span>", summary: statuses.map(function (s, i) { return s + " " + counts[i]; }).join(", ") }) +
        chartCard({ id: "clm-bar", title: "Claims by month", subtitle: "Approved vs pending over six months", chartClass: "chart--bar", aria: "Stacked bar chart of claims by month", summary: "Claims filed per month." }) +
      "</div>" +
      '<div class="dash-grid dash-grid--2" style="margin-bottom:18px;">' +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Claim status funnel</h3><p>From submission to payout</p></div></div><div class="funnel">' + funnel + "</div></article>" +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Need help with a claim?</h3><p>' + esc(agent().name || "Your advisor") + " is on hand</p></div></div>" +
          '<div class="agent-card"><img src="' + esc(agent().avatar || "assets/images/dashboard/avatars/agent-maya.webp") + '" alt="' + esc(agent().name || "Stackly advisor") + '" width="64" height="64" loading="lazy"><div><strong>' + esc(agent().name || "Maya Chen") + '</strong><small>' + esc(agent().role || "Your Stackly advisor") + '</small></div></div>' +
          '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;"><button class="dbtn dbtn--primary" type="button" data-toast-btn="Live chat is opening\u2026">' + icon("chat") + "Live chat</button><a class=\"dbtn dbtn--ghost\" href=\"#/support\">" + icon("life") + "Support centre</a></div></article>" +
      "</div>" +
      '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>All claims</h3><p>Every claim on your account</p></div></div>' +
        '<div class="dash-table-wrap"><table class="dash-table"><caption class="sr-only">Your claims</caption><thead><tr><th scope="col">Claim</th><th scope="col">Type</th><th scope="col" class="is-num">Amount</th><th scope="col">Filed</th><th scope="col">Status</th><th scope="col" class="is-num">Action</th></tr></thead><tbody>' + rows + "</tbody></table></div></article>";
  }

  function mountClaims(el) {
    var list = claims();
    var statuses = ["Submitted", "In Review", "Approved", "Paid", "Rejected"];
    var counts = statuses.map(function (s) { return list.filter(function (c) { return c.status === s; }).length; });
    Charts.donut(qs("#clm-donut", el), statuses, counts, { colors: [PALETTE[3], PALETTE[2], PALETTE[5], PALETTE[0], PALETTE[4]], totalLabel: "Claims", valueFormatter: countFmt, totalFormatter: countFmt });
    var split = claimsMonthlySplit();
    Charts.bar(qs("#clm-bar", el), split.labels, [{ name: "Approved", data: split.approved }, { name: "Pending", data: split.pending }], { stacked: true, colors: [PALETTE[0], PALETTE[2]] });
    qsa("[data-claim-detail]", el).forEach(function (btn) {
      btn.addEventListener("click", function () { openClaimDrawer(btn.dataset.claimDetail); });
    });
  }

  function openClaimDrawer(id) {
    var c = claims().filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    var timeline = c.timeline.map(function (t) {
      return '<div class="timeline-item' + (t.done ? " is-done" : "") + '"><span class="timeline-marker"></span><div class="timeline-body"><strong>' + esc(t.label) + "</strong><time>" + esc(fmtDate(t.date, { month: "short", day: "numeric" })) + "</time></div></div>";
    }).join("");
    var evidence = (c.evidence || []).map(function (e) {
      return '<figure><img src="' + esc(e.image) + '" alt="' + esc(e.label) + '" width="320" height="200" loading="lazy"><figcaption>' + esc(e.label) + "</figcaption></figure>";
    }).join("");

    var body =
      '<span class="' + statusClass(c.status) + '">' + esc(c.status) + "</span>" +
      '<h3 style="margin:14px 0 6px;font-family:var(--display);font-size:20px;">' + esc(c.reference) + "</h3>" +
      '<p style="color:var(--dash-muted);font-size:13px;margin:0 0 16px;">' + esc(c.description) + "</p>" +
      '<div class="progress" style="margin-bottom:18px;"><span style="width:' + c.progress + '%;"></span></div>' +
      '<ul class="drawer-list"><li><span class="k">Related policy</span><span class="v">' + esc(c.type) + "</span></li>" +
      '<li><span class="k">Claim amount</span><span class="v">' + money(c.amount) + "</span></li>" +
      '<li><span class="k">Filed</span><span class="v">' + esc(fmtDate(c.filedAt)) + "</span></li>" +
      '<li><span class="k">Last update</span><span class="v">' + esc(relTime(c.updatedAt)) + "</span></li></ul>" +
      '<h4 style="margin:20px 0 12px;font-family:var(--display);">Progress</h4><div class="timeline">' + timeline + "</div>" +
      (evidence ? '<h4 style="margin:22px 0 10px;font-family:var(--display);">Evidence</h4><div class="evidence-grid">' + evidence + "</div>" : "") +
      '<div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap;"><button class="dbtn dbtn--primary" type="button" data-toast-btn="Your claims guide has been notified.">' + icon("chat") + "Message my guide</button></div>";

    openDrawer("Claim " + c.reference, body);
  }

  /* ---- Payments ---- */
  function renderPayments() {
    var list = payments().slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    var months = monthsBack(12).map(function (m) { return m.toLocaleDateString("en-US", { month: "short" }); });
    var paidThisYear = sum(list.filter(function (p) { return p.status === "Paid" && new Date(p.date).getFullYear() === new Date().getFullYear() && p.kind === "premium"; }), function (p) { return p.amount; });
    var upcoming = list.filter(function (p) { return p.status !== "Paid"; }).slice().reverse();
    var methods = ["Visa \u2022\u2022\u2022\u2022 4242", "Mastercard \u2022\u2022\u2022\u2022 8810", "Bank transfer"];

    var methodCards = methods.map(function (m, i) {
      return '<article class="dash-card payment-method"><span class="pm-logo">' + (i === 2 ? "BANK" : m.slice(0, 4).toUpperCase()) + '</span><div style="flex:1;"><strong style="display:block;font-size:14px;">' + esc(m) + '</strong><small style="color:var(--dash-muted);">' + (i === 0 ? "Default" : "Backup") + ' \u00b7 ' + (i === 2 ? "Verified" : "Expires 0" + (4 + i) + "/28") + '</small></div><span class="chip">' + (i === 0 ? "Primary" : "Active") + "</span></article>";
    }).join("");

    var dueCards = upcoming.map(function (p) {
      return '<article class="dash-card payment-method"><span class="pm-logo">' + icon("clock") + '</span><div style="flex:1;"><strong style="display:block;font-size:14px;">' + money(p.amount) + '</strong><small style="color:var(--dash-muted);">' + esc(p.label) + " \u00b7 " + esc(fmtDate(p.date, { month: "short", day: "numeric" })) + '</small></div><button class="dbtn dbtn--accent dbtn--sm" type="button" data-toast-btn="Payment of ' + money(p.amount) + ' is being processed.">Pay now</button></article>';
    }).join("");

    var rows = list.slice(0, 14).map(function (p) {
      return "<tr>" +
        cell("Date", esc(fmtDate(p.date, { month: "short", day: "numeric", year: "numeric" }))) +
        cell("Description", "<strong>" + esc(p.label) + "</strong>") +
        cell("Method", esc(p.method)) +
        cell("Status", '<span class="' + statusClass(p.status) + '">' + esc(p.status) + "</span>") +
        cell("Amount", money(p.amount), true) +
        cell("Invoice", '<button class="dbtn dbtn--ghost dbtn--sm" type="button" data-toast-btn="Invoice ' + esc(p.invoice) + ' downloading.">' + icon("download") + " Invoice</button>", true) +
        "</tr>";
    }).join("");

    return pageHead({
      title: "Payments & billing",
      subtitle: "Premiums, payouts, invoices, and upcoming dues.",
      actions: '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="All invoices are being bundled for download.">' + icon("download") + "Download all invoices</button>"
    }) +
      '<div class="dash-grid dash-grid--4 dash-stagger" style="margin-bottom:18px;">' +
        statCard({ icon: "dollar", label: "Paid this year", value: moneyShort(paidThisYear) }) +
        statCard({ icon: "clock", label: "Next due", value: nextDue() ? money(nextDue().amount) : "$0" }) +
        statCard({ icon: "card", label: "Payment methods", value: "3" }) +
        statCard({ icon: "trend", label: "Payouts received", value: moneyShort(payoutsReceived()) }) +
      "</div>" +
      '<div class="dash-grid dash-grid--2" style="margin-bottom:18px;">' +
        chartCard({ id: "pay-bar", title: "Premium vs payouts", subtitle: "Monthly premium paid and payouts received", chartClass: "chart--bar", aria: "Grouped bar chart of premium paid versus payouts received over twelve months", summary: "Premium and payouts per month." }) +
        chartCard({ id: "pay-donut", title: "Payment status", subtitle: "Paid, due, and scheduled", chartClass: "chart--donut", aria: "Doughnut chart of payment statuses", summary: "Payment status breakdown." }) +
      "</div>" +
      '<h2 style="font-family:var(--display);font-size:18px;margin:0 0 14px;">Upcoming dues</h2>' +
      '<div class="dash-grid dash-grid--3" style="margin-bottom:22px;">' + (dueCards || '<article class="dash-card dash-card-pad" style="color:var(--dash-muted);font-size:13px;">Nothing due. You are all caught up.</article>') + "</div>" +
      '<h2 style="font-family:var(--display);font-size:18px;margin:0 0 14px;">Payment methods</h2>' +
      '<div class="dash-grid dash-grid--3" style="margin-bottom:22px;">' + methodCards + "</div>" +
      '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Transactions</h3><p>Your recent billing history</p></div></div>' +
        '<div class="dash-table-wrap"><table class="dash-table"><caption class="sr-only">Recent transactions</caption><thead><tr><th scope="col">Date</th><th scope="col">Description</th><th scope="col">Method</th><th scope="col">Status</th><th scope="col" class="is-num">Amount</th><th scope="col" class="is-num">Invoice</th></tr></thead><tbody>' + rows + "</tbody></table></div></article>";
  }

  function mountPayments(el) {
    var list = payments();
    Charts.bar(qs("#pay-bar", el), monthsBack(12).map(function (m) { return m.toLocaleDateString("en-US", { month: "short" }); }),
      [{ name: "Premium", data: premiumSeries() }, { name: "Payouts", data: payoutSeries() }],
      { colors: [PALETTE[0], PALETTE[3]] });
    var paid = list.filter(function (p) { return p.status === "Paid"; }).length;
    var due = list.filter(function (p) { return p.status === "Due"; }).length;
    var sched = list.filter(function (p) { return p.status === "Scheduled"; }).length;
    Charts.donut(qs("#pay-donut", el), ["Paid", "Due", "Scheduled"], [paid, due, sched], { colors: [PALETTE[0], PALETTE[2], PALETTE[3]], totalLabel: "Payments", valueFormatter: countFmt, totalFormatter: countFmt });
  }

  /* ---- Documents ---- */
  function renderDocuments() {
    var list = documents();
    var cats = ["All"].concat(Object.keys(list.reduce(function (m, d) { m[d.category] = 1; return m; }, {})));
    var chips = cats.map(function (c, i) { return '<button class="chip' + (i === 0 ? " is-active" : "") + '" type="button" data-doc-filter="' + esc(c) + '">' + esc(c) + "</button>"; }).join("");

    var cards = list.map(function (d) {
      return '<article class="dash-card doc-card" data-doc-card data-category="' + esc(d.category) + '" data-name="' + esc((d.name + " " + d.category).toLowerCase()) + '">' +
        '<span class="doc-ico doc-ico--' + (d.type === "image" ? "image" : "pdf") + '">' + (d.type === "image" ? "IMG" : "PDF") + "</span>" +
        '<div class="doc-body"><strong>' + esc(d.name) + "</strong><small>" + esc(d.category) + " \u00b7 " + esc(d.size) + " \u00b7 " + esc(relTime(d.updatedAt)) + "</small></div>" +
        '<button class="dash-icon-btn" type="button" data-toast-btn="Downloading \u201c' + esc(d.name) + '\u201d." aria-label="Download ' + esc(d.name) + '">' + icon("download") + "</button></article>";
    }).join("");

    var catCounts = list.reduce(function (m, d) { m[d.category] = (m[d.category] || 0) + 1; return m; }, {});
    var catLabels = Object.keys(catCounts);

    return pageHead({
      title: "Documents",
      subtitle: "Policies, certificates, invoices, and guides \u2014 ready when you are.",
      actions: '<button class="dbtn dbtn--primary" type="button" data-toast-btn="Choose a file to upload from your device.">' + icon("plus") + "Upload document</button>"
    }) +
      '<div class="dash-grid dash-grid--3" style="margin-bottom:18px;">' +
        chartCard({ id: "doc-donut", title: "Library by type", subtitle: "How your documents are organised", chartClass: "chart--donut", aria: "Doughnut chart of documents by category", summary: catLabels.map(function (c) { return c + " " + catCounts[c]; }).join(", ") }) +
        '<article class="dash-card dash-card-pad dash-span-2"><div class="dash-card-head"><div><h3>Need a document fast?</h3><p>Tell us what you need and we will find it.</p></div></div>' +
          '<div class="dash-search" style="max-width:none;margin-bottom:14px;">' + icon("search") + '<input type="search" placeholder="Search certificates, invoices, policy wording\u2026" aria-label="Search documents" data-doc-search></div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">' + chips + "</div>" +
          '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="A Stackly guide will send the document to your email.">' + icon("chat") + "Ask a human to find it</button></article>" +
      "</div>" +
      '<div class="dash-grid dash-grid--3 dash-stagger" data-doc-grid>' + cards + "</div>";
  }

  function mountDocuments(el) {
    var list = documents();
    var catCounts = list.reduce(function (m, d) { m[d.category] = (m[d.category] || 0) + 1; return m; }, {});
    var labels = Object.keys(catCounts);
    Charts.donut(qs("#doc-donut", el), labels, labels.map(function (l) { return catCounts[l]; }), { totalLabel: "Docs", valueFormatter: countFmt, totalFormatter: countFmt });

    var search = qs("[data-doc-search]", el);
    var chips = qsa("[data-doc-filter]", el);
    var cards = qsa("[data-doc-card]", el);
    var activeCat = "All";
    function apply() {
      var term = search ? search.value.trim().toLowerCase() : "";
      cards.forEach(function (card) {
        var ok = (activeCat === "All" || card.dataset.category === activeCat) && (!term || card.dataset.name.indexOf(term) !== -1);
        card.style.display = ok ? "" : "none";
      });
    }
    if (search) search.addEventListener("input", apply);
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.classList.remove("is-active"); });
        chip.classList.add("is-active");
        activeCat = chip.dataset.docFilter;
        apply();
      });
    });
  }

  /* ---- Support ---- */
  function renderSupport() {
    var list = tickets();
    var resolved = list.filter(function (t) { return t.status === "Resolved"; }).length;
    var ticketRows = list.map(function (t) {
      return "<tr>" +
        cell("Subject", "<strong>" + esc(t.subject) + "</strong>") +
        cell("Priority", esc(t.priority)) +
        cell("Status", '<span class="' + statusClass(t.status) + '">' + esc(t.status) + "</span>") +
        cell("Updated", esc(relTime(t.updatedAt))) +
        "</tr>";
    }).join("");

    var faqs = [
      { q: "How do I file a new claim?", a: "Open the Claims view and choose File new claim. A dedicated guide is assigned and keeps you updated at every step." },
      { q: "Can I change my cover later?", a: "Yes. Your cover can grow or change with your life. Request a change from any policy and a guide will help you adjust it." },
      { q: "How quickly will someone reply?", a: "Live chat usually answers within four minutes during support hours, and claims guidance is available 24/7." },
      { q: "Where can I download my documents?", a: "Everything lives in the Documents view, including certificates, invoices, and policy wording." }
    ];
    var faqHtml = faqs.map(function (f, i) {
      return '<div class="faq-item"><h3 style="margin:0;"><button type="button" aria-expanded="' + (i === 0 ? "true" : "false") + '" aria-controls="supp-faq-' + i + '" id="supp-q-' + i + '"><span>' + esc(f.q) + '</span><i aria-hidden="true"></i></button></h3><section class="faq-answer" id="supp-faq-' + i + '" aria-labelledby="supp-q-' + i + '"' + (i === 0 ? "" : " hidden") + "><p>" + esc(f.a) + "</p></section></div>";
    }).join("");

    return pageHead({
      title: "Support",
      subtitle: "Real people, clear answers, and a guide who knows your cover.",
      actions: '<button class="dbtn dbtn--primary" type="button" data-toast-btn="Connecting you to a Stackly guide\u2026">' + icon("chat") + "Start live chat</button>"
    }) +
      '<div class="dash-grid dash-grid--3" style="margin-bottom:18px;">' +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Your advisor</h3><p>Whenever you need a human</p></div></div>' +
          '<div class="agent-card"><img src="' + esc(agent().avatar || "assets/images/dashboard/avatars/agent-maya.webp") + '" alt="' + esc(agent().name || "Stackly advisor") + '" width="64" height="64" loading="lazy"><div><strong>' + esc(agent().name || "Maya Chen") + '</strong><small>' + esc(agent().role || "Your Stackly advisor") + '</small></div></div>' +
          '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;"><button class="dbtn dbtn--accent" type="button" data-toast-btn="Starting a call with your advisor\u2026">' + icon("chat") + "Message</button><a class=\"dbtn dbtn--ghost\" href=\"contact.html\">Book a call</a></div></article>" +
        chartCard({ id: "sup-radial", title: "Tickets resolved", subtitle: "This year", chartClass: "chart--radial", aria: "Radial chart showing resolved support tickets", summary: resolved + " of " + list.length + " tickets resolved." }) +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Response times</h3><p>Average first reply</p></div></div><p style="font-family:var(--display);font-size:32px;font-weight:800;margin:0;">4 min</p><p style="color:var(--dash-muted);font-size:12px;margin:4px 0 8px;">Live chat, support hours</p><div class="chart chart--spark" id="sup-spark" style="height:46px;" role="img" aria-label="Response time trend"></div></article>' +
      "</div>" +
      '<div class="dash-grid dash-grid--2">' +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Frequently asked</h3><p>Quick answers to common questions</p></div></div><div class="faq" data-support-faq>' + faqHtml + "</div></article>" +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Your tickets</h3><p>Open and recent support requests</p></div></div>' +
          '<div class="dash-table-wrap"><table class="dash-table"><caption class="sr-only">Support tickets</caption><thead><tr><th scope="col">Subject</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Updated</th></tr></thead><tbody>' + ticketRows + "</tbody></table></div></article>" +
      "</div>";
  }

  function mountSupport(el) {
    var list = tickets();
    var resolved = list.filter(function (t) { return t.status === "Resolved"; }).length;
    var pct = list.length ? Math.round((resolved / list.length) * 100) : 100;
    Charts.radial(qs("#sup-radial", el), pct, { label: "Resolved", color: PALETTE[0] });
    Charts.spark(qs("#sup-spark", el), seededTrend(state.user.id + "support", 5, 10, 1.4), PALETTE[1]);

    var faq = qs("[data-support-faq]", el);
    if (faq) {
      qsa("button", faq).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var answer = doc.getElementById(btn.getAttribute("aria-controls"));
          var open = btn.getAttribute("aria-expanded") !== "true";
          qsa("button", faq).forEach(function (other) {
            other.setAttribute("aria-expanded", "false");
            var a = doc.getElementById(other.getAttribute("aria-controls"));
            if (a) a.hidden = true;
          });
          if (open && answer) { btn.setAttribute("aria-expanded", "true"); answer.hidden = false; }
        });
      });
    }
  }

  /* ---- Profile ---- */
  function renderProfile() {
    var u = state.user;
    var p = u.profile || {};
    var completion = profileCompletion();
    return pageHead({
      title: "Profile",
      subtitle: "Your details, kept accurate and in your control.",
      actions: '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="Your profile is up to date.">' + icon("check") + "All changes saved"
    }) +
      '<div class="dash-grid dash-grid--3" style="margin-bottom:18px;">' +
        chartCard({ id: "prof-radial", title: "Profile completion", subtitle: "Add a few details to reach 100%", chartClass: "chart--radial", aria: "Radial chart showing profile completion " + completion + " percent", summary: "Profile is " + completion + "% complete." }) +
        '<article class="dash-card dash-card-pad dash-span-2" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">' +
          avatarMarkup(u, "dash-avatar--lg") +
          '<div style="min-width:220px;flex:1;"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><h2 style="margin:0;font-family:var(--display);font-size:24px;">' + esc(u.fullName) + '</h2><span class="role-badge">' + icon("shield") + esc(u.role === "agent" ? "Agent" : "Customer") + "</span></div>" +
          '<p style="margin:8px 0 0;color:var(--dash-muted);font-size:13px;">' + esc(u.email) + (u.phone ? " \u00b7 " + esc(u.phone) : "") + "</p>" +
          '<div style="display:flex;gap:22px;margin-top:14px;flex-wrap:wrap;"><span><small style="display:block;color:var(--dash-muted);font-size:11px;">Member since</small><strong>' + esc(fmtDate(u.createdAt, { month: "long", day: "numeric", year: "numeric" })) + "</strong></span>" +
          '<span><small style="display:block;color:var(--dash-muted);font-size:11px;">Country</small><strong>' + esc(u.country || "Not set") + "</strong></span>" +
          '<span><small style="display:block;color:var(--dash-muted);font-size:11px;">Preferred contact</small><strong>' + esc(p.preferredContact || "Email") + "</strong></span></div></div></article>" +
      "</div>" +
      '<div class="dash-grid dash-grid--2">' +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Personal details</h3><p>Update how we reach you</p></div></div>' +
          '<form data-profile-form><div class="dash-form-grid">' +
            field("Full name", "profile-name", u.fullName, "text", true) +
            field("Email address", "profile-email", u.email, "email", true) +
            field("Phone number", "profile-phone", u.phone, "tel") +
            field("Country / region", "profile-country", u.country, "text") +
            field("Date of birth", "profile-dob", p.dateOfBirth, "date") +
            field("Occupation", "profile-occupation", p.occupation, "text") +
            field("Address", "profile-address", p.address, "text", false, true) +
            field("City", "profile-city", p.city, "text") +
            field("Postal code", "profile-postal", p.postalCode, "text") +
            '<div class="dash-field"><label for="profile-contact">Preferred contact</label><select class="dash-select" id="profile-contact"><option' + (p.preferredContact === "Email" ? " selected" : "") + ">Email</option><option" + (p.preferredContact === "Phone" ? " selected" : "") + ">Phone</option><option" + (p.preferredContact === "SMS" ? " selected" : "") + ">SMS</option></select></div>" +
          "</div>" +
          '<div style="margin-top:18px;"><button class="dbtn dbtn--primary" type="submit">' + icon("check") + "Save changes</button></div></form></article>" +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Password &amp; security</h3><p>Keep your account protected</p></div></div>' +
          '<p style="color:var(--dash-muted);font-size:13px;line-height:1.6;">For your security, passwords are never stored in this demo. In production this triggers a secure, server-side password change.</p>' +
          '<form data-password-form style="margin-top:16px;"><div class="dash-form-grid"><div class="dash-field is-full"><label for="pw-current">Current password</label><input class="dash-input" id="pw-current" type="password" autocomplete="current-password"></div>' +
          '<div class="dash-field"><label for="pw-new">New password</label><input class="dash-input" id="pw-new" type="password" autocomplete="new-password"></div>' +
          '<div class="dash-field"><label for="pw-confirm">Confirm new password</label><input class="dash-input" id="pw-confirm" type="password" autocomplete="new-password"></div></div>' +
          '<p data-pw-status role="status" style="min-height:18px;margin:10px 0 0;font-size:12px;color:var(--dash-danger);"></p>' +
          '<div style="margin-top:8px;"><button class="dbtn dbtn--primary" type="submit">' + icon("check") + "Update password</button></div></form></article>" +
      "</div>";
  }

  function field(label, id, value, type, required, full) {
    return '<div class="dash-field' + (full ? " is-full" : "") + '"><label for="' + id + '">' + esc(label) + '</label><input class="dash-input" id="' + id + '" type="' + (type || "text") + '" value="' + esc(value || "") + '"' + (required ? " required" : "") + "></div>";
  }

  function mountProfile(el) {
    Charts.radial(qs("#prof-radial", el), profileCompletion(), { label: "Complete", color: PALETTE[0] });

    var form = qs("[data-profile-form]", el);
    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var patch = {
          fullName: qs("#profile-name", el).value.trim(),
          email: qs("#profile-email", el).value.trim().toLowerCase(),
          phone: qs("#profile-phone", el).value.trim(),
          country: qs("#profile-country", el).value.trim(),
          profile: {
            dateOfBirth: qs("#profile-dob", el).value,
            occupation: qs("#profile-occupation", el).value.trim(),
            address: qs("#profile-address", el).value.trim(),
            city: qs("#profile-city", el).value.trim(),
            postalCode: qs("#profile-postal", el).value.trim(),
            preferredContact: qs("#profile-contact", el).value
          }
        };
        var updated = Store.updateUser(state.user.id, patch);
        if (updated) { state.user = updated; hydrateShell(); }
        toast("Profile updated. Thank you.");
      });
    }

    var pwForm = qs("[data-password-form]", el);
    if (pwForm) {
      pwForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var next = qs("#pw-new", el).value;
        var confirm = qs("#pw-confirm", el).value;
        var status = qs("[data-pw-status]", el);
        if (next.length < 8 || !/[A-Z]/.test(next) || !/[0-9]/.test(next)) {
          status.textContent = "Use 8+ characters with an uppercase letter and a number.";
          status.style.color = "var(--dash-danger)";
          return;
        }
        if (next !== confirm) {
          status.textContent = "Passwords do not match.";
          status.style.color = "var(--dash-danger)";
          return;
        }
        status.textContent = "Password updated in this demo. Nothing was stored.";
        status.style.color = "var(--dash-accent)";
        pwForm.reset();
      });
    }
  }

  /* ---- Settings ---- */
  function renderSettings() {
    var prefs = state.user.prefs || {};
    function toggleRow(label, desc, key, checked) {
      return '<div class="toggle-row"><div><strong>' + esc(label) + "</strong><span>" + esc(desc) + '</span></div><label class="switch"><input type="checkbox" data-pref-toggle="' + key + '"' + (checked ? " checked" : "") + ' aria-label="' + esc(label) + '"><span class="switch-track"><span class="switch-thumb"></span></span></label></div>';
    }
    return pageHead({ title: "Settings", subtitle: "Tune your workspace, notifications, and accessibility." }) +
      '<div class="dash-grid dash-grid--2">' +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Appearance</h3><p>Choose the theme that suits you</p></div></div>' +
          '<div role="radiogroup" aria-label="Theme" style="display:flex;gap:10px;flex-wrap:wrap;">' +
            ["light", "dark", "system"].map(function (mode) {
              return '<button class="chip' + ((prefs.theme || "system") === mode ? " is-active" : "") + '" type="button" role="radio" aria-checked="' + ((prefs.theme || "system") === mode) + '" data-theme-option="' + mode + '">' + mode.charAt(0).toUpperCase() + mode.slice(1) + "</button>";
            }).join("") +
          "</div></article>" +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Accessibility</h3><p>Make the dashboard feel right</p></div></div>' +
          toggleRow("Reduce motion", "Soften animations and transitions", "reduceMotion", prefs.reduceMotion) +
          toggleRow("Larger text", "Increase the base text size", "largeText", prefs.largeText) +
        "</article>" +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Notifications</h3><p>Decide what reaches your inbox</p></div></div>' +
          toggleRow("Email updates", "Important account and policy emails", "emailUpdates", prefs.emailUpdates) +
          toggleRow("SMS alerts", "Texts for time-sensitive updates", "smsAlerts", prefs.smsAlerts) +
          toggleRow("Claim alerts", "Every change to your claims", "claimAlerts", prefs.claimAlerts) +
          toggleRow("Product news", "Occasional ideas and product updates", "productNews", prefs.productNews) +
        "</article>" +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Account</h3><p>Sessions and data</p></div></div>' +
          '<p style="color:var(--dash-muted);font-size:13px;line-height:1.7;">This dashboard is a client-side demo. Your session lives in this browser only. In production, sessions are issued and revoked server-side.</p>' +
          '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;"><button class="dbtn dbtn--primary" type="button" data-logout>' + icon("logout") + "Sign out</button>" +
          '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="Demo data reset. Reload to seed it fresh.">' + icon("gear") + "Reset demo data</button></div></article>" +
      "</div>";
  }

  function mountSettings(el) {
    qsa("[data-theme-option]", el).forEach(function (btn) {
      btn.addEventListener("click", function () {
        setTheme(btn.dataset.themeOption);
        qsa("[data-theme-option]", el).forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-checked", String(on));
        });
      });
    });
    qsa("[data-pref-toggle]", el).forEach(function (input) {
      input.addEventListener("change", function () {
        var patch = {}; patch[input.dataset.prefToggle] = input.checked;
        state.user = Store.updateUser(state.user.id, { prefs: patch }) || state.user;
        applyPrefs();
        toast("Preferences saved.");
      });
    });
  }

  /* ====================================================================== *
   * View registry
   * ====================================================================== */
  var VIEWS = {
    overview: { title: "Overview", render: renderOverview, mount: mountOverview },
    policies: { title: "My Policies", render: renderPolicies, mount: mountPolicies },
    claims: { title: "Claims", render: renderClaims, mount: mountClaims },
    payments: { title: "Payments & Billing", render: renderPayments, mount: mountPayments },
    documents: { title: "Documents", render: renderDocuments, mount: mountDocuments },
    support: { title: "Support", render: renderSupport, mount: mountSupport },
    profile: { title: "Profile", render: renderProfile, mount: mountProfile },
    settings: { title: "Settings", render: renderSettings, mount: mountSettings }
  };

  /* ====================================================================== *
   * Router
   * ====================================================================== */
  function routeFromHash() {
    var hash = window.location.hash.replace(/^#\/?/, "").split("?")[0];
    return hash || "overview";
  }

  function setActive(route) {
    qsa("[data-route]").forEach(function (link) {
      var on = link.dataset.route === route;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
  }

  function showSkeleton() {
    viewEl.setAttribute("aria-busy", "true");
    viewEl.innerHTML = '<div class="dash-grid dash-grid--4" aria-hidden="true">' + rep('<div class="skeleton skeleton--stat"></div>', 4) + "</div>" +
      '<div class="dash-grid dash-grid--2" style="margin-top:18px;" aria-hidden="true">' + rep('<div class="skeleton skeleton--chart"></div>', 2) + "</div>";
  }

  function renderRoute(route) {
    if (!VIEWS[route]) route = "overview";
    state.route = route;
    setActive(route);
    doc.title = VIEWS[route].title + " | Stackly Customer Dashboard";

    var announcer = qs("[data-route-announcer]");
    var finish = function () {
      var view = VIEWS[route];
      Charts.destroyAll();
      viewEl.innerHTML = view.render();
      viewEl.setAttribute("aria-busy", "false");
      viewEl.classList.remove("is-entering");
      if (!reduceMotionQuery.matches) {
        void viewEl.offsetWidth;
        viewEl.classList.add("is-entering");
      }
      try { view.mount(viewEl); } catch (e) { console.error("[Stackly] view mount failed", e); }
      if (announcer) announcer.textContent = view.title + " view loaded";
    };

    if (!state.booted) {
      showSkeleton();
      Charts.ensureLib().then(function () { finish(); state.booted = true; });
    } else {
      finish();
    }
  }

  /* ====================================================================== *
   * Shell wiring
   * ====================================================================== */
  function hydrateShell() {
    var u = state.user;
    var initials = Store.initials(u.fullName);
    qsa("[data-user-name]").forEach(function (n) { n.textContent = u.fullName; });
    qsa("[data-user-email]").forEach(function (n) { n.textContent = u.email; });
    qsa("[data-user-role]").forEach(function (n) { n.textContent = u.role === "agent" ? "Agent" : "Customer"; });
    qsa("[data-user-initials]").forEach(function (n) { n.textContent = initials; });
    qsa("[data-user-avatar-wrap]").forEach(function (n) {
      if (u.avatar) { n.innerHTML = '<img src="' + esc(u.avatar) + '" alt="' + esc(u.fullName) + '" width="42" height="42">'; }
      else { n.textContent = initials; }
    });
    qsa("[data-user-since]").forEach(function (n) { n.textContent = fmtDate(u.createdAt, { month: "long", year: "numeric" }); });
    var notifCount = notifications().filter(function (n) { return !n.read; }).length;
    var dot = qs("[data-notif-dot]");
    if (dot) { dot.textContent = String(notifCount); dot.hidden = notifCount === 0; }
    var claimsBadge = qs("[data-claims-badge]");
    if (claimsBadge) { claimsBadge.textContent = String(openClaims().length); claimsBadge.hidden = openClaims().length === 0; }
  }

  function renderNotifications() {
    var panel = qs("[data-notif-panel]");
    if (!panel) return;
    var list = notifications();
    panel.innerHTML = '<div class="dash-panel-head"><strong>Notifications</strong><button type="button" class="chip" data-notif-readall>Mark all read</button></div>' +
      '<div class="dash-panel-list">' + (list.length ? list.map(function (n) {
        return '<div class="dash-panel-item' + (n.read ? "" : " is-unread") + '"><span class="dash-panel-icon">' + icon(n.type === "claim" ? "clipboard" : n.type === "payment" ? "dollar" : n.type === "document" ? "file" : "shield") + '</span><div><strong>' + esc(n.title) + "</strong><p>" + esc(n.body) + "</p><time>" + esc(relTime(n.time)) + "</time></div></div>";
      }).join("") : '<div class="dash-panel-item"><div><p>No notifications right now.</p></div></div>') + "</div>";
    var readAll = qs("[data-notif-readall]", panel);
    if (readAll) readAll.addEventListener("click", function () {
      notifications().forEach(function (n) { n.read = true; });
      Store.updateData(state.user.id, { notifications: notifications() });
      renderNotifications();
      hydrateShell();
    });
  }

  function setTheme(mode) {
    var resolved = mode || "system";
    var darkPref = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = resolved === "dark" || (resolved === "system" && darkPref);
    app.setAttribute("data-theme", dark ? "dark" : "light");
    state.user = Store.updateUser(state.user.id, { prefs: { theme: resolved } }) || state.user;
    var btn = qs("[data-theme-toggle]");
    if (btn) {
      btn.innerHTML = icon(dark ? "sun" : "moon");
      btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    }
    /* Re-render current view so charts pick up the new palette */
    if (state.booted && state.route) renderRoute(state.route);
  }

  function applyPrefs() {
    var prefs = state.user.prefs || {};
    app.classList.toggle("reduce-motion", !!prefs.reduceMotion);
    app.classList.toggle("large-text", !!prefs.largeText);
  }

  function closeAllPanels() {
    qsa("[data-notif-panel]").forEach(function (p) { p.hidden = true; });
    qsa("[data-user-panel]").forEach(function (p) { p.hidden = true; });
    qsa("[data-notif-toggle]").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
    qsa("[data-user-toggle]").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
  }

  function toast(message, isError) {
    var node = qs("[data-toast]");
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    node.classList.toggle("is-error", !!isError);
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(function () { node.hidden = true; }, 3400);
  }

  var drawerRoot = qs("[data-drawer-root]");
  function openDrawer(title, html, onMount) {
    if (!drawerRoot) return;
    drawerRoot.innerHTML = '<div class="drawer-backdrop" data-drawer-close></div>' +
      '<aside class="drawer" role="dialog" aria-modal="true" aria-label="' + esc(title) + '" tabindex="-1"><div class="drawer-head"><h2>' + esc(title) + '</h2><button class="dash-icon-btn" type="button" data-drawer-close aria-label="Close details">' + icon("close") + "</button></div>" +
      '<div class="drawer-body">' + html + "</div></aside>";
    var backdrop = qs(".drawer-backdrop", drawerRoot);
    var drawer = qs(".drawer", drawerRoot);
    var lastFocus = doc.activeElement;
    window.requestAnimationFrame(function () { backdrop.classList.add("is-open"); drawer.classList.add("is-open"); });
    drawer.focus();
    if (onMount) onMount(drawer);
    drawerRoot._lastFocus = lastFocus;
    function close() {
      backdrop.classList.remove("is-open");
      drawer.classList.remove("is-open");
      window.setTimeout(function () { drawerRoot.innerHTML = ""; }, 260);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      doc.removeEventListener("keydown", onKey);
    }
    function onKey(event) {
      if (event.key === "Escape") { close(); return; }
      if (event.key === "Tab") {
        var focusables = qsa('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', drawer).filter(function (n) { return n.offsetParent !== null; });
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    doc.addEventListener("keydown", onKey);
    qsa("[data-drawer-close]", drawerRoot).forEach(function (b) { b.addEventListener("click", close); });
  }

  function bindShell() {
    /* Sidebar toggle: collapse on desktop, drawer on mobile */
    var sidebar = qs("[data-dash-sidebar]");
    var backdrop = qs("[data-sidebar-backdrop]");
    function openMobile() { sidebar.classList.add("is-open"); backdrop.hidden = false; window.requestAnimationFrame(function () { backdrop.classList.add("is-open"); }); }
    function closeMobile() {
      sidebar.classList.remove("is-open"); backdrop.classList.remove("is-open");
      window.setTimeout(function () { backdrop.hidden = true; }, 220);
    }
    qsa("[data-sidebar-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (window.innerWidth <= 1024) { openMobile(); }
        else { app.classList.toggle("is-collapsed"); Store.setUI({ collapsed: app.classList.contains("is-collapsed") }); }
      });
    });
    var closeBtn = qs("[data-sidebar-close]");
    if (closeBtn) closeBtn.addEventListener("click", closeMobile);
    if (backdrop) backdrop.addEventListener("click", closeMobile);
    qsa("[data-route]").forEach(function (link) { link.addEventListener("click", function () { if (window.innerWidth <= 1024) closeMobile(); }); });

    /* Theme toggle */
    var themeBtn = qs("[data-theme-toggle]");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        var dark = app.getAttribute("data-theme") === "dark";
        setTheme(dark ? "light" : "dark");
      });
    }

    /* Notifications + user menus */
    var notifToggle = qs("[data-notif-toggle]");
    var notifPanel = qs("[data-notif-panel]");
    if (notifToggle && notifPanel) {
      notifToggle.addEventListener("click", function (event) {
        event.stopPropagation();
        var open = notifPanel.hidden;
        closeAllPanels();
        notifPanel.hidden = !open;
        notifToggle.setAttribute("aria-expanded", String(open));
      });
    }
    var userToggle = qs("[data-user-toggle]");
    var userPanel = qs("[data-user-panel]");
    if (userToggle && userPanel) {
      userToggle.addEventListener("click", function (event) {
        event.stopPropagation();
        var open = userPanel.hidden;
        closeAllPanels();
        userPanel.hidden = !open;
        userToggle.setAttribute("aria-expanded", String(open));
      });
    }
    doc.addEventListener("click", function (event) {
      if (!event.target.closest("[data-notif-panel]") && !event.target.closest("[data-notif-toggle]") && !event.target.closest("[data-user-panel]") && !event.target.closest("[data-user-toggle]")) {
        closeAllPanels();
      }
    });
    doc.addEventListener("keydown", function (event) { if (event.key === "Escape") closeAllPanels(); });

    /* Global search */
    var search = qs("[data-global-search]");
    if (search) {
      search.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = qs("input", search);
        var term = (input.value || "").trim().toLowerCase();
        if (!term) return;
        var found = null;
        policies().forEach(function (p) { if (!found && (p.name + p.policyNumber + p.type).toLowerCase().indexOf(term) !== -1) found = { view: "policies", label: p.name }; });
        claims().forEach(function (c) { if (!found && (c.reference + c.title).toLowerCase().indexOf(term) !== -1) found = { view: "claims", label: c.reference }; });
        documents().forEach(function (d) { if (!found && d.name.toLowerCase().indexOf(term) !== -1) found = { view: "documents", label: d.name }; });
        if (found) { window.location.hash = "#/" + found.view; toast("Found: " + found.label); }
        else { toast("No matches for \u201C" + term + "\u201D. Try a policy, claim, or document name.", true); }
      });
    }

    /* Delegated buttons (toasts + logout) */
    doc.addEventListener("click", function (event) {
      var toastTrigger = event.target.closest("[data-toast-btn]");
      if (toastTrigger) { event.preventDefault(); toast(toastTrigger.dataset.toastBtn); }
      var logout = event.target.closest("[data-logout]");
      if (logout) { event.preventDefault(); logoutNow(); }
    });

    window.addEventListener("hashchange", function () { renderRoute(routeFromHash()); });
  }

  function logoutNow() {
    Store.clearSession("customer");
    window.location.href = "login.html";
  }

  function renderGuard() {
    app.outerHTML = '<div class="dash-guard" data-theme="light"><div class="dash-guard-card">' +
      '<img src="assets/images/dashboard/empty-state.webp" alt="" width="260" height="180">' +
      "<h1>The Agent workspace is on the way</h1>" +
      "<p>You are signed in as an Agent. The customer dashboard is reserved for policyholders, and the Agent console is the next build. For now you can sign out and explore the customer experience with a customer account.</p>" +
      '<div class="dash-guard-actions"><button class="dbtn dbtn--primary" type="button" data-logout>' + icon("logout") + "Sign out</button>" +
      '<a class="dbtn dbtn--ghost" href="index.html#home">Back to Stackly</a></div></div></div>';
    qsa("[data-logout]").forEach(function (b) { b.addEventListener("click", logoutNow); });
  }

  /* ====================================================================== *
   * Boot
   * ====================================================================== */
  function boot() {
    if (!app || !viewEl) {
      return; /* Not the customer page (e.g. the Agent dashboard reuses utilities). */
    }
    /* Resolve the customer profile from localStorage: a customer session, a
       matching signed-up user, or a seeded demo customer. No backend/auth wall
       so this dashboard can always be opened. */
    state.user = Store.getDashboardUser ? Store.getDashboardUser("customer") : Store.getSession();
    if (!state.user) {
      window.location.replace("login.html?next=customer-dashboard.html");
      return;
    }
    state.data = Store.ensureData(state.user);

    var ui = Store.getUI();
    if (ui.collapsed && window.innerWidth > 1024) app.classList.add("is-collapsed");

    /* Resolve initial theme before paint */
    var prefs = state.user.prefs || {};
    var darkPref = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var mode = prefs.theme || "system";
    app.setAttribute("data-theme", (mode === "dark" || (mode === "system" && darkPref)) ? "dark" : "light");

    hydrateShell();
    applyPrefs();
    renderNotifications();
    bindShell();

    var themeBtn = qs("[data-theme-toggle]");
    if (themeBtn) themeBtn.innerHTML = icon(app.getAttribute("data-theme") === "dark" ? "sun" : "moon");

    var route = routeFromHash();
    if (!VIEWS[route]) { window.location.hash = "#/overview"; route = "overview"; }
    renderRoute(route);

    if (reduceMotionQuery.addEventListener) {
      reduceMotionQuery.addEventListener("change", function () { if (state.booted) renderRoute(state.route); });
    }
  }

  /* Shared utilities reused by the Agent dashboard (agent.js) and any future
     role-based SPA. Kept framework-free and side-effect free. */
  window.StacklyDashboard = {
    Charts: Charts,
    VIEWS: VIEWS,
    icon: icon,
    toast: toast,
    openDrawer: openDrawer,
    setRoot: function (el) { rootApp = el; },
    reduceMotion: function () { return reduceMotionQuery.matches; },
    palette: PALETTE,
    qs: qs,
    qsa: qsa,
    rep: rep,
    esc: esc,
    sum: sum,
    clamp: clamp,
    money: money,
    moneyShort: moneyShort,
    fmtDate: fmtDate,
    relTime: relTime,
    monthsBack: monthsBack,
    sameMonth: sameMonth,
    seededTrend: seededTrend,
    typeColor: typeColor,
    typeImage: typeImage,
    statusClass: statusClass,
    pageHead: pageHead,
    statCard: statCard,
    chartCard: chartCard,
    avatarMarkup: avatarMarkup,
    cell: cell
  };

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
