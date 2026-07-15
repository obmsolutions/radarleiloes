const state = { allLots: [], filteredLots: [], query: '', favorites: new Set(JSON.parse(localStorage.getItem('favoritos') || '[]')) };

const $ = (selector) => document.querySelector(selector);
const searchForm = $("#searchForm");
const searchInput = $("#searchInput");
const results = $("#results");
const loading = $("#loading");
const emptyState = $("#emptyState");
const resultsSummary = $("#resultsSummary");
const activeFilters = $("#activeFilters");
const detailsDialog = $("#detailsDialog");
const dialogContent = $("#dialogContent");

const filters = {
  state: $("#stateFilter"),
  city: $("#cityFilter"),
  category: $("#categoryFilter"),
  source: $("#sourceFilter"),
  sort: $("#sortFilter"),
};

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "Consulte";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

function formatDate(iso) {
  if (!iso) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(iso));
}

function escapeHtml(text = "") {
  return String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function setOptions(select, values, placeholder) {
  const current = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>` +
    values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  if (values.includes(current)) select.value = current;
}

function populateFilters(lots) {
  setOptions(filters.state, uniqueSorted(lots.map(l => l.state)), "Todos os estados");
  setOptions(filters.city, uniqueSorted(lots.map(l => l.city)), "Todas as cidades");
  setOptions(filters.category, uniqueSorted(lots.map(l => l.category)), "Todas as categorias");
  setOptions(filters.source, uniqueSorted(lots.map(l => l.source)), "Todos os sites");
}

function renderActiveFilters() {
  const labels = [];
  if (state.query) labels.push(`Busca: ${state.query}`);
  if (filters.state.value) labels.push(`Estado: ${filters.state.value}`);
  if (filters.city.value) labels.push(`Cidade: ${filters.city.value}`);
  if (filters.category.value) labels.push(`Categoria: ${filters.category.value}`);
  if (filters.source.value) labels.push(`Site: ${filters.source.value}`);
  activeFilters.innerHTML = labels.map(label => `<span class="filter-chip">${escapeHtml(label)}</span>`).join("");
}

function applyFilters() {
  const now = new Date();
  let data = state.allLots.filter(lot => new Date(lot.endDate) >= now);

  if (filters.state.value) data = data.filter(l => l.state === filters.state.value);
  if (filters.city.value) data = data.filter(l => l.city === filters.city.value);
  if (filters.category.value) data = data.filter(l => l.category === filters.category.value);
  if (filters.source.value) data = data.filter(l => l.source === filters.source.value);

  const sort = filters.sort.value;
  data.sort((a, b) => {
    if (sort === "dateDesc") return new Date(b.endDate) - new Date(a.endDate);
    if (sort === "priceAsc") return (a.currentBid ?? Infinity) - (b.currentBid ?? Infinity);
    if (sort === "priceDesc") return (b.currentBid ?? -Infinity) - (a.currentBid ?? -Infinity);
    return new Date(a.endDate) - new Date(b.endDate);
  });

  state.filteredLots = data;
  renderLots();
  renderActiveFilters();
}

function renderLots() {
  const lots = state.filteredLots;
  resultsSummary.textContent = `${lots.length} lote${lots.length === 1 ? "" : "s"} ativo${lots.length === 1 ? "" : "s"}, ordenado${lots.length === 1 ? "" : "s"} conforme o filtro selecionado.`;
  emptyState.classList.toggle("hidden", lots.length > 0);
  results.innerHTML = lots.map(lot => `
    <article class="lot-card">
      <button class="lot-image-wrap js-details" data-id="${escapeHtml(lot.id)}" aria-label="Ver detalhes de ${escapeHtml(lot.title)}" style="border:0;padding:0;text-align:left">
        <img class="lot-image" src="${escapeHtml(lot.imageUrl)}" alt="${escapeHtml(lot.title)}" loading="lazy"
          onerror="this.src='https://placehold.co/900x600/161c2b/98a2b8?text=Imagem+indisponível'">
        <span class="source-badge">${escapeHtml(lot.source)}</span>
      </button>

      <div class="lot-content">
        <div class="category">${escapeHtml(lot.category || "Outros")}</div>
        <h3 class="lot-title">${escapeHtml(lot.title)}</h3>

        <div class="meta-row">
          <span class="meta-pill">📅 Encerra ${formatDate(lot.endDate)}</span>
          <span class="meta-pill">📍 ${escapeHtml(lot.city)}/${escapeHtml(lot.state)}</span>
          ${lot.reference ? `<span class="meta-pill">🏷️ ${escapeHtml(lot.reference)}</span>` : ""}
        </div>

        <div class="price-row">
          <div>
            <div class="price-label">Lance atual</div>
            <div class="price">${formatCurrency(lot.currentBid)}</div>
          </div>
          <div class="card-actions">
            <button class="action-button js-details" data-id="${escapeHtml(lot.id)}">Ver detalhes</button>
            <a class="action-button highlight" href="${escapeHtml(lot.url)}" target="_blank" rel="noopener noreferrer">Entrar no anúncio ↗</a>
          </div>
        </div>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".js-details").forEach(btn => {
    btn.addEventListener("click", () => openDetails(btn.dataset.id));
  });
}

