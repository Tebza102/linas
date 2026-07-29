(function () {
  "use strict";

  /* ---------- Config ---------- */
  // No WhatsApp number has been confirmed yet (Client Inputs Register I-006 / I-014).
  // Leave this null until Tebogo confirms a real number — never guess one.
  var CONFIG = {
    whatsappNumber: null // e.g. "27648834344" once confirmed, digits only, no leading +/0
  };

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Nav solid-on-scroll ---------- */
  var nav = document.getElementById("nav");
  function updateNav() {
    if (window.scrollY > window.innerHeight * 0.6) {
      nav.classList.add("nav--solid");
    } else {
      nav.classList.remove("nav--solid");
    }
  }
  window.addEventListener("scroll", updateNav, { passive: true });
  updateNav();

  /* ---------- Hero video: only autoplay if motion is welcome ---------- */
  var heroVideo = document.getElementById("heroVideo");
  if (heroVideo && !prefersReducedMotion) {
    var playAttempt = heroVideo.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(function () {
        // Autoplay blocked or failed — poster image (already set) is the fallback, nothing else to do.
      });
    }
  }

  /* ---------- Interactive menu ---------- */
  var menuInteractive = document.getElementById("menuInteractive");
  var menuTabsEl = document.getElementById("menuTabs");
  var menuGridEl = document.getElementById("menuGrid");
  var activeCategory = null;

  function renderTabs() {
    menuTabsEl.innerHTML = "";
    LINA_MENU.categories.forEach(function (cat, i) {
      var btn = document.createElement("button");
      btn.className = "menu__tab";
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", cat.id === activeCategory ? "true" : "false");
      btn.setAttribute("data-cat", cat.id);
      btn.textContent = cat.label + (cat.priceNote ? " (" + cat.priceNote + ")" : "");
      btn.addEventListener("click", function () {
        activeCategory = cat.id;
        renderTabs();
        renderGrid();
      });
      menuTabsEl.appendChild(btn);
    });
  }

  function renderGrid() {
    menuGridEl.innerHTML = "";
    var cat = LINA_MENU.categories.find(function (c) { return c.id === activeCategory; });
    if (!cat) return;
    cat.items.forEach(function (item) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "menu-card";

      var imgWrap = document.createElement("div");
      imgWrap.className = "menu-card__image";
      var imgSrc = item.image || item.categoryImage || cat.categoryImage;
      if (imgSrc) {
        var img = document.createElement("img");
        img.src = imgSrc;
        img.alt = "";
        img.loading = "lazy";
        imgWrap.appendChild(img);
      } else {
        var span = document.createElement("span");
        span.textContent = "Photo pending";
        imgWrap.appendChild(span);
      }
      card.appendChild(imgWrap);

      var body = document.createElement("div");
      body.className = "menu-card__body";
      var name = document.createElement("p");
      name.className = "menu-card__name";
      name.textContent = item.name;
      var price = document.createElement("p");
      price.className = "menu-card__price";
      price.textContent = item.price;
      body.appendChild(name);
      body.appendChild(price);
      card.appendChild(body);

      card.addEventListener("click", function () { openMenuModal(item, cat); });
      menuGridEl.appendChild(card);
    });
  }

  var lastMenuTrigger = null;
  function openMenuModal(item, cat) {
    var modal = document.createElement("div");
    modal.className = "menu-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
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
        var focusables = modal.querySelectorAll("button");
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    orderBtn.addEventListener("click", function () { handleWhatsAppAction(item.name); });
    document.addEventListener("keydown", onKey);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  if (typeof LINA_MENU !== "undefined" && menuInteractive) {
    activeCategory = LINA_MENU.categories[0].id;
    renderTabs();
    renderGrid();
    menuInteractive.hidden = false; // enhance only once JS + data are confirmed present
    var noscriptFallback = document.querySelector(".menu__noscript");
    // menu__noscript is inside <noscript> so browsers with JS never parse/show it anyway;
    // menuInteractive.hidden removal above is the actual progressive-enhancement step.
  }

  /* ---------- Gallery lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImage = document.getElementById("lightboxImage");
  var lightboxCaption = document.getElementById("lightboxCaption");
  var lightboxClose = document.getElementById("lightboxClose");
  var lastGalleryTrigger = null;

  document.querySelectorAll(".gallery__item[data-full]").forEach(function (btn) {
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
    lightbox.hidden = true;
    lightboxImage.src = "";
    document.removeEventListener("keydown", onLightboxKey);
    if (lastGalleryTrigger) lastGalleryTrigger.focus();
  }
  function onLightboxKey(e) { if (e.key === "Escape") closeLightbox(); }
  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });

  /* ---------- WhatsApp action (shared) ---------- */
  var whatsappNote = document.getElementById("whatsappNote");
  function handleWhatsAppAction(itemName) {
    if (CONFIG.whatsappNumber) {
      var text = itemName
        ? "Hi Lina's, I'd like to order: " + itemName
        : "Hi Lina's, I'd like to place an order.";
      var url = "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(text);
      window.open(url, "_blank", "noopener");
    } else {
      if (whatsappNote) {
        whatsappNote.textContent = "WhatsApp ordering isn't wired to a confirmed number yet (see Client Inputs Register I-006 / I-014). Nothing was sent.";
        whatsappNote.setAttribute("data-state", "error");
        whatsappNote.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
      }
    }
  }
  var whatsappOrderBtn = document.getElementById("whatsappOrderBtn");
  if (whatsappOrderBtn) whatsappOrderBtn.addEventListener("click", function () { handleWhatsAppAction(null); });
  var stickyWhatsapp = document.getElementById("stickyWhatsapp");
  if (stickyWhatsapp) stickyWhatsapp.addEventListener("click", function () { handleWhatsAppAction(null); });

  /* ---------- Enquiry form (prototype only — no network call) ---------- */
  var enquiryForm = document.getElementById("enquiryForm");
  var formStatus = document.getElementById("formStatus");
  if (enquiryForm) {
    enquiryForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!enquiryForm.checkValidity()) {
        formStatus.textContent = "Please fill in every required field, including consent, before sending.";
        formStatus.setAttribute("data-state", "error");
        return;
      }
      formStatus.textContent = "Prototype only: this enquiry was not actually sent or stored anywhere.";
      formStatus.setAttribute("data-state", "success");
      enquiryForm.reset();
    });
  }
})();
