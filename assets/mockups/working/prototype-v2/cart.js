/*
 * Lina's public order cart (menu page only).
 *
 * Scope, deliberately: a cart that is never checked out stays entirely in the
 * browser. No backend record is created by adding an item. The order document
 * is created only when the customer presses "Order via WhatsApp", which is the
 * point at which browsing becomes a real, recorded intent.
 *
 * State is ids + quantities ONLY — never names or prices. Everything the
 * customer sees is re-resolved from LINA_MENU at render time, and everything
 * that is actually charged is computed server-side from api/_lib/menu-catalog.js.
 * A cart left open across a price change therefore cannot resurrect a stale price.
 *
 * sessionStorage rather than localStorage: CLAUDE.md forbids relying on
 * localStorage for order data, and session scope also means a shared phone at
 * the trailer doesn't hand the next customer the previous one's order.
 *
 * Exposes window.LINA_CART because the site has no bundler — script.js checks
 * for it and degrades to its original single-item WhatsApp action when absent.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "lina-cart-v1";
  var SUBMISSION_KEY = "lina-cart-submission-v1";
  var MAX_QTY_PER_LINE = 20;

  var state = { items: [] };
  var subscribers = [];
  var lastFocus = null;

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtCents(cents) {
    return "R" + ((Number(cents) || 0) / 100).toFixed(2);
  }

  /* ---------- Menu lookup (display only — never authoritative) ---------- */
  function findMenuItem(id) {
    if (typeof LINA_MENU === "undefined") return null;
    for (var c = 0; c < LINA_MENU.categories.length; c++) {
      var cat = LINA_MENU.categories[c];
      for (var i = 0; i < cat.items.length; i++) {
        if (cat.items[i].id === id) return { item: cat.items[i], category: cat };
      }
    }
    return null;
  }

  /* ---------- Persistence ---------- */
  function load() {
    var removed = 0;
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) { state = { items: [] }; return removed; }
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.items)) { state = { items: [] }; return removed; }
      var clean = [];
      parsed.items.forEach(function (line) {
        if (!line || typeof line.id !== "string") { removed++; return; }
        // An item pulled from the menu since this cart was filled must not
        // silently linger — the customer is told, not quietly shortchanged.
        if (!findMenuItem(line.id)) { removed++; return; }
        var qty = Math.floor(Number(line.qty));
        if (!isFinite(qty) || qty < 1) { removed++; return; }
        clean.push({ id: line.id, qty: Math.min(qty, MAX_QTY_PER_LINE) });
      });
      state = { items: clean };
    } catch (err) {
      state = { items: [] };
    }
    return removed;
  }
  function save() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, items: state.items }));
    } catch (err) { /* private mode — the cart simply won't persist */ }
  }

  /**
   * Idempotency key for one checkout attempt. Regenerated after a successful
   * order, otherwise the customer's NEXT order would be deduplicated against
   * the previous one and silently never created.
   */
  function submissionId() {
    var id = null;
    try { id = sessionStorage.getItem(SUBMISSION_KEY); } catch (err) { /* ignore */ }
    if (!id) {
      id = "web-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      try { sessionStorage.setItem(SUBMISSION_KEY, id); } catch (err) { /* ignore */ }
    }
    return id;
  }
  function resetSubmissionId() {
    try { sessionStorage.removeItem(SUBMISSION_KEY); } catch (err) { /* ignore */ }
  }

  /* ---------- Derived views ---------- */
  function getLines() {
    var lines = [];
    state.items.forEach(function (line) {
      var found = findMenuItem(line.id);
      if (!found) return;
      lines.push({
        id: line.id,
        name: found.item.name,
        priceCents: found.item.priceCents,
        qty: line.qty,
        lineTotalCents: found.item.priceCents * line.qty
      });
    });
    return lines;
  }
  function getCount() {
    return state.items.reduce(function (n, l) { return n + l.qty; }, 0);
  }
  // Indicative only. The server recomputes and its figure wins.
  function getSubtotalCents() {
    return getLines().reduce(function (n, l) { return n + l.lineTotalCents; }, 0);
  }

  /* ---------- Mutations ---------- */
  function notify() { subscribers.forEach(function (fn) { fn(); }); }

  function add(id, qty) {
    if (!findMenuItem(id)) return;
    var n = Math.max(1, Math.floor(Number(qty) || 1));
    var existing = null;
    state.items.forEach(function (l) { if (l.id === id) existing = l; });
    if (existing) existing.qty = Math.min(existing.qty + n, MAX_QTY_PER_LINE);
    else state.items.push({ id: id, qty: Math.min(n, MAX_QTY_PER_LINE) });
    save(); notify(); renderStickyButton(); toast("Added to your order");
  }
  function setQty(id, qty) {
    var n = Math.floor(Number(qty));
    if (!isFinite(n) || n < 1) return remove(id);
    state.items.forEach(function (l) { if (l.id === id) l.qty = Math.min(n, MAX_QTY_PER_LINE); });
    save(); notify(); renderStickyButton(); renderPanel();
  }
  function remove(id) {
    state.items = state.items.filter(function (l) { return l.id !== id; });
    save(); notify(); renderStickyButton(); renderPanel();
  }
  function clear() {
    state.items = [];
    save(); notify(); renderStickyButton();
  }

  /* ---------- Toast ---------- */
  var toastEl = null, toastTimer = null;
  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "cart-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 1800);
  }

  /* ---------- Sticky cart button ---------- */
  var stickyEl = null;
  function renderStickyButton() {
    var sticky = document.getElementById("stickyWhatsapp");
    var count = getCount();
    if (!stickyEl) {
      stickyEl = document.createElement("button");
      stickyEl.type = "button";
      stickyEl.className = "sticky-cart";
      stickyEl.id = "stickyCart";
      stickyEl.addEventListener("click", open);
      document.body.appendChild(stickyEl);
    }
    stickyEl.innerHTML = "View order <span class=\"sticky-cart__count\">" + count + "</span>";
    stickyEl.hidden = count === 0;
    // One control in the thumb zone, not two: the cart takes the sticky slot
    // while it has items and hands it back to the general WhatsApp action when
    // it empties. That WhatsApp button is a general enquiry channel, not an
    // order action, so it is never removed — only temporarily yielded.
    if (sticky) sticky.hidden = count > 0;
  }

  /* ---------- Panel (checkout + confirmation) ---------- */
  var panelEl = null;
  var view = "cart"; // "cart" | "confirmation"
  var lastOrder = null;

  function ensurePanel() {
    if (panelEl) return panelEl;
    panelEl = document.createElement("div");
    panelEl.className = "cart-panel";
    panelEl.id = "cartPanel";
    panelEl.setAttribute("role", "dialog");
    panelEl.setAttribute("aria-modal", "true");
    panelEl.setAttribute("aria-label", "Your order");
    panelEl.hidden = true;
    document.body.appendChild(panelEl);
    panelEl.addEventListener("click", function (e) { if (e.target === panelEl) close(); });
    return panelEl;
  }

  function onPanelKey(e) {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "Tab" && panelEl) {
      var f = panelEl.querySelectorAll("button, a[href], input, textarea, select");
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }

  function open() {
    lastFocus = document.activeElement;
    view = "cart";
    ensurePanel().hidden = false;
    renderPanel();
    document.addEventListener("keydown", onPanelKey);
  }
  function close() {
    if (panelEl) panelEl.hidden = true;
    document.removeEventListener("keydown", onPanelKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function renderPanel() {
    if (!panelEl || panelEl.hidden) return;
    if (view === "confirmation") return renderConfirmation();
    renderCart();
  }

  function renderCart() {
    var lines = getLines();
    var html =
      '<div class="cart-panel__inner">' +
        '<button class="cart-panel__close" id="cartClose" aria-label="Close your order">Close ✕</button>' +
        '<h2 class="cart-panel__title">Your order</h2>';

    if (!lines.length) {
      html += '<p class="cart-empty">Your order is empty. Add something from the menu to get started.</p></div>';
      panelEl.innerHTML = html;
      panelEl.querySelector("#cartClose").addEventListener("click", close);
      panelEl.querySelector("#cartClose").focus();
      return;
    }

    html += '<ul class="cart-lines">';
    lines.forEach(function (l) {
      html +=
        '<li class="cart-line">' +
          '<div class="cart-line__main">' +
            '<span class="cart-line__name">' + escapeHtml(l.name) + '</span>' +
            '<span class="cart-line__unit">' + fmtCents(l.priceCents) + ' each</span>' +
          '</div>' +
          '<div class="cart-line__qty">' +
            '<button type="button" class="cart-qty-btn" data-dec="' + escapeHtml(l.id) + '" aria-label="Reduce quantity of ' + escapeHtml(l.name) + '">−</button>' +
            '<span class="cart-qty-value" aria-label="Quantity">' + l.qty + '</span>' +
            '<button type="button" class="cart-qty-btn" data-inc="' + escapeHtml(l.id) + '" aria-label="Increase quantity of ' + escapeHtml(l.name) + '">+</button>' +
          '</div>' +
          '<span class="cart-line__total">' + fmtCents(l.lineTotalCents) + '</span>' +
          '<button type="button" class="cart-line__remove" data-remove="' + escapeHtml(l.id) + '" aria-label="Remove ' + escapeHtml(l.name) + '">Remove</button>' +
        '</li>';
    });
    html += '</ul>';

    html +=
      '<p class="cart-subtotal"><span>Subtotal</span><strong>' + fmtCents(getSubtotalCents()) + '</strong></p>' +
      '<p class="cart-note-small">Confirmed on the next step. Lina’s confirms availability and the final amount on WhatsApp.</p>' +
      '<label class="cart-field">Note for Lina’s (optional)' +
        '<textarea id="cartNote" rows="2" maxlength="500" placeholder="e.g. no atchar, extra cheese"></textarea>' +
      '</label>' +
      '<label class="cart-field">Your name (optional)' +
        '<input type="text" id="cartName" maxlength="120" autocomplete="name">' +
      '</label>' +
      '<label class="cart-field">Your phone (optional)' +
        '<input type="tel" id="cartPhone" maxlength="40" autocomplete="tel">' +
      '</label>' +
      // Consent is revealed only when personal details are actually being
      // given — an anonymous order needs no consent and is never asked for one.
      '<div id="cartConsentWrap" hidden>' +
        '<label class="cart-consent">' +
          '<input type="checkbox" id="cartConsent">' +
          '<span>I agree to Lina’s storing my name and phone number to process this order (POPIA).</span>' +
        '</label>' +
      '</div>' +
      '<div aria-hidden="true" style="position:absolute; left:-9999px; top:-9999px;">' +
        '<label>Company<input type="text" id="cartCompany" tabindex="-1" autocomplete="off"></label>' +
      '</div>' +
      '<button type="button" class="btn btn--primary cart-submit" id="cartSubmit">Order via WhatsApp</button>' +
      '<p class="form-status" id="cartStatus" role="status" aria-live="polite"></p>' +
      '</div>';

    panelEl.innerHTML = html;

    panelEl.querySelector("#cartClose").addEventListener("click", close);
    panelEl.querySelectorAll("[data-inc]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-inc");
        state.items.forEach(function (l) { if (l.id === id) setQty(id, l.qty + 1); });
      });
    });
    panelEl.querySelectorAll("[data-dec]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-dec");
        state.items.forEach(function (l) { if (l.id === id) setQty(id, l.qty - 1); });
      });
    });
    panelEl.querySelectorAll("[data-remove]").forEach(function (b) {
      b.addEventListener("click", function () { remove(b.getAttribute("data-remove")); });
    });

    var nameEl = panelEl.querySelector("#cartName");
    var phoneEl = panelEl.querySelector("#cartPhone");
    var consentWrap = panelEl.querySelector("#cartConsentWrap");
    function toggleConsent() {
      consentWrap.hidden = !(nameEl.value.trim() || phoneEl.value.trim());
    }
    nameEl.addEventListener("input", toggleConsent);
    phoneEl.addEventListener("input", toggleConsent);

    panelEl.querySelector("#cartSubmit").addEventListener("click", submitOrder);
    panelEl.querySelector("#cartClose").focus();
  }

  function submitOrder() {
    var btn = panelEl.querySelector("#cartSubmit");
    var statusEl = panelEl.querySelector("#cartStatus");
    var name = panelEl.querySelector("#cartName").value.trim();
    var phone = panelEl.querySelector("#cartPhone").value.trim();
    var consentEl = panelEl.querySelector("#cartConsent");

    if ((name || phone) && (!consentEl || !consentEl.checked)) {
      statusEl.textContent = "Please tick the consent box, or clear your name and phone to order anonymously.";
      statusEl.setAttribute("data-state", "error");
      return;
    }

    btn.disabled = true;
    statusEl.textContent = "Saving your order…";
    statusEl.removeAttribute("data-state");

    var payload = {
      items: state.items.map(function (l) { return { itemId: l.id, quantity: l.qty }; }),
      customerName: name || null,
      customerPhone: phone || null,
      customerNote: panelEl.querySelector("#cartNote").value.trim() || null,
      popiaConsent: Boolean(consentEl && consentEl.checked),
      submissionId: submissionId(),
      company: panelEl.querySelector("#cartCompany").value
    };

    fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (resp) {
      return resp.json().then(function (data) { return { ok: resp.ok, data: data }; });
    }).then(function (res) {
      if (!res.ok || !res.data.ok) {
        // Never a fake success, and the cart is left completely untouched so
        // the customer can simply try again.
        statusEl.textContent = (res.data && res.data.error)
          ? res.data.error
          : "Your order was not saved — nothing was sent. Please try again.";
        statusEl.setAttribute("data-state", "error");
        btn.disabled = false;
        return;
      }
      // Stored. Only now is the customer offered the WhatsApp link.
      lastOrder = res.data.order;
      clear();
      resetSubmissionId();
      view = "confirmation";
      renderConfirmation();
    }).catch(function () {
      statusEl.textContent = "Could not reach the ordering service. Your order was not saved and nothing was sent.";
      statusEl.setAttribute("data-state", "error");
      btn.disabled = false;
    });
  }

  function renderConfirmation() {
    var o = lastOrder;
    if (!o) { view = "cart"; return renderCart(); }

    // Everything below renders from the SERVER response, never from local
    // state — if a price changed mid-session, the server's figure is what the
    // customer sees, and it is the figure actually recorded.
    var html =
      '<div class="cart-panel__inner">' +
        '<button class="cart-panel__close" id="cartClose" aria-label="Close">Close ✕</button>' +
        '<h2 class="cart-panel__title">Order saved</h2>' +
        '<p class="cart-reference-label">Your order reference</p>' +
        '<p class="cart-reference">' + escapeHtml(o.referenceNumber) + '</p>' +
        '<p class="cart-note-small">This order is <strong>awaiting confirmation</strong>. Send the WhatsApp message below so Lina’s can confirm availability, collection and payment.</p>' +
        '<ul class="cart-lines cart-lines--summary">';
    (o.items || []).forEach(function (l) {
      html +=
        '<li class="cart-line cart-line--summary">' +
          '<span class="cart-line__name">' + escapeHtml(l.name) + ' × ' + l.quantity + '</span>' +
          '<span class="cart-line__total">' + fmtCents(l.lineTotalCents) + '</span>' +
        '</li>';
    });
    html +=
        '</ul>' +
        '<p class="cart-subtotal"><span>Subtotal</span><strong>' + fmtCents(o.subtotalCents) + '</strong></p>' +
        // A real anchor rendered BEFORE any gesture is required: tapping it is
        // a genuine user-activated navigation, so it can never be popup-blocked
        // the way a window.open() after an await would be on mobile.
        '<a class="btn btn--primary cart-submit" id="cartWhatsappLink" href="' + escapeHtml(o.whatsappUrl) + '" target="_blank" rel="noopener">Open WhatsApp to send your order</a>' +
        '<button type="button" class="btn btn--ghost cart-copy" id="cartCopy">Copy order text</button>' +
        '<details class="cart-message-details"><summary>Show the message</summary>' +
          '<pre class="cart-message">' + escapeHtml(o.whatsappMessage) + '</pre>' +
        '</details>' +
        '<p class="form-status" id="cartStatus" role="status" aria-live="polite"></p>' +
      '</div>';

    panelEl.innerHTML = html;
    panelEl.querySelector("#cartClose").addEventListener("click", close);
    panelEl.querySelector("#cartCopy").addEventListener("click", function () {
      var btn = panelEl.querySelector("#cartCopy");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(o.whatsappMessage).then(function () {
          btn.textContent = "Copied";
          setTimeout(function () { btn.textContent = "Copy order text"; }, 1600);
        }).catch(function () { btn.textContent = "Could not copy"; });
      } else {
        btn.textContent = "Copy from the message below";
      }
    });
    panelEl.querySelector("#cartWhatsappLink").focus();
  }

  /* ---------- Init ---------- */
  var removedCount = load();
  renderStickyButton();
  if (removedCount > 0) {
    toast(removedCount === 1
      ? "One item is no longer available and was removed"
      : removedCount + " items are no longer available and were removed");
  }

  window.LINA_CART = {
    add: add,
    setQty: setQty,
    remove: remove,
    clear: clear,
    getLines: getLines,
    getCount: getCount,
    getSubtotalCents: getSubtotalCents,
    open: open,
    close: close,
    subscribe: function (fn) { if (typeof fn === "function") subscribers.push(fn); }
  };
})();
