/* ==========================================================================
   Stackly data layer (store.js)
   Single source of truth for users, session, preferences, and per-user demo
   data. Shared by the auth pages and the role-based dashboards.

   Security notes:
   - Passwords / credentials are NEVER read or written here.
   - All persistence is client-side localStorage and is for demo purposes only.
     In production, identity must be verified server-side (documented in README).
   ========================================================================== */
(function (window) {
  "use strict";

  var KEYS = {
    users: "stackly.users",
    session: "stackly.session",
    roleSessions: "stackly.session.roles",
    data: "stackly.data",
    agentData: "stackly.agentData",
    ui: "stackly.ui"
  };

  /* ------------------------------------------------------------------ *
   * Storage helpers
   * ------------------------------------------------------------------ */
  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      var parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  /* ------------------------------------------------------------------ *
   * Users
   * ------------------------------------------------------------------ */
  function normalizeUser(input) {
    input = input || {};
    var now = new Date().toISOString();
    var fullName = String(input.fullName || "").replace(/\s+/g, " ").trim() || "Stackly Member";
    var parts = fullName.split(" ");

    return {
      id: input.id || uid("usr"),
      fullName: fullName,
      email: String(input.email || "").trim().toLowerCase(),
      phone: String(input.phone || "").trim(),
      country: String(input.country || "").trim(),
      role: input.role === "agent" ? "agent" : "customer",
      createdAt: input.createdAt || now,
      policyInterest: String(input.policyInterest || "").trim(),
      agencyId: String(input.agencyId || "").trim(),
      avatar: input.avatar || "",
      profile: Object.assign({
        firstName: parts[0] || "",
        lastName: parts.length > 1 ? parts[parts.length - 1] : "",
        dateOfBirth: "",
        address: "",
        city: "",
        postalCode: "",
        occupation: "",
        preferredContact: "Email"
      }, input.profile || {}),
      prefs: Object.assign({
        theme: "system",
        emailUpdates: true,
        smsAlerts: true,
        claimAlerts: true,
        productNews: false,
        reduceMotion: false,
        largeText: false
      }, input.prefs || {})
    };
  }

  function getUsers() {
    var list = readJSON(KEYS.users, []);
    return Array.isArray(list) ? list : [];
  }

  function saveUsers(list) {
    return writeJSON(KEYS.users, list);
  }

  function getUserById(id) {
    if (!id) {
      return null;
    }
    return getUsers().filter(function (user) {
      return user.id === id;
    })[0] || null;
  }

  function getUserByEmail(email) {
    var target = String(email || "").trim().toLowerCase();
    if (!target) {
      return null;
    }
    return getUsers().filter(function (user) {
      return user.email === target;
    })[0] || null;
  }

  function createUser(input) {
    var user = normalizeUser(input);
    var users = getUsers();

    if (user.email) {
      var existing = getUserByEmail(user.email);
      if (existing) {
        return existing;
      }
    }

    users.push(user);
    saveUsers(users);
    return user;
  }

  function updateUser(id, patch) {
    var users = getUsers();
    var index = -1;

    users.forEach(function (user, i) {
      if (user.id === id) {
        index = i;
      }
    });

    if (index === -1) {
      return null;
    }

    var current = users[index];
    var next = Object.assign({}, current, patch || {});
    next.profile = Object.assign({}, current.profile || {}, (patch && patch.profile) || {});
    next.prefs = Object.assign({}, current.prefs || {}, (patch && patch.prefs) || {});
    if (patch && patch.fullName) {
      var parts = String(patch.fullName).replace(/\s+/g, " ").trim().split(" ");
      next.profile.firstName = parts[0] || next.profile.firstName;
      next.profile.lastName = parts.length > 1 ? parts[parts.length - 1] : next.profile.lastName;
    }

    users[index] = next;
    saveUsers(users);
    return next;
  }

  /* ------------------------------------------------------------------ *
   * Session
   * ------------------------------------------------------------------ */
  function setRoleSession(role, user) {
    if (!user || !user.id) {
      return null;
    }
    var key = role === "agent" ? "agent" : "customer";
    var map = readJSON(KEYS.roleSessions, {});
    if (!map || typeof map !== "object") {
      map = {};
    }
    map[key] = user.id;
    writeJSON(KEYS.roleSessions, map);
    return map;
  }

  function getRoleSession(role) {
    var key = role === "agent" ? "agent" : "customer";
    var map = readJSON(KEYS.roleSessions, {});
    var id = map && map[key];
    return id ? getUserById(id) : null;
  }

  function setSession(user) {
    if (!user || !user.id) {
      return null;
    }
    var session = {
      userId: user.id,
      role: user.role,
      email: user.email,
      startedAt: new Date().toISOString()
    };
    writeJSON(KEYS.session, session);
    /* Also remember the session per role so each dashboard can be opened
       independently in the same browser (pure front-end demo). */
    setRoleSession(user.role, user);
    return session;
  }

  function getSession() {
    var session = readJSON(KEYS.session, null);
    if (!session || !session.userId) {
      return null;
    }
    var user = getUserById(session.userId);
    if (!user) {
      clearSession();
      return null;
    }
    return user;
  }

  function clearSession(role) {
    try {
      window.localStorage.removeItem(KEYS.session);
      if (role) {
        var key = role === "agent" ? "agent" : "customer";
        var map = readJSON(KEYS.roleSessions, {});
        if (map && typeof map === "object") {
          delete map[key];
          writeJSON(KEYS.roleSessions, map);
        }
      } else {
        window.localStorage.removeItem(KEYS.roleSessions);
      }
    } catch (error) {
      /* ignore */
    }
  }

  /* ------------------------------------------------------------------ *
   * Role-scoped resolved user for the dashboards.
   * Order of resolution:
   *   1. the stored session for that role,
   *   2. the active primary session if its role matches,
   *   3. any existing user of that role (e.g. created at signup),
   *   4. a seeded demo user persisted to localStorage.
   * This keeps both dashboards openable at the same time using only
   * localStorage, with no backend.
   * ------------------------------------------------------------------ */
  function roleDemoSeed(role) {
    if (role === "agent") {
      return {
        fullName: "Jordan Ellis",
        email: "agent.demo@stacklyinsurance.com",
        phone: "+91 98450 11223",
        country: "India",
        role: "agent",
        agencyId: "AGT-STK-2048",
        profile: { firstName: "Jordan", lastName: "Ellis", city: "Salem", occupation: "Insurance advisor" }
      };
    }
    return {
      fullName: "Maya Rodriguez",
      email: "maya.demo@stacklyinsurance.com",
      phone: "+1 512 555 0142",
      country: "United States",
      role: "customer",
      policyInterest: "Home",
      profile: { firstName: "Maya", lastName: "Rodriguez" }
    };
  }

  function getDashboardUser(role) {
    role = role === "agent" ? "agent" : "customer";

    var user = getRoleSession(role);
    if (user) {
      return user;
    }

    var primary = getSession();
    if (primary && primary.role === role) {
      setRoleSession(role, primary);
      return primary;
    }

    var candidates = getUsers().filter(function (candidate) {
      return candidate.role === role;
    });
    if (candidates.length) {
      setRoleSession(role, candidates[0]);
      return candidates[0];
    }

    var seeded = createUser(roleDemoSeed(role));
    setRoleSession(role, seeded);
    return seeded;
  }

  /* ------------------------------------------------------------------ *
   * Small shared helpers
   * ------------------------------------------------------------------ */
  function initials(name) {
    var clean = String(name || "").replace(/[^A-Za-z\s'-]/g, " ").trim();
    if (!clean) {
      return "S";
    }
    var parts = clean.split(/\s+/);
    var first = parts[0] ? parts[0].charAt(0) : "";
    var last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return (first + last).toUpperCase() || "S";
  }

  function firstName(user) {
    if (!user) {
      return "there";
    }
    return (user.profile && user.profile.firstName) || String(user.fullName || "").split(" ")[0] || "there";
  }

  /* ------------------------------------------------------------------ *
   * UI state (sidebar, theme, etc.) - shared shell
   * ------------------------------------------------------------------ */
  function getUI() {
    return readJSON(KEYS.ui, {});
  }

  function setUI(patch) {
    var next = Object.assign({}, getUI(), patch || {});
    writeJSON(KEYS.ui, next);
    return next;
  }

  /* ------------------------------------------------------------------ *
   * Deterministic mock data seeding
   * A tiny FNV-1a hash + xorshift RNG keeps a user's demo data stable
   * across reloads without a backend.
   * ------------------------------------------------------------------ */
  function hashSeed(str) {
    var h = 2166136261;
    var text = String(str || "stackly");
    for (var i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function makeRng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;
      s >>>= 0;
      return (s >>> 0) / 4294967296;
    };
  }

  var POLICY_BLUEPRINTS = {
    Auto: {
      name: "Auto Shield",
      features: ["Comprehensive & collision", "24/7 roadside assistance", "Courtesy replacement car"],
      basePremium: 118,
      baseCoverage: 180000
    },
    Home: {
      name: "Home Comfort",
      features: ["Buildings & contents cover", "Accidental damage protection", "Emergency home support"],
      basePremium: 96,
      baseCoverage: 420000
    },
    Health: {
      name: "Health Guard",
      features: ["Private hospital cover", "Everyday health extras", "Mental health support"],
      basePremium: 152,
      baseCoverage: 250000
    },
    Life: {
      name: "Life Promise",
      features: ["Lump-sum family protection", "Optional critical illness", "Cover that adapts with you"],
      basePremium: 64,
      baseCoverage: 500000
    },
    Travel: {
      name: "Travel Freedom",
      features: ["Worldwide medical cover", "Trip cancellation protection", "Lost luggage support"],
      basePremium: 34,
      baseCoverage: 75000
    },
    Business: {
      name: "Business Secure",
      features: ["Liability & asset cover", "Business interruption support", "Cyber incident cover"],
      basePremium: 138,
      baseCoverage: 320000
    }
  };

  var ALL_TYPES = ["Auto", "Home", "Health", "Life", "Travel", "Business"];

  function pickTypes(primary) {
    var types = [];
    if (primary && ALL_TYPES.indexOf(primary) !== -1) {
      types.push(primary);
    }
    if (types.indexOf("Home") === -1) {
      types.push("Home");
    }
    if (types.indexOf("Auto") === -1) {
      types.push("Auto");
    }
    if (types.indexOf("Health") === -1) {
      types.push("Health");
    }
    if (types.indexOf("Life") === -1) {
      types.push("Life");
    }
    return types.slice(0, 4 + (primary ? 1 : 0));
  }

  function isoDaysAgo(days) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  }

  function isoDaysAhead(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  function roundTo(value, step) {
    return Math.round(value / step) * step;
  }

  function seedDataFor(user) {
    var rng = makeRng(hashSeed(user.id + "|" + user.email));
    var types = pickTypes(user.policyInterest);
    var policies = [];
    var policyForType = {};

    types.forEach(function (type, index) {
      var blueprint = POLICY_BLUEPRINTS[type];
      var coverage = roundTo(blueprint.baseCoverage * (0.8 + rng() * 0.8), 5000);
      var premium = roundTo(blueprint.basePremium * (0.85 + rng() * 0.5), 1);
      var renewalDays = Math.floor(20 + rng() * 330);
      var policy = {
        id: uid("pol"),
        type: type,
        name: blueprint.name + " " + (index % 2 === 0 ? "Premium" : "Essential"),
        policyNumber: "STK-" + type.slice(0, 2).toUpperCase() + "-" + (10000 + Math.floor(rng() * 89999)),
        provider: "Stackly Insurance Services",
        coverage: coverage,
        premium: premium,
        frequency: "Monthly",
        deductible: roundTo(150 + rng() * 600, 50),
        status: index === types.length - 1 && rng() > 0.6 ? "Pending" : "Active",
        startDate: isoDaysAgo(Math.floor(120 + rng() * 900)),
        renewalDate: isoDaysAhead(renewalDays),
        features: blueprint.features,
        beneficiaries: type === "Life" ? ["Jordan " + (user.profile && user.profile.lastName ? user.profile.lastName : "Family")] : []
      };
      policies.push(policy);
      policyForType[type] = policy;
    });

    var claimStatuses = ["Approved", "Paid", "In Review", "Submitted", "Rejected", "Paid", "Approved"];
    var claimCount = 3 + Math.floor(rng() * 3);
    var claims = [];
    var evidencePool = [
      { image: "assets/images/dashboard/claim-evidence-photo.webp", label: "Damage photo" },
      { image: "assets/images/dashboard/claim-evidence-document.webp", label: "Supporting document" }
    ];

    for (var c = 0; c < claimCount; c += 1) {
      var cType = types[c % types.length];
      var cStatus = claimStatuses[Math.floor(rng() * claimStatuses.length)];
      var amount = roundTo(400 + rng() * 9000, 25);
      var filedDays = Math.floor(3 + rng() * 300);
      var progressMap = { Submitted: 20, "In Review": 55, Approved: 80, Paid: 100, Rejected: 100 };
      claims.push({
        id: uid("clm"),
        reference: "CLM-" + (2024 + Math.floor(rng() * 2)) + "-" + (1000 + Math.floor(rng() * 8999)),
        type: cType,
        title: cType + " claim \u2014 " + ["storm damage", "accident repair", "medical treatment", "trip disruption", "equipment loss", "water damage"][Math.floor(rng() * 6)],
        status: cStatus,
        amount: amount,
        filedAt: isoDaysAgo(filedDays),
        updatedAt: isoDaysAgo(Math.max(0, filedDays - Math.floor(rng() * 10))),
        progress: progressMap[cStatus] || 50,
        description: "Reported through the Stackly dashboard and assigned to a dedicated claims guide.",
        evidence: rng() > 0.35 ? [evidencePool[0]] : evidencePool,
        timeline: [
          { label: "Claim submitted", date: isoDaysAgo(filedDays), done: true },
          { label: "Documents received", date: isoDaysAgo(Math.max(0, filedDays - 2)), done: true },
          { label: "Assessment in progress", date: isoDaysAgo(Math.max(0, filedDays - 5)), done: cStatus !== "Submitted" },
          { label: "Decision made", date: isoDaysAgo(Math.max(0, filedDays - 9)), done: ["Approved", "Paid", "Rejected"].indexOf(cStatus) !== -1 },
          { label: "Payment settled", date: isoDaysAgo(Math.max(0, filedDays - 12)), done: cStatus === "Paid" }
        ]
      });
    }

    /* 12 months of premium history + a couple of upcoming dues */
    var monthlyTotal = policies.reduce(function (sum, p) {
      return sum + p.premium;
    }, 0);
    var payments = [];
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var now = new Date();
    var methods = ["Visa \u2022\u2022\u2022\u2022 4242", "Mastercard \u2022\u2022\u2022\u2022 8810", "Bank transfer"];

    for (var m = 11; m >= 0; m -= 1) {
      var d = new Date(now.getFullYear(), now.getMonth() - m, Math.min(12, 8 + Math.floor(rng() * 8)));
      payments.push({
        id: uid("pay"),
        date: d.toISOString(),
        label: "Monthly premium \u2014 all policies",
        amount: roundTo(monthlyTotal * (0.92 + rng() * 0.16), 1),
        method: methods[Math.floor(rng() * methods.length)],
        status: "Paid",
        invoice: "INV-" + d.getFullYear() + "-" + String(100 + Math.floor(rng() * 899)),
        kind: "premium"
      });
    }

    payments.push({
      id: uid("pay"),
      date: isoDaysAhead(9),
      label: "Next premium due",
      amount: roundTo(monthlyTotal, 1),
      method: methods[0],
      status: "Due",
      invoice: "INV-" + now.getFullYear() + "-901",
      kind: "premium"
    });

    claims.forEach(function (claim, i) {
      if (claim.status === "Paid" && i < 2) {
        payments.push({
          id: uid("pay"),
          date: isoDaysAgo(20 + i * 35),
          label: "Claim payout \u2014 " + claim.reference,
          amount: claim.amount,
          method: "Bank transfer",
          status: "Paid",
          invoice: "PAY-" + (2100 + i),
          kind: "payout"
        });
      }
    });

    var docNames = [
      { name: "Policy schedule \u2014 Home Comfort", category: "Policy", type: "pdf", size: "482 KB" },
      { name: "Certificate of insurance", category: "Certificate", type: "pdf", size: "210 KB" },
      { name: "Auto Shield policy wording", category: "Policy", type: "pdf", size: "1.2 MB" },
      { name: "Premium invoice \u2014 last month", category: "Invoice", type: "pdf", size: "96 KB" },
      { name: "Health Guard membership card", category: "Card", type: "image", size: "540 KB" },
      { name: "Claims guide \u2014 first 24 hours", category: "Guide", type: "pdf", size: "755 KB" },
      { name: "Life Promise beneficiary form", category: "Form", type: "pdf", size: "168 KB" }
    ];
    var documents = docNames.map(function (doc, i) {
      return {
        id: uid("doc"),
        name: doc.name,
        category: doc.category,
        type: doc.type,
        size: doc.size,
        updatedAt: isoDaysAgo(4 + i * 11)
      };
    });

    var notifications = [
      { id: uid("ntf"), title: "Renewal coming up", body: "Your Home Comfort policy renews soon. Review your cover.", time: isoDaysAgo(1), type: "renewal", read: false },
      { id: uid("ntf"), title: "Claim update", body: (claims[0] ? claims[0].reference : "Your claim") + " moved to " + (claims[0] ? claims[0].status : "In Review") + ".", time: isoDaysAgo(2), type: "claim", read: false },
      { id: uid("ntf"), title: "Payment received", body: "Thanks \u2014 we received your latest premium payment.", time: isoDaysAgo(6), type: "payment", read: true },
      { id: uid("ntf"), title: "New document available", body: "Your updated certificate of insurance is ready to download.", time: isoDaysAgo(9), type: "document", read: true }
    ];

    var tickets = [
      { id: uid("tkt"), subject: "Update my mailing address", status: "Resolved", priority: "Normal", updatedAt: isoDaysAgo(5) },
      { id: uid("tkt"), subject: "Question about my deductible", status: "Open", priority: "Normal", updatedAt: isoDaysAgo(1) },
      { id: uid("tkt"), subject: "Add a driver to my auto policy", status: "In progress", priority: "High", updatedAt: isoDaysAgo(3) }
    ];

    var activity = [
      { id: uid("act"), text: "A claims guide reviewed " + (claims[0] ? claims[0].reference : "your claim") + ".", time: isoDaysAgo(1), type: "claim" },
      { id: uid("act"), text: "Premium payment of $" + Math.round(monthlyTotal) + " processed successfully.", time: isoDaysAgo(6), type: "payment" },
      { id: uid("act"), text: "Home Comfort policy documents updated.", time: isoDaysAgo(9), type: "document" },
      { id: uid("act"), text: "You enabled SMS claim alerts.", time: isoDaysAgo(14), type: "prefs" },
      { id: uid("act"), text: "Added Travel Freedom to your cover.", time: isoDaysAgo(28), type: "policy" }
    ];

    return {
      seededAt: new Date().toISOString(),
      protectionScore: Math.floor(58 + rng() * 36),
      policies: policies,
      claims: claims,
      payments: payments,
      documents: documents,
      notifications: notifications,
      tickets: tickets,
      activity: activity,
      agent: {
        name: rng() > 0.5 ? "Maya Chen" : "Jordan Ellis",
        role: "Your Stackly advisor",
        avatar: rng() > 0.5 ? "assets/images/dashboard/avatars/agent-maya.webp" : "assets/images/dashboard/avatars/agent-jordan.webp"
      }
    };
  }

  function getData(userId) {
    var map = readJSON(KEYS.data, {});
    return (map && map[userId]) || null;
  }

  function ensureData(user) {
    if (!user || !user.id) {
      return null;
    }
    var map = readJSON(KEYS.data, {});
    if (!map || typeof map !== "object") {
      map = {};
    }
    if (!map[user.id]) {
      map[user.id] = seedDataFor(user);
      writeJSON(KEYS.data, map);
    }
    return map[user.id];
  }

  function saveData(userId, data) {
    var map = readJSON(KEYS.data, {});
    if (!map || typeof map !== "object") {
      map = {};
    }
    map[userId] = data;
    writeJSON(KEYS.data, map);
    return data;
  }

  function updateData(userId, patch) {
    var current = getData(userId) || {};
    return saveData(userId, Object.assign({}, current, patch || {}));
  }

  /* ================================================================== *
   * Agent domain data
   * Extends the same source of truth for the Agent dashboard. Stored under
   * KEYS.agentData as a map of agentId -> agent workspace data.
   * ================================================================== */
  var AGENT_CUSTOMER_SEED = [
    { name: "Maya Rodriguez", city: "Salem", region: "Tamil Nadu" },
    { name: "Jordan Lee", city: "Coimbatore", region: "Tamil Nadu" },
    { name: "Priya Shah", city: "Chennai", region: "Tamil Nadu" },
    { name: "Daniel Okafor", city: "Salem", region: "Tamil Nadu" },
    { name: "Aisha Khan", city: "Erode", region: "Tamil Nadu" },
    { name: "Marcus Bennett", city: "Austin", region: "Texas" },
    { name: "Elena Petrova", city: "Denver", region: "Colorado" },
    { name: "Ravi Kumar", city: "Madurai", region: "Tamil Nadu" },
    { name: "Sofia Almeida", city: "Tiruchirappalli", region: "Tamil Nadu" },
    { name: "Noah Williams", city: "Singapore", region: "Singapore" },
    { name: "Hana Sato", city: "Singapore", region: "Singapore" },
    { name: "Liam O'Connor", city: "London", region: "United Kingdom" },
    { name: "Grace Kim", city: "Sydney", region: "New South Wales" },
    { name: "Arjun Nair", city: "Salem", region: "Tamil Nadu" }
  ];

  var AGENT_CUSTOMER_AVATARS = [
    "assets/images/dashboard/customers/customer-01.webp",
    "assets/images/dashboard/customers/customer-02.webp",
    "assets/images/dashboard/customers/customer-03.webp",
    "assets/images/dashboard/customers/customer-04.webp",
    "assets/images/dashboard/customers/customer-05.webp",
    "assets/images/dashboard/customers/customer-06.webp"
  ];

  function emailFromName(name) {
    return String(name).toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "") + "@example.com";
  }

  function seedAgentDataFor(agent) {
    var rng = makeRng(hashSeed(agent.id + "|agent|" + (agent.email || "")));
    var agentName = agent.fullName || "Your advisor";

    var customers = AGENT_CUSTOMER_SEED.map(function (item, i) {
      var roll = rng();
      var status = roll < 0.6 ? "Active" : roll < 0.76 ? "New" : roll < 0.89 ? "Prospect" : "Lapsed";
      var policiesCount = status === "Prospect" ? 0 : 1 + Math.floor(rng() * 3);
      return {
        id: uid("cus"),
        name: item.name,
        avatar: i < AGENT_CUSTOMER_AVATARS.length ? AGENT_CUSTOMER_AVATARS[i] : "",
        email: emailFromName(item.name),
        phone: "+91 9" + (80000000 + Math.floor(rng() * 19999999)),
        city: item.city,
        region: item.region,
        status: status,
        policiesCount: policiesCount,
        premium: policiesCount ? roundTo(640 + rng() * 4600, 10) : 0,
        lastContact: isoDaysAgo(Math.floor(rng() * 40)),
        since: isoDaysAgo(Math.floor(60 + rng() * 1300)),
        score: Math.floor(58 + rng() * 40),
        owner: agentName,
        tags: [item.region, policiesCount > 2 ? "Multi-policy" : "Single policy"]
      };
    });

    var policies = [];
    customers.forEach(function (customer) {
      for (var n = 0; n < customer.policiesCount; n += 1) {
        var type = ALL_TYPES[Math.floor(rng() * ALL_TYPES.length)];
        var blueprint = POLICY_BLUEPRINTS[type];
        var isRenewal = rng() > 0.55;
        var status = customer.status === "Lapsed" ? "Lapsed" : (rng() > 0.88 ? "Pending" : "Active");
        policies.push({
          id: uid("pol"),
          policyNumber: "STK-" + type.slice(0, 2).toUpperCase() + "-" + (10000 + Math.floor(rng() * 89999)),
          customerId: customer.id,
          customerName: customer.name,
          type: type,
          coverage: roundTo(blueprint.baseCoverage * (0.8 + rng() * 0.8), 5000),
          premium: roundTo(blueprint.basePremium * (0.85 + rng() * 0.5), 1),
          status: status,
          isRenewal: isRenewal,
          startDate: isoDaysAgo(Math.floor(120 + rng() * 1200)),
          renewalDate: isoDaysAhead(Math.floor(10 + rng() * 340)),
          deductible: roundTo(150 + rng() * 600, 50)
        });
      }
    });

    var claimStatuses = ["Approved", "Paid", "In Review", "Submitted", "Rejected", "Approved", "In Review"];
    var priorities = ["High", "Medium", "Low", "Medium", "High"];
    var claims = [];
    for (var c = 0; c < 14; c += 1) {
      var cCustomer = customers[Math.floor(rng() * customers.length)];
      var cStatus = claimStatuses[Math.floor(rng() * claimStatuses.length)];
      var cType = ALL_TYPES[Math.floor(rng() * ALL_TYPES.length)];
      var filedDays = Math.floor(1 + rng() * 130);
      var sla = 1 + Math.floor(rng() * 6);
      claims.push({
        id: uid("clm"),
        reference: "CLM-" + (2025 + Math.floor(rng() * 2)) + "-" + (1000 + Math.floor(rng() * 8999)),
        customerId: cCustomer.id,
        customerName: cCustomer.name,
        type: cType,
        title: cType + " claim \u2014 " + ["storm damage", "accident repair", "medical treatment", "trip disruption", "equipment loss", "water damage"][Math.floor(rng() * 6)],
        priority: priorities[Math.floor(rng() * priorities.length)],
        status: cStatus,
        amount: roundTo(500 + rng() * 12000, 25),
        slaDays: sla,
        ageDays: filedDays,
        filedAt: isoDaysAgo(filedDays),
        assignedTo: agentName,
        evidence: rng() > 0.4
          ? [{ image: "assets/images/dashboard/claim-evidence-photo.webp", label: "Damage photo" }]
          : [
            { image: "assets/images/dashboard/claim-evidence-photo.webp", label: "Damage photo" },
            { image: "assets/images/dashboard/claim-evidence-document.webp", label: "Supporting document" }
          ],
        timeline: [
          { label: "Submitted by customer", date: isoDaysAgo(filedDays), done: true },
          { label: "Assigned to you", date: isoDaysAgo(Math.max(0, filedDays - 1)), done: true },
          { label: "Assessment scheduled", date: isoDaysAgo(Math.max(0, filedDays - 3)), done: cStatus !== "Submitted" },
          { label: "Decision made", date: isoDaysAgo(Math.max(0, filedDays - 7)), done: ["Approved", "Paid", "Rejected"].indexOf(cStatus) !== -1 },
          { label: "Settlement paid", date: isoDaysAgo(Math.max(0, filedDays - 10)), done: cStatus === "Paid" }
        ]
      });
    }

    var stages = ["New", "Contacted", "Quoted", "Won", "Lost"];
    var sources = ["Referral", "Website", "Broker", "Campaign", "Walk-in"];
    var leadFirst = ["Aarav", "Isabella", "Wei", "Fatima", "Lucas", "Ananya", "Oliver", "Zara", "Ethan", "Meera", "Sofia", "Kabir", "Nora", "Diego", "Ishaan", "Chloe", "Omar", "Leah", "Vivaan", "Emma"];
    var leadLast = ["Menon", "Rossi", "Tan", "Ali", "Silva", "Iyer", "Novak", "Hassan", "Brown", "Reddy", "Costa", "Kapoor", "Larsen", "Reyes", "Gupta", "Baker", "Farouk", "Nguyen", "Joshi", "Turner"];
    var leads = [];
    for (var l = 0; l < 20; l += 1) {
      var stage = stages[Math.floor(rng() * stages.length)];
      leads.push({
        id: uid("lead"),
        name: leadFirst[l % leadFirst.length] + " " + leadLast[(l + 3) % leadLast.length],
        company: rng() > 0.5 ? leadLast[Math.floor(rng() * leadLast.length)] + " & Co." : "",
        email: "",
        phone: "+91 9" + (80000000 + Math.floor(rng() * 19999999)),
        stage: stage,
        value: roundTo(1200 + rng() * 9000, 50),
        source: sources[Math.floor(rng() * sources.length)],
        product: ALL_TYPES[Math.floor(rng() * ALL_TYPES.length)],
        updatedAt: isoDaysAgo(Math.floor(rng() * 21)),
        owner: agentName
      });
      leads[leads.length - 1].email = emailFromName(leads[leads.length - 1].name);
    }

    var commissions = [];
    var nowRef = new Date();
    for (var m = 11; m >= 0; m -= 1) {
      var entries = 1 + Math.floor(rng() * 3);
      for (var e = 0; e < entries; e += 1) {
        var day = new Date(nowRef.getFullYear(), nowRef.getMonth() - m, 3 + Math.floor(rng() * 24));
        var commCustomer = customers[Math.floor(rng() * customers.length)];
        var commType = ALL_TYPES[Math.floor(rng() * ALL_TYPES.length)];
        var premium = roundTo(900 + rng() * 5200, 10);
        var rate = 0.08 + rng() * 0.1;
        commissions.push({
          id: uid("com"),
          date: day.toISOString(),
          customerName: commCustomer.name,
          productType: commType,
          premium: premium,
          rate: Math.round(rate * 1000) / 1000,
          amount: Math.round(premium * rate),
          status: m > 1 ? "Paid" : (m === 1 ? "Pending" : "Scheduled"),
          statement: "STMT-" + day.getFullYear() + "-" + ("0" + (day.getMonth() + 1)).slice(-2)
        });
      }
    }

    var modes = ["Video call", "Phone call", "In person"];
    var appointments = [];
    for (var a = 0; a < 9; a += 1) {
      var apptCustomer = customers[Math.floor(rng() * customers.length)];
      var when = isoDaysAhead(Math.floor(rng() * 12));
      var hh = 9 + Math.floor(rng() * 9);
      appointments.push({
        id: uid("apt"),
        title: ["Cover review", "New policy consultation", "Claim follow-up", "Renewal discussion", "Portfolio check-in"][Math.floor(rng() * 5)],
        customerName: apptCustomer.name,
        customerId: apptCustomer.id,
        date: when,
        time: ("0" + hh).slice(-2) + ":" + (rng() > 0.5 ? "30" : "00"),
        mode: modes[Math.floor(rng() * modes.length)],
        location: apptCustomer.city,
        status: "Confirmed"
      });
    }

    var chatOpeners = [
      "Could you send the updated quote?",
      "Thanks for the quick turnaround!",
      "I would like to add home cover too.",
      "When is my renewal due?",
      "Can we reschedule our call?",
      "My claim status shows in review \u2014 any update?",
      "What documents do I need for the new policy?",
      "Happy with the service so far."
    ];
    var messages = customers.slice(0, 8).map(function (customer, i) {
      var unread = i < 3;
      var thread = [
        { from: "them", text: chatOpeners[i], time: isoDaysAgo(2) },
        { from: "you", text: "Thanks for reaching out \u2014 I will take a look and come back to you today.", time: isoDaysAgo(2) },
        { from: "them", text: "That works, thank you!", time: isoDaysAgo(1) }
      ];
      return {
        id: uid("msg"),
        customerId: customer.id,
        customerName: customer.name,
        avatar: customer.avatar,
        subject: ["Quote update", "Home cover add-on", "Renewal timing", "Claim update", "Documents", "Reschedule", "New policy", "Feedback"][i],
        preview: chatOpeners[i],
        time: isoDaysAgo(1),
        unread: unread,
        thread: thread
      };
    });

    var notifications = [
      { id: uid("ntf"), title: "New high-value lead", body: "A referral lead worth $8,400 entered your pipeline.", time: isoDaysAgo(0), type: "lead", read: false },
      { id: uid("ntf"), title: "Claim SLA warning", body: (claims[0] ? claims[0].reference : "A claim") + " is approaching its SLA target.", time: isoDaysAgo(1), type: "claim", read: false },
      { id: uid("ntf"), title: "Policy renewed", body: "Marcus Bennett renewed His Home Comfort policy.", time: isoDaysAgo(2), type: "policy", read: true },
      { id: uid("ntf"), title: "Commission paid", body: "Your latest commission statement is ready to download.", time: isoDaysAgo(3), type: "commission", read: true }
    ];

    var activity = [
      { id: uid("act"), text: "You approved claim " + (claims[0] ? claims[0].reference : "") + ".", time: isoDaysAgo(0), type: "claim" },
      { id: uid("act"), text: "New lead added to the pipeline from a referral.", time: isoDaysAgo(1), type: "lead" },
      { id: uid("act"), text: "Issued a new Travel Freedom policy.", time: isoDaysAgo(2), type: "policy" },
      { id: uid("act"), text: "Completed a cover review with Priya Shah.", time: isoDaysAgo(3), type: "appointment" },
      { id: uid("act"), text: "Commission statement for last month generated.", time: isoDaysAgo(5), type: "commission" }
    ];

    return {
      seededAt: new Date().toISOString(),
      region: { city: "Salem", state: "Tamil Nadu", country: "India" },
      agencyId: agent.agencyId || "AGT-STK-" + (1000 + Math.floor(rng() * 8999)),
      targets: {
        premiumMonthly: 135000,
        commissionMonthly: 16800,
        policiesMonthly: 24,
        conversionRate: 32
      },
      customers: customers,
      policies: policies,
      claims: claims,
      leads: leads,
      commissions: commissions,
      appointments: appointments,
      messages: messages,
      notifications: notifications,
      activity: activity,
      agent: agentName
    };
  }

  function getAgentData(agentId) {
    var map = readJSON(KEYS.agentData, {});
    return (map && map[agentId]) || null;
  }

  function ensureAgentData(agent) {
    if (!agent || !agent.id) {
      return null;
    }
    var map = readJSON(KEYS.agentData, {});
    if (!map || typeof map !== "object") {
      map = {};
    }
    if (!map[agent.id]) {
      map[agent.id] = seedAgentDataFor(agent);
      writeJSON(KEYS.agentData, map);
    }
    return map[agent.id];
  }

  function saveAgentData(agentId, data) {
    var map = readJSON(KEYS.agentData, {});
    if (!map || typeof map !== "object") {
      map = {};
    }
    map[agentId] = data;
    writeJSON(KEYS.agentData, map);
    return data;
  }

  function updateAgentData(agentId, patch) {
    var current = getAgentData(agentId) || {};
    return saveAgentData(agentId, Object.assign({}, current, patch || {}));
  }

  /* ------------------------------------------------------------------ *
   * Public API
   * ------------------------------------------------------------------ */
  window.StacklyStore = {
    KEYS: KEYS,
    getUsers: getUsers,
    saveUsers: saveUsers,
    getUserById: getUserById,
    getUserByEmail: getUserByEmail,
    createUser: createUser,
    updateUser: updateUser,
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession,
    getRoleSession: getRoleSession,
    setRoleSession: setRoleSession,
    getDashboardUser: getDashboardUser,
    getUI: getUI,
    setUI: setUI,
    ensureData: ensureData,
    getData: getData,
    saveData: saveData,
    updateData: updateData,
    ensureAgentData: ensureAgentData,
    getAgentData: getAgentData,
    saveAgentData: saveAgentData,
    updateAgentData: updateAgentData,
    initials: initials,
    firstName: firstName,
    normalizeUser: normalizeUser,
    clone: clone
  };
})(window);
