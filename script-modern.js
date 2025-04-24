// Paste the complete script-modern.js from the previous V6 response here.
// (It's quite long, so pasting it again would be redundant, but ensure you are using that version)
document.addEventListener('DOMContentLoaded', () => {
    // --- Core Selectors ---
    const form = document.getElementById('character-sheet-modern');
    if (!form) { console.error("FATAL: Could not find form '#character-sheet-modern'"); return; }

    const levelInput = document.getElementById('level');
    const proficiencyBonusDisplay = document.getElementById('proficiency-bonus');
    const spellcastingAbilitySelect = document.getElementById('spellcasting-ability');
    const hpCurrentInput = document.getElementById('hp-current');
    const hpTempInput = document.getElementById('hp-temp');
    const hpTotalDisplay = document.getElementById('hp-total-display');

    // --- Dynamic List Selectors ---
    const spellListContent = document.getElementById('spell-list-content');
    const addSpellButton = document.getElementById('add-spell-button');
    const weaponsListContent = document.getElementById('weapons-list-content');
    const addWeaponButton = document.getElementById('add-weapon-button');
    const itemsListContent = document.getElementById('items-list-content');
    const addItemButton = document.getElementById('add-item-button');

    // --- Spell Slot Selectors ---
    const spellSlotsGrid = document.querySelector('.spell-slots-grid-modern'); // Matches V6 HTML

    // --- Dark Mode Selector ---
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const bodyElement = document.body;

    // --- Constants and Counters ---
    const slotMaxValues = { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 };
    // Initialize counters based on potentially pre-existing rows (important for load)
    let spellIndexCounter = spellListContent?.querySelectorAll('.spell-row').length || 0;
    let weaponIndexCounter = weaponsListContent?.querySelectorAll('.attack-row').length || 0;
    let itemIndexCounter = itemsListContent?.querySelectorAll('.item-row').length || 0;

    // --- Helper Functions ---
    function calculateModifier(score) { const numericScore = parseInt(score, 10); return Math.floor(((isNaN(numericScore) ? 10 : numericScore) - 10) / 2); }
    function formatModifier(modifier) { return modifier >= 0 ? `+${modifier}` : `${modifier}`; }
    function calculateProficiencyBonus(level) { const lvl = parseInt(level, 10); if (isNaN(lvl) || lvl < 1) return 2; return Math.ceil(lvl / 4) + 1; }

    // --- Update Functions ---
    function updateProficiencyBonus() {
        const level = levelInput?.value || 1;
        const pb = calculateProficiencyBonus(level);
        if (proficiencyBonusDisplay) proficiencyBonusDisplay.textContent = formatModifier(pb);
        return pb;
    }
    function updateAbilityScoresAndModifiers() {
        const modifiers = {};
        form.querySelectorAll('.ability-box').forEach(box => { // Query within form
            const ability = box.id.split('-')[0];
            const scoreInput = box.querySelector('.ability-score');
            const modDisplay = box.querySelector('.ability-mod');
            if (scoreInput && modDisplay) {
                const score = scoreInput.value;
                const modifier = calculateModifier(score);
                modDisplay.textContent = formatModifier(modifier);
                modifiers[ability] = modifier;
            }
        });
        return modifiers;
    }
    function updateSavingThrows(modifiers, pb) {
        form.querySelectorAll('.saving-throw').forEach(saveDiv => { // Query within form
            const checkbox = saveDiv.querySelector('.save-prof');
            const valueDisplay = saveDiv.querySelector('.save-value');
            const abilityBox = saveDiv.closest('.ability-box');
            if (!abilityBox) return;
            const ability = abilityBox.id.split('-')[0];
            if (checkbox && valueDisplay && modifiers.hasOwnProperty(ability)) {
                const baseModifier = modifiers[ability];
                const totalSave = baseModifier + (checkbox.checked ? pb : 0);
                valueDisplay.textContent = formatModifier(totalSave);
            }
        });
    }
     function updateSkills(modifiers, pb) {
        form.querySelectorAll('.skill').forEach(skillDiv => { // Query within form
            const checkbox = skillDiv.querySelector('.skill-prof');
            const valueDisplay = skillDiv.querySelector('.skill-value');
            const ability = checkbox?.dataset.ability;
            if (checkbox && valueDisplay && ability && modifiers.hasOwnProperty(ability)) {
                const baseModifier = modifiers[ability];
                const totalSkill = baseModifier + (checkbox.checked ? pb : 0);
                valueDisplay.textContent = formatModifier(totalSkill);
                if (checkbox.id === 'perception-prof') {
                    updatePassivePerception(modifiers, pb);
                }
            }
        });
    }
    function updatePassivePerception(modifiers, pb) {
        const perceptionProfCheckbox = document.getElementById('perception-prof'); // ID remains
        const wisModifier = modifiers['wis'] || 0;
        const perceptionBonus = wisModifier + (perceptionProfCheckbox?.checked ? pb : 0);
        const passivePerception = 10 + perceptionBonus;
        const ppDisplay = document.getElementById('passive-perception'); // ID remains
        if (ppDisplay) ppDisplay.textContent = passivePerception;
    }
    function updateInitiative(modifiers) {
        const dexModifier = modifiers['dex'] || 0;
        const totalInitiative = dexModifier;
        const initDisplay = document.getElementById('initiative'); // ID remains
         if (initDisplay) initDisplay.textContent = formatModifier(totalInitiative);
    }
    function updateSpellcastingStats(modifiers, pb) {
        const selectedAbility = spellcastingAbilitySelect?.value || 'none';
        const modDisplay = document.getElementById('spellcasting-mod'); // ID remains
        const dcDisplay = document.getElementById('spell-save-dc'); // ID remains
        const attackDisplay = document.getElementById('spell-attack-bonus'); // ID remains
        if (!modDisplay || !dcDisplay || !attackDisplay) return;
        if (selectedAbility === 'none' || !modifiers.hasOwnProperty(selectedAbility)) {
            modDisplay.textContent = 'N/A'; dcDisplay.textContent = 'N/A'; attackDisplay.textContent = 'N/A'; return;
        }
        const spellMod = modifiers[selectedAbility];
        const spellSaveDC = 8 + pb + spellMod;
        const spellAttackBonus = pb + spellMod;
        modDisplay.textContent = formatModifier(spellMod);
        dcDisplay.textContent = spellSaveDC;
        attackDisplay.textContent = formatModifier(spellAttackBonus);
    }
    function updateTotalHpDisplay() {
        const current = parseInt(hpCurrentInput?.value, 10) || 0;
        const temp = parseInt(hpTempInput?.value, 10) || 0;
        if (hpTotalDisplay) hpTotalDisplay.textContent = current + temp;
    }

    // --- Master Update Function ---
    function updateAllCalculatedFields() {
        const pb = updateProficiencyBonus();
        const modifiers = updateAbilityScoresAndModifiers();
        updateSavingThrows(modifiers, pb);
        updateSkills(modifiers, pb);
        updateInitiative(modifiers);
        updateSpellcastingStats(modifiers, pb);
        updateTotalHpDisplay();
    }

    // --- Dynamic List Management ---
    function createSpellRow(index, spellData = {}) { const row = document.createElement('div'); row.classList.add('dynamic-list-row', 'spell-row'); row.dataset.spellIndex = index; row.innerHTML = `<input type="text" class="spell-input spell-level lvl-col" name="spell_level_${index}" value="${spellData.level || ''}" title="Spell Level"> <input type="text" class="spell-input spell-name" name="spell_name_${index}" placeholder="Spell Name" value="${spellData.name || ''}" title="Spell Name"> <div class="spell-components comp-col"> <input type="checkbox" id="spell_comp_v_${index}" name="spell_comp_v_${index}" ${spellData.compV ? 'checked' : ''} title="Verbal"><label for="spell_comp_v_${index}" class="sr-only">V</label> <input type="checkbox" id="spell_comp_s_${index}" name="spell_comp_s_${index}" ${spellData.compS ? 'checked' : ''} title="Somatic"><label for="spell_comp_s_${index}" class="sr-only">S</label> <input type="checkbox" id="spell_comp_m_${index}" name="spell_comp_m_${index}" ${spellData.compM ? 'checked' : ''} title="Material"><label for="spell_comp_m_${index}" class="sr-only">M</label> </div> <input type="text" class="spell-input spell-notes notes-col" name="spell_notes_${index}" value="${spellData.notes || ''}" title="Spell Notes/Details (Range, Time, etc.)"> <button type="button" class="action-button remove-button remove-spell-row-button action-col" title="Remove Spell"><i class="fas fa-minus"></i></button>`; return row; }
    function addSpellRowHandler() { if (!spellListContent) return; const newRow = createSpellRow(spellIndexCounter); spellListContent.appendChild(newRow); spellIndexCounter++; }
    function removeSpellRow(event) { event.target.closest('.spell-row')?.remove(); }
    function createWeaponRow(index, weaponData = {}) { const row = document.createElement('div'); row.classList.add('dynamic-list-row', 'attack-row'); row.dataset.weaponIndex = index; row.innerHTML = `<input type="text" class="weapon-input" name="attack_name_${index}" value="${weaponData.name || ''}" title="Weapon Name"> <input type="text" class="weapon-input" name="attack_bonus_${index}" value="${weaponData.bonus || ''}" title="Attack Bonus / DC"> <input type="text" class="weapon-input" name="attack_damage_${index}" value="${weaponData.damage || ''}" title="Damage & Type"> <input type="text" class="weapon-input notes-input notes-col" name="attack_notes_${index}" value="${weaponData.notes || ''}" title="Attack Notes"> <button type="button" class="action-button remove-button remove-weapon-row-button action-col" title="Remove Attack"><i class="fas fa-minus"></i></button>`; return row; }
    function addWeaponRowHandler() { if (!weaponsListContent) return; const newRow = createWeaponRow(weaponIndexCounter); weaponsListContent.appendChild(newRow); weaponIndexCounter++; }
    function removeWeaponRow(event) { event.target.closest('.attack-row')?.remove(); }
    function createItemRow(index, itemData = {}) { const row = document.createElement('div'); row.classList.add('dynamic-list-row', 'item-row'); row.dataset.itemIndex = index; row.innerHTML = `<input type="text" class="item-input item-name" name="item_name_${index}" placeholder="Item Name" value="${itemData.name || ''}" title="Item Name"> <input type="number" class="item-input item-count count-col" name="item_count_${index}" value="${itemData.count !== undefined ? itemData.count : 1}" min="0" title="Item Count"> <input type="text" class="item-input item-notes notes-input notes-col" name="item_notes_${index}" placeholder="Notes/Weight..." value="${itemData.notes || ''}" title="Item Notes"> <button type="button" class="action-button remove-button remove-item-row-button action-col" title="Remove Item"><i class="fas fa-minus"></i></button>`; return row; }
    function addItemRowHandler() { if (!itemsListContent) return; const newRow = createItemRow(itemIndexCounter); itemsListContent.appendChild(newRow); itemIndexCounter++; }
    function removeItemRow(event) { event.target.closest('.item-row')?.remove(); }

    // --- Spell Slot Management ---
    function generateSpellSlots(level, total) { const visualContainer = document.getElementById(`modern-slot-visual-${level}`); if (!visualContainer) return; visualContainer.innerHTML = ''; const numTotal = parseInt(total, 10); if (isNaN(numTotal) || numTotal <= 0) return; const maxAllowed = slotMaxValues[level] !== undefined ? slotMaxValues[level] : 0; const countToGenerate = Math.min(numTotal, maxAllowed); for (let i = 1; i <= countToGenerate; i++) { const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.id = `modern_slot_lvl${level}_used_${i}`; checkbox.name = `modern_slot_lvl${level}_used_${i}`; checkbox.dataset.level = level; checkbox.dataset.index = i; visualContainer.appendChild(checkbox); } }
    function spellSlotTotalChangeHandler(event) { const inputElement = event.target; const levelContainer = inputElement.closest('.spell-slot-level-modern'); if (!levelContainer) return; const level = levelContainer.dataset.level; if (!level) return; let total = parseInt(inputElement.value, 10); const maxAllowed = slotMaxValues[level] !== undefined ? slotMaxValues[level] : 0; if (isNaN(total) || total < 0) { total = 0; } else if (total > maxAllowed) { total = maxAllowed; } inputElement.value = total; generateSpellSlots(level, total); }

    // --- Dark Mode Logic ---
    function applyTheme(theme) {
        bodyElement.dataset.theme = theme;
        localStorage.setItem('dndSheetTheme', theme);
        if (darkModeToggle) {
            darkModeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            darkModeToggle.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        }
    }
    function toggleTheme() {
        const currentTheme = bodyElement.dataset.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }

    // --- Event Listeners ---
    levelInput?.addEventListener('input', updateAllCalculatedFields);
    form.querySelectorAll('.ability-score').forEach(input => input.addEventListener('input', updateAllCalculatedFields));
    form.querySelectorAll('.prof-toggle').forEach(toggle => toggle.addEventListener('change', updateAllCalculatedFields));
    spellcastingAbilitySelect?.addEventListener('change', updateAllCalculatedFields);
    hpCurrentInput?.addEventListener('input', updateTotalHpDisplay);
    hpTempInput?.addEventListener('input', updateTotalHpDisplay);
    addSpellButton?.addEventListener('click', addSpellRowHandler);
    addWeaponButton?.addEventListener('click', addWeaponRowHandler);
    addItemButton?.addEventListener('click', addItemRowHandler);
    spellListContent?.addEventListener('click', function(event) { if (event.target.closest('.remove-spell-row-button')) removeSpellRow(event); });
    weaponsListContent?.addEventListener('click', function(event) { if (event.target.closest('.remove-weapon-row-button')) removeWeaponRow(event); });
    itemsListContent?.addEventListener('click', function(event) { if (event.target.closest('.remove-item-row-button')) removeItemRow(event); });
    if (spellSlotsGrid) { spellSlotsGrid.addEventListener('input', function(event) { if (event.target.classList.contains('slot-total-input')) { spellSlotTotalChangeHandler(event); } }); }
    darkModeToggle?.addEventListener('click', toggleTheme);

    // --- Save/Load Functionality ---
    const saveButton = document.getElementById('save-button');
    const loadFileLabel = document.querySelector('.load-button-label');
    const loadFileInput = document.getElementById('load-file');
    saveButton?.addEventListener('click', () => { const characterData = {}; const inputs = form.querySelectorAll('input:not([type=file]), textarea, select'); inputs.forEach(input => { if (input.closest('#spell-list-content') || input.closest('#weapons-list-content') || input.closest('#items-list-content') || input.closest('.slot-visual-modern') || input.classList.contains('slot-total-input') || input.id === 'hp-total-display') return; const key = input.name || input.id; if (!key) return; if (input.type === 'checkbox') characterData[key] = input.checked; else characterData[key] = input.value; }); characterData.spellSlots = {}; spellSlotsGrid?.querySelectorAll('.spell-slot-level-modern').forEach(slotLevelDiv => { const level = slotLevelDiv.dataset.level; const totalInput = slotLevelDiv.querySelector('.slot-total-input'); const usedCheckboxes = slotLevelDiv.querySelectorAll('.slot-visual-modern input[type=checkbox]:checked'); if (totalInput) { characterData.spellSlots[`level${level}`] = { total: totalInput.value || '0', used: Array.from(usedCheckboxes).map(cb => cb.dataset.index) }; } }); characterData.spells = []; spellListContent?.querySelectorAll('.spell-row').forEach((row, i) => { characterData.spells.push({ index: i, level: row.querySelector('.spell-level')?.value || '', name: row.querySelector('.spell-name')?.value || '', compV: row.querySelector('input[name^="spell_comp_v"]')?.checked || false, compS: row.querySelector('input[name^="spell_comp_s"]')?.checked || false, compM: row.querySelector('input[name^="spell_comp_m"]')?.checked || false, notes: row.querySelector('.spell-notes')?.value || '' }); }); characterData.weapons = []; weaponsListContent?.querySelectorAll('.attack-row').forEach((row, i) => { characterData.weapons.push({ index: i, name: row.querySelector('input[name^="attack_name"]')?.value || '', bonus: row.querySelector('input[name^="attack_bonus"]')?.value || '', damage: row.querySelector('input[name^="attack_damage"]')?.value || '', notes: row.querySelector('input[name^="attack_notes"]')?.value || '' }); }); characterData.items = []; itemsListContent?.querySelectorAll('.item-row').forEach((row, i) => { characterData.items.push({ index: i, name: row.querySelector('.item-name')?.value || '', count: row.querySelector('.item-count')?.value || 0, notes: row.querySelector('.item-notes')?.value || '' }); }); const jsonData = JSON.stringify(characterData, null, 2); const blob = new Blob([jsonData], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); const charName = document.getElementById('charname')?.value || 'modern_character'; const fileName = `${charName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_dnd_sheet_modern.json`; a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); });
    loadFileLabel?.addEventListener('click', () => loadFileInput?.click());
    loadFileInput?.addEventListener('change', (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { try { const characterData = JSON.parse(e.target.result); const inputs = form.querySelectorAll('input:not([type=file]), textarea, select'); inputs.forEach(input => { if (input.closest('#spell-list-content') || input.closest('#weapons-list-content') || input.closest('#items-list-content') || input.closest('.slot-visual-modern') || input.classList.contains('slot-total-input') || input.id === 'hp-total-display') return; const key = input.name || input.id; if (characterData.hasOwnProperty(key)) { if (input.type === 'checkbox') input.checked = characterData[key]; else input.value = characterData[key]; } else { /* Clear */ } }); if (spellListContent) { spellListContent.innerHTML = ''; spellIndexCounter = 0; if (characterData.spells && Array.isArray(characterData.spells)) { characterData.spells.forEach(spellData => { const newRow = createSpellRow(spellIndexCounter, spellData); spellListContent.appendChild(newRow); spellIndexCounter++; }); } } if (weaponsListContent) { weaponsListContent.innerHTML = ''; weaponIndexCounter = 0; if (characterData.weapons && Array.isArray(characterData.weapons)) { characterData.weapons.forEach(weaponData => { const newRow = createWeaponRow(weaponIndexCounter, weaponData); weaponsListContent.appendChild(newRow); weaponIndexCounter++; }); } else { initializeDefaultRows(weaponsListContent, addWeaponRowHandler); } } if (itemsListContent) { itemsListContent.innerHTML = ''; itemIndexCounter = 0; if (characterData.items && Array.isArray(characterData.items)) { characterData.items.forEach(itemData => { const newRow = createItemRow(itemIndexCounter, itemData); itemsListContent.appendChild(newRow); itemIndexCounter++; }); } else { initializeDefaultRows(itemsListContent, addItemRowHandler); } } if (characterData.spellSlots && spellSlotsGrid) { for (let level = 1; level <= 9; level++) { const slotData = characterData.spellSlots[`level${level}`]; const totalInput = document.getElementById(`modern-slots-total-${level}`); if (slotData && totalInput) { const maxAllowed = slotMaxValues[level] !== undefined ? slotMaxValues[level] : 0; let loadedTotal = parseInt(slotData.total, 10) || 0; loadedTotal = Math.min(loadedTotal, maxAllowed); totalInput.value = loadedTotal; generateSpellSlots(level, loadedTotal); if (slotData.used && Array.isArray(slotData.used)) { slotData.used.forEach(usedIndex => { const checkbox = document.getElementById(`modern_slot_lvl${level}_used_${usedIndex}`); if (checkbox) checkbox.checked = true; }); } } else if (totalInput) { totalInput.value = '0'; generateSpellSlots(level, '0'); } } } updateAllCalculatedFields(); alert('Character data loaded successfully!'); } catch (error) { console.error("Error loading or parsing file:", error); alert('Error loading character data.'); } finally { if(loadFileInput) loadFileInput.value = ''; } }; reader.onerror = () => { alert('Error reading file.'); if(loadFileInput) loadFileInput.value = ''; }; reader.readAsText(file); });

    // --- Print Functionality ---
    const printButton = document.getElementById('print-button');
    printButton?.addEventListener('click', () => window.print());

    // --- Initial Setup ---
    function initializeDefaultRows(container, addHandler) { if (container && container.children.length === 0) { addHandler(); } }
    initializeDefaultRows(spellListContent, addSpellRowHandler);
    initializeDefaultRows(weaponsListContent, addWeaponRowHandler);
    initializeDefaultRows(itemsListContent, addItemRowHandler);
    const savedTheme = localStorage.getItem('dndSheetTheme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);
    updateAllCalculatedFields();

}); // End DOMContentLoaded