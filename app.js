/**
 * Frontend Lógica para Administrador de Prompts SPA
 */

// --- ESTADO DE LA APLICACIÓN ---
const state = {
  prompts: [],             // Lista completa de prompts desde la base de datos
  categories: [],          // Lista de categorías únicas
  selectedCategory: 'all', // Categoría actualmente filtrada
  searchQuery: '',         // Búsqueda de texto activa
  apiUrl: 'https://script.google.com/macros/s/AKfycbwclvP0l3jgSIvgbjyR6JlST48nRlYuJjeSWDz_TUgTrhPX09g1hhIKggDgzff5oJ9Nyw/exec',              // URL de la Web App de Google Apps Script
  theme: 'light',          // Tema actual: 'light' o 'dark'
  isSyncing: false         // Bandera para evitar peticiones duplicadas
};

// --- ELEMENTOS DEL DOM ---
const DOM = {
  // Cabecera e Interfaces Globales
  html: document.documentElement,
  themeToggle: document.getElementById('themeToggle'),
  iconMoon: document.getElementById('iconMoon'),
  iconSun: document.getElementById('iconSun'),
  connectionStatus: document.getElementById('connectionStatus'),
  connectionStatusText: document.getElementById('connectionStatusText'),
  toastContainer: document.getElementById('toastContainer'),

  // Estadísticas
  statTotalPrompts: document.getElementById('statTotalPrompts'),
  statTotalCategories: document.getElementById('statTotalCategories'),
  statLastSync: document.getElementById('statLastSync'),

  // Controles
  searchInput: document.getElementById('searchInput'),
  categoryPills: document.getElementById('categoryPills'),
  promptsGrid: document.getElementById('promptsGrid'),
  categorySuggestions: document.getElementById('categorySuggestions'),

  // Botones de Apertura de Modales
  btnOpenSettings: document.getElementById('btnOpenSettings'),
  btnOpenCreateModal: document.getElementById('btnOpenCreateModal'),

  // Modal: Ajustes (Settings)
  settingsModal: document.getElementById('settingsModal'),
  settingsForm: document.getElementById('settingsForm'),
  settingsApiUrl: document.getElementById('settingsApiUrl'),
  btnCloseSettingsModal: document.getElementById('btnCloseSettingsModal'),
  btnCancelSettingsModal: document.getElementById('btnCancelSettingsModal'),

  // Modal: Formulario (Crear/Editar)
  promptModal: document.getElementById('promptModal'),
  promptForm: document.getElementById('promptForm'),
  promptModalTitle: document.getElementById('promptModalTitle'),
  formRowIndex: document.getElementById('formRowIndex'),
  formCategoria: document.getElementById('formCategoria'),
  formNombre: document.getElementById('formNombre'),
  formPrompt: document.getElementById('formPrompt'),
  formEjemplos: document.getElementById('formEjemplos'),
  btnClosePromptModal: document.getElementById('btnClosePromptModal'),
  btnCancelPromptModal: document.getElementById('btnCancelPromptModal'),
  btnSavePrompt: document.getElementById('btnSavePrompt'),

  // Modal: Detalle
  detailModal: document.getElementById('detailModal'),
  detailCategory: document.getElementById('detailCategory'),
  detailDate: document.getElementById('detailDate'),
  detailModalTitle: document.getElementById('detailModalTitle'),
  detailPromptContent: document.getElementById('detailPromptContent'),
  detailExamplesContent: document.getElementById('detailExamplesContent'),
  detailExamplesSection: document.getElementById('detailExamplesSection'),
  btnCopyPrompt: document.getElementById('btnCopyPrompt'),
  btnCopyExamples: document.getElementById('btnCopyExamples'),
  btnEditFromDetail: document.getElementById('btnEditFromDetail'),
  btnCloseDetailModal: document.getElementById('btnCloseDetailModal'),
  btnCloseDetail: document.getElementById('btnCloseDetail')
};

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSettings();
  registerEvents();

  if (state.apiUrl) {
    fetchPrompts();
  } else {
    showToast('Por favor, configura la URL de la API de Google Apps Script.', 'warning');
    openModal(DOM.settingsModal);
    renderGridEmptyState(true); // Indica que falta configurar
  }
});

