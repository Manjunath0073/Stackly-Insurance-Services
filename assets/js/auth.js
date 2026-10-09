(function (window) {
  "use strict";

  var emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
  var phonePattern = /^\+?[0-9\s().-]{7,20}$/;
  /* Letters (with accents) grouped into name parts separated by a single
     space, hyphen or apostrophe — e.g. "Accept", "Mary-Jane", "O'Brien". */
  var namePattern = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;

  var setError = function (field, message) {
    if (!field) {
      return;
    }
    var errorId = field.getAttribute("aria-describedby");
    var error = errorId ? document.getElementById(errorId) : null;
    field.setAttribute("aria-invalid", message ? "true" : "false");
    field.classList.toggle("auth-invalid", Boolean(message));
    field.classList.toggle("auth-valid", !message && Boolean(field.value));
    if (error) {
      error.textContent = message || "";
    }
  };

  var getRole = function (form) {
    var input = form ? form.querySelector("[data-role-input]") : null;
    return input ? input.value : "";
  };

  var initRoleGroup = function (form, onChange) {
    if (!form) {
      return;
    }
    var group = form.querySelector("[data-role-group]");
    var input = form.querySelector("[data-role-input]");
    if (!group || !input) {
      return;
    }
    var options = Array.from(group.querySelectorAll("[data-role-value]"));
    var select = function (option) {
      input.value = option.dataset.roleValue;
      options.forEach(function (item) {
        var active = item === option;
        item.setAttribute("aria-checked", active ? "true" : "false");
      });
      var error = form.querySelector("[data-role-error]");
      if (error) {
        error.textContent = "";
      }
      if (onChange) {
        onChange(input.value);
      }
    };
    options.forEach(function (option, index) {
      option.addEventListener("click", function () {
        select(option);
      });
      option.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
          return;
        }
        event.preventDefault();
        var nextIndex = event.key === "ArrowRight" ? (index + 1) % options.length : (index - 1 + options.length) % options.length;
        options[nextIndex].focus();
        select(options[nextIndex]);
      });
    });
  };

  var initPasswordToggles = function (scope) {
    (scope || document).querySelectorAll("[data-password-toggle]").forEach(function (button) {
      button.addEventListener("click", function () {
        var input = document.getElementById(button.getAttribute("aria-controls"));
        if (!input) {
          return;
        }
        var showing = input.type === "text";
        input.type = showing ? "password" : "text";
        button.textContent = showing ? "Show" : "Hide";
        button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      });
    });
  };

  var isEmail = function (value) {
    return emailPattern.test(value.trim());
  };

  var isPhone = function (value) {
    return phonePattern.test(value.trim());
  };

  var isName = function (value) {
    var clean = String(value || "").trim();
    return clean.length >= 2 && namePattern.test(clean);
  };

  var passwordScore = function (value) {
    var score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[a-z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score;
  };

  /* Per-rule password checks used for live feedback and strict validation. */
  var passwordChecks = function (value) {
    var text = String(value || "");
    return {
      length: text.length >= 8,
      upper: /[A-Z]/.test(text),
      lower: /[a-z]/.test(text),
      number: /[0-9]/.test(text),
      special: /[^A-Za-z0-9]/.test(text),
      noSpace: text.length > 0 && !/\s/.test(text)
    };
  };

  var isStrongPassword = function (value) {
    var checks = passwordChecks(value);
    return checks.length && checks.upper && checks.lower && checks.number && checks.special && checks.noSpace;
  };

  window.StacklyAuth = {
    emailPattern: emailPattern,
    setError: setError,
    getRole: getRole,
    initRoleGroup: initRoleGroup,
    initPasswordToggles: initPasswordToggles,
    isEmail: isEmail,
    isPhone: isPhone,
    isName: isName,
    passwordScore: passwordScore,
    passwordChecks: passwordChecks,
    isStrongPassword: isStrongPassword
  };
})(window);
