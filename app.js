document.addEventListener('DOMContentLoaded', () => {
    // --- APPLICATION STATE ---
    const state = {
        medications: [],
        view: 'medications', // 'medications' or 'themes'
        activeFamily: 'Todos',
        activeTheme: null,
    };

    // --- DOM SELECTORS ---
    const selectors = {
        medicationSection: document.getElementById('medication-section'),
        themesSection: document.getElementById('themes-section'),
        medicationList: document.getElementById('medication-list'),
        searchBar: document.getElementById('searchBar'),
        noResults: document.getElementById('no-results'),
        familyFilterContainer: document.getElementById('familyFilterContainer'),
        themesFilterContainer: document.getElementById('themesFilterContainer'),
        familiesDropdownBtn: document.getElementById('families-dropdown-btn'),
        familiesBtnText: document.getElementById('families-btn-text'),
        themesDropdownBtn: document.getElementById('themes-dropdown-btn'),
        familiesDropdownPanel: document.getElementById('families-dropdown-panel'),
        themesDropdownPanel: document.getElementById('themes-dropdown-panel'),
        modal: document.getElementById('medicationModal'),
        modalContent: document.getElementById('modal-content-wrapper'),
        cardTemplate: document.getElementById('medication-card-template'),
        medCount: document.getElementById('med-count'),
        loadingIndicator: document.getElementById('loading-indicator'),
        additionalCalculators: document.getElementById('calculadoras-adicionales'),
    };

    // --- UTILITY FUNCTIONS ---
    const debounce = (func, delay = 300) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };

    const normalizeText = (str) => {
        if (!str) return '';
        return str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    // --- DISPLAY & RENDERING LOGIC ---
    const debouncedSearch = debounce(() => updateDisplay());

    function updateDisplay() {
        const searchTerm = normalizeText(selectors.searchBar.value);
        let results = [];

        if (searchTerm) {
            state.view = 'medications';
            results = state.medications.map(med => ({
                ...med,
                score: calculateRelevance(med, searchTerm)
            }))
            .filter(med => med.score > 0)
            .sort((a, b) => b.score - a.score);
        } else {
            if (state.view === 'medications') {
                results = state.activeFamily === 'Todos' ?
                    state.medications :
                    state.medications.filter(med => med.simpleFamily === state.activeFamily);
            }
        }

        if (state.view === 'medications') renderMedications(results);

        selectors.medicationSection.classList.toggle('hidden', state.view !== 'medications');
        selectors.themesSection.classList.toggle('hidden', state.view !== 'themes');

        if (state.view === 'themes') {
            document.querySelectorAll('.theme-content').forEach(tc => tc.classList.add('hidden'));
            if (state.activeTheme) document.getElementById(`theme-${state.activeTheme}`).classList.remove('hidden');
        }
        updateActiveButtons();
    }
    
    function calculateRelevance(med, term) {
        let score = 0;
        const normName = normalizeText(med.name);
        if (normName === term) score += 20;
        else if (normName.startsWith(term)) score += 10;
        else if (normName.includes(term)) score += 5;

        if (normalizeText(med.simpleFamily).includes(term)) score += 3;
        if (normalizeText(med.uses).includes(term)) score += 2;
        if (normalizeText(med.indications).includes(term)) score += 1;
        return score;
    }

    function renderMedications(meds) {
        selectors.loadingIndicator.classList.add('hidden');
        selectors.medicationList.innerHTML = ''; // Clear previous results

        // *** FIX: Correctly show/hide the "no results" message ***
        if (meds.length === 0) {
            selectors.noResults.classList.remove('hidden');
        } else {
            selectors.noResults.classList.add('hidden');
        }

        meds.forEach(med => {
            const cardClone = document.getElementById('medication-card-template').content.cloneNode(true);
            const cardElement = cardClone.querySelector('article');
            
            // *** FIX: Use a reliable unique identifier to find the correct medication later ***
            cardElement.dataset.originalIndex = med.originalIndex;

            const imageName = encodeURIComponent(`${med.name}\n${med.presentation}`);
            cardElement.querySelector('.card-img').src = `https://placehold.co/400x200/e0f2fe/083344?text=${imageName}&font=inter`;
            cardElement.querySelector('.card-name').textContent = med.name;
            cardElement.querySelector('.card-presentation').textContent = med.presentation;
            cardElement.querySelector('.card-family').textContent = med.family;
            cardElement.querySelector('.card-uses').textContent = med.uses;
            selectors.medicationList.appendChild(cardElement);
        });
    }


    function updateActiveButtons() {
        document.querySelectorAll('#familyFilterContainer .filter-btn').forEach(btn => {
            btn.classList.toggle('active', state.view === 'medications' && btn.dataset.family === state.activeFamily);
        });
        document.querySelectorAll('#themesFilterContainer .theme-btn').forEach(btn => {
            btn.classList.toggle('active', state.view === 'themes' && btn.dataset.theme === state.activeTheme);
        });
        
        selectors.familiesBtnText.textContent = (state.view === 'medications' && state.activeFamily !== 'Todos') 
            ? `Familia: ${state.activeFamily}` 
            : 'Familias de Medicamentos';
    }

    // --- MODAL LOGIC ---
    function openModal(med) {
        let calculatorHtml = '';
        if (med.isCalculable) {
            calculatorHtml = `
            <div class="mt-6 pt-6 border-t border-slate-200">
                <h4 class="text-base font-semibold text-slate-800 mb-2">Calculadora de Dosis Pediátrica</h4>
                <div class="flex items-center space-x-3">
                    <input type="number" placeholder="Peso en kg" class="weight-input-modal border border-slate-300 rounded-md p-2 w-28 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <button class="calculate-btn-modal bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">Calcular</button>
                </div>
                <div class="result-div-modal mt-3 text-blue-800 font-semibold text-sm p-3 bg-blue-50 rounded-md min-h-[44px]"></div>
            </div>`;
        }

        selectors.modalContent.innerHTML = `
            <div class="flex justify-between items-center p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
                <h3 id="modalTitle" class="text-xl font-bold text-slate-900">${med.name} - ${med.presentation}</h3>
                <button id="closeModalBtn" aria-label="Cerrar modal" class="text-slate-400 hover:text-slate-800 text-3xl">&times;</button>
            </div>
            <div class="overflow-y-auto p-6">
                <p class="text-lg font-semibold text-blue-600 mb-4">${med.family}</p>
                <div class="space-y-3 text-sm text-slate-700">
                    <p><strong class="font-semibold text-slate-900">Usos:</strong> ${med.uses}</p>
                    <p><strong class="font-semibold text-slate-900">Indicaciones:</strong> ${med.indications}</p>
                    <p><strong class="font-semibold text-slate-900">Dosis Adulto:</strong> ${med.dose_adult}</p>
                    <p><strong class="font-semibold text-slate-900">Dosis Pediátrica:</strong> ${med.dose_pediatric}</p>
                    <p><strong class="font-semibold text-red-600">Contraindicaciones:</strong> ${med.contraindications}</p>
                </div>
                ${calculatorHtml}
            </div>`;
        
        selectors.modal.classList.remove('hidden');
        setTimeout(() => selectors.modalContent.classList.remove('scale-95', 'opacity-0'), 10);
        
        document.getElementById('closeModalBtn').addEventListener('click', closeModal);
        if (med.isCalculable) {
            selectors.modalContent.querySelector('.calculate-btn-modal').addEventListener('click', () => {
                const weight = parseFloat(selectors.modalContent.querySelector('.weight-input-modal').value);
                const resultDiv = selectors.modalContent.querySelector('.result-div-modal');
                calculateAndDisplayDose(med, weight, resultDiv);
            });
        }
    }
    
    function closeModal() {
        selectors.modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            selectors.modal.classList.add('hidden');
            selectors.modalContent.innerHTML = '';
        }, 300);
    }

    // --- CALCULATION LOGIC ---
    function calculateAndDisplayDose(med, weight, resultDiv) {
        if (!weight || weight <= 0) {
            resultDiv.innerHTML = `<span class="text-red-500">Por favor, ingrese un peso válido.</span>`;
            return;
        }

        let resultText = '';
        const concentration = med.concentration; // mg per mL

        if (med.doseMin_mg_kg_dia && med.doseMax_mg_kg_dia) { // Dose per day
            const intervals = parseInt(String(med.doseIntervals).split('-').pop(), 10);
            const minMlPerTake = (weight * med.doseMin_mg_kg_dia / concentration) / intervals;
            const maxMlPerTake = (weight * med.doseMax_mg_kg_dia / concentration) / intervals;
            resultText = `Dar <strong>entre ${minMlPerTake.toFixed(1)} y ${maxMlPerTake.toFixed(1)} mL</strong>, ${intervals} veces al día.`;
        } else if (med.doseMin_mg_kg_dosis && med.doseMax_mg_kg_dosis) { // Dose per take
            const minMl = (weight * med.doseMin_mg_kg_dosis) / concentration;
            const maxMl = (weight * med.doseMax_mg_kg_dosis) / concentration;
            const frequencyText = med.doseFreq ? ` cada ${Math.round(24 / med.doseFreq)} horas.` : '.';
            resultText = `Dar <strong>entre ${minMl.toFixed(1)} y ${maxMl.toFixed(1)} mL</strong> por toma${frequencyText}`;
        }
        
        resultDiv.innerHTML = resultText || '<span class="text-red-500">No se pudo calcular la dosis.</span>';
    }

    function calculateAdditional(type) {
        if (type === 'hidratacion') {
            const peso = parseFloat(document.getElementById("peso-hidratacion").value);
            const resultDiv = document.getElementById("resultado-hidratacion");
            if (!peso || peso <= 0) { resultDiv.innerText = "Ingrese un peso válido."; return; }

            const mantenimiento = peso < 10 ? peso * 100 :
                                 peso <= 20 ? 1000 + ((peso - 10) * 50) :
                                 1500 + ((peso - 20) * 20);
            const deficit = peso * 50; // Moderate deficit example
            const total = mantenimiento + deficit;
            resultDiv.innerHTML = `Mantenimiento: <strong>${mantenimiento.toFixed(0)} mL/día</strong> | Déficit: <strong>${deficit.toFixed(0)} mL</strong> | Total 24h: <strong>${total.toFixed(0)} mL</strong>`;
        } else if (type === 'ibuprofeno') {
            const peso = parseFloat(document.getElementById("peso-ibuprofeno").value);
            const resultDiv = document.getElementById("resultado-ibuprofeno");
            if (!peso || peso <= 0) { resultDiv.innerText = "Ingrese un peso válido."; return; }
            const dosisMg = peso * 10; // 10 mg/kg
            // Assuming 100mg/5ml concentration = 20mg/ml
            const dosisMl = dosisMg / 20; 
            resultDiv.innerHTML = `Dosis: <strong>${dosisMl.toFixed(1)} mL</strong> (${dosisMg.toFixed(0)} mg) cada 8 horas.`;
        }
    }


    // --- INITIALIZATION ---
    async function initializeApp() {
        try {
            const response = await fetch('medicamentos.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const rawMedications = await response.json();
            
            // Remove duplicates and add original index for stable referencing
            const uniqueMedications = [];
            const seen = new Set();
            rawMedications.forEach((med, index) => {
                const identifier = `${med.name}|${med.presentation}`;
                if (!seen.has(identifier)) {
                    seen.add(identifier);
                    uniqueMedications.push({ ...med, originalIndex: index });
                }
            });

            state.medications = uniqueMedications;

            selectors.medCount.textContent = state.medications.length;
            initFiltersAndThemes();
            initEventListeners();
            updateDisplay();
        } catch (error) {
            console.error("Initialization Failed:", error);
            selectors.loadingIndicator.innerHTML = `<p class="text-red-600"><strong>Error:</strong> No se pudo cargar la guía de medicamentos. Revise la conexión o el archivo de datos.</p>`;
        }
    }

    function initFiltersAndThemes() {
        const families = ['Todos', ...new Set(state.medications.map(med => med.simpleFamily).filter(f => f).sort())];
        selectors.familyFilterContainer.innerHTML = families.map(f => `<button class="filter-btn" data-family="${f}">${f}</button>`).join('');

        const themes = [
            { id: 'gpc-insulina', name: 'Guía Clínica de Insulinoterapia' },
        ];
        selectors.themesFilterContainer.innerHTML = themes.map(t => `<button class="theme-btn" data-theme="${t.id}">${t.name}</button>`).join('');
    }

    function initEventListeners() {
        selectors.searchBar.addEventListener('input', debouncedSearch);

        selectors.medicationList.addEventListener('click', e => {
            const card = e.target.closest('[data-original-index]');
            if (card) {
                const index = parseInt(card.dataset.originalIndex, 10);
                const medication = state.medications.find(m => m.originalIndex === index);
                if (medication) openModal(medication);
            }
        });

        // Dropdown handling
        const closeDropdowns = () => {
            selectors.familiesDropdownPanel.classList.remove('is-open');
            selectors.themesDropdownPanel.classList.remove('is-open');
            selectors.familiesDropdownBtn.classList.remove('active');
            selectors.themesDropdownBtn.classList.remove('active');
        };

        const toggleDropdown = (type, event) => {
            event.stopPropagation();
            const isFamilies = type === 'families';
            const panelToToggle = isFamilies ? selectors.familiesDropdownPanel : selectors.themesDropdownPanel;
            const otherPanel = isFamilies ? selectors.themesDropdownPanel : selectors.familiesDropdownPanel;
            
            panelToToggle.classList.toggle('is-open');
            otherPanel.classList.remove('is-open');

            updateActiveButtons();
        };

        selectors.familiesDropdownBtn.addEventListener('click', (e) => toggleDropdown('families', e));
        selectors.themesDropdownBtn.addEventListener('click', (e) => toggleDropdown('themes', e));

        selectors.familyFilterContainer.addEventListener('click', e => {
            if (e.target.matches('.filter-btn')) {
                state.view = 'medications';
                state.activeFamily = e.target.dataset.family;
                state.activeTheme = null;
                selectors.searchBar.value = '';
                updateDisplay();
                closeDropdowns();
            }
        });

        selectors.themesFilterContainer.addEventListener('click', e => {
            if (e.target.matches('.theme-btn')) {
                state.view = 'themes';
                state.activeTheme = e.target.dataset.theme;
                state.activeFamily = 'Todos';
                updateDisplay();
                closeDropdowns();
            }
        });

        // Modal and global click handling
        document.addEventListener('click', closeDropdowns);
        selectors.modal.addEventListener('click', e => {
            if (e.target === selectors.modal) closeModal();
        });
        document.addEventListener('keydown', e => {
            if (e.key === "Escape" && !selectors.modal.classList.contains('hidden')) {
                closeModal();
            }
        });

        // Additional Calculators
        selectors.additionalCalculators.addEventListener('click', e => {
             if (e.target.matches('button[data-calculator]')) {
                calculateAdditional(e.target.dataset.calculator);
            }
        });
    }

    initializeApp();
});



