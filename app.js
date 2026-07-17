/*
 Radar Leilões Frontend v2.0
 Antes de publicar, altere somente a linha API_BASE abaixo.
*/
const API_BASE = "https://radarleiloes-api.onrender.com";

const STORAGE = {
  favorites: "radarLeiloes_favorites",
  notes: "radarLeiloes_notes",
  theme: "radarLeiloes_theme"
};

const state = {
  items: [],
  filtered: [],
  query: "",
  favorites: new Set(JSON.parse(localStorage.getItem(STORAGE.favorites) || "[]")),
  notes: JSON.parse(localStorage.getItem(STORAGE.notes) || "{}")
};

const $ = selector => document.querySelector(selector);
const results = $("#results");
const summary = $("#resultsSummary");
const emptyState = $("#emptyState");
const activeFilters = $("#activeFilters");
const searchInput = $("#searchInput");
const detailsDialog = $("#detailsDialog");
const detailsContent = $("#detailsContent");

const filters = {
  state: $("#stateFilter"),
  city: $("#cityFilter"),
  category: $("#categoryFilter"),
  source: $("#sourceFilter"),
  status: $("#statusFilter"),
  sort: $("#sortFilter")
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}
function currency(value) {
  if (value === null || value === undefined || value === "") return "Consulte";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}