// --- ENRUTADOR Y EVENTOS DE INTERFAZ ---
function registerEvents() {
  // Tema
  DOM.themeToggle.addEventListener('click', toggleTheme);

  // Modales - Ajustes
  DOM.btnOpenSettings.addEventListener('click', () => {
    DOM.settingsApiUrl.value = state.apiUrl;
    openModal(DOM.settingsModal);
  });
  DOM.btnCloseSettingsModal.addEventListener('click', () => closeModal(DOM.settingsModal));
  DOM.btnCancelSettingsModal.addEventListener('click', () => closeModal(DOM.settingsModal));
  DOM.settingsForm.addEventListener('submit', handleSettingsSubmit);

  // Modales - Formulario Prompt
  DOM.btnOpenCreateModal.addEventListener('click', () => openPromptFormModal());
  DOM.btnClosePromptModal.addEventListener('click', () => closeModal(DOM.promptModal));
  DOM.btnCancelPromptModal.addEventListener('click', () => closeModal(DOM.promptModal));
  DOM.promptForm.addEventListener('submit', handlePromptSubmit);

  // Modales - Detalle
  DOM.btnCloseDetailModal.addEventListener('click', () => closeModal(DOM.detailModal));
  DOM.btnCloseDetail.addEventListener('click', () => closeModal(DOM.detailModal));
  DOM.btnEditFromDetail.addEventListener('click', handleEditFromDetail);

  // Filtros y Búsqueda
  DOM.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    renderPrompts();
  });

  // Copiar Portapapeles (Detalle)
  DOM.btnCopyPrompt.addEventListener('click', () => {
    copyToClipboard(DOM.detailPromptContent.textContent, 'Prompt copiado al portapapeles');
  });
  DOM.btnCopyExamples.addEventListener('click', () => {
    copyToClipboard(DOM.detailExamplesContent.textContent, 'Ejemplos copiados al portapapeles');
  });

  // Cerrar modales al hacer clic fuera
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeModal(e.target);
    }
  });
}

// --- GESTIÓN DE TEMAS (CLARO / OSCURO) ---
function initTheme() {
  const savedTheme = localStorage.getItem('prompt_manager_theme');
  if (savedTheme) {
    state.theme = savedTheme;
  } else {
    // Si no hay preferencia guardada, usamos la preferencia del sistema
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    state.theme = prefersDark ? 'dark' : 'light';
  }
  applyTheme();
}

function applyTheme() {
  DOM.html.setAttribute('data-theme', state.theme);
  if (state.theme === 'dark') {
    DOM.iconMoon.style.display = 'none';
    DOM.iconSun.style.display = 'block';
  } else {
    DOM.iconMoon.style.display = 'block';
    DOM.iconSun.style.display = 'none';
  }
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('prompt_manager_theme', state.theme);
  applyTheme();
}

// --- GESTIÓN DE CONFIGURACIÓN (API URL) ---
function initSettings() {
  const savedUrl = localStorage.getItem('prompt_manager_api_url');
  if (savedUrl) {
    state.apiUrl = savedUrl;
  }
  updateConnectionBadge();
}

function updateConnectionBadge(status = 'none') {
  DOM.connectionStatus.className = 'connection-badge';

  if (!state.apiUrl) {
    DOM.connectionStatus.classList.add('disconnected');
    DOM.connectionStatusText.textContent = 'Sin Configurar';
    DOM.connectionStatus.title = 'Configura el URL de la API';
    return;
  }

  if (status === 'testing') {
    DOM.connectionStatus.classList.add('disconnected');
    DOM.connectionStatusText.textContent = 'Probando...';
    return;
  }

  if (status === 'connected') {
    DOM.connectionStatus.classList.add('connected');
    DOM.connectionStatusText.textContent = 'Conectado';
    DOM.connectionStatus.title = `Conectado a la API: ${state.apiUrl}`;
  } else {
    DOM.connectionStatus.classList.add('disconnected');
    DOM.connectionStatusText.textContent = 'Desconectado';
    DOM.connectionStatus.title = 'Fallo de conexión. Revisa el URL de la API.';
  }
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const url = DOM.settingsApiUrl.value.trim();

  if (!url) {
    showToast('El URL de la API es requerido.', 'error');
    return;
  }

  if (!url.startsWith('https://script.google.com/')) {
    showToast('El URL debe comenzar con https://script.google.com/...', 'warning');
    return;
  }

  // Guardamos temporalmente y probamos la conexión
  updateConnectionBadge('testing');
  showToast('Probando conexión con Google Sheets...', 'info');

  try {
    // Para probar la conexión y configurar la hoja si no lo está, enviamos una acción 'setup'
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({ action: 'setup' })
    });

    const result = await response.json();

    if (result.status === 'success') {
      state.apiUrl = url;
      localStorage.setItem('prompt_manager_api_url', url);
      updateConnectionBadge('connected');
      closeModal(DOM.settingsModal);
      showToast(result.message || 'Conexión exitosa y base de datos lista.', 'success');
      fetchPrompts(); // Carga de inmediato los prompts
    } else {
      throw new Error(result.message || 'La API devolvió un estado fallido.');
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    updateConnectionBadge('error');
    showToast('No se pudo establecer conexión con el Google Sheet. Valida la URL y los permisos.', 'error');
  }
}

