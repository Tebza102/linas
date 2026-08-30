/* "Our Offerings" — entry reveal (Home page only).
 *
 * No external library. Progressive enhancement: the section's base CSS
 * state (offerings.css) is fully visible with no JS at all, so a
 * JS-disabled visitor sees the complete section immediately. This
 * script only ever ADDS classes on top of that visible baseline — it
 * never hides content that was already rendered.
 *
 * Reveals once per page load (observer disconnects after the first
 * trigger) and is skipped entirely under prefers-reduced-motion.
 */
(function () {
  "use strict";

  var section = document.querySelector(".offerings");
  if (!section) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return; // stays in its default, fully visible, non-animated state
  }

  section.classList.add("js-armed");

  if (typeof IntersectionObserver === "undefined") {
    // No IntersectionObserver support: reveal immediately rather than
    // leaving the section in its armed (hidden) state forever.
    section.classList.add("is-visible");
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          section.classList.add("is-visible");
          observer.unobserve(section);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
  );

  observer.observe(section);
})();
