(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var body = doc.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.classList.add("js-ready");

  /* Sticky header state — rAF-throttled with a hysteresis band. A plain
     `scrollY > 18` toggle lets elastic overscroll near the top flip
     `is-scrolled` (and with it the announcement bar + header height) on and
     off every frame, which shifts the layout. The band stops that flapping:
     the class is only added past 24px and only removed once back above 6px. */
  var header = doc.querySelector("[data-header]");
  var headerTick = false;
  var headerOn = false;
  var updateHeader = function () {
    headerTick = false;
    if (!header) {
      return;
    }
    var y = window.scrollY;
    if (headerOn) {
      if (y < 6) {
        headerOn = false;
        header.classList.remove("is-scrolled");
      }
    } else if (y > 24) {
      headerOn = true;
      header.classList.add("is-scrolled");
    }
  };
  var queueHeaderUpdate = function () {
    if (!headerTick) {
      headerTick = true;
      window.requestAnimationFrame(updateHeader);
    }
  };

  updateHeader();
  window.addEventListener("scroll", queueHeaderUpdate, { passive: true });

  /* Reading progress */
  var scrollProgress = doc.querySelector("[data-scroll-progress] span");
  var updateScrollProgress = function () {
    if (!scrollProgress) {
      return;
    }
    var scrollableHeight = doc.documentElement.scrollHeight - window.innerHeight;
    var progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
    scrollProgress.style.transform = "scaleX(" + Math.min(Math.max(progress, 0), 1) + ")";
  };

  updateScrollProgress();
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  window.addEventListener("resize", updateScrollProgress, { passive: true });

  /* Mobile navigation */
  var menuToggle = doc.querySelector("[data-menu-toggle]");
  var mobileMenu = doc.querySelector("[data-mobile-menu]");

  var closeMenu = function () {
    if (!menuToggle || !mobileMenu) {
      return;
    }

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
    mobileMenu.hidden = true;
    body.classList.remove("menu-open");
  };

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", function () {
      var isOpen = menuToggle.getAttribute("aria-expanded") === "true";

      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
      mobileMenu.hidden = isOpen;
      body.classList.toggle("menu-open", !isOpen);
    });

    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    doc.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        closeMenu();
        menuToggle.focus();
      }
    });
  }

  /* Scroll reveal */
  var revealItems = doc.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealItems.length && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px" });

    revealItems.forEach(function (item) {
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  /* Subtle pointer depth on premium surfaces */
  if (!reduceMotion) {
    var heroVisual = doc.querySelector(".hero-visual");
    if (heroVisual) {
      heroVisual.addEventListener("pointermove", function (event) {
        if (event.pointerType !== "mouse") {
          return;
        }
        var bounds = heroVisual.getBoundingClientRect();
        var x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
        var y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 10;
        heroVisual.style.setProperty("--hero-shift-x", x.toFixed(2) + "px");
        heroVisual.style.setProperty("--hero-shift-y", y.toFixed(2) + "px");
      });
      heroVisual.addEventListener("pointerleave", function () {
        heroVisual.style.setProperty("--hero-shift-x", "0px");
        heroVisual.style.setProperty("--hero-shift-y", "0px");
      });
    }

    doc.querySelectorAll(".product-card, .plan-card, .quote-widget").forEach(function (surface) {
      surface.addEventListener("pointermove", function (event) {
        if (event.pointerType !== "mouse") {
          return;
        }
        var bounds = surface.getBoundingClientRect();
        var x = ((event.clientX - bounds.left) / bounds.width) * 100;
        var y = ((event.clientY - bounds.top) / bounds.height) * 100;
        surface.style.setProperty("--glow-x", x.toFixed(1) + "%");
        surface.style.setProperty("--glow-y", y.toFixed(1) + "%");
      });
      surface.addEventListener("pointerleave", function () {
        surface.style.setProperty("--glow-x", "50%");
        surface.style.setProperty("--glow-y", "50%");
      });
    });
  }

  /* Animated counters */
  var counterItems = doc.querySelectorAll("[data-counter]");
  var formatCounter = function (value, element) {
    var decimals = Number(element.dataset.decimals || 0);
    if (element.dataset.format === "compact") {
      if (value >= 1000) {
        return (value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(".0", "") + "k";
      }
    }
    return value.toFixed(decimals);
  };

  var animateCounter = function (element) {
    if (element.dataset.counted === "true") {
      return;
    }

    element.dataset.counted = "true";
    var target = Number(element.dataset.counter);
    var duration = 1300;
    var start = performance.now();

    var tick = function (now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = formatCounter(target * eased, element);
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      }
    };

    if (reduceMotion) {
      element.textContent = formatCounter(target, element);
    } else {
      window.requestAnimationFrame(tick);
    }
  };

  if ("IntersectionObserver" in window && counterItems.length) {
    var counterObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counterItems.forEach(function (item) {
      counterObserver.observe(item);
    });
  } else {
    counterItems.forEach(animateCounter);
  }

  /* Mini quote funnel */
  var quoteWidget = doc.querySelector("[data-quote-widget]");
  if (quoteWidget) {
    var quoteForm = quoteWidget.querySelector("[data-quote-form]");
    var quoteSteps = Array.from(quoteWidget.querySelectorAll("[data-quote-step]"));
    var quoteNext = quoteWidget.querySelector("[data-quote-next]");
    var quoteBack = quoteWidget.querySelector("[data-quote-back]");
    var quoteProgress = quoteWidget.querySelector("[data-quote-progress]");
    var quoteStepLabel = quoteWidget.querySelector("[data-quote-step-label]");
    var quoteError = quoteWidget.querySelector("[data-quote-error]");
    var detailError = quoteWidget.querySelector("[data-details-error]");
    var quoteSuccess = quoteWidget.querySelector("[data-quote-success]");
    var selectedType = "";
    var currentStep = 1;
    var quoteLabels = {
      home: { label: "Home cover", estimate: "Typically from $38 / month" },
      auto: { label: "Auto cover", estimate: "Typically from $32 / month" },
      health: { label: "Health cover", estimate: "Typically from $64 / month" },
      business: { label: "Business cover", estimate: "Typically from $56 / month" },
      life: { label: "Life cover", estimate: "Typically from $29 / month" },
      travel: { label: "Travel cover", estimate: "Typically from $14 / trip" }
    };

    var setType = function (type) {
      selectedType = type;
      quoteWidget.querySelectorAll("[data-quote-type]").forEach(function (option) {
        option.classList.toggle("is-selected", option.dataset.quoteType === type);
        option.setAttribute("aria-pressed", option.dataset.quoteType === type ? "true" : "false");
      });
      if (quoteError) {
        quoteError.hidden = true;
      }
    };

    var updateSummary = function () {
      var details = quoteLabels[selectedType] || quoteLabels.home;
      var summary = quoteWidget.querySelector("[data-quote-summary]");
      var estimate = quoteWidget.querySelector("[data-quote-estimate]");
      if (summary) {
        summary.textContent = details.label;
      }
      if (estimate) {
        estimate.textContent = details.estimate;
      }
    };

    var resetQuoteSuccess = function () {
      var footer = quoteWidget.querySelector(".widget-footer");
      if (footer) {
        footer.hidden = false;
      }
      if (quoteSuccess) {
        quoteSuccess.hidden = true;
      }
    };

    var renderQuoteStep = function () {
      quoteSteps.forEach(function (step) {
        var isActive = Number(step.dataset.quoteStep) === currentStep;
        step.hidden = !isActive;
        step.classList.toggle("is-active", isActive);
      });

      if (quoteStepLabel) {
        quoteStepLabel.textContent = String(currentStep).padStart(2, "0") + " / 03";
      }
      if (quoteProgress) {
        quoteProgress.style.width = (currentStep / 3) * 100 + "%";
      }
      if (quoteBack) {
        quoteBack.hidden = currentStep === 1;
      }
      if (quoteNext) {
        quoteNext.hidden = currentStep === 3;
      }
      updateSummary();
    };

    var validateDetails = function () {
      var postcode = quoteWidget.querySelector("#coverage-postcode");
      var priority = quoteWidget.querySelector("#coverage-priority");
      var valid = postcode && priority && postcode.checkValidity() && priority.value;
      if (detailError) {
        detailError.hidden = Boolean(valid);
      }
      return Boolean(valid);
    };

    quoteWidget.querySelectorAll("[data-quote-type]").forEach(function (option) {
      option.setAttribute("aria-pressed", "false");
      option.addEventListener("click", function () {
        setType(option.dataset.quoteType);
      });
    });

    doc.querySelectorAll("[data-quote-type-link]").forEach(function (link) {
      link.addEventListener("click", function () {
        resetQuoteSuccess();
        setType(link.dataset.quoteTypeLink);
        currentStep = 1;
        renderQuoteStep();
      });
    });

    if (quoteNext) {
      quoteNext.addEventListener("click", function () {
        if (currentStep === 1 && !selectedType) {
          if (quoteError) {
            quoteError.hidden = false;
          }
          return;
        }
        if (currentStep === 2 && !validateDetails()) {
          return;
        }
        currentStep = Math.min(currentStep + 1, 3);
        renderQuoteStep();
      });
    }

    if (quoteBack) {
      quoteBack.addEventListener("click", function () {
        currentStep = Math.max(currentStep - 1, 1);
        renderQuoteStep();
      });
    }

    if (quoteForm) {
      quoteForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (currentStep !== 3) {
          return;
        }
        var footer = quoteWidget.querySelector(".widget-footer");
        if (footer) {
          footer.hidden = true;
        }
        if (quoteSuccess) {
          quoteSuccess.hidden = false;
        }
      });
    }

    renderQuoteStep();
  }

  /* Testimonial carousel */
  var slider = doc.querySelector("[data-testimonial-slider]");
  if (slider) {
    var slides = Array.from(slider.querySelectorAll("[data-slide]"));
    var dots = Array.from(doc.querySelectorAll("[data-slide-to]"));
    var currentSlide = 0;

    var showSlide = function (index) {
      currentSlide = (index + slides.length) % slides.length;
      slides.forEach(function (slide, slideIndex) {
        var isActive = slideIndex === currentSlide;
        slide.hidden = !isActive;
        slide.classList.toggle("is-active", isActive);
        slide.setAttribute("aria-hidden", isActive ? "false" : "true");
      });
      dots.forEach(function (dot, dotIndex) {
        var isActive = dotIndex === currentSlide;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    };

    var previous = doc.querySelector("[data-slider-prev]");
    var next = doc.querySelector("[data-slider-next]");

    if (previous) {
      previous.addEventListener("click", function () {
        showSlide(currentSlide - 1);
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        showSlide(currentSlide + 1);
      });
    }
    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        showSlide(Number(dot.dataset.slideTo));
      });
    });
    slider.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showSlide(currentSlide - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showSlide(currentSlide + 1);
      }
    });
    showSlide(0);
  }

  /* FAQ accordion */
  var accordion = doc.querySelector("[data-accordion]");
  if (accordion) {
    var faqButtons = accordion.querySelectorAll(".faq-question");
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
          otherButton.closest(".faq-item").classList.remove("is-open");
        });

        if (shouldOpen && answer) {
          button.setAttribute("aria-expanded", "true");
          answer.hidden = false;
          button.closest(".faq-item").classList.add("is-open");
        }
      });
    });
  }

  /* Client-side newsletter confirmations */
  doc.querySelectorAll("[data-newsletter-form]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var scope = form.parentElement;
      var note = scope ? scope.querySelector("[data-newsletter-note]") : null;
      if (note) {
        note.textContent = "You are on the list. Thanks for keeping in touch.";
        note.classList.add("is-success");
      }
      var input = form.querySelector("input");
      if (input) {
        input.value = "";
        input.placeholder = "You are in. Thank you.";
      }
    });
  });

  /* Highlight the current page in the navigation (desktop + mobile menu) */
  var currentPage = (window.location.pathname.split("/").pop() || "").toLowerCase();
  if (!currentPage) {
    currentPage = "index.html";
  }

  var pageFromHref = function (href) {
    var clean = String(href || "").split("#")[0].split("?")[0].toLowerCase();
    if (!clean) {
      return "index.html"; /* in-page anchor such as "#home" belongs to the home page */
    }
    return clean.split("/").pop();
  };

  doc.querySelectorAll(".desktop-nav a:not(.button), .mobile-nav-list a:not(.button)").forEach(function (link) {
    var href = link.getAttribute("href") || "";
    var isAnchorOnly = href.charAt(0) === "#";

    if (isAnchorOnly) {
      if (currentPage === "index.html") {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
      }
      return;
    }

    if (pageFromHref(href) === currentPage) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });
})();
