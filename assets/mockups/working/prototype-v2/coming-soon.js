// Lina's — Coming Soon page behaviour: countdown (hidden until a launch
// date is configured, drives both the right panel's clock and the left
// poster card's numeral from one shared tick()), promo region (hidden
// until enabled), and the Private Preview password dialog. Public contact
// on this page is WhatsApp-only — there is no enquiry form here.
(function () {
  "use strict";

  /* ---------- Countdown + promo, driven by /api/coming-soon/config ---------- */

  function pad(n) { return String(n).padStart(2, "0"); }

  // SAST is a fixed UTC+2 offset year-round (no daylight saving), so
  // shifting an epoch ms value by +2h and reading its UTC date parts
  // gives the correct SAST wall-clock calendar date regardless of the
  // visitor's own browser/OS timezone — no Intl/timezone-database
  // dependency needed.
  var SAST_OFFSET_MS = 2 * 60 * 60 * 1000;
  function sastDateParts(ms) {
    var d = new Date(ms + SAST_OFFSET_MS);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
  }
  // Whole calendar dates between "now" and the launch date, in SAST,
  // ignoring time-of-day entirely — 27 Aug and 1 Sept are "5 days apart"
  // from 00:00 to 23:59 SAST regardless of the current time. This is
  // deliberately a different number from the live Hours/Minutes/Seconds
  // ticker below, which counts down to the precise 9:00 AM instant.
  function calendarDaysBetween(nowMs, targetMs) {
    var a = sastDateParts(nowMs);
    var b = sastDateParts(targetMs);
    var aUTC = Date.UTC(a.y, a.m, a.d);
    var bUTC = Date.UTC(b.y, b.m, b.d);
    return Math.max(0, Math.round((bUTC - aUTC) / 86400000));
  }

  function startCountdown(launchAtIso) {
    var region = document.getElementById("countdownRegion");
    var target = new Date(launchAtIso).getTime();
    var dEl = document.getElementById("cdDays");
    var hEl = document.getElementById("cdHours");
    var mEl = document.getElementById("cdMinutes");
    var sEl = document.getElementById("cdSeconds");
    var textEl = document.getElementById("countdownText");
    var timer = null;

    // Poster (left panel) — the numeral is the one dynamic element on an
    // otherwise pixel-reproduced card. It shares the exact same `days`
    // value computed below for the right panel's clock rather than
    // running its own date math, so the two can never disagree.
    var posterCount = document.getElementById("posterCount");
    var posterToday = document.getElementById("posterToday");
    var posterLaunched = document.getElementById("posterLaunched");
    var posterNumeral = document.getElementById("posterNumeral");
    var posterDayLabel = document.getElementById("posterDayLabel");

    function showLaunched() {
      region.querySelector(".cs-countdown__grid").hidden = true;
      region.querySelector(".cs-countdown__label").textContent = "Lina's is launching now.";
      textEl.textContent = "Lina's is launching now.";
      if (posterCount) posterCount.hidden = true;
      if (posterToday) posterToday.hidden = true;
      if (posterLaunched) posterLaunched.hidden = false;
    }

    function tick() {
      var nowMs = Date.now();
      var diffMs = target - nowMs;
      if (diffMs <= 0) {
        clearInterval(timer);
        showLaunched();
        return;
      }
      var totalSeconds = Math.floor(diffMs / 1000);
      // Days: calendar-date difference in SAST (see calendarDaysBetween) —
      // the cross-channel headline number, matching Chef Lina's daily
      // poster. Hours/Minutes/Seconds: unchanged, still the live countdown
      // to the precise 9:00 AM instant. The two are intentionally
      // independent and will not arithmetically "add up" to the same
      // total (e.g. "5 Days, 19 Hours" is expected, not a bug).
      var days = calendarDaysBetween(nowMs, target);
      var hours = Math.floor((totalSeconds % 86400) / 3600);
      var minutes = Math.floor((totalSeconds % 3600) / 60);
      var seconds = totalSeconds % 60;
      dEl.textContent = days;
      hEl.textContent = pad(hours);
      mEl.textContent = pad(minutes);
      sEl.textContent = pad(seconds);
      textEl.textContent = days + " days, " + hours + " hours, " + minutes + " minutes and " + seconds + " seconds until launch.";

      if (days >= 1) {
        if (posterNumeral) posterNumeral.textContent = days;
        if (posterDayLabel) posterDayLabel.textContent = "DAY" + (days === 1 ? "" : "S") + " TO GO";
        if (posterCount) posterCount.hidden = false;
        if (posterToday) posterToday.hidden = true;
        if (posterLaunched) posterLaunched.hidden = true;
      } else {
        // Same SAST calendar date as launch, but the 9:00 AM instant
        // hasn't arrived yet (diffMs > 0, handled above) — a bare "0"
        // numeral would read as broken, so swap to a "today" message
        // instead. Hours/Minutes/Seconds keep ticking normally toward
        // 9:00 AM; showLaunched() takes over once diffMs <= 0, unchanged.
        if (posterCount) posterCount.hidden = true;
        if (posterToday) posterToday.hidden = false;
        if (posterLaunched) posterLaunched.hidden = true;
      }
    }

    region.hidden = false;
    tick();
    timer = setInterval(tick, 1000);

    // A backgrounded tab can throttle setInterval to well under 1/sec (or
    // suspend it entirely) — tick() always derives its display from
    // Date.now() fresh, so it's never wrong, but the display can sit stale
    // for several seconds until the next throttled tick fires. Re-ticking
    // immediately on refocus closes that gap rather than waiting on it.
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") tick();
    });
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

  /* ---------- Floating music control ----------
     No autoplay, deliberately: browsers block audio-with-sound until a
     user gesture, and fighting that reliably isn't possible — every
     <audio> here has preload="none" and stays fully untouched by JS
     until a visitor clicks a track button. Only one track plays at a
     time; picking a different track pauses whichever is currently
     playing first. */
  (function () {
    var toggle = document.getElementById("musicToggle");
    var widget = document.getElementById("musicWidget");
    var panel = document.getElementById("musicPanel");
    var stopBtn = document.getElementById("musicStop");
    var trackBtns = Array.prototype.slice.call(document.querySelectorAll(".cs-music__track"));
    if (!toggle || !panel) return;

    var audioEls = {
      1: document.getElementById("audioTrack1"),
      2: document.getElementById("audioTrack2"),
      3: document.getElementById("audioTrack3")
    };
    var currentKey = null;

    function openPanel() {
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
    }
    function closePanel() {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }
    function togglePanel() {
      if (panel.hidden) openPanel(); else closePanel();
    }

    function setPressedState() {
      trackBtns.forEach(function (btn) {
        btn.setAttribute("aria-pressed", String(btn.getAttribute("data-track") === currentKey));
      });
      stopBtn.disabled = !currentKey;
    }

    function stopCurrent() {
      if (!currentKey) return;
      var el = audioEls[currentKey];
      if (el) el.pause();
      currentKey = null;
      setPressedState();
    }

    function playTrack(key) {
      // Always pause whatever's currently playing first — only one track
      // plays at a time, never layered.
      if (currentKey && currentKey !== key) {
        var prev = audioEls[currentKey];
        if (prev) prev.pause();
      }
      var el = audioEls[key];
      if (!el) return;
      currentKey = key;
      setPressedState();
      // .play() returns a promise that rejects if the browser still
      // refuses (e.g. no user-gesture context was actually present) —
      // caught so a refusal never surfaces as an uncaught console error.
      el.play().catch(function () {
        currentKey = null;
        setPressedState();
      });
    }

    Object.keys(audioEls).forEach(function (key) {
      var el = audioEls[key];
      if (!el) return;
      // A track finishing naturally should reset the UI the same way an
      // explicit stop does — otherwise it stays "pressed" for audio
      // that's no longer actually playing.
      el.addEventListener("ended", function () {
        if (currentKey === key) { currentKey = null; setPressedState(); }
      });
    });

    toggle.addEventListener("click", togglePanel);

    trackBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-track");
        if (currentKey === key) { stopCurrent(); return; }
        playTrack(key);
      });
    });

    stopBtn.addEventListener("click", stopCurrent);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) {
        closePanel();
        toggle.focus();
      }
    });

    document.addEventListener("click", function (e) {
      if (!panel.hidden && widget && !widget.contains(e.target)) closePanel();
    });
  })();

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
    // The button reference itself, not document.activeElement: a click
    // doesn't reliably focus a <button> in every browser (notably Safari
    // and Firefox on macOS), so snapshotting "whatever was focused" is
    // fragile — there is only one trigger for this modal, so returning to
    // it explicitly is both simpler and correct regardless of how the
    // modal was opened.
    lastFocused = openBtn;
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
          if (result.ok && result.data.ok) {
            var params = new URLSearchParams(location.search);
            var dest = params.get("from") || "/";
            location.href = dest;
            return;
          }
          // A slow response can resolve after the visitor has already
          // closed the modal (Escape, Cancel, backdrop click) — the modal's
          // own hidden state is checked fresh here rather than trusted from
          // when the request was sent, so a late error never reopens focus
          // on an input the visitor can no longer see.
          if (backdrop.hidden) return;
          modal.removeAttribute("aria-busy");
          submitBtn.disabled = false;
          // Deliberately generic — never confirms whether the password was
          // close, malformed, or simply wrong.
          status.textContent = (result.data && result.data.error) || "That password isn't correct. Please try again.";
          status.setAttribute("data-state", "error");
          passwordInput.focus();
          passwordInput.select();
        })
        .catch(function () {
          submitting = false;
          if (backdrop.hidden) return;
          modal.removeAttribute("aria-busy");
          submitBtn.disabled = false;
          status.textContent = "Could not reach the server. Please try again.";
          status.setAttribute("data-state", "error");
        });
    });
  }
})();
