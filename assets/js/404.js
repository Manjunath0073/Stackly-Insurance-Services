/* ==========================================================================
   Stackly 404 page interactions
   Page-specific only. Shared behavior (header, nav, reveals) lives in main.js.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var body = doc.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var HOME_URL = "index.html";

  var init = function () {
    body.classList.add("notfound-js-ready");

    /* ----------------------------------------------------------------------
       Go Back button
       Uses window.history.back(). When there is no usable history entry
       (document.referrer is empty or history.length <= 1) we fall back to
       the homepage so the button always does something useful.
       ---------------------------------------------------------------------- */
    var backButton = doc.querySelector("[data-nf-back]");
    if (backButton) {
      backButton.addEventListener("click", function () {
        var hasReferrer = typeof doc.referrer === "string" && doc.referrer.length > 0;
        var hasHistory = window.history.length > 1;

        if (hasHistory && hasReferrer) {
          window.history.back();
        } else {
          window.location.href = HOME_URL;
        }
      });
    }

    /* ----------------------------------------------------------------------
       Optional auto-redirect to home (cancelable, accessible)
       ---------------------------------------------------------------------- */
    var redirect = doc.querySelector("[data-nf-redirect]");
    var cancelButton = doc.querySelector("[data-nf-cancel]");
    var announce = doc.querySelector("[data-nf-announce]");
    var countdowns = doc.querySelectorAll("[data-nf-countdown]");
    var ring = doc.querySelector("[data-nf-ring]");
    var RING_CIRCUMFERENCE = 119.38;
    var TOTAL_SECONDS = 15;
    var remaining = TOTAL_SECONDS;
    var timerId = null;
    var settled = false;

    var writeAnnouncement = function (message) {
      if (announce) {
        announce.textContent = message;
      }
    };

    var paint = function () {
      var progress = (TOTAL_SECONDS - remaining) / TOTAL_SECONDS;
      countdowns.forEach(function (node) {
        node.textContent = String(remaining);
      });
      if (ring) {
        ring.style.strokeDashoffset = (RING_CIRCUMFERENCE * progress).toFixed(2);
      }
    };

    var stopCountdown = function () {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    };

    if (redirect && countdowns.length) {
      paint();
      writeAnnouncement("Redirecting to the Stackly homepage in " + TOTAL_SECONDS + " seconds. Use the stay on this page button to cancel.");

      timerId = window.setInterval(function () {
        remaining -= 1;

        if (remaining <= 0) {
          stopCountdown();
          window.location.href = HOME_URL;
          return;
        }

        paint();

        if (remaining === 5) {
          writeAnnouncement("Redirecting to the homepage in 5 seconds. Use the stay on this page button to cancel.");
        }
      }, 1000);

      if (cancelButton) {
        cancelButton.addEventListener("click", function () {
          if (settled) {
            return;
          }
          settled = true;
          stopCountdown();
          redirect.classList.add("is-cancelled");
          body.classList.add("notfound-stopped");
          writeAnnouncement("Automatic redirect cancelled. You can stay on this page as long as you like.");

          window.setTimeout(function () {
            redirect.hidden = true;
          }, reduceMotion ? 0 : 380);

          if (backButton) {
            backButton.focus();
          }
        });
      }
    }

    /* ----------------------------------------------------------------------
       Recovery search — routes a query to the most relevant page.
       There is no back end; this is a friendly client-side recovery aid.
       ---------------------------------------------------------------------- */
    var searchForm = doc.querySelector("[data-nf-search]");
    if (searchForm) {
      var searchInput = searchForm.querySelector("[data-nf-search-input]");
      var searchStatus = doc.querySelector("[data-nf-search-status]");

      var routes = [
        { href: "claims.html#claims-home", label: "Claims", terms: ["claim", "claims", "payout", "settle", "file a claim", "track"] },
        { href: "login.html", label: "Login", terms: ["login", "log in", "sign in", "signin", "account", "portal"] },
        { href: "signup.html", label: "Sign up", terms: ["sign up", "signup", "register", "create account", "join", "get started"] },
        { href: "contact.html#contact-home", label: "Contact", terms: ["contact", "support", "phone", "call", "email", "talk", "human", "help"] },
        { href: "about.html#about-home", label: "About", terms: ["about", "company", "team", "story", "careers", "who we are"] },
        { href: "products.html#products-home", label: "Products", terms: ["product", "products", "cover", "coverage", "plan", "plans", "insurance", "auto", "car", "health", "life", "travel", "business", "compare", "price"] },
        { href: "resources.html#resources-home", label: "Resources", terms: ["resource", "resources", "guide", "guides", "blog", "article", "faq", "learn", "news"] },
        { href: HOME_URL + "#home", label: "Home", terms: ["home", "homepage", "start", "main", "quote", "get a quote"] }
      ];

      var setStatus = function (message, isWarning) {
        if (searchStatus) {
          searchStatus.textContent = message;
          searchStatus.classList.toggle("is-warn", Boolean(isWarning));
        }
      };

      var findRoute = function (query) {
        for (var i = 0; i < routes.length; i += 1) {
          var terms = routes[i].terms;
          for (var j = 0; j < terms.length; j += 1) {
            if (query.indexOf(terms[j]) !== -1) {
              return routes[i];
            }
          }
        }
        return null;
      };

      searchForm.addEventListener("submit", function (event) {
        event.preventDefault();

        var query = searchInput ? searchInput.value.trim().toLowerCase() : "";
        if (!query) {
          setStatus("Type what you were looking for and we will point you the right way.", true);
          if (searchInput) {
            searchInput.focus();
          }
          return;
        }

        var match = findRoute(query);
        if (match) {
          setStatus("Great \u2014 opening " + match.label + "\u2026");
          window.setTimeout(function () {
            window.location.href = match.href;
          }, 320);
        } else {
          setStatus("We could not find a page for \u201C" + query + "\u201D. Try one of the popular links below.", true);
        }
      });

      if (searchInput) {
        searchInput.addEventListener("input", function () {
          setStatus("", false);
        });
      }
    }

    /* ----------------------------------------------------------------------
       Subtle pointer parallax on the hero visual (mouse only)
       ---------------------------------------------------------------------- */
    var visual = doc.querySelector("[data-nf-parallax]");
    if (visual && !reduceMotion) {
      visual.addEventListener("pointermove", function (event) {
        if (event.pointerType !== "mouse") {
          return;
        }
        var bounds = visual.getBoundingClientRect();
        var x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 14;
        var y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 12;
        visual.style.setProperty("--nf-shift-x", x.toFixed(2) + "px");
        visual.style.setProperty("--nf-shift-y", y.toFixed(2) + "px");
      });

      visual.addEventListener("pointerleave", function () {
        visual.style.setProperty("--nf-shift-x", "0px");
        visual.style.setProperty("--nf-shift-y", "0px");
      });
    }
  };

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
