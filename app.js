
/**
 * Replace your current service card renderer with this structure.
 * If your function is named differently, adapt accordingly.
 */
function serviceCardTemplate(s){
  return `
    <div class="service-card">
      <div class="service-header">
        <div class="service-title">${escapeHtml(s.name || "")}</div>
        <div class="service-price">$${Number(s.base || 0)}</div>
      </div>

      <div class="service-questions">
        ${(s.questions || []).map(q => `
          <div class="mini">${escapeHtml(q.label || "")}</div>
        `).join("")}
      </div>
    </div>
  `;
}

/**
 * Example integration inside renderServicesList():
 *
 * function renderServicesList(){
 *   const el = document.getElementById("serviceList");
 *   el.innerHTML = state.services.map(serviceCardTemplate).join("");
 * }
 */
