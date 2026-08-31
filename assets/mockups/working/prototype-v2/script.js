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

  /* ---------- Hero/gateway media: only autoplay if motion is welcome ----------
     play() is retried once data arrives, since a play() issued before the
     first frame exists can be silently dropped by some browsers. */
  function tryPlay(v) {
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }
  document.querySelectorAll("video[data-autoplay-hero]").forEach(function (v) {
    if (prefersReducedMotion) return;
    tryPlay(v);
    v.addEventListener("loadeddata", function () { if (v.paused) tryPlay(v); });
  });

  /* ---------- Hero sequence: still (Ken Burns) -> crossfade to video ----------
     Applies to every .gateway--sequence hero (Home, Catering, Mobile Kitchen).
     The crossfade fires only once the video is PROVEN to be playing
     (readyState >= 2 and not paused) — never onto a paused/blank layer, so
     no black frame and no fade-to-static-poster is possible. If autoplay is
     refused outright, the swap simply never happens and the Ken Burns still
     carries the hero. Still phase ~3s, crossfade 1.6s (CSS).
     Reduced-motion users never get the swap — they see the strongest still,
     unanimated, with all text and actions available. */
  document.querySelectorAll(".gateway--sequence").forEach(function (hero) {
    if (prefersReducedMotion) return;
    var video = hero.querySelector(".gateway__media");
    if (!video) return;
    var swapped = false;
    var started = Date.now();
    var timer = setInterval(function () {
      var elapsed = Date.now() - started;
      if (elapsed >= 3000 && video.readyState >= 2 && !video.paused) {
        swapped = true;
        hero.classList.add("gateway--video-active");
      } else if (elapsed >= 3000 && video.paused) {
        tryPlay(video);
      }
      if (swapped || elapsed > 12000) clearInterval(timer);
    }, 400);
  });

  /* ---------- WhatsApp action (shared across all pages) ---------- */
  var whatsappNote = document.getElementById("whatsappNote");
  function handleWhatsAppAction(itemName, isEnquiryOnly) {
    if (CONFIG.whatsappNumber) {
      // isEnquiryOnly: used only for menu items with no confirmed price/id
      // (currently the temporary Summer Menu preview) — "order" would be
      // misleading for something that isn't a confirmed, priced product yet.
      var text = itemName
        ? (isEnquiryOnly
            ? "Hi Lina's, I'd like to ask about: " + itemName + " (Summer Menu)"
            : "Hi Lina's, I'd like to order: " + itemName)
        : "Hello Lina's, I would like to enquire about your catering or mobile kitchen services.";
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
  var menuGridEl = document.getElementById("menuGrid");

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Collapses a category's items into display entries: consecutive items
     sharing a `group` become ONE entry carrying every option, so the two
     burger ids render as a single "Lina's Burger & Fries" card with a
     Beef and a Chicken button. Ungrouped items pass through untouched. */
  function groupItems(items) {
    var entries = [];
    var byGroup = {};
    (items || []).forEach(function (item) {
      if (!item.group) { entries.push({ item: item, options: null }); return; }
      if (byGroup[item.group]) { byGroup[item.group].options.push(item); return; }
      var entry = {
        item: item,
        options: [item],
        groupName: item.groupName || item.name,
        groupNote: item.groupNote || null
      };
      byGroup[item.group] = entry;
      entries.push(entry);
    });
    return entries;
  }

  // Builds one menu row. Extracted verbatim from the previous inline
  // cat.items.forEach body so every category can reuse it — the DOM,
  // classes, image/imageConfidence handling, modal listener and cart
  // wiring below are unchanged from that original implementation.
  function buildMenuCard(item, cat, entry) {
      // The card is a DIV holding two sibling buttons — "open details" and
      // "add". It used to be a single <button>; nesting an Add button inside
      // that would be invalid HTML with unpredictable click behaviour.
      var card = document.createElement("div");
      card.className = "menu-card";
      var openBtn = document.createElement("button");
      openBtn.type = "button"; openBtn.className = "menu-card__open";
      openBtn.setAttribute("aria-label", "View details for " + item.name);
      var imgWrap = document.createElement("div"); imgWrap.className = "menu-card__image";
      var imgSrc = item.image || item.categoryImage || cat.categoryImage;
      if (imgSrc) {
        var img = document.createElement("img"); img.src = imgSrc; img.alt = ""; img.loading = "lazy";
        imgWrap.appendChild(img);
        // Honest labelling: a photo shown here is never claimed to be the exact
        // plate unless imageConfidence is "confirmed" — otherwise it's genuine
        // Lina's photography used as representative imagery, and says so.
        // The Summer Menu preview is the one exception: its photos are the
        // exact approved homepage images of these exact dishes, not
        // representative stand-ins, so the caveat tag would be inaccurate.
        if (item.imageConfidence !== "confirmed" && cat.id !== "summer") {
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
      openBtn.appendChild(imgWrap);
      var body = document.createElement("div"); body.className = "menu-card__body";
      var name = document.createElement("p"); name.className = "menu-card__name";
      // A grouped dish shows its dish name ("Lina's Tacos"), never one
      // variant's name — the variant is chosen by the buttons below.
      name.textContent = (entry && entry.options) ? entry.groupName : item.name;
      var price = document.createElement("p"); price.className = "menu-card__price"; price.textContent = item.price;
      body.appendChild(name);
      body.appendChild(price); openBtn.appendChild(body);
      // "Choose: Prawn or Chicken", or a fixed accompaniment note. Appended
      // to the row, NOT inside .menu-card__body: body is the tight
      // baseline-aligned "name ..... price" pair, and adding a third child
      // there forces the price onto its own line for any name long enough
      // to wrap. This keeps that row exactly as it was and gives the note
      // its own full-width line beneath.
      var noteText = (entry && entry.options) ? entry.groupNote : item.note;
      if (noteText) {
        var noteEl = document.createElement("p");
        noteEl.className = "menu-card__note";
        noteEl.textContent = noteText;
        openBtn.appendChild(noteEl);
      }
      openBtn.addEventListener("click", function () { openMenuModal(item, cat, entry); });
      card.appendChild(openBtn);

      // One-tap add is the point of a mobile-kitchen menu — burying it inside
      // the details modal would defeat it. Only rendered when cart.js is
      // present (menu page only) AND the item is a confirmed, server-priced
      // product (has an id, orderable !== false) — the temporary Summer Menu
      // preview items have neither, by design, so they never get an Add
      // button and can never reach the cart.
      if (window.LINA_CART && item.id && item.orderable !== false) {
        if (entry && entry.options) {
          // One button per option — the choice IS the add action, so a
          // burger or taco can never reach the cart without one.
          var choices = document.createElement("div");
          choices.className = "menu-card__choices";
          entry.options.forEach(function (opt) {
            var choiceBtn = document.createElement("button");
            choiceBtn.type = "button"; choiceBtn.className = "menu-card__add menu-card__choice";
            choiceBtn.textContent = opt.choiceLabel;
            choiceBtn.setAttribute("aria-label", "Add " + opt.name + " to your order");
            choiceBtn.addEventListener("click", function () {
              window.LINA_CART.add(opt.id, 1);
            });
            choices.appendChild(choiceBtn);
          });
          card.appendChild(choices);
        } else {
          var addBtn = document.createElement("button");
          addBtn.type = "button"; addBtn.className = "menu-card__add";
          addBtn.textContent = "Add";
          addBtn.setAttribute("aria-label", "Add " + item.name + " to your order");
          addBtn.addEventListener("click", function () {
            window.LINA_CART.add(item.id, 1);
          });
          card.appendChild(addBtn);
        }
      }
      return card;
  }

  /* ---------- Tab navigation ----------
     Tabs are a presentation grouping over categories, not categories
     themselves: "The Rest of Lina's Menu" shows Everyday Favourites and
     Drinks one after the other as headings, so the whole non-seasonal menu
     is one continuous view rather than a second level of navigation.
     LINA_MENU is never mutated here. */
  var TAB_LIST = (typeof LINA_MENU !== "undefined" && LINA_MENU.tabs) ? LINA_MENU.tabs : [];
  var DEFAULT_CATEGORY_ID = TAB_LIST.length ? TAB_LIST[0].id : null;

  function findCategory(id) {
    var cats = (typeof LINA_MENU !== "undefined" && LINA_MENU.categories) ? LINA_MENU.categories : [];
    for (var i = 0; i < cats.length; i++) {
      if (cats[i].id === id) return cats[i];
    }
    return null;
  }
  function findTab(id) {
    for (var i = 0; i < TAB_LIST.length; i++) {
      if (TAB_LIST[i].id === id) return TAB_LIST[i];
    }
    return null;
  }
  // Invalid/missing values fall back to the default (Summer Menu) rather
  // than erroring or showing nothing.
  function resolveCategoryId(requested) {
    return findTab(requested) ? requested : DEFAULT_CATEGORY_ID;
  }
  function categoryIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return resolveCategoryId(params.get("category"));
  }

  var tabsEl = document.getElementById("menuCategoryTabs");

  function renderTabs(activeId) {
    if (!tabsEl) return;
    tabsEl.innerHTML = "";
    TAB_LIST.forEach(function (tab) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "menu-tab";
      btn.textContent = tab.label;
      btn.setAttribute("role", "tab");
      var selected = tab.id === activeId;
      btn.setAttribute("aria-selected", selected ? "true" : "false");
      if (selected) btn.classList.add("is-active");
      btn.addEventListener("click", function () { activateCategory(tab.id, true); });
      tabsEl.appendChild(btn);
    });
  }

  // Renders only the active category's items — the fix for the page
  // previously rendering every category stacked in one long scroll.
  // Cart state (cart.js/sessionStorage) is entirely independent of this and
  // is never touched here.
  function renderGrid(activeId) {
    menuGridEl.innerHTML = "";
    var tab = findTab(activeId) || findTab(DEFAULT_CATEGORY_ID);
    if (!tab) return;

    // Every category in the active tab, in order, each with its own heading
    // — one continuous view, no nested tabs or accordions.
    (tab.categories || []).forEach(function (catId, index) {
      var cat = findCategory(catId);
      if (!cat) return;

      var section = document.createElement("section");
      section.className = "menu-section";
      // The tabpanel id/role belongs to the first section only — the tab
      // controls one panel, and the rest are ordinary sections within it.
      if (index === 0) {
        section.id = "menuCategoryPanel";
        section.setAttribute("role", "tabpanel");
      }
      section.setAttribute("data-category", cat.id);

      var heading = document.createElement("h2");
      heading.className = "menu-section__title";
      heading.textContent = cat.label;
      section.appendChild(heading);

      var noteText = cat.priceNote || cat.note;
      if (noteText) {
        var note = document.createElement("p");
        note.className = "menu-section__note";
        note.textContent = noteText;
        section.appendChild(note);
      }

      groupItems(cat.items).forEach(function (entry) {
        section.appendChild(buildMenuCard(entry.item, cat, entry));
      });

      // Sits BENEATH the items, unlike `note` above them.
      if (cat.footnote) {
        var footnote = document.createElement("p");
        footnote.className = "menu-section__footnote";
        footnote.textContent = cat.footnote;
        section.appendChild(footnote);
      }

      menuGridEl.appendChild(section);
    });
  }

  function activateCategory(id, pushHistory) {
    var resolved = resolveCategoryId(id);
    renderTabs(resolved);
    renderGrid(resolved);
    if (pushHistory) {
      var url = new URL(window.location.href);
      url.searchParams.set("category", resolved);
      window.history.pushState({ category: resolved }, "", url);
    }
  }

  window.addEventListener("popstate", function () {
    activateCategory(categoryIdFromUrl(), false);
  });

  var lastMenuTrigger = null;
  function openMenuModal(item, cat, entry) {
    var canOrder = window.LINA_CART && item.id && item.orderable !== false;
    var options = (entry && entry.options) ? entry.options : null;
    var displayName = options ? entry.groupName : item.name;
    var noteText = options ? entry.groupNote : item.note;
    var modal = document.createElement("div");
    modal.className = "menu-modal"; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", displayName);

    // A grouped dish gets one button per option instead of a single "Add to
    // order", so the choice is made here too rather than defaulting silently.
    var actionsHtml;
    if (canOrder && options) {
      actionsHtml = '<div class="menu-modal__choices">';
      options.forEach(function (opt, i) {
        actionsHtml +=
          '<button class="btn btn--primary" type="button" data-choice-index="' + i + '">' +
            'Add ' + escapeHtml(opt.choiceLabel) +
          '</button>';
      });
      actionsHtml += '</div>';
    } else {
      actionsHtml =
        '<button class="btn btn--primary" id="modalOrderBtn" type="button">' +
          (canOrder ? "Add to order" : "Order this on WhatsApp →") +
        '</button>';
    }

    modal.innerHTML =
      '<div class="menu-modal__panel">' +
        '<button class="menu-modal__close" aria-label="Close item details">✕</button>' +
        '<h3>' + escapeHtml(displayName) + '</h3>' +
        '<p class="menu-card__price">' + escapeHtml(item.price) + ' · ' + escapeHtml(cat.label) + '</p>' +
        (noteText ? '<p class="menu-modal__note">' + escapeHtml(noteText) + '</p>' : '') +
        '<p class="placeholder-note">' +
          "Ingredient list is exactly as written on Lina’s own menu. No extra description is added." +
        '</p>' +
        actionsHtml +
      '</div>';
    document.body.appendChild(modal);
    var closeBtn = modal.querySelector(".menu-modal__close");
    var orderBtn = modal.querySelector("#modalOrderBtn");
    closeBtn.focus();
    // Wired before the single-button handler below, which no longer exists
    // for a grouped dish.
    modal.querySelectorAll("[data-choice-index]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var opt = options[Number(btn.getAttribute("data-choice-index"))];
        if (!opt) return;
        window.LINA_CART.add(opt.id, 1);
        close();
      });
    });
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
    // Absent for a grouped dish — its per-option buttons are wired above.
    if (orderBtn) {
      orderBtn.addEventListener("click", function () {
        // With the cart present AND the item confirmed-orderable, this adds
        // to the order; without cart.js (any other page) the original
        // single-item WhatsApp action is preserved.
        if (canOrder) {
          window.LINA_CART.add(item.id, 1);
          close();
          return;
        }
        handleWhatsAppAction(item.name, item.orderable === false);
      });
    }
    document.addEventListener("keydown", onKey);
  }
  if (typeof LINA_MENU !== "undefined" && menuGridEl) {
    activateCategory(categoryIdFromUrl(), false);
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