function dateTime(value) {
  if (!value) return "Data não identificada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a,b) => a.localeCompare(b, "pt-BR"));
}
function setOptions(select, values, label) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${label}</option>` + values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  if (values.includes(current)) select.value = current;
}
function populateFilters() {
  setOptions(filters.state, unique(state.items.map(i => i.state)), "Todos os estados");
  setOptions(filters.city, unique(state.items.map(i => i.city)), "Todas as cidades");
  setOptions(filters.category, unique(state.items.map(i => i.category)), "Todas as categorias");
  setOptions(filters.source, unique(state.items.map(i => i.source)), "Todos os sites");
}
function applyLocalFilters() {
  let items = [...state.items];
  if (filters.state?.value) items = items.filter(i => i.state === filters.state.value);
  if (filters.city?.value) items = items.filter(i => i.city === filters.city.value);
  if (filters.category?.value) items = items.filter(i => i.category === filters.category.value);
  if (filters.source?.value) items = items.filter(i => i.source === filters.source.value);
  if (filters.status?.value === "favorites") items = items.filter(i => state.favorites.has(i.id));
  if (filters.status?.value === "soon") {
    const limit = new Date(); limit.setDate(limit.getDate() + 3);
    items = items.filter(i => i.endDate && new Date(i.endDate) <= limit);
  }
  const sort = filters.sort?.value || "dateAsc";
  items.sort((a,b) => {
    if (sort === "dateDesc") return new Date(b.endDate || 0) - new Date(a.endDate || 0);
    if (sort === "priceAsc") return (a.currentBid ?? Infinity) - (b.currentBid ?? Infinity);
    if (sort === "priceDesc") return (b.currentBid ?? -Infinity) - (a.currentBid ?? -Infinity);
    if (sort === "titleAsc") return a.title.localeCompare(b.title, "pt-BR");
    if (!a.endDate) return 1;
    if (!b.endDate) return -1;
    return new Date(a.endDate) - new Date(b.endDate);
  });
  state.filtered = items;
  render();
}
function render() {
  summary.textContent = `${state.filtered.length} oportunidade${state.filtered.length === 1 ? "" : "s"} encontrada${state.filtered.length === 1 ? "" : "s"}.`;
  emptyState?.classList.toggle("hidden", state.filtered.length > 0);
  const chips = [];
  if (state.query) chips.push(`Busca: ${state.query}`);
  if (filters.state?.value) chips.push(`Estado: ${filters.state.value}`);
  if (filters.city?.value) chips.push(`Cidade: ${filters.city.value}`);
  if (filters.category?.value) chips.push(`Categoria: ${filters.category.value}`);
  if (filters.source?.value) chips.push(`Site: ${filters.source.value}`);
  if (activeFilters) activeFilters.innerHTML = chips.map(c => `<span class="chip">${escapeHtml(c)}</span>`).join("");

  results.innerHTML = state.filtered.map(item => {
    const fav = state.favorites.has(item.id);
    const note = state.notes[item.id] || "";
    return `<article class="lot-card">
      <div class="image-button js-details" data-id="${escapeHtml(item.id)}" role="button" tabindex="0">
        <img class="lot-image" src="${escapeHtml(item.imageUrl || "assets/placeholder.svg")}" alt="${escapeHtml(item.title)}" onerror="this.src='assets/placeholder.svg'">
        <span class="source-badge">${escapeHtml(item.source)}</span>
        <button class="favorite-button ${fav ? "active" : ""} js-favorite" data-id="${escapeHtml(item.id)}">${fav ? "♥" : "♡"}</button>
      </div>
      <div class="lot-content">
        <div class="category">${escapeHtml(item.category || "Diversos")}</div>
        <h3 class="lot-title">${escapeHtml(item.title)}</h3>
        <div class="meta-row">
          <span class="meta-pill">📅 ${dateTime(item.endDate)}</span>
          ${(item.city || item.state) ? `<span class="meta-pill">📍 ${escapeHtml(item.city || "Local não identificado")}${item.state ? `/${escapeHtml(item.state)}` : ""}</span>` : ""}
          ${item.reference ? `<span class="meta-pill">🏷️ ${escapeHtml(item.reference)}</span>` : ""}
        </div>
        ${note ? `<p class="notes-preview"><strong>Minha anotação:</strong> ${escapeHtml(note)}</p>` : ""}
        <div class="price-actions">
          <div><div class="price-label">Lance atual</div><div class="price">${currency(item.currentBid)}</div></div>
          <div class="card-actions">
            <button class="action-button js-details" data-id="${escapeHtml(item.id)}">Ver detalhes</button>
            <a class="action-button highlight" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Abrir anúncio ↗</a>
          </div>
        </div>
      </div>
    </article>`;
  }).join("");

  document.querySelectorAll(".js-details").forEach(el => el.addEventListener("click", e => {
    if (!e.target.closest(".js-favorite")) openDetails(el.dataset.id);
  }));
  document.querySelectorAll(".js-favorite").forEach(el => el.addEventListener("click", e => {
    e.stopPropagation(); toggleFavorite(el.dataset.id);
  }));
}
function toggleFavorite(id) {
  state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
  localStorage.setItem(STORAGE.favorites, JSON.stringify([...state.favorites]));
  applyLocalFilters();
}
function openDetails(id) {
  const item = state.items.find(i => i.id === id);
  if (!item || !detailsDialog || !detailsContent) return;
  detailsContent.innerHTML = `<img class="dialog-image" src="${escapeHtml(item.imageUrl || "assets/placeholder.svg")}" alt="${escapeHtml(item.title)}">
  <div class="dialog-body">
    <div class="category">${escapeHtml(item.source)} · ${escapeHtml(item.category || "Diversos")}</div>
    <h2>${escapeHtml(item.title)}</h2>
    <p>${escapeHtml(item.description || "Consulte o anúncio oficial para detalhes completos.")}</p>
    <div class="details-grid">
      <div class="detail-box"><small>Lance atual</small><strong>${currency(item.currentBid)}</strong></div>
      <div class="detail-box"><small>Encerramento</small><strong>${dateTime(item.endDate)}</strong></div>
      <div class="detail-box"><small>Local</small><strong>${escapeHtml(item.city || "Não identificado")}${item.state ? `/${escapeHtml(item.state)}` : ""}</strong></div>
      <div class="detail-box"><small>Referência</small><strong>${escapeHtml(item.reference || "Não informada")}</strong></div>
    </div>
    <label style="display:grid;gap:7px;color:var(--muted)">Minha anotação
      <textarea id="detailNote" rows="4" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);color:var(--text)">${escapeHtml(state.notes[item.id] || "")}</textarea>
    </label>
    <div class="dialog-actions">
      <button id="saveNoteButton" class="secondary-button">Salvar anotação</button>
      <a class="primary-button" style="display:inline-flex;align-items:center" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Abrir anúncio ↗</a>
    </div>
  </div>`;
  $("#saveNoteButton").addEventListener("click", () => {
    state.notes[item.id] = $("#detailNote").value.trim();
    localStorage.setItem(STORAGE.notes, JSON.stringify(state.notes));
    detailsDialog.close(); applyLocalFilters();
  });
  detailsDialog.showModal();
}
async function searchApi(query = "") {
  if (API_BASE.includes("COLE_AQUI")) {
    summary.textContent = "Configure a URL da API na primeira linha do arquivo app.js.";
    emptyState?.classList.remove("hidden");
    return;
  }
  summary.textContent = "Consultando os sites públicos. Aguarde...";
  results.innerHTML = "";
  emptyState?.classList.add("hidden");
  try {
    const url = new URL("/api/search", API_BASE);
    if (query) url.searchParams.set("q", query);
    url.searchParams.set("refresh", "1");
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API respondeu ${response.status}`);
    const data = await response.json();
    state.items = data.items || [];
    state.query = query;
    populateFilters();
    applyLocalFilters();
    if (data.errors?.length) console.warn("Algumas fontes falharam:", data.errors);
  } catch (error) {
    console.error(error);
    summary.textContent = "Não foi possível falar com a API. Confirme a URL e se o Render está online.";
    emptyState?.classList.remove("hidden");
  }
}

$("#searchForm")?.addEventListener("submit", e => {
  e.preventDefault();
  searchApi(searchInput.value.trim());
});
Object.values(filters).filter(Boolean).forEach(select => select.addEventListener("change", applyLocalFilters));
$("#clearButton")?.addEventListener("click", () => {
  searchInput.value = "";
  Object.values(filters).filter(Boolean).forEach(s => s.value = "");
  if (filters.sort) filters.sort.value = "dateAsc";
  searchApi("");
});
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => {
  document.getElementById(button.dataset.close)?.close();
}));
$("#themeButton")?.addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem(STORAGE.theme, document.body.classList.contains("light") ? "light" : "dark");
});
if (localStorage.getItem(STORAGE.theme) === "light") document.body.classList.add("light");

searchApi("");
