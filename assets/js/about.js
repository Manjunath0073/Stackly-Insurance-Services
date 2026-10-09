(function () {
  "use strict";

  var doc = document;
  var body = doc.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  body.classList.add("about-js-ready");

  /* Staggered hero headline mask reveal */
  var heroCopy = doc.querySelector(".about-hero-copy");
  if (heroCopy) {
    window.requestAnimationFrame(function () {
      window.setTimeout(function () {
        heroCopy.classList.add("is-about-hero-visible");
      }, reduceMotion ? 0 : 140);
    });
  }

  /* Signature timeline progress */
  var timeline = doc.querySelector("[data-about-timeline]");
  var timelineItems = timeline ? Array.from(timeline.querySelectorAll("[data-timeline-item]")) : [];
  var timelineProgress = timeline ? timeline.querySelector("[data-timeline-progress]") : null;

  var updateTimeline = function () {
    if (!timeline || !timelineItems.length) {
      return;
    }

    var bounds = timeline.getBoundingClientRect();
    var trigger = window.innerHeight * 0.62;
    var progress = (trigger - bounds.top) / Math.max(bounds.height, 1);
    var clampedProgress = Math.min(Math.max(progress, 0.08), 1);

    if (timelineProgress) {
      timelineProgress.style.height = clampedProgress * 100 + "%";
    }

    var activeIndex = 0;
    timelineItems.forEach(function (item, index) {
      var itemTop = item.getBoundingClientRect().top;
      if (itemTop < trigger) {
        item.classList.add("is-past");
        activeIndex = index;
      } else {
        item.classList.remove("is-past");
      }
    });

    timelineItems.forEach(function (item, index) {
      item.classList.toggle("is-active", index === activeIndex);
    });
  };

  if (timeline) {
    updateTimeline();
    window.addEventListener("scroll", updateTimeline, { passive: true });
    window.addEventListener("resize", updateTimeline, { passive: true });
  }

  /* About-page count-up stats */
  var aboutCounters = doc.querySelectorAll("[data-about-counter]");
  var formatNumber = function (value, element) {
    var decimals = Number(element.dataset.aboutDecimals || 0);
    if (element.dataset.aboutFormat === "compact" && value >= 1000) {
      return (value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(".0", "") + "k";
    }
    return value.toFixed(decimals);
  };

  var animateCounter = function (element) {
    if (element.dataset.aboutCounted === "true") {
      return;
    }

    element.dataset.aboutCounted = "true";
    var target = Number(element.dataset.aboutCounter);

    if (reduceMotion) {
      element.textContent = formatNumber(target, element);
      return;
    }

    var start = performance.now();
    var tick = function (now) {
      var progress = Math.min((now - start) / 1400, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = formatNumber(target * eased, element);
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      }
    };

    window.requestAnimationFrame(tick);
  };

  if (aboutCounters.length && "IntersectionObserver" in window) {
    var counterObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    aboutCounters.forEach(function (counter) {
      counterObserver.observe(counter);
    });
  } else {
    aboutCounters.forEach(animateCounter);
  }

  if (reduceMotion) {
    return;
  }

  /* Image cluster depth */
  var heroCollage = doc.querySelector("[data-about-parallax]");
  if (heroCollage) {
    heroCollage.addEventListener("pointermove", function (event) {
      if (event.pointerType !== "mouse") {
        return;
      }
      var bounds = heroCollage.getBoundingClientRect();
      var x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 16;
      var y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 12;
      heroCollage.style.setProperty("--about-parallax-x", x.toFixed(2) + "px");
      heroCollage.style.setProperty("--about-parallax-y", y.toFixed(2) + "px");
    });
    heroCollage.addEventListener("pointerleave", function () {
      heroCollage.style.setProperty("--about-parallax-x", "0px");
      heroCollage.style.setProperty("--about-parallax-y", "0px");
    });
  }

  /* Pillar card tilt */
  doc.querySelectorAll("[data-about-tilt]").forEach(function (card) {
    card.addEventListener("pointermove", function (event) {
      if (event.pointerType !== "mouse") {
        return;
      }
      var bounds = card.getBoundingClientRect();
      var x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 5;
      var y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -5;
      card.style.transform = "perspective(900px) rotateX(" + y.toFixed(2) + "deg) rotateY(" + x.toFixed(2) + "deg) translateY(-5px)";
    });
    card.addEventListener("pointerleave", function () {
      card.style.transform = "";
    });
  });

})();
