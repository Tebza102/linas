/* Lina's — shared helpers for the client working-model demo pages. */
window.LinaDemo = (function () {
  "use strict";
  function formatDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
    } catch (e) {
      return iso;
    }
  }
  return { formatDate: formatDate };
})();
