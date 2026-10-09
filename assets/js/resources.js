(function () {
  "use strict";

  var doc = document;
  var body = doc.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  body.classList.add("resources-js-ready");

  var heroCopy = doc.querySelector(".resources-hero-copy");
  var heroMosaic = doc.querySelector(".resources-hero-mosaic");
  if (heroCopy) {
    window.requestAnimationFrame(function () {
      window.setTimeout(function () {
        heroCopy.classList.add("is-resources-hero-visible");
      }, reduceMotion ? 0 : 130);
    });
  }
  if (heroMosaic) {
    window.requestAnimationFrame(function () {
      window.setTimeout(function () {
        heroMosaic.classList.add("is-resources-visible");
      }, reduceMotion ? 0 : 260);
    });
  }

  /* Search and resource filtering */
  var searchForm = doc.querySelector("[data-resource-search]");
  var searchInput = doc.querySelector("#resource-search-input");
  var cards = Array.from(doc.querySelectorAll("[data-resource-card]"));
  var emptyMessage = doc.querySelector("[data-resource-empty]");
  var activeFilter = "all";

  var applyResourceFilter = function (filter, query) {
    activeFilter = filter || "all";
    var normalizedQuery = (query || "").trim().toLowerCase();
    var matched = 0;
    cards.forEach(function (card) {
      var category = card.dataset.resourceCategory;
      var text = card.textContent.toLowerCase();
      var categoryMatches = activeFilter === "all" || activeFilter === "guides" || activeFilter === "video" || activeFilter === "webinar" || activeFilter === "tools" || activeFilter === "case-study" || category === activeFilter;
      var queryMatches = !normalizedQuery || text.indexOf(normalizedQuery) !== -1;
      var visible = categoryMatches && queryMatches;
      card.hidden = !visible;
      if (visible) {
        matched += 1;
      }
    });
    if (emptyMessage) {
      emptyMessage.hidden = matched !== 0;
    }
    doc.querySelectorAll("[data-resource-filter]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.resourceFilter === activeFilter);
    });
  };

  doc.querySelectorAll("[data-resource-filter]").forEach(function (button) {
    button.addEventListener("click", function () {
      var filter = button.dataset.resourceFilter;
      applyResourceFilter(filter, searchInput ? searchInput.value : "");
      if (button.closest(".resources-category-grid")) {
        var latest = doc.querySelector("#latest");
        if (latest) {
          latest.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
        }
      }
    });
  });

  if (searchForm) {
    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      applyResourceFilter("all", searchInput ? searchInput.value : "");
      var latest = doc.querySelector("#latest");
      if (latest) {
        latest.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  }

  doc.querySelectorAll("[data-resource-query]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (searchInput) {
        searchInput.value = button.dataset.resourceQuery;
        searchInput.focus();
      }
      applyResourceFilter("all", button.dataset.resourceQuery);
      var latest = doc.querySelector("#latest");
      if (latest) {
        latest.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  });

  /* Video preview lightbox */
  var lightbox = doc.querySelector("[data-resources-lightbox]");
  var lightboxTitle = lightbox ? lightbox.querySelector("[data-resources-video-title]") : null;
  var lightboxClose = lightbox ? lightbox.querySelector("[data-resources-lightbox-close]") : null;
  var lastVideo = null;
  var closeLightbox = function () {
    if (!lightbox) {
      return;
    }
    lightbox.hidden = true;
    body.classList.remove("resources-lightbox-open");
    if (lastVideo) {
      lastVideo.focus();
    }
  };
  doc.querySelectorAll("[data-resource-video]").forEach(function (video) {
    video.addEventListener("click", function () {
      if (!lightbox) {
        return;
      }
      lastVideo = video;
      if (lightboxTitle) {
        lightboxTitle.textContent = video.dataset.videoTitle || "Resource video";
      }
      lightbox.hidden = false;
      body.classList.add("resources-lightbox-open");
      if (lightboxClose) {
        lightboxClose.focus();
      }
    });
  });
  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }
  if (lightbox) {
    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });
  }

  /* FAQ */
  var accordion = doc.querySelector("[data-resources-accordion]");
  if (accordion) {
    var faqButtons = accordion.querySelectorAll("button");
    faqButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var answer = doc.getElementById(button.getAttribute("aria-controls"));
        var shouldOpen = button.getAttribute("aria-expanded") !== "true";
        faqButtons.forEach(function (otherButton) {
          var otherAnswer = doc.getElementById(otherButton.getAttribute("aria-controls"));
          otherButton.setAttribute("aria-expanded", "false");
          if (otherAnswer) {
            otherAnswer.hidden = true;
          }
          otherButton.closest(".resources-faq-item").classList.remove("is-open");
        });
        if (shouldOpen && answer) {
          button.setAttribute("aria-expanded", "true");
          answer.hidden = false;
          button.closest(".resources-faq-item").classList.add("is-open");
        }
      });
    });
  }

  /* Newsletter demo */
  var newsletter = doc.querySelector("[data-resources-newsletter]");
  if (newsletter) {
    newsletter.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!newsletter.checkValidity()) {
        newsletter.reportValidity();
        return;
      }
      var note = doc.querySelector("[data-resources-newsletter-note]");
      var input = newsletter.querySelector("input");
      if (note) {
        note.textContent = "You are on the list. Thanks for keeping in touch.";
      }
      if (input) {
        input.value = "";
        input.placeholder = "You are in. Thank you.";
      }
    });
  }

  doc.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && lightbox && !lightbox.hidden) {
      closeLightbox();
    }
  });
})();
