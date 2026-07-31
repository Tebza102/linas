(function () {
  "use strict";

  var CONFIG = {
    // Confirmed real number: +27 76 483 4344, international format for wa.me.
    whatsappNumber: "27764834344"
  };

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Side-reveal nav drawer (every page) ---------- */
  var navToggle = document.getElementById("navToggle");
  var siteNav = document.getElementById("siteNav");
  var navClose = document.getElementById("navClose");
  var navBackdrop = document.getElementById("navBackdrop");
  var lastNavTrigger = null;

  function openNav() {
    lastNavTrigger = document.activeElement;
    siteNav.hidden = false;
    if (navBackdrop) navBackdrop.hidden = false;
    navClose.focus();
    document.addEventListener("keydown", onNavKey);
  }
  function closeNav() {
    siteNav.hidden = true;
    if (navBackdrop) navBackdrop.hidden = true;
    document.removeEventListener("keydown", onNavKey);
    if (lastNavTrigger) lastNavTrigger.focus();
  }
  function onNavKey(e) {
    if (e.key === "Escape") closeNav();
    if (e.key === "Tab") {
      var focusables = siteNav.querySelectorAll("a, button");
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  if (navToggle && siteNav && navClose) {
    navToggle.addEventListener("click", openNav);
    navClose.addEventListener("click", closeNav);
    if (navBackdrop) navBackdrop.addEventListener("click", closeNav);
    siteNav.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeNav); });
  }

  /* ---------- Hero/gateway media: only autoplay if motion is welcome ---------- */
  document.querySelectorAll("video[data-autoplay-hero]").forEach(function (v) {
    if (!prefersReducedMotion) {
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
  });

  /* ---------- Landing hero sequence: still (Ken Burns) -> crossfade to video ----------
     Reduced-motion users never get the swap — they see the still image only, which is
     the explicit "graceful fallback" this sequence is required to have. Without JS
     (progressive enhancement), the still's pure-CSS Ken Burns still plays and the video
     simply never appears — also a reasonable, still-premium experience. */
  var sequenceHero = document.querySelector(".gateway--sequence");
  if (sequenceHero && !prefersReducedMotion) {
    var heroVideoEl = sequenceHero.querySelector(".gateway__media");
    var swapToVideo = function () { sequenceHero.classList.add("gateway--video-active"); };
    if (heroVideoEl) {
      // Prefer swapping once the video actually has a frame ready, so the crossfade
      // never reveals a blank/black frame; fall back to a fixed delay if that event
      // is slow to arrive (e.g. slower connections).
      var swapped = false;
      var doSwapOnce = function () { if (!swapped) { swapped = true; swapToVideo(); } };
      heroVideoEl.addEventListener("loadeddata", function () { setTimeout(doSwapOnce, 3800); });
      setTimeout(doSwapOnce, 5200);
    } else {
      setTimeout(swapToVideo, 3800);
    }
  }

  /* ---------- WhatsApp action (shared across all pages) ---------- */
  var whatsappNote = document.getElementById("whatsappNote");
  function handleWhatsAppAction(itemName) {
    if (CONFIG.whatsappNumber) {
      var text = itemName ? "Hi Lina's, I'd like to order: " + itemName : "Hello Lina's, I would like to enquire about your catering or mobile kitchen services.";
      window.open("https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(text), "_blank", "noopener");
    } else if (whatsappNote) {
      whatsappNote.textContent = "WhatsApp ordering isn't connected to a number yet. Nothing was sent — please use the enquiry form instead.";
      whatsappNote.classList.add("is-visible");
    }
  }
  document.querySelectorAll("[data-whatsapp-trigger]").forEach(function (btn) {
    btn.addEventListener("click", function () { handleWhatsAppAction(btn.getAttribute("data-item") || null); });
  });

  /* ---------- Interactive menu (menu.html only — guarded) ---------- */
  var menuTabsEl = document.getElementById("menuTabs");
  var menuGridEl = document.getElementById("menuGrid");
  var activeCategory = null;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderTabs() {
    menuTabsEl.innerHTML = "";
    LINA_MENU.categories.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "menu__tab"; btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", cat.id === activeCategory ? "true" : "false");
      btn.textContent = cat.label + (cat.priceNote ? " (" + cat.priceNote + ")" : "");
      btn.addEventListener("click", function () { activeCategory = cat.id; renderTabs(); renderGrid(); });
      menuTabsEl.appendChild(btn);
    });
  }
  function renderGrid() {
    menuGridEl.innerHTML = "";
    var cat = LINA_MENU.categories.find(function (c) { return c.id === activeCategory; });
    if (!cat) return;
    cat.items.forEach(function (item) {
      var card = document.createElement("button");
      card.type = "button"; card.className = "menu-card";
      var imgWrap = document.createElement("div"); imgWrap.className = "menu-card__image";
      var imgSrc = item.image || item.categoryImage || cat.categoryImage;
      if (imgSrc) {
        var img = document.createElement("img"); img.src = imgSrc; img.alt = ""; img.loading = "lazy";
        imgWrap.appendChild(img);
        // Honest labelling: a photo shown here is never claimed to be the exact
        // plate unless imageConfidence is "confirmed" — otherwise it's genuine
        // Lina's photography used as representative imagery, and says so.
        if (item.imageConfidence !== "confirmed") {
          var repTag = document.createElement("span");
          repTag.className = "menu-card__tag";
          repTag.textContent = "Representative photo";
          imgWrap.appendChild(repTag);
        }
      } else {
        // No apologetic grey placeholder — confident typography stands in for
        // the photo instead, consistent with the black/white/red system.
        imgWrap.classList.add("menu-card__image--type");
        var initial = document.createElement("span");
        initial.className = "menu-card__initial";
        initial.textContent = item.name.charAt(0);
        imgWrap.appendChild(initial);
      }
      card.appendChild(imgWrap);
      var body = document.createElement("div"); body.className = "menu-card__body";
      var name = document.createElement("p"); name.className = "menu-card__name"; name.textContent = item.name;
      var price = document.createElement("p"); price.className = "menu-card__price"; price.textContent = item.price;
      body.appendChild(name); body.appendChild(price); card.appendChild(body);
      card.addEventListener("click", function () { openMenuModal(item, cat); });
      menuGridEl.appendChild(card);
    });
  }
  var lastMenuTrigger = null;
  function openMenuModal(item, cat) {
    var modal = document.createElement("div");
    modal.className = "menu-modal"; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", item.name);
    modal.innerHTML =
      '<div class="menu-modal__panel">' +
        '<button class="menu-modal__close" aria-label="Close item details">✕</button>' +
        '<h3>' + escapeHtml(item.name) + '</h3>' +
        '<p class="menu-card__price">' + escapeHtml(item.price) + ' · ' + escapeHtml(cat.label) + '</p>' +
        '<p class="placeholder-note">Ingredient list is exactly as written on Lina’s own menu. No extra description is added.</p>' +
        '<button class="btn btn--primary" id="modalOrderBtn" type="button">Order this on WhatsApp →</button>' +
      '</div>';
    document.body.appendChild(modal);
    var closeBtn = modal.querySelector(".menu-modal__close");
    var orderBtn = modal.querySelector("#modalOrderBtn");
    closeBtn.focus();
    function close() {
      document.body.removeChild(modal);
      document.removeEventListener("keydown", onKey);
      if (lastMenuTrigger) lastMenuTrigger.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        var f = modal.querySelectorAll("button");
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }
    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    orderBtn.addEventListener("click", function () { handleWhatsAppAction(item.name); });
    document.addEventListener("keydown", onKey);
  }
  if (typeof LINA_MENU !== "undefined" && menuTabsEl && menuGridEl) {
    activeCategory = LINA_MENU.categories[0].id;
    renderTabs();
    renderGrid();
  }

  /* ---------- Gallery click-to-play video tiles (never autoplay) ---------- */
  document.querySelectorAll(".gallery-grid__item--video").forEach(function (tile) {
    var playBtn = tile.querySelector(".gallery-grid__play");
    if (!playBtn) return;
    playBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var video = document.createElement("video");
      video.src = tile.getAttribute("data-video-src");
      video.poster = tile.getAttribute("data-poster") || "";
      video.controls = true;
      video.muted = true; // user-initiated play; still muted by default, controls let them unmute
      video.playsInline = true;
      tile.innerHTML = "";
      tile.appendChild(video);
      video.play().catch(function () {});
    });
  });

  /* ---------- Gallery lightbox (gallery.html, and anywhere with a gallery grid) ---------- */
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    var lightboxImage = document.getElementById("lightboxImage");
    var lightboxCaption = document.getElementById("lightboxCaption");
    var lightboxClose = document.getElementById("lightboxClose");
    var lastGalleryTrigger = null;
    document.querySelectorAll(".gallery-grid__item[data-full]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        lastGalleryTrigger = btn;
        lightboxImage.src = btn.getAttribute("data-full");
        lightboxImage.alt = btn.getAttribute("data-caption") || "";
        lightboxCaption.textContent = btn.getAttribute("data-caption") || "";
        lightbox.hidden = false;
        lightboxClose.focus();
        document.addEventListener("keydown", onLightboxKey);
      });
    });
    function closeLightbox() {
      lightbox.hidden = true; lightboxImage.src = "";
      document.removeEventListener("keydown", onLightboxKey);
      if (lastGalleryTrigger) lastGalleryTrigger.focus();
    }
    function onLightboxKey(e) { if (e.key === "Escape") closeLightbox(); }
    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
  }

  /* Enquiry form submission (contact.html) is handled by the real,
     Firestore-backed logic in enquiry-submit.js — loaded as a separate
     module only on contact.html, not here, since it needs ES module
     imports for the Firebase client SDK. */
})();
