// Lina's — Coming Soon page behaviour: countdown (hidden until a launch
// date is configured), promo region (hidden until enabled), and the
// Private Preview password dialog. enquiry-submit.js handles the form.
(function () {
  "use strict";

  /* ---------- Countdown + promo, driven by /api/coming-soon/config ---------- */

  function pad(n) { return String(n).padStart(2, "0"); }

  function startCountdown(launchAtIso) {
    var region = document.getElementById("countdownRegion");
    var target = new Date(launchAtIso).getTime();
    var dEl = document.getElementById("cdDays");
    var hEl = document.getElementById("cdHours");
    var mEl = document.getElementById("cdMinutes");
    var sEl = document.getElementById("cdSeconds");
    var textEl = document.getElementById("countdownText");
    var timer = null;

    function tick() {
      var diffMs = target - Date.now();
      if (diffMs <= 0) {
        clearInterval(timer);
        region.querySelector(".cs-countdown__grid").hidden = true;
        region.querySelector(".cs-countdown__label").textContent = "Lina's is launching now.";
        textEl.textContent = "Lina's is launching now.";
        return;
      }
      var totalSeconds = Math.floor(diffMs / 1000);
      var days = Math.floor(totalSeconds / 86400);
      var hours = Math.floor((totalSeconds % 86400) / 3600);
      var minutes = Math.floor((totalSeconds % 3600) / 60);
      var seconds = totalSeconds % 60;
      dEl.textContent = days;
      hEl.textContent = pad(hours);
      mEl.textContent = pad(minutes);
      sEl.textContent = pad(seconds);
      textEl.textContent = days + " days, " + hours + " hours, " + minutes + " minutes and " + seconds + " seconds until launch.";
    }

    region.hidden = false;
    tick();
    timer = setInterval(tick, 1000);
  }

  fetch("/api/coming-soon/config")
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data || !data.ok) return;
      // Absent/invalid launchAt ⇒ the region stays hidden. Never a fabricated
      // date, never a countdown showing zeroes.
      if (data.launchAt) startCountdown(data.launchAt);
      if (data.promoEnabled && data.promoText) {
        document.getElementById("promoText").textContent = data.promoText;
        document.getElementById("promoRegion").hidden = false;
      }
    })
    .catch(function () {
      // Countdown/promo are enhancements, not the page's job — a failed
      // config fetch simply leaves both regions hidden.
    });

  /* ---------- Private Preview modal ---------- */

  var openBtn = document.getElementById("privatePreviewOpen");
  var backdrop = document.getElementById("previewModalBackdrop");
  var modal = document.getElementById("previewModal");
  var closeBtn = document.getElementById("previewModalClose");
  var cancelBtn = document.getElementById("previewModalCancel");
  var form = document.getElementById("previewForm");
  var passwordInput = document.getElementById("previewPassword");
  var toggleBtn = document.getElementById("previewPasswordToggle");
  var status = document.getElementById("previewModalStatus");
  var submitBtn = document.getElementById("previewModalSubmit");
  var submitting = false;
  var lastFocused = null;

  function getFocusable() {
    return Array.prototype.slice.call(
      modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
  }

  function openModal() {
    lastFocused = document.activeElement;
    backdrop.hidden = false;
    status.textContent = "";
    status.removeAttribute("data-state");
    passwordInput.value = "";
    passwordInput.type = "password";
    toggleBtn.textContent = "Show";
    toggleBtn.setAttribute("aria-pressed", "false");
    passwordInput.focus();
    document.addEventListener("keydown", onKeydown);
  }

  function closeModal() {
    backdrop.hidden = true;
    document.removeEventListener("keydown", onKeydown);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    if (e.key === "Tab") {
      var focusable = getFocusable();
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  if (openBtn) openBtn.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
  if (backdrop) {
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeModal();
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      var showing = passwordInput.type === "text";
      passwordInput.type = showing ? "password" : "text";
      toggleBtn.textContent = showing ? "Show" : "Hide";
      toggleBtn.setAttribute("aria-pressed", String(!showing));
      passwordInput.focus();
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (submitting) return; // prevents repeated submissions while processing
      var password = passwordInput.value;
      if (!password) {
        status.textContent = "Please enter the preview password.";
        status.setAttribute("data-state", "error");
        return;
      }

      submitting = true;
      modal.setAttribute("aria-busy", "true");
      submitBtn.disabled = true;
      status.textContent = "Checking…";
      status.removeAttribute("data-state");

      fetch("/api/preview/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          submitting = false;
          modal.removeAttribute("aria-busy");
          submitBtn.disabled = false;
          if (result.ok && result.data.ok) {
            var params = new URLSearchParams(location.search);
            var dest = params.get("from") || "/";
            location.href = dest;
            return;
          }
          // Deliberately generic — never confirms whether the password was
          // close, malformed, or simply wrong.
          status.textContent = (result.data && result.data.error) || "That password isn't correct. Please try again.";
          status.setAttribute("data-state", "error");
          passwordInput.focus();
          passwordInput.select();
        })
        .catch(function () {
          submitting = false;
          modal.removeAttribute("aria-busy");
          submitBtn.disabled = false;
          status.textContent = "Could not reach the server. Please try again.";
          status.setAttribute("data-state", "error");
        });
    });
  }
})();
