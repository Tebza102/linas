// Lina's — discreet "Exit Private Preview" control for the real public
// pages. Reads only the non-secret linas_preview_ui cookie (a UI hint —
// all real authority lives in the HttpOnly linas_private_preview cookie,
// which this script can't read and doesn't need to). No-ops entirely when
// that cookie is absent, so with Coming Soon mode off — or for any visitor
// who never unlocked anything — this script does nothing at all.
(function () {
  "use strict";

  function hasPreviewUiCookie() {
    return document.cookie.split(";").some(function (c) {
      return c.trim().indexOf("linas_preview_ui=") === 0;
    });
  }

  if (!hasPreviewUiCookie()) return;

  var bar = document.createElement("div");
  bar.setAttribute("role", "status");
  bar.style.cssText = [
    "position:fixed", "left:0", "right:0", "bottom:0", "z-index:999",
    "background:#000", "color:rgba(255,255,255,0.85)", "font:13px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
    "padding:10px 16px", "display:flex", "align-items:center", "justify-content:center", "gap:12px"
  ].join(";");

  var label = document.createElement("span");
  label.textContent = "You're viewing a private preview.";

  var exitBtn = document.createElement("button");
  exitBtn.type = "button";
  exitBtn.textContent = "Exit Private Preview";
  exitBtn.style.cssText = "background:none;border:1px solid rgba(255,255,255,0.4);color:#fff;font-size:12px;padding:6px 12px;border-radius:2px;cursor:pointer;";
  exitBtn.addEventListener("click", function () {
    exitBtn.disabled = true;
    exitBtn.textContent = "Exiting…";
    fetch("/api/preview/logout", { method: "POST" })
      .then(function () { location.reload(); })
      .catch(function () {
        exitBtn.disabled = false;
        exitBtn.textContent = "Exit Private Preview";
      });
  });

  bar.appendChild(label);
  bar.appendChild(exitBtn);
  document.body.appendChild(bar);
})();
