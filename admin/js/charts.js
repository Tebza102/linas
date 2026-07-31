// Lina's admin portal — small dependency-free chart primitives.
// Black/red/white only, restrained opacity variations, no gradients/3D/
// decorative effects. Every renderer takes real numbers and an explicit
// empty-state message — it never fabricates a trend when data is thin.
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Horizontal bars — used for funnels, "leads by source", campaign revenue.
// `items`: [{ label, value, formattedValue }]. Bars are relative to the
// single largest value in the set (not a fixed scale), so a chart with one
// small number still reads sensibly.
export function horizontalBarChart(container, items, emptyMessage) {
  const real = items.filter((i) => i.value > 0);
  if (!real.length) {
    container.innerHTML = `<p class="chart-empty">${esc(emptyMessage)}</p>`;
    return;
  }
  const max = Math.max(...real.map((i) => i.value));
  container.innerHTML = items.map((i, idx) => {
    const pct = max > 0 ? Math.round((i.value / max) * 100) : 0;
    // Restrained opacity step-down by rank — never a rainbow of colours.
    const opacity = Math.max(0.35, 1 - idx * 0.12);
    return `
      <div class="bar-row">
        <span class="bar-row__label" title="${esc(i.label)}">${esc(i.label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${pct}%; opacity:${opacity};"></span></span>
        <span class="bar-row__value">${esc(i.formattedValue != null ? i.formattedValue : i.value)}</span>
      </div>
    `;
  }).join("");
}

// Vertical bars over time — used for "confirmed revenue over time".
// `points`: [{ label, value, formattedValue }], left-to-right chronological.
export function verticalBarChart(container, points, emptyMessage) {
  const real = points.filter((p) => p.value > 0);
  if (!real.length) {
    container.innerHTML = `<p class="chart-empty">${esc(emptyMessage)}</p>`;
    return;
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  container.innerHTML = `
    <div class="vbar-chart">
      ${points.map((p) => {
        const pct = Math.max(2, Math.round((p.value / max) * 100));
        return `
          <div class="vbar-col">
            <span class="vbar-col__value">${p.value > 0 ? esc(p.formattedValue != null ? p.formattedValue : p.value) : ""}</span>
            <div class="vbar-col__bar" style="height:${pct}%; opacity:${p.value > 0 ? 1 : 0.15};"></div>
            <span class="vbar-col__label">${esc(p.label)}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}
