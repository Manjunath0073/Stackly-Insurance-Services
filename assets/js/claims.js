(function () {
  "use strict";

  var doc = document;
  var body = doc.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  body.classList.add("claims-js-ready");

  /* Signature claims status ring */
  var statusRing = doc.querySelector("[data-claim-ring]");
  if (statusRing) {
    var animateRing = function () {
      if (reduceMotion) {
        statusRing.style.setProperty("--claim-progress", "68%");
        return;
      }
      var start = performance.now();
      var tick = function (now) {
        var progress = Math.min((now - start) / 1100, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        statusRing.style.setProperty("--claim-progress", (68 * eased).toFixed(1) + "%");
        if (progress < 1) {
          window.requestAnimationFrame(tick);
        }
      };
      window.requestAnimationFrame(tick);
    };
    window.setTimeout(animateRing, reduceMotion ? 0 : 350);
  }

  /* Hero depth */
  var heroStage = doc.querySelector("[data-claims-parallax]");
  if (heroStage && !reduceMotion) {
    heroStage.addEventListener("pointermove", function (event) {
      if (event.pointerType !== "mouse") {
        return;
      }
      var bounds = heroStage.getBoundingClientRect();
      var x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
      var y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 9;
      heroStage.style.setProperty("--claims-parallax-x", x.toFixed(2) + "px");
      heroStage.style.setProperty("--claims-parallax-y", y.toFixed(2) + "px");
    });
    heroStage.addEventListener("pointerleave", function () {
      heroStage.style.setProperty("--claims-parallax-x", "0px");
      heroStage.style.setProperty("--claims-parallax-y", "0px");
    });
  }

  /* Process path progress */
  var process = doc.querySelector("[data-claims-process]");
  var processItems = process ? Array.from(process.querySelectorAll("[data-process-step]")) : [];
  var processProgress = process ? process.querySelector("[data-process-progress]") : null;
  var updateProcess = function () {
    if (!process || !processItems.length) {
      return;
    }
    var bounds = process.getBoundingClientRect();
    var trigger = window.innerHeight * 0.72;
    var progress = Math.min(Math.max((trigger - bounds.top) / Math.max(bounds.height, 1), 0.1), 1);
    if (processProgress) {
      processProgress.style.width = progress * 100 + "%";
    }
    var activeIndex = 0;
    processItems.forEach(function (item, index) {
      if (item.getBoundingClientRect().top < trigger) {
        item.classList.add("is-active");
        activeIndex = index;
      } else {
        item.classList.remove("is-active");
      }
    });
    processItems.forEach(function (item, index) {
      item.classList.toggle("is-active", index === activeIndex);
    });
  };
  if (process) {
    updateProcess();
    window.addEventListener("scroll", updateProcess, { passive: true });
    window.addEventListener("resize", updateProcess, { passive: true });
  }

  /* Fast payout counters */
  var counters = doc.querySelectorAll("[data-claims-counter]");
  var formatCounter = function (value, element) {
    var decimals = Number(element.dataset.claimsDecimals || 0);
    return value.toFixed(decimals);
  };
  var animateCounter = function (element) {
    if (element.dataset.claimsCounted === "true") {
      return;
    }
    element.dataset.claimsCounted = "true";
    var target = Number(element.dataset.claimsCounter);
    if (reduceMotion) {
      element.textContent = formatCounter(target, element);
      return;
    }
    var start = performance.now();
    var tick = function (now) {
      var progress = Math.min((now - start) / 1200, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = formatCounter(target * eased, element);
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      }
    };
    window.requestAnimationFrame(tick);
  };
  if (counters.length && "IntersectionObserver" in window) {
    var counterObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.55 });
    counters.forEach(function (counter) {
      counterObserver.observe(counter);
    });
  } else {
    counters.forEach(animateCounter);
  }

  /* Demo claim tracker */
  var tracker = doc.querySelector("[data-claims-tracker]");
  if (tracker) {
    var trackerForm = tracker.querySelector("[data-tracker-form]");
    var trackerInput = tracker.querySelector("#claim-id");
    var trackerError = tracker.querySelector("[data-tracker-error]");
    var trackerResult = tracker.querySelector("[data-tracker-result]");
    var trackerId = tracker.querySelector("[data-tracker-id]");
    if (trackerForm) {
      trackerForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var value = trackerInput ? trackerInput.value.trim().toUpperCase() : "";
        if (!value) {
          if (trackerError) {
            trackerError.hidden = false;
          }
          return;
        }
        if (trackerError) {
          trackerError.hidden = true;
        }
        if (trackerId) {
          trackerId.textContent = value;
        }
        if (trackerResult) {
          trackerResult.hidden = false;
          trackerResult.classList.remove("is-refreshing");
          window.requestAnimationFrame(function () {
            trackerResult.classList.add("is-refreshing");
          });
        }
      });
    }
  }

  /* Customer story carousel */
  var stories = doc.querySelector("[data-claims-stories]");
  if (stories) {
    var slides = Array.from(stories.querySelectorAll("[data-story-slide]"));
    var current = 0;
    var currentLabel = doc.querySelector("[data-story-current]");
    var showStory = function (index) {
      current = (index + slides.length) % slides.length;
      slides.forEach(function (slide, slideIndex) {
        var active = slideIndex === current;
        slide.hidden = !active;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
      });
      if (currentLabel) {
        currentLabel.textContent = String(current + 1).padStart(2, "0");
      }
    };
    var previous = doc.querySelector("[data-story-prev]");
    var next = doc.querySelector("[data-story-next]");
    if (previous) {
      previous.addEventListener("click", function () {
        showStory(current - 1);
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        showStory(current + 1);
      });
    }
    stories.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showStory(current - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showStory(current + 1);
      }
    });
    showStory(0);
  }

  /* Claims FAQ accordion */
  var accordion = doc.querySelector("[data-claims-accordion]");
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
          otherButton.closest(".claims-faq-item").classList.remove("is-open");
        });
        if (shouldOpen && answer) {
          button.setAttribute("aria-expanded", "true");
          answer.hidden = false;
          button.closest(".claims-faq-item").classList.add("is-open");
        }
      });
    });
  }
})();