// Activar modo Alfredo (oscuro)
document.getElementById('modoAlfredoToggle').addEventListener('click', () => {
    document.body.classList.toggle('modo-alfredo');
});

// Generar tarjetas modernas con botón de cálculo
function renderMedications(medications) {
    const list = document.getElementById('medication-list');
    list.innerHTML = '';
    medications.forEach((med, index) => {
        const card = document.createElement('div');
        card.className = 'med-card p-4';
        card.innerHTML = `
            <h3 class="text-lg font-semibold mb-2">${med.nombre}</h3>
            <p class="text-sm text-slate-600 mb-4">${med.descripcion || ''}</p>
            <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition" onclick="openCalculator(${index})">
                Calculadora de Dosis
            </button>
        `;
        list.appendChild(card);
    });
}

// Modal dinámico por medicamento
function openCalculator(index) {
    const modal = document.getElementById('medicationModal');
    const content = document.getElementById('modal-content-wrapper');
    const med = window._medications[index];

    content.innerHTML = `
        <h2 class="text-xl font-bold mb-4">${med.nombre}</h2>
        <p class="mb-2">${med.descripcion || ''}</p>
        <label class="block mb-2">Peso del paciente (kg):</label>
        <input type="number" id="pesoInput" class="border p-2 rounded w-full mb-4" />
        <button onclick="calcularDosis(${index})" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">Calcular</button>
        <div id="resultadoDosis" class="mt-4 font-semibold"></div>
    `;
    modal.classList.add('active');
}

// Cerrar modal al hacer clic fuera del contenido
document.getElementById('medicationModal').addEventListener('click', (e) => {
    if (e.target.id === 'medicationModal') {
        e.currentTarget.classList.remove('active');
    }
});

// Lógica simple para cálculo de dosis
function calcularDosis(index) {
    const peso = parseFloat(document.getElementById('pesoInput').value);
    const med = window._medications[index];
    const dosis = med.dosis_por_kg ? peso * med.dosis_por_kg : null;
    const resultado = dosis ? \`\${dosis.toFixed(2)} mg por dosis\` : 'No disponible';
    document.getElementById('resultadoDosis').textContent = resultado;
}

// Inicializar carga de medicamentos
fetch('medicamentos.json')
    .then(res => res.json())
    .then(data => {
        window._medications = data;
        renderMedications(data);
        document.getElementById('med-count').textContent = data.length;
    })
    .catch(err => console.error('Error al cargar medicamentos:', err));
