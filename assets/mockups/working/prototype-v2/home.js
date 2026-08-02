// Lina's — Poster-led homepage, first screen: chef-led animated gateway.
//
// Reads only from LINA_HOME_MEDIA (home-media.js). Populates the header
// CTA and hero copy, builds a stacked crossfade visual stage (the 3
// automatic hero states plus one reveal image per destination, all
// sharing one pool of absolutely-positioned layers), and wires the
// desktop hover/focus / mobile two-tap destination interaction.
//
// Reduced motion: the existing global rule in styles.css already
// collapses every CSS transition/animation here to ~0 duration. This
// file additionally stops the auto-cycle timer entirely under reduced
// motion (mirroring the exact prefersReducedMotion pattern script.js
// already uses for its own hero) so a reduced-motion visitor gets one
// stable image, not a rapid flicker between instantly-swapped states.
(function () {
  "use strict";

  if (typeof LINA_HOME_MEDIA === "undefined") return;
  var hero = document.querySelector(".home-hero");
  if (!hero) return;

  var media = LINA_HOME_MEDIA;
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isCoarsePointer = !!(window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches);

  var CROSSFADE_MS = 1800;
  var DWELL_MS = { chef: 10000, chefAction: 6000, dish: 6000 };

  /* ---------- Copy + header CTA (unchanged population pattern) ---------- */
  var ctaPrimary = document.getElementById("homeNavCta");
  if (ctaPrimary && media.cta && media.cta.primary) {
    ctaPrimary.href = media.cta.primary.href;
    ctaPrimary.textContent = media.cta.primary.label;
  }

  var taglineEl = document.getElementById("homeTagline");
  if (taglineEl) taglineEl.textContent = media.copy.tagline;

  var eyebrowEl = document.getElementById("homeEyebrow");
  if (eyebrowEl) eyebrowEl.textContent = media.copy.eyebrow;

  var headlineEl = document.getElementById("homeHeadline");
  if (headlineEl && media.copy.headlineLines) {
    headlineEl.innerHTML = "";
    media.copy.headlineLines.forEach(function (line, i) {
      if (i > 0) headlineEl.appendChild(document.createElement("br"));
      headlineEl.appendChild(document.createTextNode(line));
    });
  }

  var subEl = document.getElementById("homeSupporting");
  if (subEl) subEl.textContent = media.copy.supporting;

  /* ---------- Visual stage: one stacked layer per hero state + per destination image ---------- */
  var visualEl = document.getElementById("homeHeroVisual");
  var layers = {}; // key -> <img>

  function addLayer(key, img, isPushLayer) {
    var el = document.createElement("img");
    el.className = "home-hero__layer" + (isPushLayer ? " home-hero__layer--push" : "");
    el.setAttribute("data-layer", key);
    el.src = img.src;
    el.alt = img.alt || "";
    visualEl.appendChild(el);
    layers[key] = el;
    return el;
  }

  if (visualEl && media.hero) {
    media.hero.forEach(function (state, i) {
      addLayer("hero:" + state.id, state, i === 0);
    });
  }
  if (visualEl && media.destinations) {
    media.destinations.forEach(function (dest) {
      if (dest.image) addLayer("dest:" + dest.id, dest.image, false);
    });
  }

  var activeKey = null;
  function setActiveLayer(key) {
    if (key === activeKey) return;
    Object.keys(layers).forEach(function (k) {
      var isNowActive = k === key;
      layers[k].classList.toggle("is-active", isNowActive);
      if (isNowActive && layers[k].classList.contains("home-hero__layer--push")) {
        // Restart the slow push-in each time this layer becomes active
        // again (e.g. the auto-cycle looping back to the opening image).
        layers[k].style.animation = "none";
        void layers[k].offsetWidth; // force reflow
        layers[k].style.animation = "";
      }
    });
    activeKey = key;
  }

  /* ---------- Automatic hero sequence (chef -> chef-at-work -> dish -> chef...) ---------- */
  var autoTimer = null;
  var autoIndex = 0;
  var autoPaused = false;

  function scheduleNext() {
    if (prefersReducedMotion || autoPaused || !media.hero || !media.hero.length) return;
    var state = media.hero[autoIndex];
    var dwell = DWELL_MS[state.id] || 8000;
    autoTimer = window.setTimeout(function () {
      autoIndex = (autoIndex + 1) % media.hero.length;
      if (!autoPaused) setActiveLayer("hero:" + media.hero[autoIndex].id);
      scheduleNext();
    }, dwell);
  }

  function pauseAuto() {
    autoPaused = true;
    if (autoTimer) { window.clearTimeout(autoTimer); autoTimer = null; }
  }

  function resumeAuto() {
    if (!autoPaused) return;
    autoPaused = false;
    scheduleNext();
  }

  if (media.hero && media.hero.length) {
    setActiveLayer("hero:" + media.hero[0].id);
    scheduleNext();
  }

  /* ---------- Interactive destinations ---------- */
  var listEl = document.getElementById("homeDestinations");
  if (listEl && media.destinations) {
    listEl.innerHTML = "";
    media.destinations.forEach(function (dest) {
      var li = document.createElement("li");
      li.className = "home-destinations__item";
      li.setAttribute("data-destination", dest.id);

      var a = document.createElement("a");
      a.className = "home-destinations__link";
      a.href = dest.href;
      a.setAttribute("aria-expanded", "false");
      if (dest.external) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }

      var label = document.createElement("span");
      label.className = "home-destinations__label";
      label.textContent = dest.label;

      var arrow = document.createElement("span");
      arrow.className = "home-destinations__arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";

      a.appendChild(label);
      a.appendChild(arrow);
      li.appendChild(a);
      listEl.appendChild(li);
    });

    var items = Array.prototype.slice.call(listEl.querySelectorAll(".home-destinations__item"));

    function activateDestination(id) {
      items.forEach(function (item) {
        var isActive = item.getAttribute("data-destination") === id;
        item.querySelector(".home-destinations__link").setAttribute("aria-expanded", String(isActive));
      });
      pauseAuto();
      setActiveLayer("dest:" + id);
    }

    function deactivateDestinations() {
      items.forEach(function (item) {
        item.querySelector(".home-destinations__link").setAttribute("aria-expanded", "false");
      });
      resumeAuto();
      if (media.hero && media.hero.length) {
        setActiveLayer("hero:" + media.hero[autoIndex].id);
      }
    }

    listEl.addEventListener("pointerover", function (e) {
      if (e.pointerType !== "mouse") return;
      var link = e.target.closest(".home-destinations__link");
      if (!link) return;
      activateDestination(link.closest(".home-destinations__item").getAttribute("data-destination"));
    });
    listEl.addEventListener("pointerleave", function (e) {
      if (e.pointerType !== "mouse") return;
      deactivateDestinations();
    });

    listEl.addEventListener("focusin", function (e) {
      var link = e.target.closest(".home-destinations__link");
      if (!link) return;
      activateDestination(link.closest(".home-destinations__item").getAttribute("data-destination"));
    });
    listEl.addEventListener("focusout", function (e) {
      // Only deactivate once focus actually leaves the whole list, not
      // when it moves between two destination links inside it.
      if (listEl.contains(e.relatedTarget)) return;
      deactivateDestinations();
    });

    listEl.addEventListener("click", function (e) {
      var link = e.target.closest(".home-destinations__link");
      if (!link || !isCoarsePointer) return;
      var id = link.closest(".home-destinations__item").getAttribute("data-destination");
      var alreadyActive = link.getAttribute("aria-expanded") === "true";
      if (!alreadyActive) {
        e.preventDefault();
        activateDestination(id);
      }
      // Second tap on an already-active destination: let the link's
      // default navigation (or WhatsApp target="_blank") proceed as-is.
    });
  }
})();
