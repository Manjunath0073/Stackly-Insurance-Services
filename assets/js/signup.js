(function () {
  "use strict";

  var form = document.querySelector("[data-signup-form]");
  if (!form || !window.StacklyAuth) {
    return;
  }

  var auth = window.StacklyAuth;
  var steps = Array.from(form.querySelectorAll("[data-signup-step]"));
  var currentStep = 1;
  var role = "";
  var progress = form.querySelector("[data-signup-progress]");
  var stepLabel = form.querySelector("[data-signup-step-label]");
  var nextButton = form.querySelector("[data-signup-next]");
  var backButton = form.querySelector("[data-signup-back]");
  var submitButton = form.querySelector("[data-signup-submit]");
  var success = document.querySelector("[data-signup-success]");
  var password = document.getElementById("signup-password");
  var strengthBar = form.querySelector("[data-password-strength]");
  var strengthLabel = form.querySelector("[data-password-strength-label]");
  var pwRules = Array.from(form.querySelectorAll("[data-pw-rule]"));

  var field = function (id) { return document.getElementById(id); };
  var error = function (id) { return document.querySelector('[data-error-for="' + id + '"]'); };
  var showFieldError = function (id, message) { auth.setError(field(id), message); };

  var updateRoleFields = function (value) {
    role = value;
    form.querySelectorAll("[data-role-only]").forEach(function (wrapper) {
      var visible = wrapper.dataset.roleOnly === value;
      wrapper.classList.toggle("is-visible", visible);
      wrapper.hidden = !visible;
      var input = wrapper.querySelector("input, select");
      if (input) {
        input.required = visible;
        if (!visible) {
          input.value = "";
          auth.setError(input, "");
        }
      }
    });
    var summaryRole = form.querySelector("[data-summary-role]");
    if (summaryRole) {
      summaryRole.textContent = value === "agent" ? "Agent" : "Customer (Policyholder)";
    }
    updateActions();
  };

  auth.initRoleGroup(form, updateRoleFields);
  auth.initPasswordToggles(form);

  var validateStep = function (step) {
    var valid = true;
    if (step === 1) {
      if (!role) {
        var roleError = form.querySelector("[data-role-error]");
        if (roleError) roleError.textContent = "Choose Customer or Agent.";
        valid = false;
      }
      var name = field("signup-name");
      var email = field("signup-email");
      var confirmEmail = field("signup-email-confirm");
      if (!auth.isName(name.value)) { showFieldError("signup-name", "Enter a valid name using letters, spaces, hyphens or apostrophes."); valid = false; } else showFieldError("signup-name", "");
      if (!auth.isEmail(email.value)) { showFieldError("signup-email", "Enter a valid email address, e.g. name@example.com."); valid = false; } else showFieldError("signup-email", "");
      if (!confirmEmail.value || confirmEmail.value.trim().toLowerCase() !== email.value.trim().toLowerCase()) { showFieldError("signup-email-confirm", "Email addresses must match."); valid = false; } else showFieldError("signup-email-confirm", "");
      var confirmPassword = field("signup-password-confirm");
      if (!auth.isStrongPassword(password.value)) { showFieldError("signup-password", "Use 8+ characters with upper and lower case, a number, and a symbol (no spaces)."); valid = false; } else showFieldError("signup-password", "");
      if (!confirmPassword.value || confirmPassword.value !== password.value) { showFieldError("signup-password-confirm", "Passwords must match."); valid = false; } else showFieldError("signup-password-confirm", "");
    }
    if (step === 2) {
      var phone = field("signup-phone");
      var country = field("signup-country");
      if (!auth.isPhone(phone.value)) { showFieldError("signup-phone", "Enter a valid phone number."); valid = false; } else showFieldError("signup-phone", "");
      if (!country.value) { showFieldError("signup-country", "Choose your country or region."); valid = false; } else showFieldError("signup-country", "");
      var conditional = role === "agent" ? field("signup-agency-id") : field("signup-policy-interest");
      if (!conditional.value) { showFieldError(conditional.id, role === "agent" ? "Enter your license or agency ID." : "Choose what you are protecting first."); valid = false; } else showFieldError(conditional.id, "");
    }
    if (step === 3) {
      var terms = field("signup-terms");
      if (!terms.checked) { auth.setError(terms, "You need to accept the terms to continue."); valid = false; } else auth.setError(terms, "");
    }
    return valid;
  };

  var updatePasswordMeter = function () {
    var score = auth.passwordScore(password.value);
    var labels = ["", "Starting", "Getting stronger", "Good", "Strong", "Ready"];
    if (strengthBar) {
      strengthBar.style.width = (score / 5) * 100 + "%";
      strengthBar.style.backgroundColor = score < 3 ? "#c74b55" : score < 5 ? "#d39a4b" : "#4d9b76";
    }
    if (strengthLabel) {
      strengthLabel.textContent = labels[score];
    }
  };

  var updatePasswordRules = function () {
    var checks = auth.passwordChecks(password.value);
    pwRules.forEach(function (item) {
      item.classList.toggle("is-met", Boolean(checks[item.dataset.pwRule]));
    });
  };

  var renderStep = function (direction) {
    steps.forEach(function (step) {
      var active = Number(step.dataset.signupStep) === currentStep;
      step.hidden = !active;
      step.classList.toggle("is-entering", active && direction !== 0);
    });
    if (progress) progress.style.width = (currentStep / steps.length) * 100 + "%";
    if (stepLabel) stepLabel.textContent = String(currentStep).padStart(2, "0") + " / " + String(steps.length).padStart(2, "0");
    if (backButton) backButton.hidden = currentStep === 1;
    if (nextButton) nextButton.hidden = currentStep === 3;
    if (submitButton) submitButton.disabled = currentStep !== 3 || !field("signup-terms").checked;
    var summaryName = form.querySelector("[data-summary-name]");
    var summaryEmail = form.querySelector("[data-summary-email]");
    if (summaryName) summaryName.textContent = field("signup-name").value || "Your name";
    if (summaryEmail) summaryEmail.textContent = field("signup-email").value || "Your email";
  };

  var updateActions = function () {
    if (currentStep === 1 && nextButton) nextButton.disabled = !role;
    if (currentStep === 3 && submitButton) submitButton.disabled = !field("signup-terms").checked;
  };

  nextButton.addEventListener("click", function () {
    if (!validateStep(currentStep)) return;
    currentStep = Math.min(currentStep + 1, steps.length);
    renderStep(1);
  });
  backButton.addEventListener("click", function () {
    currentStep = Math.max(currentStep - 1, 1);
    renderStep(-1);
  });

  password.addEventListener("input", function () {
    updatePasswordMeter();
    updatePasswordRules();
    if (password.getAttribute("aria-invalid") === "true") {
      validateStep(1);
    }
  });
  form.querySelectorAll("input, select").forEach(function (input) {
    input.addEventListener("blur", function () {
      if (currentStep === 1) validateStep(1);
      if (currentStep === 2) validateStep(2);
      updateActions();
    });
    input.addEventListener("input", function () {
      updateActions();
      if (input.getAttribute("aria-invalid") === "true") {
        if (currentStep === 1) validateStep(1);
        if (currentStep === 2) validateStep(2);
      }
    });
    input.addEventListener("change", updateActions);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!validateStep(3)) return;
    submitButton.disabled = true;
    submitButton.classList.add("is-loading");
    submitButton.innerHTML = '<span aria-hidden="true"></span><span class="auth-submit-label">Creating your account...</span>';
    window.setTimeout(function () {
      var store = window.StacklyStore;
      if (store) {
        /* Persist the non-sensitive profile only. Passwords are never stored. */
        var payload = {
          fullName: field("signup-name").value.trim(),
          email: field("signup-email").value.trim().toLowerCase(),
          phone: field("signup-phone").value.trim(),
          country: field("signup-country").value,
          role: role,
          policyInterest: role === "customer" ? field("signup-policy-interest").value : "",
          agencyId: role === "agent" ? field("signup-agency-id").value.trim() : ""
        };
        var existing = store.getUserByEmail(payload.email);
        var user = existing ? store.updateUser(existing.id, payload) : store.createUser(payload);
        store.setSession(user || existing);

        var dashboardLink = document.querySelector("[data-signup-dashboard]");
        if (dashboardLink) {
          dashboardLink.setAttribute("href", role === "agent" ? "agent-dashboard.html" : "customer-dashboard.html");
          dashboardLink.innerHTML = (role === "agent" ? "Open the agent workspace" : "Go to my dashboard") + ' <span aria-hidden="true">&rarr;</span>';
        }
      }
      form.hidden = true;
      if (success) success.hidden = false;
    }, 950);
  });

  renderStep(0);
  updatePasswordMeter();
  updatePasswordRules();
})();
