/* ==========================================================================
   Stackly 404 page interactions
   Page-specific only. Shared behavior (header, nav, reveals) lives in main.js.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var body = doc.body;
  var HOME_URL = "index.html";

  var init = function () {
    body.classList.add("notfound-js-ready");

    /* Go Back button. Uses window.history.back(). When there is no usable
       history entry (document.referrer is empty or history.length <= 1) we
       fall back to the homepage so the button always does something useful. */
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
  };

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();