// Modern D&D Character Sheet Script V6.7 (Corrected)
document.addEventListener('DOMContentLoaded', () => {
    // --- Core Selectors ---
    const form = document.getElementById('character-sheet-modern');
    if (!form) { console.error("FATAL: Could not find form '#character-sheet-modern'"); return; }

    const levelInput = document.getElementById('level');
    const proficiencyBonusDisplay = document.getElementById('proficiency-bonus');
    const spellcastingAbilitySelect = document.getElementById('spellcasting-ability');
    const hpCurrentInput = document.getElementById('hp-current');
    const hpMaxInput = document.getElementById('hp-max');
    const hpTempInput = document.getElementById('hp-temp');
    const hpTotalDisplay = document.getElementById('hp-total-display');
    const hitDiceSpentInput = document.getElementById('hd-spent');

    // --- Header Control Selectors (ADDED/VERIFIED) ---
    const saveButton = document.getElementById('save-button');
    const loadFileLabel = document.querySelector('.load-button-label'); // Use querySelector for class
    const loadFileInput = document.getElementById('load-file');
    const printButton = document.getElementById('print-button');
    const longRestButton = document.getElementById('long-rest-button');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const bodyElement = document.body; // Keep body selector

    // --- Feature Selectors ---
    const classSelect = document.getElementById('class-select');
    const multiclassInputGroup = document.getElementById('multiclass-input-group');
    const multiclassInput = document.getElementById('classlevel');
    const resourceTrackersContainer = document.querySelector('.resource-trackers-container');
    const manualResourcesList = document.getElementById('manual-resources-list');
    const addManualResourceButton = document.getElementById('add-manual-resource-button');
    const concentrationCheckbox = document.getElementById('concentration-active');
    const allCollapseToggles = document.querySelectorAll('.collapse-toggle');
    const messageContainer = document.getElementById('sheet-message-container');

    // --- Dynamic List Selectors ---
    const spellListContent = document.getElementById('spell-list-content');
    const addSpellButton = document.getElementById('add-spell-button');
    const weaponsListContent = document.getElementById('weapons-list-content');
    const addWeaponButton = document.getElementById('add-weapon-button');
    const itemsListContent = document.getElementById('items-list-content');
    const addItemButton = document.getElementById('add-item-button');

    // --- Spell Slot Selectors ---
    const spellSlotsGrid = document.querySelector('.spell-slots-grid-modern');

    // --- Counters ---
    let spellIndexCounter = 0;
    let weaponIndexCounter = 0;
    let itemIndexCounter = 0;
    let manualResourceIndexCounter = 0;

    // --- Helper Functions ---
    const calculateModifier = (score) => Math.floor(((parseInt(score, 10) || 10) - 10) / 2);
    const formatModifier = (modifier) => modifier >= 0 ? `+${modifier}` : `${modifier}`;
    const calculateProficiencyBonus = (level) => Math.ceil((parseInt(level, 10) || 1) / 4) + 1;

    // --- Update Functions ---
    function updateProficiencyBonus() {
        const level = levelInput?.value || 1;
        const pb = calculateProficiencyBonus(level);
        if (proficiencyBonusDisplay) proficiencyBonusDisplay.textContent = formatModifier(pb);
        // Update resources dependent on PB or Level after PB is known
        updateClassResourceMaxes(level, null);
        return pb;
    }

    function updateAbilityScoresAndModifiers() {
        const modifiers = {};
        form.querySelectorAll('.ability-box').forEach(box => {
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
        // Update resources dependent on mods *after* all mods are calculated
        updateClassResourceMaxes(levelInput?.value || 1, modifiers);
        return modifiers;
    }

    function updateSavingThrows(modifiers, pb) {
        form.querySelectorAll('.saving-throw').forEach(saveDiv => {
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
        let perceptionBonus = 0;
        form.querySelectorAll('.skill').forEach(skillDiv => {
            const checkbox = skillDiv.querySelector('.skill-prof');
            const valueDisplay = skillDiv.querySelector('.skill-value');
            const ability = checkbox?.dataset.ability;
            if (checkbox && valueDisplay && ability && modifiers.hasOwnProperty(ability)) {
                const baseModifier = modifiers[ability];
                const totalSkill = baseModifier + (checkbox.checked ? pb : 0);
                valueDisplay.textContent = formatModifier(totalSkill);
                // Specific logic for Perception to calculate Passive Perception
                if (checkbox.id === 'perception-prof') {
                    perceptionBonus = totalSkill;
                }
            }
        });
        updatePassivePerception(perceptionBonus); // Update passive perception after skills
    }

    function updatePassivePerception(perceptionBonus) {
        const passivePerception = 10 + perceptionBonus;
        const ppDisplay = document.getElementById('passive-perception');
        if (ppDisplay) ppDisplay.textContent = passivePerception;
    }

    function updateInitiative(modifiers) {
        const dexModifier = modifiers['dex'] || 0;
        const totalInitiative = dexModifier;
        const initDisplay = document.getElementById('initiative');
         if (initDisplay) initDisplay.textContent = formatModifier(totalInitiative);
    }

    function updateSpellcastingStats(modifiers, pb) {
        const selectedAbility = spellcastingAbilitySelect?.value || 'none';
        const modDisplay = document.getElementById('spellcasting-mod');
        const dcDisplay = document.getElementById('spell-save-dc');
        const attackDisplay = document.getElementById('spell-attack-bonus');
        if (!modDisplay || !dcDisplay || !attackDisplay) return;

        if (selectedAbility === 'none' || !modifiers.hasOwnProperty(selectedAbility)) {
            modDisplay.textContent = 'N/A'; dcDisplay.textContent = 'N/A'; attackDisplay.textContent = 'N/A';
            return;
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
        const pb = updateProficiencyBonus(); // Calls updateClassResourceMaxes internally
        const modifiers = updateAbilityScoresAndModifiers(); // Calls updateClassResourceMaxes internally
        updateSavingThrows(modifiers, pb);
        updateSkills(modifiers, pb); // Calls updatePassivePerception internally
        updateInitiative(modifiers);
        updateSpellcastingStats(modifiers, pb);
        updateTotalHpDisplay();
        // One final call ensures everything is consistent, especially if mods/level were updated elsewhere
        updateClassResourceMaxes(levelInput?.value || 1, modifiers);
    }

    // --- Dynamic List Management V6.7 ---
    function createSpellRow(index, spellData = {}) {
        const row = document.createElement('div');
        row.classList.add('dynamic-list-row', 'spell-row');
        row.id = `spell-row-${index}`;
        row.innerHTML = `
            <input type="checkbox" class="spell-input spell-prepared equip-col" name="spell_prepared_${index}" ${spellData.prepared ? 'checked' : ''} title="Prepared?">
            <input type="text" class="spell-input spell-level lvl-col centered-text" name="spell_level_${index}" value="${spellData.level || ''}" title="Spell Level (0 for Cantrip)">
            <input type="text" class="spell-input spell-name name-col" name="spell_name_${index}" placeholder="Spell Name" value="${spellData.name || ''}" title="Spell Name">
            <div class="spell-components comp-col">
                <label title="Verbal">
                    <input type="checkbox" name="spell_comp_v_${index}" ${spellData.compV ? 'checked' : ''}>
                    <span class="sr-only">V</span>
                </label>
                <label title="Somatic">
                    <input type="checkbox" name="spell_comp_s_${index}" ${spellData.compS ? 'checked' : ''}>
                     <span class="sr-only">S</span>
                </label>
                <label title="Material">
                    <input type="checkbox" name="spell_comp_m_${index}" ${spellData.compM ? 'checked' : ''}>
                    <span class="sr-only">M</span>
                </label>
            </div>
            <input type="text" class="spell-input spell-notes notes-col" name="spell_notes_${index}" placeholder="Range, Duration, Details..." value="${spellData.notes || ''}" title="Spell Notes/Details">
            <button type="button" class="action-button remove-button remove-spell-row-button action-col" title="Remove Spell"><i class="fas fa-trash-alt"></i></button>
        `;
        // Add listener to new remove button immediately (less efficient than delegation, but simpler here)
         const removeButton = row.querySelector('.remove-spell-row-button');
         removeButton?.addEventListener('click', () => row.remove());
        return row;
    }

    function addSpellRowHandler() {
        if (!spellListContent) return;
        const newRow = createSpellRow(spellIndexCounter++);
        spellListContent.appendChild(newRow);
    }

    function createWeaponRow(index, weaponData = {}) {
        const row = document.createElement('div');
        row.classList.add('dynamic-list-row', 'attack-row');
        row.id = `attack-row-${index}`;
        row.innerHTML = `
            <input type="text" class="weapon-input" name="attack_name_${index}" value="${weaponData.name || ''}" placeholder="Weapon/Attack Name" title="Weapon/Attack Name">
            <input type="text" class="weapon-input centered-text" name="attack_bonus_${index}" value="${weaponData.bonus || ''}" placeholder="+X / DC Y" title="Attack Bonus / Save DC">
            <input type="text" class="weapon-input centered-text" name="attack_damage_${index}" value="${weaponData.damage || ''}" placeholder="e.g. 1d8+STR Slashing" title="Damage & Type">
            <input type="text" class="weapon-input notes-input notes-col" name="attack_notes_${index}" value="${weaponData.notes || ''}" placeholder="Properties, Range..." title="Attack Notes (Range, Properties)">
            <button type="button" class="action-button remove-button remove-weapon-row-button action-col" title="Remove Attack"><i class="fas fa-trash-alt"></i></button>
        `;
         const removeButton = row.querySelector('.remove-weapon-row-button');
         removeButton?.addEventListener('click', () => row.remove());
        return row;
    }

     function addWeaponRowHandler() {
        if (!weaponsListContent) return;
        const newRow = createWeaponRow(weaponIndexCounter++);
        weaponsListContent.appendChild(newRow);
    }

    function createItemRow(index, itemData = {}) {
        const row = document.createElement('div');
        row.classList.add('dynamic-list-row', 'item-row');
        row.id = `item-row-${index}`;
        row.innerHTML = `
             <input type="checkbox" class="item-input item-equip equip-col" name="item_equipped_${index}" ${itemData.equipped ? 'checked' : ''} title="Equipped?">
            <input type="text" class="item-input item-name" name="item_name_${index}" placeholder="Item Name" value="${itemData.name || ''}" title="Item Name">
            <input type="number" class="item-input item-count count-col centered-text" name="item_count_${index}" value="${itemData.count !== undefined ? itemData.count : 1}" min="0" title="Item Count">
            <input type="text" class="item-input item-notes notes-input notes-col" name="item_notes_${index}" placeholder="Description, Weight..." value="${itemData.notes || ''}" title="Item Notes/Weight">
            <button type="button" class="action-button remove-button remove-item-row-button action-col" title="Remove Item"><i class="fas fa-trash-alt"></i></button>
        `;
         const removeButton = row.querySelector('.remove-item-row-button');
         removeButton?.addEventListener('click', () => row.remove());
        return row;
    }

     function addItemRowHandler() {
         if (!itemsListContent) return;
         const newRow = createItemRow(itemIndexCounter++);
         itemsListContent.appendChild(newRow);
     }

    function createManualResourceRow(index, resourceData = {}) {
        const row = document.createElement('div');
        row.classList.add('manual-resource-row'); // V6.7 - Used CSS class name
        row.id = `manual-resource-row-${index}`;
        row.innerHTML = `
            <input type="text" class="manual-resource-name" name="manual_resource_name_${index}" value="${resourceData.name || ''}" placeholder="Resource Name (e.g., Luck Points)" title="Custom Resource Name">
            <div class="resource-values">
                <input type="number" class="manual-resource-current resource-current centered-text" name="manual_resource_current_${index}" value="${resourceData.current || '0'}" min="0" title="Current Value">
                <span class="resource-separator">/</span>
                <input type="number" class="manual-resource-max resource-max centered-text" name="manual_resource_max_${index}" value="${resourceData.max || '1'}" min="0" title="Maximum Value">
            </div>
            <button type="button" class="action-button remove-button remove-manual-resource-button action-col" title="Remove Manual Resource"><i class="fas fa-trash-alt"></i></button>
        `;
         const removeButton = row.querySelector('.remove-manual-resource-button');
         removeButton?.addEventListener('click', () => row.remove());
        return row;
    }

    function addManualResourceHandler() {
        if (!manualResourcesList) return;
        const newRow = createManualResourceRow(manualResourceIndexCounter++);
        manualResourcesList.appendChild(newRow);
    }

    // --- Event Listener for Removing Dynamic Rows (Replaced with direct binding for simplicity) ---
    // The previous delegated listener is removed; buttons now get listeners when created.

    // --- Spell Slot Management ---
    function generateSpellSlotsVisuals(level, total) {
        const visualContainer = document.getElementById(`modern-slot-visual-${level}`);
        if (!visualContainer) return;
        visualContainer.innerHTML = '';
        let numTotal = parseInt(total, 10);

        if (isNaN(numTotal) || numTotal < 0) { numTotal = 0; }
        const countToGenerate = Math.min(numTotal, 6); // Generate max 6 visuals

        for (let i = 1; i <= countToGenerate; i++) {
            const checkboxId = `modern_slot_lvl${level}_used_${i}`;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.id = checkboxId; checkbox.name = checkboxId;
            checkbox.dataset.level = level; checkbox.dataset.index = i;
            visualContainer.appendChild(checkbox);
        }
    }

    function spellSlotTotalChangeHandler(event) {
        const inputElement = event.target;
        if (!inputElement.classList.contains('slot-total-input') || !inputElement.closest('.spell-slot-level-modern')) return;

        const levelContainer = inputElement.closest('.spell-slot-level-modern');
        const level = levelContainer?.dataset.level;
        if (!level) return;

        let total = parseInt(inputElement.value, 10);
        if (isNaN(total) || total < 0) { total = 0; }
        if (total > 6) { total = 6; inputElement.value = 6; } // Ensure value is capped
        // inputElement.value = total; // No need to set again if capped
        generateSpellSlotsVisuals(level, total);
    }

    // --- Class, Multiclass & Resource Management (V6.7 - Updated Max/Readonly logic) ---
    const classResourceMap = {
        "Barbarian": ["rage-tracker"],
        "Bard": ["bardic-inspiration-tracker"],
        "Cleric": ["channel-divinity-tracker"],
        "Druid": ["wild-shape-tracker"],
        "Fighter": [],
        "Monk": ["ki-tracker"],
        "Paladin": ["channel-divinity-tracker"],
        "Ranger": [], "Rogue": [],
        "Sorcerer": ["sorcery-points-tracker"],
        "Warlock": [], "Wizard": [], "Other": []
    };

    function updateClassResourceVisibility() {
        const selectedClass = classSelect?.value || "";
        const isMulticlass = selectedClass === 'Other';
        const resourcesToShow = classResourceMap[selectedClass] || [];

        resourceTrackersContainer?.querySelectorAll('.class-resource').forEach(el => el.style.display = 'none');

        if (isMulticlass) {
             // Show *all* class resources if multiclass is selected
             // This requires manual management by the user, but prevents hiding needed trackers
             resourceTrackersContainer?.querySelectorAll('.class-resource').forEach(el => el.style.display = ''); // Show all
        } else {
            // Show only resources for the selected single class
            resourcesToShow.forEach(trackerId => {
                const trackerElement = document.getElementById(trackerId);
                if (trackerElement) trackerElement.style.display = ''; // Use default display (flex)
            });
        }
    }

    function updateMulticlassInputVisibility() {
        if (multiclassInputGroup) {
            multiclassInputGroup.style.display = (classSelect?.value === 'Other') ? '' : 'none';
        }
    }

    function updateClassResourceMaxes(currentLevel = null, currentModifiers = null) {
        const level = parseInt(currentLevel ?? levelInput?.value, 10) || 1;
        // Ensure modifiers are fetched if not provided (needed for CHA mod etc.)
        const modifiers = currentModifiers ?? (() => { const mods = {}; form.querySelectorAll('.ability-box').forEach(box => { const scoreInput = box.querySelector('.ability-score'); if (scoreInput) mods[box.id.split('-')[0]] = calculateModifier(scoreInput.value); }); return mods; })();
        const fullClassLevelText = (multiclassInputGroup?.style.display !== 'none' && multiclassInput?.value) ? multiclassInput.value.toLowerCase() : "";
        const selectedSingleClass = (classSelect?.value !== 'Other' && classSelect?.value) ? classSelect.value.toLowerCase() : null;

        const getClassLevel = (className) => {
             if (fullClassLevelText) {
                 const match = fullClassLevelText.match(new RegExp(className.toLowerCase() + '\\s*(\\d+)'));
                 if (match?.[1]) return parseInt(match[1], 10);
                 return 0; // Not found in multiclass string
             }
             if (selectedSingleClass === className.toLowerCase()) { return level; } // Matches the single class selected
             return 0; // Not the selected single class
        };

        // Rage (Barbarian)
        const rageMaxInput = document.getElementById('rage-max');
        if (rageMaxInput) {
            const barbarianLevel = getClassLevel('barbarian');
            let maxRages = 0;
             if (barbarianLevel >= 20) maxRages = Infinity;
             else if (barbarianLevel >= 17) maxRages = 6;
             else if (barbarianLevel >= 12) maxRages = 5;
             else if (barbarianLevel >= 6) maxRages = 4;
             else if (barbarianLevel >= 3) maxRages = 3;
             else if (barbarianLevel >= 1) maxRages = 2;
            rageMaxInput.value = (maxRages === Infinity) ? '∞' : maxRages.toString(); // Store as string if Infinity
            rageMaxInput.type = (maxRages === Infinity) ? 'text' : 'number'; // Change type dynamically
        }

        // Bardic Inspiration (Bard) - Max based on CHA Mod
        const bardicMaxInput = document.getElementById('bardic-inspiration-max');
        if (bardicMaxInput) {
            const chaMod = modifiers['cha'] ?? 0;
            bardicMaxInput.value = Math.max(1, chaMod); // Ensure at least 1
            bardicMaxInput.readOnly = true; // Make readonly as it's calculated
        }

        // Channel Divinity (Cleric/Paladin) - Max based on class levels
        const channelDivinityMaxInput = document.getElementById('channel-divinity-max');
         if (channelDivinityMaxInput) {
             const clericLevel = getClassLevel('cleric');
             const paladinLevel = getClassLevel('paladin');
             let maxCD = 0;
             // Check Cleric levels first
             if (clericLevel >= 18) maxCD = 3;
             else if (clericLevel >= 6) maxCD = 2;
             else if (clericLevel >= 2) maxCD = 1;
             // Add Paladin uses (they don't stack uses, just gain access at level 3, potentially more later)
             // Basic PHB Paladin Channel Divinity uses are typically 1 per short/long rest. Some subclasses might grant more.
             // This logic assumes standard PHB rules where Paladin gets 1 use at level 3. If a cleric/paladin multiclass exists, the cleric levels primarily determine the # of uses.
             if (paladinLevel >= 3 && maxCD === 0) { // Only give Paladin's 1 use if they aren't getting uses from Cleric
                 maxCD = 1;
             }
             // Note: Complex multiclass interactions (like Paladin 6/Cleric 6) might need specific interpretation.
             // This calculation primarily follows the higher progression (Cleric).
             channelDivinityMaxInput.value = maxCD;
             // Max value is calculated, but might be overridden manually for specific builds/items
             // channelDivinityMaxInput.readOnly = false; // Allow manual override if needed
        }

        // Wild Shape (Druid) - Max based on Druid Level (Standard PHB = 2 uses at level 2)
        const wildShapeMaxInput = document.getElementById('wild-shape-max');
        if (wildShapeMaxInput) {
            const druidLevel = getClassLevel('druid');
            wildShapeMaxInput.value = (druidLevel >= 2) ? 2 : 0;
             // wildShapeMaxInput.readOnly = false; // Allow manual override (e.g., Moon Druid changes)
        }

        // Ki Points (Monk) - Max equals Monk Level
        const kiMaxInput = document.getElementById('ki-max');
        if (kiMaxInput) {
            const monkLevel = getClassLevel('monk');
            kiMaxInput.value = Math.max(0, monkLevel); // Monk level can be 0 if not a monk
            kiMaxInput.readOnly = true; // Strictly based on level
        }

        // Sorcery Points (Sorcerer) - Max equals Sorcerer Level
        const sorcPointsMaxInput = document.getElementById('sorcery-points-max');
        if (sorcPointsMaxInput) {
            const sorcLevel = getClassLevel('sorcerer');
             sorcPointsMaxInput.value = Math.max(0, sorcLevel); // Sorc level can be 0
             sorcPointsMaxInput.readOnly = true; // Strictly based on level
        }
    }


    // --- Long Rest Functionality (V6.7 - Check Max Type) ---
    function executeLongRest() {
        if (!window.confirm("Are you sure you want to take a Long Rest? This will reset HP, spell slots, spent Hit Dice, and certain resources to their maximums.")) return;

        // Reset HP
        if (hpCurrentInput && hpMaxInput) { hpCurrentInput.value = hpMaxInput.value; }
        if (hpTempInput) { hpTempInput.value = 0; }

        // Reset Hit Dice Spent
        if (hitDiceSpentInput) { hitDiceSpentInput.value = 0; }

        // Reset Spell Slots (visual checkboxes)
        spellSlotsGrid?.querySelectorAll('.slot-visual-modern input[type="checkbox"]').forEach(cb => cb.checked = false);

        // Reset Death Saves
        form.querySelectorAll('.ds-checks input[type="checkbox"]').forEach(cb => cb.checked = false);

        // Reset Class Resources (that reset on Long Rest)
        const longRestResources = [
             "rage-tracker",            // Barbarian Rage
             "bardic-inspiration-tracker", // Bardic Inspiration (Most regain on Long, some on Short at higher levels)
             "channel-divinity-tracker", // Cleric/Paladin Channel Divinity (Typically regain on Short/Long)
             "wild-shape-tracker",       // Druid Wild Shape (Regain on Short/Long)
             "ki-tracker",             // Monk Ki (Regain on Short/Long)
             "sorcery-points-tracker",  // Sorcerer Points (Regain on Long)
             // Note: Warlock slots reset on Short Rest, so not included here.
             // Add other class resources if they reset on Long Rest
        ];

        longRestResources.forEach(trackerId => {
            const tracker = document.getElementById(trackerId);
            // Only reset if the tracker is currently visible (relevant for single class)
            // For multiclass, we might reset resources even if the primary class doesn't use them.
            // Let's reset regardless of visibility, assuming the user added the resource intentionally.
            if (tracker) {
                const currentInput = tracker.querySelector('.resource-current');
                const maxInput = tracker.querySelector('.resource-max'); // Handles both number and text inputs

                if (currentInput && maxInput) {
                    // Handle the '∞' case for Rage
                    if (maxInput.type === 'text' && maxInput.value === '∞') {
                        // Set to a high number or simply keep current if already high? Let's set to max possible value for the number input type
                        currentInput.value = currentInput.max || 99; // Or just leave it if ∞? Let's reset to max numeric allowed
                    } else {
                        currentInput.value = maxInput.value; // Set current to the max value
                    }
                }
            }
        });

        // Reset Manual Resources - Assuming they ALL reset on long rest. Could add a checkbox per resource later.
        manualResourcesList?.querySelectorAll('.manual-resource-row').forEach(row => {
             const currentInput = row.querySelector('.manual-resource-current');
             const maxInput = row.querySelector('.manual-resource-max');
             if(currentInput && maxInput) {
                 currentInput.value = maxInput.value;
             }
        });

        // Update calculated HP total display
        updateTotalHpDisplay();
        showTemporaryMessage("Long Rest Complete!", "success");
    }

    // --- Collapsible Sections ---
    function toggleCollapse(event) {
        const button = event.currentTarget;
        const card = button.closest('.card');
        if (!card) return;
        const icon = button.querySelector('i');
        card.classList.toggle('collapsed');
        if (card.classList.contains('collapsed')) {
            icon?.classList.replace('fa-chevron-up', 'fa-chevron-down');
            button.title = "Expand Section";
        } else {
            icon?.classList.replace('fa-chevron-down', 'fa-chevron-up');
            button.title = "Collapse Section";
        }
    }

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
        const currentTheme = bodyElement.dataset.theme || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }

    // --- Utility: Temporary Message Display ---
    function showTemporaryMessage(message, type = 'info') {
        if (!messageContainer) return;
        const messageDiv = document.createElement('div');
        messageDiv.className = `sheet-message sheet-message-${type}`;
        messageDiv.textContent = message;
        messageContainer.appendChild(messageDiv);
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => { messageDiv.remove(); }, 500); // Remove after fade out
        }, 2500); // Message visible for 2.5 seconds
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Calculation Triggers
        levelInput?.addEventListener('input', updateAllCalculatedFields);
        form.querySelectorAll('.ability-score').forEach(input => input.addEventListener('input', updateAllCalculatedFields));
        form.querySelectorAll('.prof-toggle').forEach(toggle => toggle.addEventListener('change', updateAllCalculatedFields));
        spellcastingAbilitySelect?.addEventListener('change', updateAllCalculatedFields);
        hpCurrentInput?.addEventListener('input', updateTotalHpDisplay);
        hpTempInput?.addEventListener('input', updateTotalHpDisplay);
        hpMaxInput?.addEventListener('input', updateTotalHpDisplay); // Max HP changes affect current if current > new max? (Rule dependent, currently doesn't enforce)
        multiclassInput?.addEventListener('input', () => updateClassResourceMaxes(levelInput?.value, null)); // Update resources on multiclass text change

        // Dynamic List Add Buttons
        addSpellButton?.addEventListener('click', addSpellRowHandler);
        addWeaponButton?.addEventListener('click', addWeaponRowHandler);
        addItemButton?.addEventListener('click', addItemRowHandler);
        addManualResourceButton?.addEventListener('click', addManualResourceHandler);

        // Spell Slot Total Input Change
        spellSlotsGrid?.addEventListener('input', spellSlotTotalChangeHandler);

        // Class Selection Change
        classSelect?.addEventListener('change', () => {
            updateMulticlassInputVisibility();
            updateClassResourceVisibility(); // Show/hide relevant trackers
            updateClassResourceMaxes(levelInput?.value, null); // Recalculate maxes for the new class/multiclass state
        });

        // UI Buttons
        allCollapseToggles?.forEach(button => button.addEventListener('click', toggleCollapse));
        darkModeToggle?.addEventListener('click', toggleTheme);
        longRestButton?.addEventListener('click', executeLongRest);
        saveButton?.addEventListener('click', saveData); // Now wired up correctly
        loadFileLabel?.addEventListener('click', () => loadFileInput?.click()); // Trigger hidden file input
        loadFileInput?.addEventListener('change', loadData); // Handle file selection
        printButton?.addEventListener('click', () => window.print()); // Simple print trigger
    }

    // --- Save/Load Functionality (V6.7 - Consistent Naming, JSON structure) ---
    function saveData() {
        const characterData = {};
        const excludedContainers = ['#spell-list-content', '#weapons-list-content', '#items-list-content', '#manual-resources-list', '.slot-visual-modern'];
        const excludedIds = ['hp-total-display', 'load-file']; // Exclude calculated/utility IDs

        // Save standard form fields
        form.querySelectorAll('input:not([type=file]):not([type=checkbox]), textarea, select').forEach(input => {
            // Skip inputs within dynamic list containers or specifically excluded IDs
            if (excludedContainers.some(selector => input.closest(selector)) || excludedIds.includes(input.id)) return;
            // Skip the multiclass input if it's hidden
            if (input.id === 'classlevel' && multiclassInputGroup?.style.display === 'none') return;

            const key = input.name || input.id;
            if (key) { characterData[key] = input.value; }
        });

        // Save checkboxes separately
        form.querySelectorAll('input[type=checkbox]').forEach(input => {
             // Skip checkboxes within dynamic list containers (handled below) or spell slot visuals
            if (excludedContainers.some(selector => input.closest(selector)) || input.closest('.slot-visual-modern')) return;
            const key = input.name || input.id;
            if (key) { characterData[key] = input.checked; }
        });


        // Save Spell Slots (Total and Used)
        characterData.spellSlots = {};
        spellSlotsGrid?.querySelectorAll('.spell-slot-level-modern').forEach(slotLevelDiv => {
            const level = slotLevelDiv.dataset.level;
            const totalInput = slotLevelDiv.querySelector('.slot-total-input');
            const usedCheckboxes = slotLevelDiv.querySelectorAll('.slot-visual-modern input[type=checkbox]:checked');
            if (totalInput && level) {
                characterData.spellSlots[`level${level}`] = {
                    total: totalInput.value || '0',
                    used: Array.from(usedCheckboxes).map(cb => cb.dataset.index) // Store indices of used slots
                };
            }
        });

        // Save Dynamic Lists
        characterData.spells = Array.from(spellListContent?.querySelectorAll('.spell-row') || []).map((row, index) => {
            // Find elements using more specific selectors within the row
            return {
                prepared: row.querySelector(`input[name="spell_prepared_${row.id.split('-').pop()}"]`)?.checked || false,
                level: row.querySelector(`input[name="spell_level_${row.id.split('-').pop()}"]`)?.value || '',
                name: row.querySelector(`input[name="spell_name_${row.id.split('-').pop()}"]`)?.value || '',
                compV: row.querySelector(`input[name="spell_comp_v_${row.id.split('-').pop()}"]`)?.checked || false,
                compS: row.querySelector(`input[name="spell_comp_s_${row.id.split('-').pop()}"]`)?.checked || false,
                compM: row.querySelector(`input[name="spell_comp_m_${row.id.split('-').pop()}"]`)?.checked || false,
                notes: row.querySelector(`input[name="spell_notes_${row.id.split('-').pop()}"]`)?.value || ''
            };
        });
        characterData.weapons = Array.from(weaponsListContent?.querySelectorAll('.attack-row') || []).map(row => ({
            name: row.querySelector('input[name^="attack_name"]')?.value || '',
            bonus: row.querySelector('input[name^="attack_bonus"]')?.value || '',
            damage: row.querySelector('input[name^="attack_damage"]')?.value || '',
            notes: row.querySelector('input[name^="attack_notes"]')?.value || ''
        }));
        characterData.items = Array.from(itemsListContent?.querySelectorAll('.item-row') || []).map(row => ({
            equipped: row.querySelector('input[name^="item_equipped"]')?.checked || false,
            name: row.querySelector('input[name^="item_name"]')?.value || '',
            count: row.querySelector('input[name^="item_count"]')?.value || '1', // Default count to 1 if empty
            notes: row.querySelector('input[name^="item_notes"]')?.value || ''
        }));
        characterData.manualResources = Array.from(manualResourcesList?.querySelectorAll('.manual-resource-row') || []).map(row => ({
            name: row.querySelector('.manual-resource-name')?.value || '',
            current: row.querySelector('.manual-resource-current')?.value || '0',
            max: row.querySelector('.manual-resource-max')?.value || '1'
        }));

        // Create and Download JSON File
        const jsonData = JSON.stringify(characterData, null, 2); // Pretty print JSON
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const charName = document.getElementById('charname')?.value || 'modern_character';
        // Use V6.7 in filename
        const fileName = `${charName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_dnd_sheet_v6.7.json`;
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Clean up blob URL
        showTemporaryMessage("Character Saved!", "success");
    }

    function loadData(event) {
         const file = event.target.files[0];
         if (!file) return;
         const reader = new FileReader();
         reader.onload = (e) => {
             try {
                 const characterData = JSON.parse(e.target.result);

                 // --- PRE-LOAD PREPARATION ---
                 // Clear dynamic lists & reset counters FIRST
                 if (spellListContent) spellListContent.innerHTML = '';
                 if (weaponsListContent) weaponsListContent.innerHTML = '';
                 if (itemsListContent) itemsListContent.innerHTML = '';
                 if (manualResourcesList) manualResourcesList.innerHTML = '';
                 spellIndexCounter = 0; weaponIndexCounter = 0; itemIndexCounter = 0; manualResourceIndexCounter = 0;
                 // Clear existing spell slot visuals before loading new totals
                 spellSlotsGrid?.querySelectorAll('.slot-visual-modern').forEach(vis => vis.innerHTML = '');


                 // --- LOAD DATA ---
                 // Load standard inputs (text, textarea, select, number)
                 form.querySelectorAll('input:not([type=file]):not([type=checkbox]), textarea, select').forEach(input => {
                     const key = input.name || input.id;
                     // Skip inputs that should not be loaded directly (dynamic lists, calculated, file input, spell totals)
                     if (!key || input.closest('#spell-list-content, #weapons-list-content, #items-list-content, #manual-resources-list') || ['hp-total-display', 'load-file'].includes(key) || input.classList.contains('slot-total-input')) return;
                     if (characterData.hasOwnProperty(key)) {
                          input.value = characterData[key];
                     } else {
                         // Optional: Clear fields not found in saved data? Or leave them as default?
                         // input.value = ''; // Uncomment to clear fields not in JSON
                     }
                 });

                 // Load checkboxes (must be done separately)
                  form.querySelectorAll('input[type=checkbox]').forEach(input => {
                     const key = input.name || input.id;
                      // Skip checkboxes inside dynamic lists or spell slot visuals (handled later)
                     if (!key || input.closest('#spell-list-content, #weapons-list-content, #items-list-content, #manual-resources-list, .slot-visual-modern')) return;
                      if (characterData.hasOwnProperty(key)) {
                          input.checked = characterData[key];
                     } else {
                         // input.checked = false; // Uncomment to uncheck boxes not in JSON
                     }
                 });

                 // --- POST-LOAD PROCESSING for specific elements ---
                 updateMulticlassInputVisibility(); // Update visibility based on loaded classSelect value

                 // Load Dynamic Lists by creating new rows
                 characterData.spells?.forEach(data => { if (spellListContent) spellListContent.appendChild(createSpellRow(spellIndexCounter++, data)); });
                 characterData.weapons?.forEach(data => { if (weaponsListContent) weaponsListContent.appendChild(createWeaponRow(weaponIndexCounter++, data)); });
                 characterData.items?.forEach(data => { if (itemsListContent) itemsListContent.appendChild(createItemRow(itemIndexCounter++, data)); });
                 characterData.manualResources?.forEach(data => { if (manualResourcesList) manualResourcesList.appendChild(createManualResourceRow(manualResourceIndexCounter++, data)); });

                 // Load Spell Slots (Set totals, generate visuals, check used boxes)
                 if (characterData.spellSlots && spellSlotsGrid) {
                     for (let level = 1; level <= 9; level++) {
                         const slotData = characterData.spellSlots[`level${level}`];
                         const totalInput = document.getElementById(`modern-slots-total-${level}`);
                         if (slotData && totalInput) {
                             let loadedTotal = parseInt(slotData.total, 10) || 0;
                             loadedTotal = Math.min(Math.max(loadedTotal, 0), 6); // Clamp between 0 and 6
                             totalInput.value = loadedTotal;
                             generateSpellSlotsVisuals(level, loadedTotal); // Generate visuals based on loaded total

                             // Check the 'used' checkboxes based on loaded data
                             if (slotData.used && Array.isArray(slotData.used)) {
                                 slotData.used.forEach(usedIndexStr => {
                                     const usedIndex = parseInt(usedIndexStr, 10);
                                     if (!isNaN(usedIndex) && usedIndex > 0 && usedIndex <= loadedTotal) { // Validate index
                                         const checkbox = document.getElementById(`modern_slot_lvl${level}_used_${usedIndex}`);
                                         if (checkbox) checkbox.checked = true;
                                     }
                                 });
                             }
                         } else if (totalInput) {
                             // If no data for this level, reset it
                             totalInput.value = '0';
                             generateSpellSlotsVisuals(level, 0);
                         }
                     }
                 }

                 // --- FINAL UPDATES ---
                 updateClassResourceVisibility(); // Ensure correct resources are shown based on loaded class
                 updateAllCalculatedFields(); // Recalculate everything based on loaded data
                 applyTheme(localStorage.getItem('dndSheetTheme') || 'light'); // Re-apply theme
                 showTemporaryMessage('Character data loaded successfully!', 'success');

             } catch (error) {
                 console.error("Error loading or parsing file:", error);
                 showTemporaryMessage('Error loading character data. File might be corrupt or invalid.', 'error');
             } finally {
                 // Clear the file input value so the 'change' event fires even if the same file is selected again
                 if (loadFileInput) loadFileInput.value = '';
             }
         };
         reader.onerror = () => {
            showTemporaryMessage('Error reading file.', 'error');
            if (loadFileInput) loadFileInput.value = ''; // Clear input on read error too
        };
         reader.readAsText(file);
    }

    // --- Initial Setup ---
    function initializeSheet() {
        // Add one empty row to each dynamic list if they start empty (provides a starting point)
        function initializeDefaultRowsIfEmpty(container, addHandler) {
             if (container && !container.querySelector(':scope > *')) { // Check if container has direct children
                 addHandler();
             }
        }
        initializeDefaultRowsIfEmpty(spellListContent, addSpellRowHandler);
        initializeDefaultRowsIfEmpty(weaponsListContent, addWeaponRowHandler);
        initializeDefaultRowsIfEmpty(itemsListContent, addItemRowHandler);
        // Don't add a default manual resource unless requested

        // Apply saved theme or default based on system preference
        const savedTheme = localStorage.getItem('dndSheetTheme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);

        // Initial UI state updates
        updateMulticlassInputVisibility();
        updateClassResourceVisibility();
        updateAllCalculatedFields(); // Initial calculation of all fields

        // Generate initial spell slot visuals based on default values (likely 0)
        for (let i = 1; i <= 9; i++) {
            const totalInput = document.getElementById(`modern-slots-total-${i}`);
            if (totalInput) generateSpellSlotsVisuals(i, totalInput.value || 0);
        }

        setupEventListeners(); // Setup all event listeners AFTER initial setup
        console.log("Modern D&D Sheet V6.7 Initialized");
    }

    // --- Run Initialization ---
    initializeSheet();

}); // End DOMContentLoaded