// --- MODALES GENERALES ---
function openModal(modal) {
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  // Evitar scroll en el fondo
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// --- FORMULARIO DE PROMPTS (CREAR / EDITAR) ---
function openPromptFormModal(promptData = null) {
  DOM.promptForm.reset();

  // Rellenamos sugerencias de categorías en la lista interactiva
  renderCategorySuggestions();

  if (promptData) {
    // Modo Edición
    DOM.promptModalTitle.textContent = 'Editar Prompt';
    DOM.formRowIndex.value = promptData.row;
    DOM.formCategoria.value = promptData.categoria;
    DOM.formNombre.value = promptData.nombre;
    DOM.formPrompt.value = promptData.prompt;
    DOM.formEjemplos.value = promptData.ejemplos;
    DOM.btnSavePrompt.textContent = 'Actualizar Prompt';
  } else {
    // Modo Creación
    DOM.promptModalTitle.textContent = 'Nuevo Prompt';
    DOM.formRowIndex.value = '';
    DOM.btnSavePrompt.textContent = 'Guardar Prompt';
  }

  openModal(DOM.promptModal);
  DOM.formCategoria.focus();
}

async function handlePromptSubmit(e) {
  e.preventDefault();

  const categoria = DOM.formCategoria.value.trim();
  const nombre = DOM.formNombre.value.trim();
  const prompt = DOM.formPrompt.value.trim();
  const ejemplos = DOM.formEjemplos.value.trim();
  const rowIndex = DOM.formRowIndex.value; // Si existe, es edición

  // Validaciones
  if (!categoria || !nombre || !prompt) {
    showToast('Los campos con asterisco (*) son obligatorios.', 'warning');
    return;
  }

  if (!state.apiUrl) {
    showToast('La API de Google Sheets no está configurada.', 'error');
    openModal(DOM.settingsModal);
    return;
  }

  const isEdit = rowIndex !== '';
  const action = isEdit ? 'update' : 'create';

  // Cambiamos el estado del botón a guardando
  DOM.btnSavePrompt.disabled = true;
  DOM.btnSavePrompt.textContent = isEdit ? 'Actualizando...' : 'Guardando...';

  const payload = {
    action: action,
    categoria: categoria,
    nombre: nombre,
    prompt: prompt,
    ejemplos: ejemplos
  };

  if (isEdit) {
    payload.row = parseInt(rowIndex, 10);
  }

  try {
    const response = await fetch(state.apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.status === 'success') {
      showToast(result.message || 'Guardado exitoso.', 'success');
      closeModal(DOM.promptModal);

      // Actualizamos localmente para agilizar la UI sin hacer un full refetch
      if (isEdit) {
        const index = state.prompts.findIndex(p => p.row === payload.row);
        if (index !== -1) {
          state.prompts[index] = { ...state.prompts[index], ...result.data };
        }
      } else {
        state.prompts.push(result.data);
      }

      // Procesar estadísticas y redibujar
      updateStats();
      rebuildCategoriesFilter();
      renderPrompts();

      // Opcionalmente hacemos sync en background para asegurar sincronía
      fetchPrompts(false); // silencioso, sin skeletons
    } else {
      throw new Error(result.message || 'Error al guardar.');
    }
  } catch (error) {
    console.error('Error al guardar el prompt:', error);
    showToast('Error de red al intentar guardar en Google Sheets.', 'error');
  } finally {
    DOM.btnSavePrompt.disabled = false;
    DOM.btnSavePrompt.textContent = isEdit ? 'Actualizar Prompt' : 'Guardar Prompt';
  }
}

// --- OPERACIÓN LEER (FETCH PROMPTS) ---
async function fetchPrompts(showSkeletons = true) {
  if (!state.apiUrl) return;

  if (state.isSyncing) return;
  state.isSyncing = true;

  if (showSkeletons) {
    renderGridSkeletons();
  }

  try {
    const response = await fetch(state.apiUrl);
    const result = await response.json();

    if (result.status === 'success') {
      state.prompts = result.data || [];
      updateConnectionBadge('connected');

      // Actualizamos estadísticas
      updateStats();
      DOM.statLastSync.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Reconstruir lista de categorías y renderizar
      rebuildCategoriesFilter();
      renderPrompts();
    } else {
      throw new Error(result.message || 'Error en respuesta de la API.');
    }
  } catch (error) {
    console.error('Error al obtener prompts:', error);
    updateConnectionBadge('error');
    showToast('Error al conectar con Google Sheets para leer datos.', 'error');
    if (showSkeletons) {
      renderGridEmptyState(false, true); // Mostrar error de carga
    }
  } finally {
    state.isSyncing = false;
  }
}

// --- ELIMINAR PROMPT ---
async function deletePrompt(rowNum) {
  if (!confirm('¿Estás seguro de que deseas eliminar este prompt de forma permanente?')) {
    return;
  }

  if (!state.apiUrl) {
    showToast('Configura la API antes de realizar operaciones.', 'error');
    return;
  }

  showToast('Eliminando prompt...', 'info');

  try {
    const response = await fetch(state.apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({
        action: 'delete',
        row: rowNum
      })
    });

    const result = await response.json();

    if (result.status === 'success') {
      showToast(result.message || 'Prompt eliminado correctamente.', 'success');

      // Quitamos de memoria y renderizamos de inmediato
      state.prompts = state.prompts.filter(p => p.row !== rowNum);

      // Actualizar estadísticas y filtros
      updateStats();
      rebuildCategoriesFilter();
      renderPrompts();

      // Volvemos a sincronizar en background para reordenar índices de fila corretos
      fetchPrompts(false);
    } else {
      throw new Error(result.message || 'No se pudo eliminar el prompt.');
    }
  } catch (error) {
    console.error('Error al eliminar:', error);
    showToast('Error de conexión al intentar eliminar el prompt.', 'error');
  }
}