function openDetails(id) {
  const lot = state.allLots.find(item => item.id === id);
  if (!lot) return;
  dialogContent.innerHTML = `
    <img class="dialog-image" src="${escapeHtml(lot.imageUrl)}" alt="${escapeHtml(lot.title)}">
    <div class="dialog-body">
      <div class="category">${escapeHtml(lot.source)} · ${escapeHtml(lot.category)}</div>
      <h2>${escapeHtml(lot.title)}</h2>
      <p>${escapeHtml(lot.description || "Consulte o anúncio oficial para informações completas, taxas e condições.")}</p>

      <div class="dialog-grid">
        <div class="detail-box"><small>Lance atual</small><strong>${formatCurrency(lot.currentBid)}</strong></div>
        <div class="detail-box"><small>Encerramento</small><strong>${formatDate(lot.endDate)}</strong></div>
        <div class="detail-box"><small>Local</small><strong>${escapeHtml(lot.city)}/${escapeHtml(lot.state)}</strong></div>
        <div class="detail-box"><small>Referência</small><strong>${escapeHtml(lot.reference || "Não informada")}</strong></div>
      </div>

      <a class="action-button highlight" href="${escapeHtml(lot.url)}" target="_blank" rel="noopener noreferrer">
        Entrar no anúncio oficial ↗
      </a>
    </div>
  `;
  detailsDialog.showModal();
}

async function runSearch(query) {
  loading.classList.remove("hidden");
  emptyState.classList.add("hidden");
  results.innerHTML = "";
  try {
    const response = await fetch('data/leiloes.json');
    if (!response.ok) throw new Error("Falha na consulta");
    const payload = await response.json();
    state.query = query.trim();
    const terms = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/\s+/).filter(Boolean);
    state.allLots = (payload.items || []).filter(lot => { const h = [lot.title, lot.description, lot.category, lot.city, lot.state, lot.source, lot.reference].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); return !terms.length || terms.every(t => h.includes(t)); });
    populateFilters(state.allLots);
    applyFilters();
  } catch (error) {
    console.error(error);
    resultsSummary.textContent = "Não foi possível concluir a busca.";
    emptyState.classList.remove("hidden");
    emptyState.querySelector("h3").textContent = "Erro ao consultar as fontes";
    emptyState.querySelector("p").textContent = "Verifique se o servidor está em execução e tente novamente.";
  } finally {
    loading.classList.add("hidden");
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch(searchInput.value);
});

Object.values(filters).forEach(select => select.addEventListener("change", applyFilters));

$("#clearFilters").addEventListener("click", () => {
  Object.values(filters).forEach(select => {
    if (select !== filters.sort) select.value = "";
  });
  filters.sort.value = "dateAsc";
  applyFilters();
});

$("#closeDialog").addEventListener("click", () => detailsDialog.close());
detailsDialog.addEventListener("click", (event) => {
  if (event.target === detailsDialog) detailsDialog.close();
});

$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
});
if (localStorage.getItem("theme") === "light") document.body.classList.add("light");

runSearch("");
