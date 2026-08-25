// Lina's — Poster-led homepage, first screen.
//
// Reads only from LINA_HOME_MEDIA (home-media.js): populates the header
// CTA, the hero copy (including the headline's italic connector word),
// the two hero CTA buttons and the chef portrait. Also owns three small
// homepage-only behaviours: the sticky header's scroll-compact state, and
// a magnetic-hover effect on the primary CTA button only.
//
// The mobile full-screen nav overlay is deliberately NOT built here — it
// reuses the exact same #siteNav/#navToggle/#navBackdrop markup and the
// open/close/focus-trap/Escape logic already in script.js (shared by
// every page), restyled purely in CSS under body.home. That keeps this
// task's blast radius at zero for every other page's navigation.
//
// Reduced motion: the existing global rule in styles.css already collapses
// every CSS transition/animation here to ~0 duration. This file
// additionally skips the magnetic-hover wiring entirely under reduced
// motion, rather than relying on a CSS override alone.
(function () {
  "use strict";

  if (typeof LINA_HOME_MEDIA === "undefined") return;
  var hero = document.querySelector(".home-hero");
  if (!hero) return;

  var media = LINA_HOME_MEDIA;
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isFinePointer = !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches);

  /* ---------- Header CTA ---------- */
  var ctaPrimary = document.getElementById("homeNavCta");
  if (ctaPrimary && media.cta && media.cta.primary) {
    ctaPrimary.href = media.cta.primary.href;
    ctaPrimary.textContent = media.cta.primary.label;
  }

  /* ---------- Hero copy ---------- */
  var taglineEl = document.getElementById("homeTagline");
  if (taglineEl) taglineEl.textContent = media.copy.tagline;

  var eyebrowEl = document.getElementById("homeEyebrow");
  if (eyebrowEl) eyebrowEl.textContent = media.copy.eyebrow;

  var headlineEl = document.getElementById("homeHeadline");
  if (headlineEl && media.copy.headline) {
    var h = media.copy.headline;
    headlineEl.innerHTML = "";
    headlineEl.appendChild(document.createTextNode(h.line1));
    headlineEl.appendChild(document.createElement("br"));
    var connector = document.createElement("em");
    connector.className = "home-hero__title-connector";
    connector.textContent = h.connector;
    headlineEl.appendChild(connector);
    headlineEl.appendChild(document.createElement("br"));
    headlineEl.appendChild(document.createTextNode(h.line2));
  }

  var subEl = document.getElementById("homeSupporting");
  if (subEl) subEl.textContent = media.copy.supporting;

  /* ---------- Hero CTA row ---------- */
  var ctaRow = document.getElementById("homeCtaRow");
  var primaryBtn = null;
  if (ctaRow && media.cta) {
    ctaRow.innerHTML = "";
    if (media.cta.primary) {
      primaryBtn = document.createElement("a");
      primaryBtn.className = "home-hero__cta home-hero__cta--primary";
      primaryBtn.href = media.cta.primary.href;
      primaryBtn.textContent = media.cta.primary.label;
      ctaRow.appendChild(primaryBtn);
    }
    if (media.cta.secondary) {
      var secondaryBtn = document.createElement("a");
      secondaryBtn.className = "home-hero__cta home-hero__cta--secondary";
      secondaryBtn.href = media.cta.secondary.href;
      secondaryBtn.textContent = media.cta.secondary.label;
      ctaRow.appendChild(secondaryBtn);
    }
  }

  /* ---------- Chef portrait ---------- */
  var chefImg = document.getElementById("homeChefImg");
  if (chefImg && media.heroImage) {
    chefImg.src = media.heroImage.src;
    chefImg.alt = media.heroImage.alt || "";
  }

  /* ---------- Sticky header: scroll-compact state ----------
     Toggles a class only; every visual consequence (padding, logo size,
     the hairline border) lives in home.css. */
  var headerEl = document.getElementById("homeHeader");
  if (headerEl) {
    var COMPACT_AT = 80;
    var ticking = false;
    function applyCompactState() {
      headerEl.classList.toggle("is-compact", window.scrollY > COMPACT_AT);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(applyCompactState);
    }, { passive: true });
    applyCompactState();
  }

  /* ---------- Magnetic hover — primary CTA only ----------
     Desktop pointer devices only, never on touch, never under reduced
     motion. Reserved for the single primary action per the established
     motion pattern — not applied to the secondary button or nav links. */
  if (primaryBtn && isFinePointer && !prefersReducedMotion) {
    var STRENGTH = 14;
    primaryBtn.addEventListener("pointermove", function (e) {
      var r = primaryBtn.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width - 0.5) * STRENGTH;
      var y = ((e.clientY - r.top) / r.height - 0.5) * STRENGTH;
      primaryBtn.style.transform = "translate(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px)";
    });
    primaryBtn.addEventListener("pointerleave", function () {
      primaryBtn.style.transform = "";
    });
  }
})();