// --- VISTA DETALLADA Y COPIA DE PROMPTS ---
function viewPromptDetails(rowNum) {
  const promptData = state.prompts.find(p => p.row === rowNum);
  if (!promptData) return;

  DOM.detailCategory.textContent = promptData.categoria || 'SIN CATEGORÍA';
  DOM.detailCategory.style.backgroundColor = getCategoryColor(promptData.categoria);
  if (DOM.detailDate) {
    if (promptData.fecha) {
      DOM.detailDate.textContent = `Añadido el: ${formatDisplayDate(promptData.fecha)}`;
      DOM.detailDate.style.display = 'inline-block';
    } else {
      DOM.detailDate.textContent = '';
      DOM.detailDate.style.display = 'none';
    }
  }
  DOM.detailModalTitle.textContent = promptData.nombre;
  DOM.detailPromptContent.textContent = promptData.prompt;

  if (promptData.ejemplos && promptData.ejemplos.trim()) {
    DOM.detailExamplesContent.textContent = promptData.ejemplos;
    DOM.detailExamplesSection.style.display = 'flex';
  } else {
    DOM.detailExamplesContent.textContent = '';
    DOM.detailExamplesSection.style.display = 'none';
  }

  // Guardamos el número de fila para que la edición desde el detalle funcione
  DOM.btnEditFromDetail.setAttribute('data-row', rowNum);

  openModal(DOM.detailModal);
}

function handleEditFromDetail() {
  const rowNum = parseInt(DOM.btnEditFromDetail.getAttribute('data-row'), 10);
  closeModal(DOM.detailModal);

  const promptData = state.prompts.find(p => p.row === rowNum);
  if (promptData) {
    setTimeout(() => {
      openPromptFormModal(promptData);
    }, 200); // Pequeño delay para transicionar entre modales fluidamente
  }
}

// --- RENDERIZADO DE LA INTERFAZ ---

// Renderizar las píldoras de filtro de categorías
function rebuildCategoriesFilter() {
  // Extraemos las categorías únicas, limpiando espacios y descartando vacías
  const cats = state.prompts
    .map(p => p.categoria.trim())
    .filter((cat, index, self) => cat !== '' && self.indexOf(cat) === index)
    .sort();

  state.categories = cats;

  // Guardamos la categoría seleccionada por si ya no existe tras borrar
  if (state.selectedCategory !== 'all' && !state.categories.includes(state.selectedCategory)) {
    state.selectedCategory = 'all';
  }

  // Render en DOM
  let html = `<button class="category-pill ${state.selectedCategory === 'all' ? 'active' : ''}" data-category="all">Todas</button>`;

  state.categories.forEach(cat => {
    html += `<button class="category-pill ${state.selectedCategory === cat ? 'active' : ''}" data-category="${cat}">${cat}</button>`;
  });

  DOM.categoryPills.innerHTML = html;

  // Añadir eventos a las nuevas píldoras
  const pills = DOM.categoryPills.querySelectorAll('.category-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedCategory = pill.getAttribute('data-category');
      renderPrompts();
    });
  });
}

