(function () {
  "use strict";

  var form = document.querySelector("[data-login-form]");
  if (!form || !window.StacklyAuth) {
    return;
  }

  var auth = window.StacklyAuth;
  var email = document.getElementById("login-email");
  var password = document.getElementById("login-password");
  var submit = form.querySelector("[data-auth-submit]");
  var toast = document.querySelector("[data-auth-toast]");
  var role = "";

  auth.initRoleGroup(form, function (value) {
    role = value;
    var roleError = form.querySelector("[data-role-error]");
    if (roleError) roleError.textContent = "";
    updateSubmit();
  });
  auth.initPasswordToggles(form);

  var validate = function () {
    var valid = true;
    var roleError = form.querySelector("[data-role-error]");
    if (!role) {
      if (roleError) roleError.textContent = "Choose Customer or Agent.";
      valid = false;
    } else if (roleError) {
      roleError.textContent = "";
    }

    var emailValue = email.value.trim();
    if (!emailValue) {
      auth.setError(email, "Enter your email address.");
      valid = false;
    } else if (!auth.isEmail(emailValue)) {
      auth.setError(email, "Enter a valid email address, e.g. name@example.com.");
      valid = false;
    } else {
      auth.setError(email, "");
    }

    if (!password.value) {
      auth.setError(password, "Enter your password.");
      valid = false;
    } else if (/\s/.test(password.value)) {
      auth.setError(password, "Password cannot contain spaces.");
      valid = false;
    } else if (password.value.length < 8) {
      auth.setError(password, "Password must be at least 8 characters.");
      valid = false;
    } else {
      auth.setError(password, "");
    }
    return valid;
  };

  var updateSubmit = function () {
    submit.disabled = !role || !email.value.trim() || !password.value;
  };

  [email, password].forEach(function (field) {
    field.addEventListener("blur", validate);
    field.addEventListener("input", function () {
      updateSubmit();
      if (field.getAttribute("aria-invalid") === "true") {
        validate();
      }
    });
  });

  var showToast = function (message, isError) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.toggle("auth-toast-error", Boolean(isError));
  };

  var resetSubmit = function () {
    submit.classList.remove("is-loading");
    submit.innerHTML = '<span class="auth-submit-label">Continue <span aria-hidden="true">&rarr;</span></span>';
    submit.disabled = false;
  };

  /* Build a friendly display name when a demo account is created on the fly. */
  var nameFromEmail = function (value) {
    var local = String(value || "").split("@")[0] || "Stackly Member";
    return local.split(/[._-]+/).filter(Boolean).map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join(" ") || "Stackly Member";
  };

  /* Only allow a same-folder page as the post-login destination. */
  var redirectTarget = function (userRole) {
    var next = "";
    try {
      next = new URLSearchParams(window.location.search).get("next") || "";
    } catch (error) {
      next = "";
    }
    if (/^[a-z0-9-]+\.html$/i.test(next)) {
      return next;
    }
    return userRole === "agent" ? "agent-dashboard.html" : "customer-dashboard.html";
  };

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    submit.disabled = true;
    submit.classList.add("is-loading");
    submit.innerHTML = '<span aria-hidden="true"></span><span class="auth-submit-label">Checking your details...</span>';

    window.setTimeout(function () {
      var store = window.StacklyStore;
      var emailValue = email.value.trim().toLowerCase();
      var user = store ? store.getUserByEmail(emailValue) : null;

      /* Role guard: an email is tied to the role it was created with. */
      if (store && user && user.role !== role) {
        resetSubmit();
        showToast("That email is registered as a " + (user.role === "agent" ? "Agent" : "Customer") + " account. Switch role to continue.", true);
        return;
      }

      /* Demo convenience: create a lightweight account if none exists yet.
         No password is ever stored. */
      if (store && !user) {
        user = store.createUser({
          fullName: nameFromEmail(emailValue),
          email: emailValue,
          role: role
        });
      }

      if (store && user) {
        store.setSession(user);
      }

      resetSubmit();
      showToast("Signed in as " + (role === "agent" ? "Agent" : "Customer") + ". Opening your dashboard...", false);
      window.setTimeout(function () {
        window.location.href = redirectTarget(role);
      }, 650);
    }, 850);
  });
})();
