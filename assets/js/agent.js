/* ==========================================================================
   Stackly Agent dashboard SPA (agent.js)
   Second role-based dashboard. Reuses the shared shell, chart adapter, drawer,
   toast, and formatters exposed by dashboard.js on window.StacklyDashboard.
   Data comes from store.js (window.StacklyStore) via the agent domain.
   Security: client-side role guard only. Real auth must be enforced server-side.
   ========================================================================== */
(function () {
  "use strict";

  var UI = window.StacklyDashboard;
  var Store = window.StacklyStore;
  var doc = document;
  var app = doc.querySelector("[data-agent-app]");
  var viewEl = doc.querySelector("[data-agent-view]");

  if (!UI || !Store || !app || !viewEl) {
    console.error("[Stackly] agent.js requires store.js and dashboard.js to load first");
    return;
  }

  /* Shared utilities */
  var Charts = UI.Charts, icon = UI.icon, esc = UI.esc, money = UI.money, moneyShort = UI.moneyShort;
  var fmtDate = UI.fmtDate, relTime = UI.relTime, monthsBack = UI.monthsBack, sameMonth = UI.sameMonth;
  var sum = UI.sum, clamp = UI.clamp, typeColor = UI.typeColor, typeImage = UI.typeImage, statusClass = UI.statusClass;
  var pageHead = UI.pageHead, statCard = UI.statCard, chartCard = UI.chartCard, avatarMarkup = UI.avatarMarkup;
  var cell = UI.cell;
  var seededTrend = UI.seededTrend, toast = UI.toast, openDrawer = UI.openDrawer;
  var qs = UI.qs, qsa = UI.qsa, rep = UI.rep, PALETTE = UI.palette;
  var reduceMotion = UI.reduceMotion;

  UI.setRoot(app);

  var state = { user: null, data: null, route: "", booted: false };

  /* ====================================================================== *
   * Domain accessors
   * ====================================================================== */
  function clients() { return state.data.customers || []; }
  function policies() { return state.data.policies || []; }
  function claims() { return state.data.claims || []; }
  function leads() { return state.data.leads || []; }
  function commissions() { return state.data.commissions || []; }
  function appointments() { return state.data.appointments || []; }
  function messages() { return state.data.messages || []; }
  function notifications() { return state.data.notifications || []; }
  function activity() { return state.data.activity || []; }
  function targets() { return state.data.targets || {}; }

  function activeClients() { return clients().filter(function (c) { return c.status === "Active"; }); }
  function managedPolicies() { return policies().filter(function (p) { return p.status !== "Lapsed"; }); }
  function openClaims() { return claims().filter(function (c) { return ["Submitted", "In Review", "Approved"].indexOf(c.status) !== -1; }); }
  function clientById(id) { return clients().filter(function (c) { return c.id === id; })[0] || null; }

  function stageClass(stage) {
    return ({ New: "status--submitted", Contacted: "status--pending", Quoted: "status--in-review", Won: "status--approved", Lost: "status--rejected" })[stage] || "status--submitted";
  }
  function priorityClass(priority) {
    return ({ High: "status--rejected", Medium: "status--pending", Low: "status--submitted" })[priority] || "status--submitted";
  }
  function clientClass(status) {
    return ({ Active: "status--active", New: "status--scheduled", Prospect: "status--in-review", Lapsed: "status--expired" })[status] || "status--active";
  }
  /* Integer formatting for count-based charts (so axes/totals are not currency). */
  function countFmt(v) { return String(Math.round(v)); }

  /* ---- Derived series ---- */
  function monthLabels(n) { return monthsBack(n).map(function (m) { return m.toLocaleDateString("en-US", { month: "short" }); }); }
  function premiumSeries(n) {
    return monthsBack(n || 12).map(function (m) {
      return Math.round(sum(commissions().filter(function (c) { return sameMonth(c.date, m); }), function (c) { return c.premium; }));
    });
  }
  function commissionSeries(n) {
    return monthsBack(n || 12).map(function (m) {
      return Math.round(sum(commissions().filter(function (c) { return sameMonth(c.date, m); }), function (c) { return c.amount; }));
    });
  }
  function policiesByType() {
    var map = {};
    managedPolicies().forEach(function (p) { map[p.type] = (map[p.type] || 0) + 1; });
    return map;
  }
  function claimsMonthly(n) {
    var months = monthsBack(n || 6);
    return {
      labels: months.map(function (m) { return m.toLocaleDateString("en-US", { month: "short" }); }),
      approved: months.map(function (m) { return claims().filter(function (c) { return sameMonth(c.filedAt, m) && ["Approved", "Paid"].indexOf(c.status) !== -1; }).length; }),
      pending: months.map(function (m) { return claims().filter(function (c) { return sameMonth(c.filedAt, m) && ["Submitted", "In Review"].indexOf(c.status) !== -1; }).length; }),
      rejected: months.map(function (m) { return claims().filter(function (c) { return sameMonth(c.filedAt, m) && c.status === "Rejected"; }).length; })
    };
  }
  function newVsRenewals(n) {
    var months = monthsBack(n || 6);
    return {
      labels: months.map(function (m) { return m.toLocaleDateString("en-US", { month: "short" }); }),
      renewals: months.map(function (m) { return policies().filter(function (p) { return p.isRenewal && sameMonth(p.startDate, m); }).length; }),
      fresh: months.map(function (m) { return policies().filter(function (p) { return !p.isRenewal && sameMonth(p.startDate, m); }).length; })
    };
  }
  function leadsByStage() {
    var stages = ["New", "Contacted", "Quoted", "Won", "Lost"];
    var out = {};
    stages.forEach(function (s) {
      var list = leads().filter(function (l) { return l.stage === s; });
      out[s] = { count: list.length, value: sum(list, function (l) { return l.value; }), list: list };
    });
    return out;
  }
  function winRate() {
    var by = leadsByStage();
    var won = by.Won.count, lost = by.Lost.count;
    return won + lost ? Math.round((won / (won + lost)) * 100) : 0;
  }
  function productMix() {
    var map = {};
    commissions().forEach(function (c) { map[c.productType] = (map[c.productType] || 0) + c.amount; });
    return map;
  }
  function regionMix() {
    var byId = {};
    clients().forEach(function (c) { byId[c.id] = c.city; });
    var map = {};
    policies().forEach(function (p) {
      var city = byId[p.customerId] || "Other";
      map[city] = (map[city] || 0) + p.premium;
    });
    return map;
  }
  function currentMonthSum(list, get) {
    var now = new Date();
    return sum(list.filter(function (item) { return sameMonth(item.date, now); }), get);
  }
  function commissionYTD() {
    var year = new Date().getFullYear();
    return sum(commissions().filter(function (c) { return new Date(c.date).getFullYear() === year; }), function (c) { return c.amount; });
  }

  /* ====================================================================== *
   * Animation helpers
   * ====================================================================== */
  function animateStatValues(root) {
    if (reduceMotion()) return;
    qsa(".stat-value", root).forEach(function (node) {
      if (node.dataset.counted) return;
      var raw = node.textContent.trim();
      var match = raw.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
      if (!match) return;
      var prefix = match[1];
      var target = parseFloat(match[2].replace(/,/g, ""));
      var suffix = match[3];
      if (!isFinite(target)) return;
      node.dataset.counted = "true";
      var decimals = (match[2].split(".")[1] || "").length;
      var start = performance.now();
      var duration = 900;
      var tick = function (now) {
        var p = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var value = target * eased;
        node.textContent = prefix + (decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString("en-US")) + suffix;
        if (p < 1) window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    });
  }

  /* ====================================================================== *
   * Views
   * ====================================================================== */

  /* ---- 1. Overview ---- */
  function renderOverview() {
    var by = leadsByStage();
    var t = targets();
    var premiumProgress = t.premiumMonthly ? clamp((premiumSeries(1)[0] / t.premiumMonthly) * 100, 0, 100) : 0;
    var commissionProgress = t.commissionMonthly ? clamp((commissionSeries(1)[0] / t.commissionMonthly) * 100, 0, 100) : 0;
    var funnel = ["New", "Contacted", "Quoted", "Won", "Lost"].map(function (s, i) {
      var max = Math.max.apply(null, ["New", "Contacted", "Quoted", "Won", "Lost"].map(function (x) { return by[x].count; }).concat([1]));
      return '<div class="funnel-row"><span>' + esc(s) + '</span><span class="funnel-bar" style="width:' + clamp((by[s].count / max) * 100, 5, 100) + "%;background:" + PALETTE[i % PALETTE.length] + ';opacity:0.85;"></span><span class="funnel-count">' + by[s].count + "</span></div>";
    }).join("");

    var notifRows = notifications().slice(0, 4).map(function (n) {
      return '<li class="activity-item"><span class="activity-ico">' + icon(n.type === "claim" ? "clipboard" : n.type === "lead" ? "trend" : n.type === "commission" ? "dollar" : "shield") + '</span><div><p>' + esc(n.title) + " \u2014 " + esc(n.body) + "</p><time>" + esc(relTime(n.time)) + "</time></div></li>";
    }).join("");
    var activityRows = activity().slice(0, 5).map(function (a) {
      return '<li class="activity-item"><span class="activity-ico">' + icon(a.type === "claim" ? "clipboard" : a.type === "lead" ? "trend" : a.type === "commission" ? "dollar" : a.type === "appointment" ? "clock" : "shield") + '</span><div><p>' + esc(a.text) + "</p><time>" + esc(relTime(a.time)) + "</time></div></li>";
    }).join("");

    return pageHead({
      title: "Good to see you, " + Store.firstName(state.user) + ".",
      subtitle: "Your book at a glance \u2014 clients, policies, pipeline, and commission.",
      actions: '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="Your performance report is being prepared.">' + icon("download") + "Export report</button>" +
        '<a class="dbtn dbtn--primary" href="#/leads">' + icon("plus") + "Add lead</a>"
    }) +
      '<div class="dash-kpis dash-stagger">' +
        statCard({ icon: "user", label: "Active clients", value: String(activeClients().length), delta: "+3 this month", spark: "ag-sp-clients" }) +
        statCard({ icon: "shield", label: "Policies managed", value: String(managedPolicies().length), delta: "+6 this month", spark: "ag-sp-policies" }) +
        statCard({ icon: "trend", label: "Premium written MTD", value: moneyShort(premiumSeries(1)[0]), delta: "vs " + moneyShort(targets().premiumMonthly || 0) + " target", spark: "ag-sp-premium" }) +
        statCard({ icon: "clipboard", label: "Open claims", value: String(openClaims().length), dir: "down", delta: "2 near SLA", spark: "ag-sp-claims" }) +
        statCard({ icon: "dollar", label: "Commission earned", value: moneyShort(commissionYTD()), delta: "year to date", spark: "ag-sp-commission" }) +
        statCard({ icon: "bolt", label: "Conversion rate", value: winRate() + "%", delta: "target " + (targets().conversionRate || 0) + "%", spark: "ag-sp-conversion" }) +
      "</div>" +
      '<div class="dash-grid dash-grid--3" style="margin-bottom:18px;">' +
        chartCard({ id: "ag-area", title: "Premium written", subtitle: "Total premium across your book, last 12 months", chartClass: "chart--area", span: "dash-span-2", aria: "Area chart of premium written over twelve months", summary: "Twelve month premium written trend." }) +
        chartCard({ id: "ag-type", title: "Policies by type", subtitle: "Your book by product line", chartClass: "chart--donut", aria: "Doughnut chart of policies by type", summary: "Policy mix by product type." }) +
      "</div>" +
      '<div class="dash-grid dash-grid--3" style="margin-bottom:18px;">' +
        chartCard({ id: "ag-claims", title: "Claims queue", subtitle: "Approved, pending, and rejected by month", chartClass: "chart--bar", span: "dash-span-2", aria: "Stacked bar chart of claims by status and month", summary: "Claims queue over six months." }) +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Target vs actual</h3><p>This month against your goals</p></div></div>' +
          '<div class="dash-grid dash-grid--2">' +
            '<div><div class="chart chart--radial" id="ag-goal-premium" role="img" aria-label="Premium target progress ' + Math.round(premiumProgress) + ' percent"></div><p style="text-align:center;color:var(--dash-muted);font-size:12px;margin:0;">Premium</p></div>' +
            '<div><div class="chart chart--radial" id="ag-goal-commission" role="img" aria-label="Commission target progress ' + Math.round(commissionProgress) + ' percent"></div><p style="text-align:center;color:var(--dash-muted);font-size:12px;margin:0;">Commission</p></div>' +
          "</div></article>" +
      "</div>" +
      '<div class="dash-grid dash-grid--2" style="margin-bottom:18px;">' +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Leads pipeline</h3><p>New \u2192 Contacted \u2192 Quoted \u2192 Won / Lost</p></div></div><div class="funnel">' + funnel + "</div></article>" +
        chartCard({ id: "ag-commission", title: "Commission trend", subtitle: "Earnings across the last 12 months", chartClass: "chart--bar", aria: "Bar chart of commission earned over twelve months", summary: "Monthly commission trend." }) +
      "</div>" +
      '<div class="dash-grid dash-grid--2">' +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Recent activity</h3><p>What you have been working on</p></div></div><ul class="activity-list" style="list-style:none;margin:0;padding:0;">' + activityRows + "</ul></article>" +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Notifications</h3><p>Updates worth knowing</p></div></div><ul class="activity-list" style="list-style:none;margin:0;padding:0;">' + notifRows + "</ul></article>" +
      "</div>";
  }

  function mountOverview(el) {
    Charts.spark(qs("#ag-sp-clients", el), seededTrend(state.user.id + "clients", activeClients().length, 8, 0.7), PALETTE[0]);
    Charts.spark(qs("#ag-sp-policies", el), seededTrend(state.user.id + "pols", managedPolicies().length, 8, 1.1), PALETTE[1]);
    Charts.spark(qs("#ag-sp-premium", el), premiumSeries(), PALETTE[2]);
    Charts.spark(qs("#ag-sp-claims", el), seededTrend(state.user.id + "claims", openClaims().length + 1, 8, 0.6), PALETTE[4]);
    Charts.spark(qs("#ag-sp-commission", el), commissionSeries(), PALETTE[5]);
    Charts.spark(qs("#ag-sp-conversion", el), seededTrend(state.user.id + "conv", winRate(), 8, 3), PALETTE[6]);

    Charts.area(qs("#ag-area", el), monthLabels(12), [{ name: "Premium written", data: premiumSeries() }], { colors: [PALETTE[0]] });
    var typeMap = policiesByType();
    var typeLabels = Object.keys(typeMap);
    Charts.donut(qs("#ag-type", el), typeLabels, typeLabels.map(function (k) { return typeMap[k]; }), { colors: typeLabels.map(typeColor), totalLabel: "Policies", valueFormatter: countFmt, totalFormatter: countFmt });

    var cm = claimsMonthly(6);
    Charts.bar(qs("#ag-claims", el), cm.labels, [
      { name: "Approved", data: cm.approved },
      { name: "Pending", data: cm.pending },
      { name: "Rejected", data: cm.rejected }
    ], { stacked: true, colors: [PALETTE[0], PALETTE[2], PALETTE[4]] });

    var t = targets();
    Charts.radial(qs("#ag-goal-premium", el), t.premiumMonthly ? clamp((premiumSeries(1)[0] / t.premiumMonthly) * 100, 0, 100) : 0, { label: "Premium", color: PALETTE[0] });
    Charts.radial(qs("#ag-goal-commission", el), t.commissionMonthly ? clamp((commissionSeries(1)[0] / t.commissionMonthly) * 100, 0, 100) : 0, { label: "Commission", color: PALETTE[2] });

    Charts.bar(qs("#ag-commission", el), monthLabels(12), [{ name: "Commission", data: commissionSeries() }], { colors: [PALETTE[5]] });
  }

  /* ---- 2. Customers ---- */
  function renderCustomers() {
    var list = clients();
    var statusCounts = ["Active", "New", "Prospect", "Lapsed"].map(function (s) { return list.filter(function (c) { return c.status === s; }).length; });
    var rows = list.map(function (c) {
      return '<tr data-client-row data-name="' + esc((c.name + " " + c.city).toLowerCase()) + '" data-status="' + esc(c.status) + '">' +
        cell("Client", '<div class="dash-table__cell-main">' + avatarMarkup({ fullName: c.name, avatar: c.avatar }, "dash-avatar--sm") + "<span><strong>" + esc(c.name) + '</strong><br><small style="color:var(--dash-muted);">' + esc(c.email) + "</small></span></div>") +
        cell("City", esc(c.city)) +
        cell("Policies", c.policiesCount, true) +
        cell("Premium", c.premium ? money(c.premium) + "/mo" : "\u2014", true) +
        cell("Status", '<span class="' + clientClass(c.status) + '">' + esc(c.status) + "</span>") +
        cell("Last contact", esc(relTime(c.lastContact))) +
        cell("Action", '<button class="dbtn dbtn--ghost dbtn--sm" type="button" data-client-detail="' + esc(c.id) + '">View</button>', true) +
        "</tr>";
    }).join("");

    return pageHead({
      title: "Customers",
      subtitle: "Every client, their cover, and when you last spoke.",
      actions: '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="Your client list is downloading.">' + icon("download") + "Export</button>" +
        '<button class="dbtn dbtn--primary" type="button" data-toast-btn="A new client record is ready to add.">' + icon("plus") + "Add client</button>"
    }) +
      '<div class="dash-grid dash-grid--4 dash-stagger" style="margin-bottom:18px;">' +
        statCard({ icon: "user", label: "Active clients", value: String(statusCounts[0]) }) +
        statCard({ icon: "plus", label: "New this month", value: String(statusCounts[1]) }) +
        statCard({ icon: "trend", label: "Prospects", value: String(statusCounts[2]) }) +
        statCard({ icon: "clock", label: "Lapsed", value: String(statusCounts[3]) }) +
      "</div>" +
      '<div class="dash-grid dash-grid--3" style="margin-bottom:18px;">' +
        chartCard({ id: "ag-cust-bar", title: "Clients by status", subtitle: "Your book by relationship stage", chartClass: "chart--bar", aria: "Bar chart of clients by status", summary: "Active, new, prospect, and lapsed clients." }) +
        chartCard({ id: "ag-cust-city", title: "Premium by city", subtitle: "Where your book is concentrated", chartClass: "chart--hbar", span: "dash-span-2", aria: "Horizontal bar chart of premium by city", summary: "Premium distribution by city." }) +
      "</div>" +
      '<div class="dash-toolbar">' +
        '<div class="dash-search">' + icon("search") + '<input type="search" placeholder="Search clients\u2026" aria-label="Search clients" data-client-search></div>' +
        '<select class="dash-select" style="max-width:180px;" data-client-status aria-label="Filter by status"><option value="All">All statuses</option><option>Active</option><option>New</option><option>Prospect</option><option>Lapsed</option></select>' +
      "</div>" +
      '<article class="dash-card dash-card-pad"><div class="dash-table-wrap"><table class="dash-table"><caption class="sr-only">Your clients</caption><thead><tr><th scope="col">Client</th><th scope="col">City</th><th scope="col" class="is-num">Policies</th><th scope="col" class="is-num">Premium</th><th scope="col">Status</th><th scope="col">Last contact</th><th scope="col" class="is-num">Action</th></tr></thead><tbody>' + rows + "</tbody></table></div></article>";
  }

  function mountCustomers(el) {
    var list = clients();
    var counts = ["Active", "New", "Prospect", "Lapsed"].map(function (s) { return list.filter(function (c) { return c.status === s; }).length; });
    Charts.bar(qs("#ag-cust-bar", el), ["Active", "New", "Prospect", "Lapsed"], [{ name: "Clients", data: counts }], { colors: [PALETTE[0]], yFormatter: function (v) { return String(Math.round(v)); } });
    var byCity = {};
    list.forEach(function (c) { byCity[c.city] = (byCity[c.city] || 0) + c.premium; });
    var cities = Object.keys(byCity).sort(function (a, b) { return byCity[b] - byCity[a]; }).slice(0, 8);
    Charts.hbar(qs("#ag-cust-city", el), cities, cities.map(function (c) { return byCity[c]; }), { name: "Premium" });

    var search = qs("[data-client-search]", el);
    var statusFilter = qs("[data-client-status]", el);
    var rows = qsa("[data-client-row]", el);
    function apply() {
      var term = search ? search.value.trim().toLowerCase() : "";
      var status = statusFilter ? statusFilter.value : "All";
      rows.forEach(function (row) {
        var ok = (!term || row.dataset.name.indexOf(term) !== -1) && (status === "All" || row.dataset.status === status);
        row.style.display = ok ? "" : "none";
      });
    }
    if (search) search.addEventListener("input", apply);
    if (statusFilter) statusFilter.addEventListener("change", apply);

    qsa("[data-client-detail]", el).forEach(function (btn) {
      btn.addEventListener("click", function () { openClientDrawer(btn.dataset.clientDetail); });
    });
  }

  function openClientDrawer(id) {
    var c = clientById(id);
    if (!c) return;
    var custPolicies = policies().filter(function (p) { return p.customerId === id; });
    var custClaims = claims().filter(function (p) { return p.customerId === id; });
    var byType = {};
    custPolicies.forEach(function (p) { byType[p.type] = (byType[p.type] || 0) + p.coverage; });
    var labels = Object.keys(byType);
    var claimRows = custClaims.length ? custClaims.map(function (x) {
      return '<li class="ag-list-row"><span class="ag-list-body"><strong>' + esc(x.reference) + " \u00b7 " + esc(x.type) + "</strong><small>" + money(x.amount) + " \u00b7 " + esc(fmtDate(x.filedAt, { month: "short", day: "numeric" })) + '</small></span><span class="' + statusClass(x.status) + '">' + esc(x.status) + "</span></li>";
    }).join("") : '<li class="ag-list-row"><span class="ag-list-body"><small>No claims on record.</small></span></li>';

    var body =
      '<div style="display:flex;gap:16px;align-items:center;margin-bottom:18px;">' + avatarMarkup({ fullName: c.name, avatar: c.avatar }, "dash-avatar--lg") +
        '<div><h3 style="margin:0;font-family:var(--display);font-size:20px;">' + esc(c.name) + "</h3>" +
        '<p style="margin:4px 0 8px;color:var(--dash-muted);font-size:13px;">' + esc(c.city) + ", " + esc(c.region) + "</p>" +
        '<span class="' + clientClass(c.status) + '">' + esc(c.status) + "</span></div></div>" +
      '<ul class="drawer-list"><li><span class="k">Email</span><span class="v">' + esc(c.email) + "</span></li>" +
      '<li><span class="k">Phone</span><span class="v">' + esc(c.phone) + "</span></li>" +
      '<li><span class="k">Client since</span><span class="v">' + esc(fmtDate(c.since, { month: "short", year: "numeric" })) + "</span></li>" +
      '<li><span class="k">Policies</span><span class="v">' + c.policiesCount + "</span></li>" +
      '<li><span class="k">Monthly premium</span><span class="v">' + (c.premium ? money(c.premium) : "\u2014") + "</span></li></ul>" +
      '<h4 style="margin:20px 0 10px;font-family:var(--display);">Coverage mix</h4>' +
      (labels.length ? '<div class="chart chart--donut" id="ag-cust-donut" role="img" aria-label="Coverage mix for this client"></div>' : '<p style="color:var(--dash-muted);font-size:13px;">No active cover yet.</p>') +
      '<h4 style="margin:20px 0 6px;font-family:var(--display);">Claim history</h4><ul style="list-style:none;margin:0;padding:0;">' + claimRows + "</ul>" +
      '<div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap;"><button class="dbtn dbtn--primary" type="button" data-toast-btn="Opening a message to ' + esc(c.name) + '.">' + icon("chat") + "Message</button>" +
      '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="A note was added to ' + esc(c.name) + "\u2019s record." + '">' + icon("edit") + "Add note</button></div>";

    openDrawer(c.name, body, function (drawerEl) {
      if (labels.length) Charts.donut(qs("#ag-cust-donut", drawerEl), labels, labels.map(function (k) { return byType[k]; }), { colors: labels.map(typeColor), totalLabel: "Covered" });
    });
  }

  /* ---- 3. Policies ---- */
  function renderPolicies() {
    var list = policies();
    var renewalsSoon = list.filter(function (p) {
      var days = (new Date(p.renewalDate) - Date.now()) / 86400000;
      return days >= 0 && days <= 30;
    }).length;
    var types = ["All"].concat(Object.keys(list.reduce(function (m, p) { m[p.type] = 1; return m; }, {})));
    var chips = types.map(function (t, i) { return '<button class="chip' + (i === 0 ? " is-active" : "") + '" type="button" data-pol-filter="' + esc(t) + '">' + esc(t) + "</button>"; }).join("");
    var rows = list.map(function (p) {
      return '<tr data-pol-row data-name="' + esc((p.customerName + " " + p.policyNumber + " " + p.type).toLowerCase()) + '" data-type="' + esc(p.type) + '" data-status="' + esc(p.status) + '">' +
        cell("Client / policy", '<div class="dash-table__cell-main"><span class="dash-table__thumb"><img src="' + typeImage(p.type) + '" alt="" width="38" height="38" loading="lazy"></span><span><strong>' + esc(p.customerName) + '</strong><br><small style="color:var(--dash-muted);">' + esc(p.policyNumber) + "</small></span></div>") +
        cell("Type", esc(p.type)) +
        cell("Coverage", moneyShort(p.coverage), true) +
        cell("Premium", money(p.premium) + "/mo", true) +
        cell("Basis", p.isRenewal ? "Renewal" : "New") +
        cell("Status", '<span class="' + statusClass(p.status) + '">' + esc(p.status) + "</span>") +
        cell("Renews", esc(fmtDate(p.renewalDate, { month: "short", day: "numeric" }))) +
        cell("Action", '<button class="dbtn dbtn--ghost dbtn--sm" type="button" data-pol-detail="' + esc(p.id) + '">View</button>', true) +
        "</tr>";
    }).join("");

    return pageHead({
      title: "Policies under management",
      subtitle: "New business and renewals across your whole book.",
      actions: '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="Renewal reminders sent to clients.">' + icon("clock") + "Remind renewals</button>" +
        '<button class="dbtn dbtn--primary" type="button" data-toast-btn="A new policy quote is ready to start.">' + icon("plus") + "New policy</button>"
    }) +
      '<div class="dash-grid dash-grid--4 dash-stagger" style="margin-bottom:18px;">' +
        statCard({ icon: "shield", label: "Total policies", value: String(list.length) }) +
        statCard({ icon: "check", label: "Active", value: String(list.filter(function (p) { return p.status === "Active"; }).length) }) +
        statCard({ icon: "clock", label: "Renewals in 30 days", value: String(renewalsSoon) }) +
        statCard({ icon: "trend", label: "Premium under management", value: moneyShort(sum(list, function (p) { return p.premium; })) + "/mo" }) +
      "</div>" +
      '<div class="dash-grid dash-grid--2" style="margin-bottom:18px;">' +
        chartCard({ id: "ag-pol-mix", title: "New vs renewals", subtitle: "Issued policies by month", chartClass: "chart--bar", aria: "Stacked bar chart of new policies versus renewals", summary: "New business and renewals by month." }) +
        chartCard({ id: "ag-pol-type", title: "Book by product", subtitle: "Policies by type", chartClass: "chart--donut", aria: "Doughnut chart of policies by type", summary: "Policy type distribution." }) +
      "</div>" +
      '<div class="dash-toolbar">' +
        '<div class="dash-search">' + icon("search") + '<input type="search" placeholder="Search policies or clients\u2026" aria-label="Search policies" data-pol-search></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + chips + "</div>" +
      "</div>" +
      '<article class="dash-card dash-card-pad"><div class="dash-table-wrap"><table class="dash-table"><caption class="sr-only">Policies under management</caption><thead><tr><th scope="col">Client / policy</th><th scope="col">Type</th><th scope="col" class="is-num">Coverage</th><th scope="col" class="is-num">Premium</th><th scope="col">Basis</th><th scope="col">Status</th><th scope="col">Renews</th><th scope="col" class="is-num">Action</th></tr></thead><tbody>' + rows + "</tbody></table></div></article>";
  }

  function mountPolicies(el) {
    var nv = newVsRenewals(6);
    Charts.bar(qs("#ag-pol-mix", el), nv.labels, [{ name: "Renewals", data: nv.renewals }, { name: "New", data: nv.fresh }], { stacked: true, colors: [PALETTE[1], PALETTE[0]], yFormatter: function (v) { return String(Math.round(v)); } });
    var typeMap = policiesByType();
    var labels = Object.keys(typeMap);
    Charts.donut(qs("#ag-pol-type", el), labels, labels.map(function (k) { return typeMap[k]; }), { colors: labels.map(typeColor), totalLabel: "Policies", valueFormatter: countFmt, totalFormatter: countFmt });

    var search = qs("[data-pol-search]", el);
    var chips = qsa("[data-pol-filter]", el);
    var rows = qsa("[data-pol-row]", el);
    var activeType = "All";
    function apply() {
      var term = search ? search.value.trim().toLowerCase() : "";
      rows.forEach(function (row) {
        var ok = (activeType === "All" || row.dataset.type === activeType) && (!term || row.dataset.name.indexOf(term) !== -1);
        row.style.display = ok ? "" : "none";
      });
    }
    if (search) search.addEventListener("input", apply);
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.classList.remove("is-active"); });
        chip.classList.add("is-active");
        activeType = chip.dataset.polFilter;
        apply();
      });
    });
    qsa("[data-pol-detail]", el).forEach(function (btn) {
      btn.addEventListener("click", function () { openPolicyDrawer(btn.dataset.polDetail); });
    });
  }

  function openPolicyDrawer(id) {
    var p = policies().filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var body =
      '<div class="drawer-hero"><img src="' + typeImage(p.type) + '" alt="' + esc(p.type) + ' cover" width="460" height="300" loading="lazy"></div>' +
      '<span class="' + statusClass(p.status) + '">' + esc(p.status) + '</span><h3 style="margin:14px 0 16px;font-family:var(--display);font-size:20px;">' + esc(p.customerName) + " \u00b7 " + esc(p.type) + "</h3>" +
      '<div class="chart chart--donut" id="ag-pol-donut" role="img" aria-label="Coverage breakdown for this policy"></div>' +
      '<ul class="drawer-list" style="margin-top:16px;"><li><span class="k">Policy number</span><span class="v">' + esc(p.policyNumber) + "</span></li>" +
      '<li><span class="k">Coverage</span><span class="v">' + money(p.coverage) + "</span></li>" +
      '<li><span class="k">Premium</span><span class="v">' + money(p.premium) + " / month</span></li>" +
      '<li><span class="k">Deductible</span><span class="v">' + money(p.deductible) + "</span></li>" +
      '<li><span class="k">Started</span><span class="v">' + esc(fmtDate(p.startDate)) + "</span></li>" +
      '<li><span class="k">Renews</span><span class="v">' + esc(fmtDate(p.renewalDate)) + "</span></li>" +
      '<li><span class="k">Basis</span><span class="v">' + (p.isRenewal ? "Renewal" : "New business") + "</span></li></ul>" +
      '<div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap;"><button class="dbtn dbtn--primary" type="button" data-toast-btn="Renewal reminder sent to the client.">' + icon("clock") + "Send renewal reminder</button>" +
      '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="Policy documents are downloading.">' + icon("download") + "Documents</button></div>";
    openDrawer("Policy " + p.policyNumber, body, function (drawerEl) {
      Charts.donut(qs("#ag-pol-donut", drawerEl), ["Coverage", "Deductible", "Annual premium"], [p.coverage, p.deductible, Math.round(p.premium * 12)], { totalLabel: "Covered" });
    });
  }

  /* ---- 4. Claims queue ---- */
  function renderClaims() {
    var list = claims().slice().sort(function (a, b) { return b.ageDays - a.ageDays; });
    var byStatus = ["Submitted", "In Review", "Approved", "Paid", "Rejected"].map(function (s) { return list.filter(function (c) { return c.status === s; }).length; });
    var funnel = ["Submitted", "In Review", "Approved", "Paid"].map(function (s, i) {
      var count = list.filter(function (c) { return c.status === s || (s === "Approved" && c.status === "Paid"); }).length;
      var max = Math.max.apply(null, byStatus.concat([1]));
      return '<div class="funnel-row"><span>' + esc(s) + '</span><span class="funnel-bar" style="width:' + clamp((count / max) * 100, 5, 100) + "%;background:" + PALETTE[i % PALETTE.length] + ';opacity:0.85;"></span><span class="funnel-count">' + count + "</span></div>";
    }).join("");
    var atRisk = list.filter(function (c) { return ["Submitted", "In Review"].indexOf(c.status) !== -1 && c.ageDays >= c.slaDays; }).length;

    var rows = list.map(function (c) {
      return "<tr>" +
        cell("Claim", '<div class="dash-table__cell-main"><span class="dash-table__thumb"><img src="' + typeImage(c.type) + '" alt="" width="38" height="38" loading="lazy"></span><span><strong>' + esc(c.reference) + '</strong><br><small style="color:var(--dash-muted);">' + esc(c.customerName) + "</small></span></div>") +
        cell("Type", esc(c.type)) +
        cell("Amount", money(c.amount), true) +
        cell("Priority", '<span class="status ' + priorityClass(c.priority) + '">' + esc(c.priority) + "</span>") +
        cell("Status", '<span class="' + statusClass(c.status) + '">' + esc(c.status) + "</span>") +
        cell("Age / SLA", c.ageDays + "d / " + c.slaDays + "d", true) +
        cell("Action", '<button class="dbtn dbtn--ghost dbtn--sm" type="button" data-claim-detail="' + esc(c.id) + '">Open</button>', true) +
        "</tr>";
    }).join("");

    return pageHead({
      title: "Claims queue",
      subtitle: "Every claim assigned to you, with SLA at a glance.",
      actions: '<button class="dbtn dbtn--primary" type="button" data-toast-btn="Choose a customer to start a claim.">' + icon("plus") + "New claim"
    }) +
      '<div class="dash-grid dash-grid--4 dash-stagger" style="margin-bottom:18px;">' +
        statCard({ icon: "clipboard", label: "Open claims", value: String(openClaims().length) }) +
        statCard({ icon: "clock", label: "Awaiting decision", value: String(list.filter(function (c) { return c.status === "In Review"; }).length) }) +
        statCard({ icon: "bolt", label: "Average age", value: Math.round(sum(list, function (c) { return c.ageDays; }) / (list.length || 1)) + "d" }) +
        statCard({ icon: "trend", label: "SLA at risk", value: String(atRisk), dir: "down" }) +
      "</div>" +
      '<div class="dash-grid dash-grid--3" style="margin-bottom:18px;">' +
        chartCard({ id: "ag-clm-status", title: "Status mix", subtitle: "Where your queue stands", chartClass: "chart--donut", aria: "Doughnut chart of claims by status", summary: "Claims by status." }) +
        chartCard({ id: "ag-clm-month", title: "Claims by month", subtitle: "Approved, pending, rejected", chartClass: "chart--bar", span: "dash-span-2", aria: "Stacked bar chart of claims by month", summary: "Monthly claims queue." }) +
      "</div>" +
      '<div class="dash-grid dash-grid--2" style="margin-bottom:18px;">' +
        chartCard({ id: "ag-clm-sla", title: "Time to settle", subtitle: "Average days to decision, last 6 months", chartClass: "chart--area", aria: "Line chart of average settlement time", summary: "Average settlement time trend." }) +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Queue funnel</h3><p>From submission to payout</p></div></div><div class="funnel">' + funnel + "</div></article>" +
      "</div>" +
      '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Assigned claims</h3><p>Sorted by age</p></div></div>' +
        '<div class="dash-table-wrap"><table class="dash-table"><caption class="sr-only">Claims queue</caption><thead><tr><th scope="col">Claim</th><th scope="col">Type</th><th scope="col" class="is-num">Amount</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col" class="is-num">Age / SLA</th><th scope="col" class="is-num">Action</th></tr></thead><tbody>' + rows + "</tbody></table></div></article>";
  }

  function mountClaims(el) {
    var list = claims();
    var statuses = ["Submitted", "In Review", "Approved", "Paid", "Rejected"];
    var counts = statuses.map(function (s) { return list.filter(function (c) { return c.status === s; }).length; });
    Charts.donut(qs("#ag-clm-status", el), statuses, counts, { colors: [PALETTE[3], PALETTE[2], PALETTE[5], PALETTE[0], PALETTE[4]], totalLabel: "Claims", valueFormatter: countFmt, totalFormatter: countFmt });
    var cm = claimsMonthly(6);
    Charts.bar(qs("#ag-clm-month", el), cm.labels, [
      { name: "Approved", data: cm.approved },
      { name: "Pending", data: cm.pending },
      { name: "Rejected", data: cm.rejected }
    ], { stacked: true, colors: [PALETTE[0], PALETTE[2], PALETTE[4]], yFormatter: function (v) { return String(Math.round(v)); } });
    Charts.area(qs("#ag-clm-sla", el), monthLabels(6), [{ name: "Days to decision", data: seededTrend(state.user.id + "sla", 3.5, 6, 1.6).map(function (v) { return Math.max(1, v); }) }], { colors: [PALETTE[1]], yFormatter: function (v) { return Math.round(v) + "d"; } });

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
      '<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;"><span class="' + statusClass(c.status) + '">' + esc(c.status) + '</span><span class="status ' + priorityClass(c.priority) + '">' + esc(c.priority) + " priority</span></div>" +
      '<h3 style="margin:0 0 6px;font-family:var(--display);font-size:20px;">' + esc(c.reference) + "</h3>" +
      '<p style="color:var(--dash-muted);font-size:13px;margin:0 0 16px;">' + esc(c.customerName) + " \u00b7 " + esc(c.title) + "</p>" +
      '<ul class="drawer-list"><li><span class="k">Amount claimed</span><span class="v">' + money(c.amount) + "</span></li>" +
      '<li><span class="k">Filed</span><span class="v">' + esc(fmtDate(c.filedAt)) + "</span></li>" +
      '<li><span class="k">Age / SLA</span><span class="v">' + c.ageDays + "d / " + c.slaDays + "d</span></li>" +
      '<li><span class="k">Assigned</span><span class="v">' + esc(c.assignedTo) + "</span></li></ul>" +
      '<h4 style="margin:20px 0 12px;font-family:var(--display);">Progress</h4><div class="timeline">' + timeline + "</div>" +
      (evidence ? '<h4 style="margin:22px 0 10px;font-family:var(--display);">Evidence</h4><div class="evidence-grid">' + evidence + "</div>" : "") +
      '<div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap;"><button class="dbtn dbtn--primary" type="button" data-toast-btn="Claim ' + esc(c.reference) + ' marked as approved.">' + icon("check") + "Approve</button>" +
      '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="Claim forwarded to underwriting.">' + icon("arrow") + "Forward</button></div>";
    openDrawer("Claim " + c.reference, body);
  }

  /* ---- 5. Leads / Pipeline ---- */
  function renderLeads() {
    var by = leadsByStage();
    var stages = ["New", "Contacted", "Quoted", "Won", "Lost"];
    var totalValue = sum(leads().filter(function (l) { return ["Won", "Lost"].indexOf(l.stage) === -1; }), function (l) { return l.value; });

    var board = stages.map(function (s, i) {
      var cards = by[s].list.map(function (l) {
        return '<article class="ag-kanban-card" style="border-left-color:' + PALETTE[i % PALETTE.length] + ';" data-lead-card="' + esc(l.id) + '">' +
          "<strong>" + esc(l.name) + "</strong>" +
          (l.company ? "<small>" + esc(l.company) + "</small>" : "<small>" + esc(l.product) + " cover</small>") +
          '<span class="ag-value">' + money(l.value) + "</span>" +
          '<div class="ag-kanban-meta"><span class="chip">' + esc(l.source) + '</span><span style="color:var(--dash-muted);font-size:11px;">' + esc(relTime(l.updatedAt)) + "</span></div>" +
          '<div class="ag-kanban-actions"><button type="button" data-lead-move="prev" data-lead-id="' + esc(l.id) + '" aria-label="Move ' + esc(l.name) + ' back a stage">' + icon("chevron", "ag-flip") + "</button>" +
          '<button type="button" data-lead-move="next" data-lead-id="' + esc(l.id) + '" aria-label="Move ' + esc(l.name) + ' forward a stage">' + icon("chevron") + "</button></div></article>";
      }).join("");
      return '<div class="ag-kanban-col"><div class="ag-kanban-head"><div><strong>' + esc(s) + '</strong><span class="ag-kanban-value">' + moneyShort(by[s].value) + '</span></div><span class="ag-count">' + by[s].count + '</span></div><div class="ag-kanban-list">' + (cards || '<p class="ag-kanban-empty">No leads here yet.</p>') + "</div></div>";
    }).join("");

    return pageHead({
      title: "Leads & pipeline",
      subtitle: "Move opportunities from first contact to won.",
      actions: '<button class="dbtn dbtn--primary" type="button" data-toast-btn="A new lead form is ready.">' + icon("plus") + "Add lead</button>"
    }) +
      '<div class="dash-grid dash-grid--4 dash-stagger" style="margin-bottom:18px;">' +
        statCard({ icon: "trend", label: "Open pipeline value", value: moneyShort(totalValue) }) +
        statCard({ icon: "check", label: "Won this month", value: String(by.Won.count) }) +
        statCard({ icon: "bolt", label: "Win rate", value: winRate() + "%" }) +
        statCard({ icon: "dollar", label: "Average deal", value: moneyShort(Math.round(sum(leads(), function (l) { return l.value; }) / (leads().length || 1))) }) +
      "</div>" +
      '<div class="dash-grid dash-grid--3" style="margin-bottom:18px;">' +
        chartCard({ id: "ag-lead-funnel", title: "Pipeline funnel", subtitle: "Lead count by stage", chartClass: "chart--bar", span: "dash-span-2", aria: "Bar chart of leads by pipeline stage", summary: "Leads per pipeline stage." }) +
        chartCard({ id: "ag-lead-win", title: "Win rate", subtitle: "Won vs lost", chartClass: "chart--donut", aria: "Doughnut chart of won and lost leads", summary: "Won versus lost leads." }) +
      "</div>" +
      '<div class="ag-kanban" role="group" aria-label="Leads pipeline board">' + board + "</div>";
  }

  function mountLeads(el) {
    var by = leadsByStage();
    var stages = ["New", "Contacted", "Quoted", "Won", "Lost"];
    Charts.bar(qs("#ag-lead-funnel", el), stages, [{ name: "Leads", data: stages.map(function (s) { return by[s].count; }) }], { colors: [PALETTE[0]], yFormatter: function (v) { return String(Math.round(v)); } });
    Charts.donut(qs("#ag-lead-win", el), ["Won", "Lost"], [by.Won.count, by.Lost.count], { colors: [PALETTE[0], PALETTE[4]], totalLabel: "Leads", valueFormatter: countFmt, totalFormatter: countFmt });

    qsa("[data-lead-move]", el).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.leadId;
        var dir = btn.dataset.leadMove === "next" ? 1 : -1;
        var list = leads();
        var lead = list.filter(function (l) { return l.id === id; })[0];
        if (!lead) return;
        var index = stages.indexOf(lead.stage);
        var nextIndex = clamp(index + dir, 0, stages.length - 1);
        if (nextIndex === index) { toast(lead.name + " is already at the " + stages[index] + " stage."); return; }
        lead.stage = stages[nextIndex];
        lead.updatedAt = new Date().toISOString();
        Store.updateAgentData(state.user.id, { leads: list });
        toast(lead.name + " moved to " + lead.stage + ".");
        renderRoute("leads");
      });
    });
  }

  /* ---- 6. Commissions ---- */
  function renderCommissions() {
    var list = commissions().slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    var paid = sum(list.filter(function (c) { return c.status === "Paid"; }), function (c) { return c.amount; });
    var pending = sum(list.filter(function (c) { return c.status === "Pending"; }), function (c) { return c.amount; });
    var rows = list.map(function (c) {
      return "<tr>" +
        cell("Date", esc(fmtDate(c.date, { month: "short", day: "numeric", year: "numeric" }))) +
        cell("Client", "<strong>" + esc(c.customerName) + "</strong>") +
        cell("Product", esc(c.productType)) +
        cell("Premium", money(c.premium), true) +
        cell("Rate", Math.round(c.rate * 100) + "%", true) +
        cell("Status", '<span class="' + statusClass(c.status) + '">' + esc(c.status) + "</span>") +
        cell("Amount", money(c.amount), true) +
        cell("Statement", '<button class="dbtn dbtn--ghost dbtn--sm" type="button" data-toast-btn="Statement ' + esc(c.statement) + ' downloading.">' + icon("download") + " Statement</button>", true) +
        "</tr>";
    }).join("");
    var mix = productMix();
    var mixLabels = Object.keys(mix);

    return pageHead({
      title: "Commissions",
      subtitle: "What you have earned, what is pending, and when it lands.",
      actions: '<button class="dbtn dbtn--primary" type="button" data-toast-btn="Your commission statement is downloading.">' + icon("download") + "Download statement</button>"
    }) +
      '<div class="dash-grid dash-grid--4 dash-stagger" style="margin-bottom:18px;">' +
        statCard({ icon: "dollar", label: "Earned (12 months)", value: moneyShort(sum(list, function (c) { return c.amount; })) }) +
        statCard({ icon: "check", label: "Paid", value: moneyShort(paid) }) +
        statCard({ icon: "clock", label: "Pending", value: moneyShort(pending) }) +
        statCard({ icon: "trend", label: "This month", value: moneyShort(commissionSeries(1)[0]) }) +
      "</div>" +
      '<div class="dash-grid dash-grid--3" style="margin-bottom:18px;">' +
        chartCard({ id: "ag-com-trend", title: "Earnings over time", subtitle: "Commission by month", chartClass: "chart--bar", span: "dash-span-2", aria: "Bar chart of commission earnings by month", summary: "Monthly commission earnings." }) +
        chartCard({ id: "ag-com-mix", title: "By product line", subtitle: "Where commission comes from", chartClass: "chart--donut", aria: "Doughnut chart of commission by product line", summary: "Commission mix by product." }) +
      "</div>" +
      '<article class="dash-card dash-card-pad" style="margin-bottom:18px;"><div class="dash-card-head"><div><h3>Payout schedule</h3><p>Next payouts</p></div></div>' +
        '<ul style="list-style:none;margin:0;padding:0;">' + list.filter(function (c) { return c.status !== "Paid"; }).slice(0, 4).map(function (c) {
          return '<li class="ag-list-row"><span class="activity-ico">' + icon("dollar") + '</span><span class="ag-list-body"><strong>' + money(c.amount) + " \u00b7 " + esc(c.customerName) + "</strong><small>" + esc(c.statement) + " \u00b7 " + esc(fmtDate(c.date, { month: "short", day: "numeric" })) + '</small></span><span class="' + statusClass(c.status) + '">' + esc(c.status) + "</span></li>";
        }).join("") + "</ul></article>" +
      '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Commission entries</h3><p>Your full ledger</p></div></div>' +
        '<div class="dash-table-wrap"><table class="dash-table"><caption class="sr-only">Commission entries</caption><thead><tr><th scope="col">Date</th><th scope="col">Client</th><th scope="col">Product</th><th scope="col" class="is-num">Premium</th><th scope="col" class="is-num">Rate</th><th scope="col">Status</th><th scope="col" class="is-num">Amount</th><th scope="col" class="is-num">Statement</th></tr></thead><tbody>' + rows + "</tbody></table></div></article>";
  }

  function mountCommissions(el) {
    Charts.bar(qs("#ag-com-trend", el), monthLabels(12), [{ name: "Commission", data: commissionSeries() }], { colors: [PALETTE[0]] });
    var mix = productMix();
    var labels = Object.keys(mix);
    Charts.donut(qs("#ag-com-mix", el), labels, labels.map(function (k) { return mix[k]; }), { colors: labels.map(typeColor), totalLabel: "Earned" });
  }

  /* ---- 7. Appointments ---- */
  function renderAppointments() {
    var list = appointments().slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    var thisWeek = list.filter(function (a) { return (new Date(a.date) - Date.now()) / 86400000 <= 7; }).length;
    var rows = list.map(function (a) {
      return '<li class="ag-list-row ag-appt"><span class="activity-ico">' + icon(a.mode === "Video call" ? "chat" : a.mode === "Phone call" ? "clock" : "user") + '</span>' +
        '<span class="ag-list-body"><strong>' + esc(a.title) + " \u00b7 " + esc(a.customerName) + "</strong><small>" + esc(fmtDate(a.date, { weekday: "short", month: "short", day: "numeric" })) + " \u00b7 " + esc(a.time) + " \u00b7 " + esc(a.mode) + " \u00b7 " + esc(a.location) + '</small></span>' +
        '<span class="' + statusClass("Active") + '">' + esc(a.status) + '</span><button class="dbtn dbtn--ghost dbtn--sm" type="button" data-toast-btn="Reminder set for ' + esc(a.customerName) + '.">Remind</button></li>';
    }).join("");

    return pageHead({
      title: "Appointments",
      subtitle: "Your upcoming meetings and follow-ups.",
      actions: '<button class="dbtn dbtn--primary" type="button" data-toast-btn="Choose a client to book a meeting.">' + icon("plus") + "Book meeting</button>"
    }) +
      '<div class="dash-grid dash-grid--4 dash-stagger" style="margin-bottom:18px;">' +
        statCard({ icon: "clock", label: "This week", value: String(thisWeek) }) +
        statCard({ icon: "user", label: "Total upcoming", value: String(list.length) }) +
        statCard({ icon: "chat", label: "Video calls", value: String(list.filter(function (a) { return a.mode === "Video call"; }).length) }) +
        statCard({ icon: "trend", label: "In person", value: String(list.filter(function (a) { return a.mode === "In person"; }).length) }) +
      "</div>" +
      chartCard({ id: "ag-appt-week", title: "Meetings per week", subtitle: "Scheduled activity over six weeks", chartClass: "chart--bar", aria: "Bar chart of meetings per week", summary: "Meetings per week." }) +
      '<article class="dash-card dash-card-pad" style="margin-top:18px;"><div class="dash-card-head"><div><h3>Upcoming</h3><p>Next appointments and reminders</p></div></div><ul style="list-style:none;margin:0;padding:0;">' + rows + "</ul></article>";
  }

  function mountAppointments(el) {
    var labels = ["6w ago", "5w ago", "4w ago", "3w ago", "2w ago", "This week"];
    Charts.bar(qs("#ag-appt-week", el), labels, [{ name: "Meetings", data: seededTrend(state.user.id + "appt", 6, 6, 4).map(function (v) { return Math.max(1, v); }) }], { colors: [PALETTE[1]], yFormatter: function (v) { return String(Math.round(v)); } });
  }

  /* ---- 8. Messages ---- */
  function renderMessages() {
    var list = messages();
    var unread = list.filter(function (m) { return m.unread; }).length;
    var items = list.map(function (m, i) {
      return '<button class="ag-msg-item' + (i === 0 ? " is-active" : "") + (m.unread ? " is-unread" : "") + '" type="button" data-msg-id="' + esc(m.id) + '">' +
        avatarMarkup({ fullName: m.customerName, avatar: m.avatar }, "dash-avatar--sm") +
        '<span class="ag-msg-meta"><strong>' + esc(m.customerName) + '</strong><span class="ag-msg-preview">' + esc(m.preview) + '</span></span>' +
        (m.unread ? '<span class="ag-msg-dot" aria-label="Unread"></span>' : "") + "</button>";
    }).join("");

    return pageHead({
      title: "Messages",
      subtitle: "Conversations with your clients, in one place.",
      actions: '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="All conversations marked as read.">' + icon("check") + "Mark all read"
    }) +
      '<div class="dash-grid dash-grid--4 dash-stagger" style="margin-bottom:18px;">' +
        statCard({ icon: "chat", label: "Unread", value: String(unread) }) +
        statCard({ icon: "user", label: "Conversations", value: String(list.length) }) +
        statCard({ icon: "clock", label: "Avg. response", value: "4 min" }) +
        statCard({ icon: "check", label: "Resolved this week", value: "9" }) +
      "</div>" +
      '<div class="ag-msg-layout"><article class="dash-card dash-card-pad"><div class="ag-msg-list" data-msg-list>' + items + "</div></article>" +
      '<article class="dash-card dash-card-pad"><div data-msg-panel></div></article></div>';
  }

  function renderThread(container, message) {
    var bubbles = message.thread.map(function (t) {
      return '<div class="ag-bubble' + (t.from === "you" ? " is-you" : "") + '">' + esc(t.text) + "<time>" + esc(relTime(t.time)) + "</time></div>";
    }).join("");
    container.innerHTML =
      '<div class="ag-thread-head">' + avatarMarkup({ fullName: message.customerName, avatar: message.avatar }, "dash-avatar") +
      '<div class="ag-thread-head-body"><strong>' + esc(message.customerName) + "</strong><small>" + esc(message.subject) + "</small></div></div>" +
      '<div class="ag-thread">' + bubbles + "</div>" +
      '<form class="ag-composer" data-msg-composer><label class="sr-only" for="ag-msg-input">Write a reply</label><input class="dash-input" id="ag-msg-input" type="text" placeholder="Write a reply\u2026"><button class="dbtn dbtn--primary" type="submit">' + icon("arrow") + "Send</button></form>";
    var form = qs("[data-msg-composer]", container);
    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = qs("#ag-msg-input", container);
        if (!input.value.trim()) return;
        message.thread.push({ from: "you", text: input.value.trim(), time: new Date().toISOString() });
        input.value = "";
        toast("Reply sent to " + message.customerName + ".");
        renderThread(container, message);
      });
    }
  }

  function mountMessages(el) {
    var list = messages();
    var panel = qs("[data-msg-panel]", el);
    if (list.length) renderThread(panel, list[0]);
    qsa("[data-msg-id]", el).forEach(function (btn) {
      btn.addEventListener("click", function () {
        qsa("[data-msg-id]", el).forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        var message = list.filter(function (m) { return m.id === btn.dataset.msgId; })[0];
        if (message) { message.unread = false; renderThread(panel, message); }
      });
    });
  }

  /* ---- 9. Reports ---- */
  function renderReports() {
    var region = regionMix();
    var regionLabels = Object.keys(region).sort(function (a, b) { return region[b] - region[a]; }).slice(0, 8);
    return pageHead({
      title: "Reports",
      subtitle: "Deeper analytics across your book and pipeline.",
      actions: '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="CSV export is downloading.">' + icon("download") + "Export CSV</button>" +
        '<button class="dbtn dbtn--primary" type="button" data-toast-btn="A PDF report is being generated.">' + icon("file") + "Export PDF</button>"
    }) +
      '<div class="dash-grid dash-grid--2" style="margin-bottom:18px;">' +
        chartCard({ id: "ag-rep-rev", title: "Revenue vs target", subtitle: "Premium written against monthly target", chartClass: "chart--bar", aria: "Bar chart of revenue versus target", summary: "Monthly revenue against target." }) +
        chartCard({ id: "ag-rep-mix", title: "Product mix", subtitle: "Commission by product line", chartClass: "chart--donut", aria: "Doughnut chart of commission by product line", summary: "Commission product mix." }) +
      "</div>" +
      '<div class="dash-grid dash-grid--2" style="margin-bottom:18px;">' +
        chartCard({ id: "ag-rep-region", title: "Premium by city", subtitle: "Salem and across the region", chartClass: "chart--hbar", aria: "Horizontal bar chart of premium by city", summary: "Premium by city." }) +
        chartCard({ id: "ag-rep-conv", title: "Conversion trend", subtitle: "Won deals over six months", chartClass: "chart--area", aria: "Line chart of conversion trend", summary: "Conversion trend." }) +
      "</div>" +
      '<div class="dash-grid dash-grid--3">' +
        statCard({ icon: "trend", label: "Avg. premium per policy", value: money(Math.round(sum(policies(), function (p) { return p.premium; }) / (policies().length || 1))) }) +
        statCard({ icon: "user", label: "Avg. policies per client", value: (sum(clients(), function (c) { return c.policiesCount; }) / (activeClients().length || 1)).toFixed(1) }) +
        statCard({ icon: "dollar", label: "Avg. commission per policy", value: money(Math.round(sum(commissions(), function (c) { return c.amount; }) / (commissions().length || 1))) }) +
      "</div>";
  }

  function mountReports(el) {
    var target = targets().premiumMonthly || 0;
    var actual = premiumSeries(12);
    Charts.bar(qs("#ag-rep-rev", el), monthLabels(12), [
      { name: "Actual", data: actual },
      { name: "Target", data: actual.map(function () { return target; }) }
    ], { colors: [PALETTE[0], PALETTE[3]] });
    var mix = productMix();
    var labels = Object.keys(mix);
    Charts.donut(qs("#ag-rep-mix", el), labels, labels.map(function (k) { return mix[k]; }), { colors: labels.map(typeColor), totalLabel: "Earned" });
    var region = regionMix();
    var cities = Object.keys(region).sort(function (a, b) { return region[b] - region[a]; }).slice(0, 8);
    Charts.hbar(qs("#ag-rep-region", el), cities, cities.map(function (c) { return region[c] * 12; }), { name: "Annual premium" });
    Charts.area(qs("#ag-rep-conv", el), monthLabels(6), [{ name: "Won deals", data: seededTrend(state.user.id + "won", 3, 6, 2.4).map(function (v) { return Math.max(0, v); }) }], { colors: [PALETTE[2]], yFormatter: function (v) { return String(Math.round(v)); } });
  }

  /* ---- 10. Profile ---- */
  function field(label, id, value, type, required, full) {
    return '<div class="dash-field' + (full ? " is-full" : "") + '"><label for="' + id + '">' + esc(label) + '</label><input class="dash-input" id="' + id + '" type="' + (type || "text") + '" value="' + esc(value || "") + '"' + (required ? " required" : "") + "></div>";
  }
  function agentCompletion() {
    var u = state.user;
    var p = u.profile || {};
    var fields = [u.fullName, u.email, u.phone, u.country, u.agencyId, p.dateOfBirth, p.address, p.city, p.occupation];
    var filled = fields.filter(function (v) { return v && String(v).trim(); }).length;
    return Math.round((filled / fields.length) * 100);
  }

  function renderProfile() {
    var u = state.user;
    var p = u.profile || {};
    return pageHead({
      title: "Agent profile",
      subtitle: "Your details, credentials, and how clients see you.",
      actions: '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="Your profile is up to date.">' + icon("check") + "All changes saved"
    }) +
      '<div class="dash-grid dash-grid--3" style="margin-bottom:18px;">' +
        chartCard({ id: "ag-prof-radial", title: "Profile completion", subtitle: "Add details to reach 100%", chartClass: "chart--radial", aria: "Radial chart showing profile completion " + agentCompletion() + " percent", summary: "Profile is " + agentCompletion() + "% complete." }) +
        '<article class="dash-card dash-card-pad dash-span-2" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">' +
          avatarMarkup(u, "dash-avatar--lg") +
          '<div style="min-width:220px;flex:1;"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><h2 style="margin:0;font-family:var(--display);font-size:24px;">' + esc(u.fullName) + '</h2><span class="role-badge role-badge--agent">' + icon("shield") + "Agent</span></div>" +
          '<p style="margin:8px 0 0;color:var(--dash-muted);font-size:13px;">' + esc(u.email) + (u.phone ? " \u00b7 " + esc(u.phone) : "") + "</p>" +
          '<div style="display:flex;gap:22px;margin-top:14px;flex-wrap:wrap;"><span><small style="display:block;color:var(--dash-muted);font-size:11px;">Agency / license ID</small><strong>' + esc(u.agencyId || state.data.agencyId) + "</strong></span>" +
          '<span><small style="display:block;color:var(--dash-muted);font-size:11px;">Region</small><strong>' + esc((state.data.region || {}).city || u.country || "\u2014") + "</strong></span>" +
          '<span><small style="display:block;color:var(--dash-muted);font-size:11px;">Member since</small><strong>' + esc(fmtDate(u.createdAt, { month: "long", year: "numeric" })) + "</strong></span></div></div></article>" +
      "</div>" +
      '<div class="dash-grid dash-grid--2">' +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Agent details</h3><p>Update your professional profile</p></div></div>' +
          '<form data-agent-form><div class="dash-form-grid">' +
            field("Full name", "agent-name", u.fullName, "text", true) +
            field("Email address", "agent-email", u.email, "email", true) +
            field("Phone number", "agent-phone", u.phone, "tel") +
            field("Country / region", "agent-country", u.country, "text") +
            field("License / agency ID", "agent-agency", u.agencyId || state.data.agencyId, "text") +
            field("Occupation", "agent-occupation", p.occupation || "Insurance advisor", "text") +
            field("Address", "agent-address", p.address, "text", false, true) +
            field("City", "agent-city", p.city || (state.data.region || {}).city, "text") +
            field("Postal code", "agent-postal", p.postalCode, "text") +
          "</div>" +
          '<div style="margin-top:18px;"><button class="dbtn dbtn--primary" type="submit">' + icon("check") + "Save changes</button></div></form></article>" +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Password &amp; security</h3><p>Keep your account protected</p></div></div>' +
          '<p style="color:var(--dash-muted);font-size:13px;line-height:1.6;">For your security, passwords are never stored in this demo. In production this triggers a secure, server-side password change.</p>' +
          '<form data-agent-password style="margin-top:16px;"><div class="dash-form-grid"><div class="dash-field is-full"><label for="ag-pw-current">Current password</label><input class="dash-input" id="ag-pw-current" type="password" autocomplete="current-password"></div>' +
          '<div class="dash-field"><label for="ag-pw-new">New password</label><input class="dash-input" id="ag-pw-new" type="password" autocomplete="new-password"></div>' +
          '<div class="dash-field"><label for="ag-pw-confirm">Confirm new password</label><input class="dash-input" id="ag-pw-confirm" type="password" autocomplete="new-password"></div></div>' +
          '<p data-ag-pw-status role="status" style="min-height:18px;margin:10px 0 0;font-size:12px;color:var(--dash-danger);"></p>' +
          '<div style="margin-top:8px;"><button class="dbtn dbtn--primary" type="submit">' + icon("check") + "Update password</button></div></form></article>" +
      "</div>";
  }

  function mountProfile(el) {
    Charts.radial(qs("#ag-prof-radial", el), agentCompletion(), { label: "Complete", color: PALETTE[0] });
    var form = qs("[data-agent-form]", el);
    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var patch = {
          fullName: qs("#agent-name", el).value.trim(),
          email: qs("#agent-email", el).value.trim().toLowerCase(),
          phone: qs("#agent-phone", el).value.trim(),
          country: qs("#agent-country", el).value.trim(),
          agencyId: qs("#agent-agency", el).value.trim(),
          profile: {
            occupation: qs("#agent-occupation", el).value.trim(),
            address: qs("#agent-address", el).value.trim(),
            city: qs("#agent-city", el).value.trim(),
            postalCode: qs("#agent-postal", el).value.trim()
          }
        };
        var updated = Store.updateUser(state.user.id, patch);
        if (updated) { state.user = updated; hydrateShell(); }
        toast("Profile updated. Thank you.");
      });
    }
    var pwForm = qs("[data-agent-password]", el);
    if (pwForm) {
      pwForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var next = qs("#ag-pw-new", el).value;
        var confirm = qs("#ag-pw-confirm", el).value;
        var status = qs("[data-ag-pw-status]", el);
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

  /* ---- 11. Settings ---- */
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
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Accessibility</h3><p>Make the workspace feel right</p></div></div>' +
          toggleRow("Reduce motion", "Soften animations and transitions", "reduceMotion", prefs.reduceMotion) +
          toggleRow("Larger text", "Increase the base text size", "largeText", prefs.largeText) +
        "</article>" +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Notifications</h3><p>Decide what reaches you</p></div></div>' +
          toggleRow("Email updates", "Lead and policy activity by email", "emailUpdates", prefs.emailUpdates) +
          toggleRow("SMS alerts", "Time-sensitive claim alerts by text", "smsAlerts", prefs.smsAlerts) +
          toggleRow("Claim alerts", "Every change in your claims queue", "claimAlerts", prefs.claimAlerts) +
          toggleRow("Pipeline digest", "A daily summary of your leads", "productNews", prefs.productNews) +
        "</article>" +
        '<article class="dash-card dash-card-pad"><div class="dash-card-head"><div><h3>Agency &amp; account</h3><p>Credentials and sessions</p></div></div>' +
          '<ul class="drawer-list"><li><span class="k">Agent</span><span class="v">' + esc(state.user.fullName) + '</span></li>' +
          '<li><span class="k">Agency / license ID</span><span class="v">' + esc(state.user.agencyId || state.data.agencyId) + '</span></li>' +
          '<li><span class="k">Region</span><span class="v">' + esc((state.data.region || {}).city || "\u2014") + ", " + esc((state.data.region || {}).country || "") + "</span></li></ul>" +
          '<p style="color:var(--dash-muted);font-size:13px;line-height:1.7;margin-top:14px;">This dashboard is a client-side demo. In production, sessions are issued and revoked server-side.</p>' +
          '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;"><button class="dbtn dbtn--primary" type="button" data-logout>' + icon("logout") + "Sign out</button>" +
          '<button class="dbtn dbtn--ghost" type="button" data-toast-btn="Demo data reset for this browser.">' + icon("gear") + "Reset demo data</button></div></article>" +
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
   * View registry + router
   * ====================================================================== */
  var VIEWS = {
    overview: { title: "Overview", render: renderOverview, mount: mountOverview },
    customers: { title: "Customers", render: renderCustomers, mount: mountCustomers },
    policies: { title: "Policies", render: renderPolicies, mount: mountPolicies },
    claims: { title: "Claims Queue", render: renderClaims, mount: mountClaims },
    leads: { title: "Leads & Pipeline", render: renderLeads, mount: mountLeads },
    commissions: { title: "Commissions", render: renderCommissions, mount: mountCommissions },
    appointments: { title: "Appointments", render: renderAppointments, mount: mountAppointments },
    messages: { title: "Messages", render: renderMessages, mount: mountMessages },
    reports: { title: "Reports", render: renderReports, mount: mountReports },
    profile: { title: "Profile", render: renderProfile, mount: mountProfile },
    settings: { title: "Settings", render: renderSettings, mount: mountSettings }
  };

  function routeFromHash() {
    return window.location.hash.replace(/^#\/?/, "").split("?")[0] || "overview";
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
    doc.title = VIEWS[route].title + " | Stackly Agent Dashboard";
    var announcer = qs("[data-route-announcer]");
    var finish = function () {
      var view = VIEWS[route];
      Charts.destroyAll();
      viewEl.innerHTML = view.render();
      viewEl.setAttribute("aria-busy", "false");
      viewEl.classList.remove("is-entering");
      if (!reduceMotion()) { void viewEl.offsetWidth; viewEl.classList.add("is-entering"); }
      try {
        view.mount(viewEl);
        animateStatValues(viewEl);
        hydrateShell();
      } catch (e) { console.error("[Stackly] agent view mount failed", e); }
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
   * Shell wiring (reuses the same shell markup/classes as the customer app)
   * ====================================================================== */
  function hydrateShell() {
    var u = state.user;
    var initials = Store.initials(u.fullName);
    qsa("[data-user-name]").forEach(function (n) { n.textContent = u.fullName; });
    qsa("[data-user-email]").forEach(function (n) { n.textContent = u.email; });
    qsa("[data-user-role]").forEach(function (n) { n.textContent = "Agent"; });
    qsa("[data-user-initials]").forEach(function (n) { n.textContent = initials; });
    qsa("[data-user-agency]").forEach(function (n) { n.textContent = u.agencyId || state.data.agencyId; });
    qsa("[data-user-avatar-wrap]").forEach(function (n) {
      if (u.avatar) { n.innerHTML = '<img src="' + esc(u.avatar) + '" alt="' + esc(u.fullName) + '" width="42" height="42">'; }
      else { n.textContent = initials; }
    });
    var unread = messages().filter(function (m) { return m.unread; }).length;
    var dot = qs("[data-notif-dot]");
    var notifCount = notifications().filter(function (n) { return !n.read; }).length;
    if (dot) { dot.textContent = String(notifCount + unread); dot.hidden = (notifCount + unread) === 0; }
    var badge = qs("[data-nav-badge]");
    if (badge) { badge.textContent = String(openClaims().length); badge.hidden = openClaims().length === 0; }
  }

  function renderNotifications() {
    var panel = qs("[data-notif-panel]");
    if (!panel) return;
    var list = notifications();
    panel.innerHTML = '<div class="dash-panel-head"><strong>Notifications</strong><button type="button" class="chip" data-notif-readall>Mark all read</button></div>' +
      '<div class="dash-panel-list">' + (list.length ? list.map(function (n) {
        return '<div class="dash-panel-item' + (n.read ? "" : " is-unread") + '"><span class="dash-panel-icon">' + icon(n.type === "claim" ? "clipboard" : n.type === "lead" ? "trend" : n.type === "commission" ? "dollar" : "shield") + '</span><div><strong>' + esc(n.title) + "</strong><p>" + esc(n.body) + "</p><time>" + esc(relTime(n.time)) + "</time></div></div>";
      }).join("") : '<div class="dash-panel-item"><div><p>No notifications right now.</p></div></div>') + "</div>";
    var readAll = qs("[data-notif-readall]", panel);
    if (readAll) readAll.addEventListener("click", function () {
      list.forEach(function (n) { n.read = true; });
      Store.updateAgentData(state.user.id, { notifications: list });
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
  function logoutNow() { Store.clearSession("agent"); window.location.href = "login.html"; }

  function bindShell() {
    var sidebar = qs("[data-dash-sidebar]");
    var backdrop = qs("[data-sidebar-backdrop]");
    function openMobile() { sidebar.classList.add("is-open"); backdrop.hidden = false; window.requestAnimationFrame(function () { backdrop.classList.add("is-open"); }); }
    function closeMobile() { sidebar.classList.remove("is-open"); backdrop.classList.remove("is-open"); window.setTimeout(function () { backdrop.hidden = true; }, 220); }
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

    var themeBtn = qs("[data-theme-toggle]");
    if (themeBtn) themeBtn.addEventListener("click", function () { setTheme(app.getAttribute("data-theme") === "dark" ? "light" : "dark"); });

    var notifToggle = qs("[data-notif-toggle]"), notifPanel = qs("[data-notif-panel]");
    if (notifToggle && notifPanel) {
      notifToggle.addEventListener("click", function (event) {
        event.stopPropagation();
        var open = notifPanel.hidden;
        closeAllPanels();
        notifPanel.hidden = !open;
        notifToggle.setAttribute("aria-expanded", String(open));
      });
    }
    var userToggle = qs("[data-user-toggle]"), userPanel = qs("[data-user-panel]");
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
      if (!event.target.closest("[data-notif-panel]") && !event.target.closest("[data-notif-toggle]") && !event.target.closest("[data-user-panel]") && !event.target.closest("[data-user-toggle]")) closeAllPanels();
    });
    doc.addEventListener("keydown", function (event) { if (event.key === "Escape") closeAllPanels(); });

    var search = qs("[data-global-search]");
    if (search) {
      search.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = qs("input", search);
        var term = (input.value || "").trim().toLowerCase();
        if (!term) return;
        var found = null;
        clients().forEach(function (c) { if (!found && (c.name + c.email + c.city).toLowerCase().indexOf(term) !== -1) found = { view: "customers", label: c.name }; });
        policies().forEach(function (p) { if (!found && (p.policyNumber + p.customerName).toLowerCase().indexOf(term) !== -1) found = { view: "policies", label: p.policyNumber }; });
        claims().forEach(function (c) { if (!found && (c.reference + c.customerName).toLowerCase().indexOf(term) !== -1) found = { view: "claims", label: c.reference }; });
        leads().forEach(function (l) { if (!found && l.name.toLowerCase().indexOf(term) !== -1) found = { view: "leads", label: l.name }; });
        if (found) { window.location.hash = "#/" + found.view; toast("Found: " + found.label); }
        else { toast("No matches for \u201C" + term + "\u201D. Try a client, policy, claim, or lead.", true); }
      });
    }

    doc.addEventListener("click", function (event) {
      var toastTrigger = event.target.closest("[data-toast-btn]");
      if (toastTrigger) { event.preventDefault(); toast(toastTrigger.dataset.toastBtn); }
      var logout = event.target.closest("[data-logout]");
      if (logout) { event.preventDefault(); logoutNow(); }
    });

    window.addEventListener("hashchange", function () { renderRoute(routeFromHash()); });
  }

  function renderGuard() {
    app.outerHTML = '<div class="dash-guard" data-theme="light"><div class="dash-guard-card">' +
      '<img src="assets/images/dashboard/empty-state.webp" alt="" width="260" height="180">' +
      "<h1>This is the Agent workspace</h1>" +
      "<p>You are signed in as a Customer. The Agent console is reserved for Stackly partners. Head to your customer dashboard to manage your own cover, or sign out to switch accounts.</p>" +
      '<div class="dash-guard-actions"><a class="dbtn dbtn--primary" href="customer-dashboard.html">' + icon("arrow") + "Go to my customer dashboard</a>" +
      '<button class="dbtn dbtn--ghost" type="button" data-logout>' + icon("logout") + "Sign out</button></div></div></div>";
    qsa("[data-logout]").forEach(function (b) { b.addEventListener("click", logoutNow); });
  }

  /* ====================================================================== *
   * Boot
   * ====================================================================== */
  function boot() {
    /* Resolve the agent profile from localStorage: an agent session, a
       matching signed-up agent, or a seeded demo agent. No backend/auth wall
       so the Agent dashboard can always be opened (even alongside the
       customer dashboard in another tab). */
    state.user = Store.getDashboardUser ? Store.getDashboardUser("agent") : Store.getSession();
    if (!state.user) {
      window.location.replace("login.html?next=agent-dashboard.html");
      return;
    }
    state.data = Store.ensureAgentData(state.user);

    var ui = Store.getUI();
    if (ui.collapsed && window.innerWidth > 1024) app.classList.add("is-collapsed");

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
  }

  window.StacklyAgent = { VIEWS: VIEWS, route: function () { return state.route; } };

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