// Sugerencias para el Datalist de categorías del formulario
function renderCategorySuggestions() {
  let html = '';
  state.categories.forEach(cat => {
    html += `<option value="${cat}">`;
  });
  DOM.categorySuggestions.innerHTML = html;
}

// Renderizar la rejilla de tarjetas (prompts)
function renderPrompts() {
  DOM.promptsGrid.innerHTML = '';

  // Aplicamos filtros en memoria (Categoría y Búsqueda de Texto)
  const filtered = state.prompts.filter(p => {
    const matchesCategory = state.selectedCategory === 'all' || p.categoria.trim() === state.selectedCategory;

    const query = state.searchQuery.toLowerCase();
    const matchesQuery = !query ||
      (p.nombre || '').toLowerCase().includes(query) ||
      (p.categoria || '').toLowerCase().includes(query) ||
      (p.prompt || '').toLowerCase().includes(query) ||
      (p.ejemplos || '').toLowerCase().includes(query);

    return matchesCategory && matchesQuery;
  });

  if (filtered.length === 0) {
    renderGridEmptyState();
    return;
  }

  // Dibujar tarjetas
  filtered.forEach(p => {
    const card = document.createElement('article');
    card.className = 'prompt-card';
    card.id = `prompt-card-${p.row}`;

    // Asignación de color de categoría
    const badgeColor = getCategoryColor(p.categoria);

    // Escapar texto para render HTML seguro
    const nombreEscapado = escapeHtml(p.nombre);
    const categoriaEscapada = escapeHtml(p.categoria || 'Sin Categoría');
    const promptEscapado = escapeHtml(p.prompt);

    card.innerHTML = `
      <div>
        <div class="card-header">
          <span class="card-category-badge" style="background-color: ${badgeColor};">${categoriaEscapada}</span>
          ${p.fecha ? `<span class="card-date" title="Añadido el: ${escapeHtml(p.fecha)}">${escapeHtml(formatDisplayDate(p.fecha))}</span>` : ''}
        </div>
        <h3 class="card-title">${nombreEscapado}</h3>
        <div class="card-body">
          <div>
            <div class="card-section-label">Prompt</div>
            <div class="card-content-preview">${promptEscapado}</div>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-secondary btn-copy-small" onclick="copyCardPrompt(${p.row})" title="Copiar el texto completo del prompt">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copiar</span>
        </button>
        
        <div class="card-actions">
          <button class="btn-card-action btn-view" onclick="viewPromptDetails(${p.row})" title="Ver detalles y ejemplos" aria-label="Ver detalles de ${nombreEscapado}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button class="btn-card-action btn-edit" onclick="editPrompt(${p.row})" title="Editar" aria-label="Editar ${nombreEscapado}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button class="btn-card-action btn-delete" onclick="deletePrompt(${p.row})" title="Eliminar" aria-label="Eliminar ${nombreEscapado}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
    `;

    DOM.promptsGrid.appendChild(card);
  });
}

// Vincular funciones globales de la tarjeta a funciones internas
window.copyCardPrompt = function (rowNum) {
  const promptData = state.prompts.find(p => p.row === rowNum);
  if (promptData) {
    copyToClipboard(promptData.prompt, 'Prompt copiado');
  }
};

window.editPrompt = function (rowNum) {
  const promptData = state.prompts.find(p => p.row === rowNum);
  if (promptData) {
    openPromptFormModal(promptData);
  }
};

// Renderizar tarjetas skeleton de carga
function renderGridSkeletons() {
  DOM.promptsGrid.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.innerHTML = `
      <div class="skeleton-line skeleton-header"></div>
      <div class="skeleton-line skeleton-title"></div>
      <div class="skeleton-line skeleton-body-1"></div>
      <div class="skeleton-line skeleton-body-2"></div>
      <div class="skeleton-line skeleton-footer"></div>
    `;
    DOM.promptsGrid.appendChild(card);
  }
}

