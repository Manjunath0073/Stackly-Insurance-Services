(function () {
  "use strict";

  var doc = document;
  var body = doc.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  body.classList.add("products-js-ready");

  /* Hero headline and flagship clip reveal */
  var heroCopy = doc.querySelector(".products-hero-copy");
  if (heroCopy) {
    window.requestAnimationFrame(function () {
      window.setTimeout(function () {
        heroCopy.classList.add("is-products-hero-visible");
      }, reduceMotion ? 0 : 140);
    });
  }

  var spotlightMain = doc.querySelector(".products-spotlight-main");
  if (spotlightMain && "IntersectionObserver" in window) {
    var spotlightObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          spotlightMain.classList.add("is-clip-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    spotlightObserver.observe(spotlightMain);
  } else if (spotlightMain) {
    spotlightMain.classList.add("is-clip-visible");
  }

  /* Hero image depth */
  var heroCollage = doc.querySelector("[data-products-parallax]");
  if (heroCollage && !reduceMotion) {
    heroCollage.addEventListener("pointermove", function (event) {
      if (event.pointerType !== "mouse") {
        return;
      }
      var bounds = heroCollage.getBoundingClientRect();
      var x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 15;
      var y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 11;
      heroCollage.style.setProperty("--products-parallax-x", x.toFixed(2) + "px");
      heroCollage.style.setProperty("--products-parallax-y", y.toFixed(2) + "px");
    });
    heroCollage.addEventListener("pointerleave", function () {
      heroCollage.style.setProperty("--products-parallax-x", "0px");
      heroCollage.style.setProperty("--products-parallax-y", "0px");
    });
  }

  /* Flagship content tabs */
  var spotlightTabs = Array.from(doc.querySelectorAll("[data-spotlight-tab]"));
  var spotlightPanels = Array.from(doc.querySelectorAll("[data-spotlight-panel]"));
  spotlightTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var name = tab.dataset.spotlightTab;
      spotlightTabs.forEach(function (item) {
        var active = item === tab;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
      });
      spotlightPanels.forEach(function (panel) {
        panel.hidden = panel.dataset.spotlightPanel !== name;
        panel.classList.toggle("is-active", panel.dataset.spotlightPanel === name);
      });
    });
  });

  /* Live coverage builder */
  var builder = doc.querySelector("[data-products-builder]");
  if (builder) {
    var builderImage = builder.querySelector("[data-builder-image]");
    var builderLevel = builder.querySelector("[data-builder-level]");
    var builderLevelOutput = builder.querySelector("[data-builder-level-output]");
    var builderEstimate = builder.querySelector("[data-builder-estimate]");
    var builderCopy = builder.querySelector("[data-builder-copy]");
    var builderMiniTitle = builder.querySelector("[data-builder-mini-title]");
    var builderMiniPrice = builder.querySelector("[data-builder-mini-price]");
    var builderRing = builder.querySelector("[data-builder-ring]");
    var builderRingValue = builder.querySelector("[data-builder-ring-value]");
    var builderType = "home";
    var builderLevelValue = 2;
    var builderData = {
      home: { title: "Home cover", alt: "Warm family home ready for thoughtful protection", image: "assets/images/products/products-builder-home.webp", prices: [38, 48, 72], copy: ["Core protection for the place you call home.", "Home cover with flexible replacement protection and a human claims guide.", "Expanded home cover for the details you would notice most."] },
      auto: { title: "Auto cover", alt: "Open road ready for a considered journey", image: "assets/images/products/products-builder-road.webp", prices: [32, 44, 68], copy: ["The essentials for everyday journeys.", "Roadside support, clear cover, and room to keep moving.", "Broader protection for the road and everything around it."] },
      health: { title: "Health cover", alt: "Warm family home ready for thoughtful protection", image: "assets/images/products/products-builder-home.webp", prices: [64, 84, 118], copy: ["A clear starting point for your care.", "Helpful navigation and room to focus on feeling better.", "Broader options for the people and care you plan around."] },
      travel: { title: "Travel cover", alt: "Open road ready for a considered journey", image: "assets/images/products/products-builder-road.webp", prices: [14, 22, 34], copy: ["A simple backup for the plans ahead.", "Worldwide support for the parts you cannot plan.", "More detail for longer, farther, more ambitious trips."] }
    };

    var updateBuilder = function () {
      var current = builderData[builderType];
      var price = current.prices[builderLevelValue - 1];
      var labels = ["Essentials", "Balanced", "Extra calm"];

      if (builderImage) {
        builderImage.src = current.image;
        builderImage.alt = current.alt;
      }
      if (builderLevelOutput) {
        builderLevelOutput.textContent = labels[builderLevelValue - 1];
      }
      if (builderEstimate) {
        builderEstimate.classList.add("is-changing");
        window.setTimeout(function () {
          builderEstimate.innerHTML = "$" + price + " <small>/ month</small>";
          builderEstimate.classList.remove("is-changing");
        }, reduceMotion ? 0 : 120);
      }
      if (builderCopy) {
        builderCopy.classList.add("is-changing");
        window.setTimeout(function () {
          builderCopy.textContent = current.copy[builderLevelValue - 1];
          builderCopy.classList.remove("is-changing");
        }, reduceMotion ? 0 : 120);
      }
      if (builderMiniTitle) {
        builderMiniTitle.textContent = current.title;
      }
      if (builderMiniPrice) {
        builderMiniPrice.textContent = "$" + price + " / mo";
      }
      if (builderRingValue) {
        builderRingValue.textContent = builderLevelValue;
      }
      if (builderRing) {
        builderRing.style.transform = "rotate(" + (-35 + (builderLevelValue - 1) * 90) + "deg)";
      }
    };

    builder.querySelectorAll("[data-builder-type]").forEach(function (button) {
      button.addEventListener("click", function () {
        builderType = button.dataset.builderType;
        builder.querySelectorAll("[data-builder-type]").forEach(function (item) {
          var active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", active ? "true" : "false");
        });
        updateBuilder();
      });
    });

    if (builderLevel) {
      builderLevel.addEventListener("input", function () {
        builderLevelValue = Number(builderLevel.value);
        updateBuilder();
      });
    }

    updateBuilder();
  }

  /* Products proof counters */
  var productCounters = doc.querySelectorAll("[data-products-counter]");
  var formatProductNumber = function (value, element) {
    var decimals = Number(element.dataset.productsDecimals || 0);
    return value.toFixed(decimals);
  };
  var animateProductCounter = function (element) {
    if (element.dataset.productsCounted === "true") {
      return;
    }
    element.dataset.productsCounted = "true";
    var target = Number(element.dataset.productsCounter);
    if (reduceMotion) {
      element.textContent = formatProductNumber(target, element);
      return;
    }
    var start = performance.now();
    var tick = function (now) {
      var progress = Math.min((now - start) / 1200, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = formatProductNumber(target * eased, element);
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      }
    };
    window.requestAnimationFrame(tick);
  };

  if (productCounters.length && "IntersectionObserver" in window) {
    var productCounterObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateProductCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.55 });
    productCounters.forEach(function (counter) {
      productCounterObserver.observe(counter);
    });
  } else {
    productCounters.forEach(animateProductCounter);
  }

  /* Proof carousel */
  var slider = doc.querySelector("[data-products-slider]");
  if (slider) {
    var proofSlides = Array.from(slider.querySelectorAll("[data-proof-slide]"));
    var currentProof = 0;
    var currentLabel = doc.querySelector("[data-proof-current]");

    var showProof = function (index) {
      currentProof = (index + proofSlides.length) % proofSlides.length;
      proofSlides.forEach(function (slide, slideIndex) {
        var active = slideIndex === currentProof;
        slide.hidden = !active;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
      });
      if (currentLabel) {
        currentLabel.textContent = String(currentProof + 1).padStart(2, "0");
      }
    };

    var proofPrev = doc.querySelector("[data-proof-prev]");
    var proofNext = doc.querySelector("[data-proof-next]");
    if (proofPrev) {
      proofPrev.addEventListener("click", function () {
        showProof(currentProof - 1);
      });
    }
    if (proofNext) {
      proofNext.addEventListener("click", function () {
        showProof(currentProof + 1);
      });
    }
    slider.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showProof(currentProof - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showProof(currentProof + 1);
      }
    });
    showProof(0);
  }

  /* Pricing FAQ accordion */
  var accordion = doc.querySelector("[data-products-accordion]");
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
          otherButton.closest(".products-faq-item").classList.remove("is-open");
        });
        if (shouldOpen && answer) {
          button.setAttribute("aria-expanded", "true");
          answer.hidden = false;
          button.closest(".products-faq-item").classList.add("is-open");
        }
      });
    });
  }
})();
