(function () {
  "use strict";

  var doc = document;
  var body = doc.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  body.classList.add("contact-js-ready");

  var heroCopy = doc.querySelector(".contact-hero-copy");
  if (heroCopy) {
    window.requestAnimationFrame(function () {
      window.setTimeout(function () {
        heroCopy.classList.add("is-contact-hero-visible");
      }, reduceMotion ? 0 : 130);
    });
  }

  /* Lazy OpenStreetMap initialization */
  var mapWrap = doc.querySelector("[data-contact-map]");
  var mapFrame = mapWrap ? mapWrap.querySelector("iframe[data-map-src]") : null;
  if (mapWrap && mapFrame) {
    var loadMap = function () {
      if (mapFrame.dataset.loaded === "true") {
        return;
      }
      mapFrame.addEventListener("load", function () {
        mapWrap.classList.add("is-loaded");
      }, { once: true });
      mapFrame.src = mapFrame.dataset.mapSrc;
      mapFrame.dataset.loaded = "true";
    };
    if ("IntersectionObserver" in window) {
      var mapObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            loadMap();
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: "180px" });
      mapObserver.observe(mapWrap);
    } else {
      loadMap();
    }
  }

  /* Contact form validation and success state */
  var form = doc.querySelector("[data-contact-form]");
  var success = doc.querySelector("[data-contact-success]");
  var resetButton = doc.querySelector("[data-contact-reset]");
  if (form) {
    var fieldIds = ["contact-name", "contact-email", "contact-phone", "contact-type", "contact-message"];

    var rules = {
      "contact-name": {
        test: function (value) {
          return value.length >= 2 && /^[A-Za-z\u00C0-\u017F' -]+$/.test(value);
        },
        invalid: "Only letters are allowed in your name.",
        fallback: "Please enter your full name."
      },
      "contact-email": {
        test: function (value) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        fallback: "Enter a valid email address."
      },
      "contact-phone": {
        optional: true,
        test: function (value) {
          var digits = value.replace(/\D/g, "");
          return /^[+()\-.\s\d]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
        },
        fallback: "Enter a valid phone number."
      },
      "contact-type": {
        test: function (value) {
          return value.length > 0;
        },
        fallback: "Please choose a topic."
      },
      "contact-message": {
        test: function (value) {
          return value.length >= 12 && value.length <= 2000;
        },
        invalid: "Your message must be between 12 and 2000 characters.",
        fallback: "A little more detail will help us help you."
      }
    };

    var setFieldError = function (field, message) {
      var error = doc.querySelector('[data-error-for="' + field.id + '"]');
      field.classList.toggle("has-error", Boolean(message));
      if (error) {
        error.textContent = message || "";
      }
    };

    var validateField = function (field) {
      var rule = rules[field.id];
      if (!rule) {
        return "";
      }
      var value = field.value.trim();
      if (rule.optional && !value) {
        return "";
      }
      if (!value) {
        return rule.fallback || "This field is required.";
      }
      if (!rule.test(value)) {
        return rule.invalid || rule.fallback || "This value is not valid.";
      }
      return "";
    };

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var firstInvalid = null;
      var valid = true;
      fieldIds.forEach(function (id) {
        var field = doc.getElementById(id);
        if (!field) {
          return;
        }
        var message = validateField(field);
        setFieldError(field, message);
        if (message) {
          valid = false;
          firstInvalid = firstInvalid || field;
        }
      });
      if (!valid) {
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }
      form.hidden = true;
      if (success) {
        success.hidden = false;
      }
    });

    fieldIds.forEach(function (id) {
      var field = doc.getElementById(id);
      if (!field) {
        return;
      }
      field.addEventListener("input", function () {
        if (id === "contact-name") {
          var cleaned = field.value.replace(/[^A-Za-z\u00C0-\u017F' -]/g, "");
          if (cleaned !== field.value) {
            field.value = cleaned;
          }
        }
        if (id === "contact-phone") {
          var digits = field.value.replace(/[^+()\-.\s\d]/g, "");
          if (digits !== field.value) {
            field.value = digits;
          }
        }
        if (field.value.trim() || field.classList.contains("has-error")) {
          setFieldError(field, validateField(field));
        }
      });
      field.addEventListener("change", function () {
        setFieldError(field, validateField(field));
      });
      field.addEventListener("blur", function () {
        setFieldError(field, validateField(field));
      });
    });
  }

  if (resetButton && form && success) {
    resetButton.addEventListener("click", function () {
      success.hidden = true;
      form.hidden = false;
      form.reset();
      var firstField = doc.getElementById("contact-name");
      if (firstField) {
        firstField.focus();
      }
    });
  }

  /* FAQ accordion */
  var accordion = doc.querySelector("[data-contact-accordion]");
  if (accordion) {
    var buttons = accordion.querySelectorAll("button");
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var answer = doc.getElementById(button.getAttribute("aria-controls"));
        var shouldOpen = button.getAttribute("aria-expanded") !== "true";
        buttons.forEach(function (otherButton) {
          var otherAnswer = doc.getElementById(otherButton.getAttribute("aria-controls"));
          otherButton.setAttribute("aria-expanded", "false");
          if (otherAnswer) {
            otherAnswer.hidden = true;
          }
          otherButton.closest(".contact-faq-item").classList.remove("is-open");
        });
        if (shouldOpen && answer) {
          button.setAttribute("aria-expanded", "true");
          answer.hidden = false;
          button.closest(".contact-faq-item").classList.add("is-open");
        }
      });
    });
  }
})();