// Renderizar estados vacíos
function renderGridEmptyState(needsConfig = false, hasError = false) {
  DOM.promptsGrid.innerHTML = '';

  let icon = '📖';
  let title = 'No hay prompts registrados';
  let desc = 'Comienza a organizar tu conocimiento agregando un prompt en el botón superior derecho.';
  let buttonHtml = '';

  if (needsConfig) {
    icon = '⚙️';
    title = 'Requiere Configuración';
    desc = 'Es necesario configurar el URL de la API de Google Apps Script para conectar tu base de datos.';
    buttonHtml = `<button class="btn btn-primary" onclick="DOM.btnOpenSettings.click()">Configurar API</button>`;
  } else if (hasError) {
    icon = '⚠️';
    title = 'Error de Conexión';
    desc = 'No logramos comunicarnos con tu Google Sheet. Revisa tu conexión de red o la validez de la URL del Script.';
    buttonHtml = `<button class="btn btn-secondary" onclick="fetchPrompts()">Reintentar Carga</button>`;
  } else if (state.searchQuery || state.selectedCategory !== 'all') {
    icon = '🔍';
    title = 'Sin coincidencias';
    desc = 'No encontramos prompts que coincidan con los filtros aplicados actualmente.';
    buttonHtml = `<button class="btn btn-secondary" onclick="resetFilters()">Limpiar Filtros</button>`;
  }

  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.innerHTML = `
    <div class="empty-state-icon" aria-hidden="true">${icon}</div>
    <h3 class="empty-state-title">${title}</h3>
    <p class="empty-state-desc">${desc}</p>
    ${buttonHtml}
  `;
  DOM.promptsGrid.appendChild(empty);
}

// Limpiar filtros activos
window.resetFilters = function () {
  DOM.searchInput.value = '';
  state.searchQuery = '';
  state.selectedCategory = 'all';
  rebuildCategoriesFilter();
  renderPrompts();
};

// --- ESTADÍSTICAS Y HELPERS ---
function updateStats() {
  DOM.statTotalPrompts.textContent = state.prompts.length;
  DOM.statTotalCategories.textContent = state.categories.length;
}

// Algoritmo Hash para color determinista de píldoras/etiquetas
function getCategoryColor(category) {
  if (!category) return 'var(--text-muted)';

  const cleanCat = category.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < cleanCat.length; i++) {
    hash = cleanCat.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Rango de tonos HSL para un aspecto armonioso
  const hue = Math.abs(hash) % 360;
  // Colores limpios y consistentes
  return `hsl(${hue}, 65%, 42%)`;
}

// Utilidad para copiar texto al portapapeles
function copyToClipboard(text, successMessage) {
  if (!navigator.clipboard) {
    // Fallback antiguo si no está en entorno seguro HTTPS
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed'; // Evitar scroll
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(successMessage, 'success');
    } catch (err) {
      showToast('No se pudo copiar el texto.', 'error');
    }
    document.body.removeChild(textArea);
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => showToast(successMessage, 'success'))
    .catch(() => showToast('Error al copiar al portapapeles.', 'error'));
}

// Sanitizar texto contra XSS
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Formatear fecha para mostrar en la interfaz (yyyy-MM-dd HH:mm:ss -> dd/MM/yyyy)
function formatDisplayDate(fechaStr) {
  if (!fechaStr) return '';
  try {
    const parts = fechaStr.split(/[\sT]+/);
    if (parts.length >= 1) {
      const dateParts = parts[0].split('-');
      if (dateParts.length === 3) {
        const [year, month, day] = dateParts;
        return `${day}/${month}/${year}`;
      }
    }
    return fechaStr;
  } catch (e) {
    return fechaStr;
  }
}

// --- NOTIFICACIONES TOAST ---
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  // Icono dinámico según tipo
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-success)"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-danger)"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-warning)"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  } else {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-primary)"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      ${iconSvg}
      <span class="toast-message">${message}</span>
    </div>
    <button class="toast-close" aria-label="Cerrar notificación">&times;</button>
  `;

  DOM.toastContainer.appendChild(toast);

  // Acción de cierre al hacer clic en la equis
  toast.querySelector('.toast-close').addEventListener('click', () => {
    slideOutAndRemove(toast);
  });

  // Desvanecimiento automático a los 3.5 segundos
  setTimeout(() => {
    if (toast.parentNode) {
      slideOutAndRemove(toast);
    }
  }, 3500);
}

function slideOutAndRemove(toast) {
  toast.style.animation = 'slideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
  toast.addEventListener('animationend', () => {
    toast.remove();
  });
}
