// Modern D&D Character Sheet Script V7.0 (Added Skill Expertise) // V7.0 Bump
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
    const initiativeBonusInput = document.getElementById('initiative-bonus-input');
    const initiativeDisplay = document.getElementById('initiative');

    // --- Header Control Selectors ---
    const saveButton = document.getElementById('save-button');
    const loadFileLabel = document.querySelector('.load-button-label');
    const loadFileInput = document.getElementById('load-file');
    const printButton = document.getElementById('print-button');
    const longRestButton = document.getElementById('long-rest-button');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const bodyElement = document.body;

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

    // --- V6.8 HP Bar Selectors ---
    const hpBarCurrent = document.getElementById('hp-bar-current');
    const hpBarTemp = document.getElementById('hp-bar-temp');

    // --- Counters ---
    let spellIndexCounter = 0;
    let weaponIndexCounter = 0;
    let itemIndexCounter = 0;
    let manualResourceIndexCounter = 0;
    let isSheetDirty = false;

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
        updateClassResourceMaxes(level, null); // Pass current level, mods will be fetched if null
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
        updateClassResourceMaxes(levelInput?.value || 1, modifiers); // Pass current level and new modifiers
        return modifiers;
    }

    function updateSavingThrows(modifiers, pb) {
        form.querySelectorAll('.saving-throw.list-item').forEach(saveDiv => { // Ensure it's a list-item to avoid other .saving-throw elements
            const checkbox = saveDiv.querySelector('.save-prof');
            const valueDisplay = saveDiv.querySelector('.save-value');
            const abilityBox = saveDiv.closest('.ability-box');
            if (!abilityBox) return; // Should always find an ability box for a save
            const ability = abilityBox.id.split('-')[0];

            if (checkbox && valueDisplay && modifiers.hasOwnProperty(ability)) {
                const baseModifier = modifiers[ability];
                const totalSave = baseModifier + (checkbox.checked ? pb : 0);
                valueDisplay.textContent = formatModifier(totalSave);
            }
        });
    }

    // V7.0: Updated for Expertise
    function updateSkills(modifiers, pb) {
        let perceptionBonus = 0;
        form.querySelectorAll('.skill.list-item').forEach(skillDiv => {
            const profCheckbox = skillDiv.querySelector('.skill-prof');
            const expertCheckbox = skillDiv.querySelector('.skill-expert'); // Added for V7.0
            const valueDisplay = skillDiv.querySelector('.skill-value');
            const ability = profCheckbox?.dataset.ability; // data-ability is on the profCheckbox

            if (profCheckbox && valueDisplay && ability && modifiers.hasOwnProperty(ability)) {
                const baseModifier = modifiers[ability];
                let totalSkill = baseModifier;

                if (profCheckbox.checked) {
                    totalSkill += pb;
                    // Only add expertise bonus if proficiency is also checked
                    if (expertCheckbox && expertCheckbox.checked) {
                        totalSkill += pb; // Expertise adds proficiency bonus again
                    }
                }
                // If profCheckbox is not checked, expertCheckbox should also be false (enforced by event listeners),
                // so no PB from proficiency or expertise is added, which is correct.

                valueDisplay.textContent = formatModifier(totalSkill);

                // Specific logic for Perception to calculate Passive Perception
                // Ensure we're checking the ID of the proficiency checkbox for perception
                if (profCheckbox.id === 'perception-prof') {
                    perceptionBonus = totalSkill;
                }
            } else if (valueDisplay && ability && modifiers.hasOwnProperty(ability)) {
                // Fallback for some edge case where checkboxes might be missing but data exists
                valueDisplay.textContent = formatModifier(modifiers[ability]);
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
        const initiativeBonus = parseInt(initiativeBonusInput?.value, 10) || 0;
        const totalInitiative = dexModifier + initiativeBonus;
         if (initiativeDisplay) initiativeDisplay.textContent = formatModifier(totalInitiative);
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
        updateHpBar();
    }

    function updateHpBar() {
        if (!hpBarCurrent || !hpBarTemp || !hpMaxInput || !hpCurrentInput || !hpTempInput) return;

        const maxHp = Math.max(1, parseInt(hpMaxInput.value, 10) || 1);
        const currentHp = parseInt(hpCurrentInput.value, 10) || 0;
        const tempHp = parseInt(hpTempInput.value, 10) || 0;

        const visualMaxHp = Math.max(maxHp, currentHp + tempHp, 1);

        let currentPercent = Math.max(0, Math.min(100, (currentHp / visualMaxHp) * 100));
        let tempPercent = Math.max(0, Math.min(100, (tempHp / visualMaxHp) * 100));

        hpBarCurrent.style.width = `${currentPercent}%`;
        hpBarTemp.style.left = `${currentPercent}%`;
        hpBarTemp.style.width = `${Math.min(tempPercent, 100 - currentPercent)}%`;
    }


    // --- Master Update Function ---
    function updateAllCalculatedFields() {
        const pb = updateProficiencyBonus(); // Calls updateClassResourceMaxes internally
        const modifiers = updateAbilityScoresAndModifiers(); // Calls updateClassResourceMaxes internally
        updateSavingThrows(modifiers, pb);
        updateSkills(modifiers, pb); // V7.0: Includes expertise, calls updatePassivePerception internally
        updateInitiative(modifiers);
        updateSpellcastingStats(modifiers, pb);
        updateTotalHpDisplay(); // Includes HP bar update
        // One final call to updateClassResourceMaxes ensures consistency if mods/level were updated elsewhere
        // (though it's already called by PB and Mod updaters, this is a safeguard)
        updateClassResourceMaxes(levelInput?.value || 1, modifiers);
    }

    // --- Dynamic List Management ---
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
         const removeButton = row.querySelector('.remove-spell-row-button');
         removeButton?.addEventListener('click', () => {
             row.remove();
             markSheetDirty();
        });
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
         removeButton?.addEventListener('click', () => {
             row.remove();
             markSheetDirty();
        });
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
         removeButton?.addEventListener('click', () => {
             row.remove();
             markSheetDirty();
        });
        return row;
    }

     function addItemRowHandler() {
         if (!itemsListContent) return;
         const newRow = createItemRow(itemIndexCounter++);
         itemsListContent.appendChild(newRow);
     }

    function createManualResourceRow(index, resourceData = {}) {
        const row = document.createElement('div');
        row.classList.add('manual-resource-row');
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
         removeButton?.addEventListener('click', () => {
             row.remove();
             markSheetDirty();
        });
        return row;
    }

    function addManualResourceHandler() {
        if (!manualResourcesList) return;
        const newRow = createManualResourceRow(manualResourceIndexCounter++);
        manualResourcesList.appendChild(newRow);
    }

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
        generateSpellSlotsVisuals(level, total);
    }

    // --- Class, Multiclass & Resource Management ---
    const classResourceMap = {
        "Barbarian": ["rage-tracker"],
        "Bard": ["bardic-inspiration-tracker"],
        "Cleric": ["channel-divinity-tracker"],
        "Druid": ["wild-shape-tracker"],
        "Fighter": [],
        "Monk": ["ki-tracker"],
        "Paladin": ["channel-divinity-tracker"], // Paladins also get Channel Divinity
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
             // Show all if "Other/Multiclass" is selected, as we don't know specific classes
             resourceTrackersContainer?.querySelectorAll('.class-resource').forEach(el => el.style.display = '');
        } else {
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
        // Ensure modifiers are an object, even if fetching fresh
        const modifiers = currentModifiers ?? (() => { const mods = {}; form.querySelectorAll('.ability-box').forEach(box => { const scoreInput = box.querySelector('.ability-score'); if (scoreInput) mods[box.id.split('-')[0]] = calculateModifier(scoreInput.value); }); return mods; })();

        const fullClassLevelText = (multiclassInputGroup?.style.display !== 'none' && multiclassInput?.value) ? multiclassInput.value.toLowerCase() : "";
        const selectedSingleClass = (classSelect?.value !== 'Other' && classSelect?.value) ? classSelect.value.toLowerCase() : null;

        const getClassLevel = (className) => {
             if (fullClassLevelText) { // Check multiclass input first
                 const match = fullClassLevelText.match(new RegExp(className.toLowerCase() + '\\s*(\\d+)'));
                 if (match?.[1]) return parseInt(match[1], 10);
                 return 0; // Class not found in multiclass string
             }
             // If not multiclassing or multiclass string is empty, check single class dropdown
             if (selectedSingleClass === className.toLowerCase()) { return level; }
             return 0; // Class not selected
        };

        // Rage (Barbarian)
        const rageMaxInput = document.getElementById('rage-max');
        if (rageMaxInput) {
            const barbarianLevel = getClassLevel('barbarian');
            let maxRages = 0;
             if (barbarianLevel >= 20) maxRages = Infinity; // Or a very high number if '∞' is problematic for input type
             else if (barbarianLevel >= 17) maxRages = 6;
             else if (barbarianLevel >= 12) maxRages = 5;
             else if (barbarianLevel >= 6) maxRages = 4;
             else if (barbarianLevel >= 3) maxRages = 3;
             else if (barbarianLevel >= 1) maxRages = 2;
             // Only update if the value actually changes to prevent unnecessary DOM manipulation
             if (rageMaxInput.value !== (maxRages === Infinity ? '∞' : maxRages.toString())) {
                 rageMaxInput.value = (maxRages === Infinity) ? '∞' : maxRages.toString();
                 // Change input type if '∞' is used
                 rageMaxInput.type = (maxRages === Infinity) ? 'text' : 'number';
             }
        }

        // Bardic Inspiration (Bard)
        const bardicMaxInput = document.getElementById('bardic-inspiration-max');
        if (bardicMaxInput) {
            const chaMod = modifiers['cha'] ?? 0; // Default to 0 if 'cha' not in modifiers
            const newMax = Math.max(1, chaMod); // Min 1 use
            if (bardicMaxInput.value != newMax) { // Use != for type coercion if needed, or !== if types are consistent
                 bardicMaxInput.value = newMax;
                 bardicMaxInput.readOnly = true; // Max is calculated
             }
        }

        // Channel Divinity (Cleric/Paladin)
        const channelDivinityMaxInput = document.getElementById('channel-divinity-max');
         if (channelDivinityMaxInput) {
             const clericLevel = getClassLevel('cleric');
             const paladinLevel = getClassLevel('paladin'); // Paladins also get CD
             let maxCD = 0;
             // Cleric CD progression
             if (clericLevel >= 18) maxCD = 3;
             else if (clericLevel >= 6) maxCD = 2;
             else if (clericLevel >= 2) maxCD = 1;

             // Paladin CD (if Paladin has CD and Cleric doesn't meet threshold yet)
             if (paladinLevel >= 3 && maxCD === 0) { // Only grant Paladin's CD if Cleric CD isn't already higher
                 maxCD = 1; // Paladins get 1 use at level 3
             }
             // Future: Consider if multiclassing stacks CD uses (RAW, they don't, you use the highest progression)
             if (channelDivinityMaxInput.value != maxCD) {
                 channelDivinityMaxInput.value = maxCD;
             }
        }

        // Wild Shape (Druid)
        const wildShapeMaxInput = document.getElementById('wild-shape-max');
        if (wildShapeMaxInput) {
            const druidLevel = getClassLevel('druid');
            const newMax = (druidLevel >= 2) ? 2 : 0; // Druids get 2 uses at level 2
             if (wildShapeMaxInput.value != newMax) {
                 wildShapeMaxInput.value = newMax;
             }
        }

        // Ki Points (Monk)
        const kiMaxInput = document.getElementById('ki-max');
        if (kiMaxInput) {
            const monkLevel = getClassLevel('monk');
            const newMax = Math.max(0, monkLevel); // Ki points equal Monk level
            if (kiMaxInput.value != newMax) {
                kiMaxInput.value = newMax;
                kiMaxInput.readOnly = true; // Max is calculated
            }
        }

        // Sorcery Points (Sorcerer)
        const sorcPointsMaxInput = document.getElementById('sorcery-points-max');
        if (sorcPointsMaxInput) {
            const sorcLevel = getClassLevel('sorcerer');
            const newMax = Math.max(0, sorcLevel); // Sorcery points equal Sorcerer level (starting at level 2, but features grant them)
             if (sorcPointsMaxInput.value != newMax) { // Sorcerers get points equal to level from L2, but 0 before
                 sorcPointsMaxInput.value = newMax;
                 sorcPointsMaxInput.readOnly = true; // Max is calculated
            }
        }
    }


    // --- Long Rest Functionality ---
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
             "rage-tracker", "bardic-inspiration-tracker", "channel-divinity-tracker",
             "wild-shape-tracker", "ki-tracker", "sorcery-points-tracker",
        ];

        longRestResources.forEach(trackerId => {
            const tracker = document.getElementById(trackerId);
            if (tracker) {
                const currentInput = tracker.querySelector('.resource-current');
                const maxInput = tracker.querySelector('.resource-max');
                if (currentInput && maxInput) {
                    if (maxInput.type === 'text' && maxInput.value === '∞') {
                        // For '∞' rages, set to a high practical number or keep current if max is truly unlimited
                        currentInput.value = currentInput.max || 99; // Or perhaps leave as is if meant to be unlimited and manually managed
                    } else {
                        currentInput.value = maxInput.value;
                    }
                }
            }
        });

        // Reset Manual Resources
        manualResourcesList?.querySelectorAll('.manual-resource-row').forEach(row => {
             const currentInput = row.querySelector('.manual-resource-current');
             const maxInput = row.querySelector('.manual-resource-max');
             if(currentInput && maxInput) {
                 currentInput.value = maxInput.value;
             }
        });

        // Update calculated HP total display (also triggers HP bar update)
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

    // --- V6.9: Spell Sorting ---
    const sortSpellsLevelButton = document.getElementById('sort-spells-level');
    const sortSpellsNameButton = document.getElementById('sort-spells-name');

    function getSpellLevelValue(levelString) {
        const lowerLevel = (levelString || '0').toLowerCase().trim();
        if (lowerLevel === 'c' || lowerLevel === '0' || lowerLevel === '') {
            return 0; // Cantrips are level 0
        }
        const num = parseInt(lowerLevel, 10);
        return isNaN(num) ? 99 : num; // Place invalid numbers last
    }

    function sortSpells(sortBy) {
        if (!spellListContent) return;
        const rows = Array.from(spellListContent.querySelectorAll('.spell-row'));
        if (rows.length < 2) return; // No need to sort less than 2 items

        rows.sort((a, b) => {
            const nameA = a.querySelector('input[name^="spell_name"]')?.value.toLowerCase() || '';
            const nameB = b.querySelector('input[name^="spell_name"]')?.value.toLowerCase() || '';
            const levelA = getSpellLevelValue(a.querySelector('input[name^="spell_level"]')?.value);
            const levelB = getSpellLevelValue(b.querySelector('input[name^="spell_level"]')?.value);

            if (sortBy === 'level') {
                if (levelA !== levelB) {
                    return levelA - levelB; // Primary sort: Level ascending
                } else {
                    return nameA.localeCompare(nameB); // Secondary sort: Name ascending
                }
            } else { // sortBy === 'name'
                return nameA.localeCompare(nameB); // Primary sort: Name ascending
            }
        });

        // Clear and re-append sorted rows
        spellListContent.innerHTML = '';
        rows.forEach(row => spellListContent.appendChild(row));
        markSheetDirty(); // Sorting changes the visual order, potentially worth saving
        showTemporaryMessage(`Spells sorted by ${sortBy === 'level' ? 'Level' : 'Name'}.`, 'info');
    }

    // --- V6.9: Unsaved Changes Warning ---
    function setupBeforeUnloadListener() {
        window.addEventListener('beforeunload', (event) => {
            if (isSheetDirty) {
                const confirmationMessage = 'You have unsaved changes. Are you sure you want to leave?';
                event.preventDefault(); // Standard for most browsers
                event.returnValue = confirmationMessage; // For older browsers
                return confirmationMessage; // For some browsers
            }
             return undefined; // Allow unload if not dirty
        });
    }

    // --- Helper to mark sheet as dirty ---
    function markSheetDirty() {
        isSheetDirty = true;
    }


    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Calculation Triggers (Add dirty flag)
        levelInput?.addEventListener('input', () => { markSheetDirty(); updateAllCalculatedFields(); });
        form.querySelectorAll('.ability-score').forEach(input => input.addEventListener('input', () => { markSheetDirty(); updateAllCalculatedFields(); }));
        // Listen to ALL prof-toggle checkboxes (saves AND skills)
        form.querySelectorAll('.prof-toggle').forEach(toggle => { // This class is on save-prof and skill-prof
            toggle.addEventListener('change', () => {
                markSheetDirty();
                 // V7.0: If this is a skill-prof checkbox and it's unchecked, uncheck its corresponding expertise
                if (toggle.classList.contains('skill-prof') && !toggle.checked) {
                    const skillDiv = toggle.closest('.skill.list-item');
                    if (skillDiv) {
                        const expertCheckbox = skillDiv.querySelector('.skill-expert');
                        if (expertCheckbox && expertCheckbox.checked) {
                            expertCheckbox.checked = false;
                            // No need to call updateAllCalculatedFields() again here, as it's called below
                        }
                    }
                }
                updateAllCalculatedFields();
            });
        });

        // V7.0: Listener for NEW skill expertise checkboxes
        form.querySelectorAll('.skill-expert').forEach(expertCheckbox => {
            expertCheckbox.addEventListener('change', () => {
                markSheetDirty(); // Expertise change dirties the sheet
                const skillDiv = expertCheckbox.closest('.skill.list-item');
                if (skillDiv) {
                    const profCheckbox = skillDiv.querySelector('.skill-prof');
                    if (profCheckbox && expertCheckbox.checked && !profCheckbox.checked) {
                        expertCheckbox.checked = false; // Prevent checking expert if not proficient
                        showTemporaryMessage("Expertise requires proficiency in the skill.", "error");
                    }
                }
                updateAllCalculatedFields(); // Recalculate all fields after expertise change
            });
        });


        spellcastingAbilitySelect?.addEventListener('change', () => { markSheetDirty(); updateAllCalculatedFields(); });
        hpCurrentInput?.addEventListener('input', () => { markSheetDirty(); updateTotalHpDisplay(); });
        hpTempInput?.addEventListener('input', () => { markSheetDirty(); updateTotalHpDisplay(); });
        hpMaxInput?.addEventListener('input', () => { markSheetDirty(); updateTotalHpDisplay(); });
        initiativeBonusInput?.addEventListener('input', () => { markSheetDirty(); updateAllCalculatedFields(); });
        multiclassInput?.addEventListener('input', () => { markSheetDirty(); updateClassResourceMaxes(levelInput?.value, null); }); // Pass null for modifiers so it fetches fresh

        // General listener for other inputs/textareas/selects to mark sheet dirty
        form.addEventListener('input', (event) => {
             if (event.target.matches('input:not([type=file]):not([type=checkbox]), textarea, select')) {
                 // Avoid double-marking if handled by a more specific listener above
                 const isHandledSpecifically = event.target.closest('.ability-score, #level, #hp-current, #hp-temp, #hp-max, #initiative-bonus-input, #classlevel, .slot-total-input');
                 if (!isHandledSpecifically) {
                    markSheetDirty();
                 }
             }
        });
        // General listener for checkboxes/selects to mark sheet dirty (if not already handled)
        form.addEventListener('change', (event) => {
            if (event.target.matches('input[type=checkbox], select')) {
                // Exclude elements handled by specific listeners or UI controls
                const isHandledSpecifically = event.target.closest('.prof-toggle, .skill-expert, #spellcasting-ability, .slot-visual-modern input[type="checkbox"]');
                const isUIControl = event.target.closest('#dark-mode-toggle'); // Dark mode toggle shouldn't dirty
                if (!isHandledSpecifically && !isUIControl) {
                    markSheetDirty();
                }
            }
        });

        // Dynamic List Add Buttons (Add dirty flag)
        addSpellButton?.addEventListener('click', () => { markSheetDirty(); addSpellRowHandler(); });
        addWeaponButton?.addEventListener('click', () => { markSheetDirty(); addWeaponRowHandler(); });
        addItemButton?.addEventListener('click', () => { markSheetDirty(); addItemRowHandler(); });
        addManualResourceButton?.addEventListener('click', () => { markSheetDirty(); addManualResourceHandler(); });

        // Remove button clicks handled in createXXXRow functions will also call markSheetDirty

        // Spell Slot Total Input Change (Add dirty flag)
        spellSlotsGrid?.addEventListener('input', (event) => {
            if (event.target.classList.contains('slot-total-input')) {
                markSheetDirty();
                spellSlotTotalChangeHandler(event);
            }
        });
        // Spell Slot Checkbox Change (mark dirty)
        spellSlotsGrid?.addEventListener('change', (event) => {
             if (event.target.matches('.slot-visual-modern input[type="checkbox"]')) {
                markSheetDirty();
             }
        });

        // Class Selection Change (Add dirty flag)
        classSelect?.addEventListener('change', () => {
            markSheetDirty();
            updateMulticlassInputVisibility();
            updateClassResourceVisibility();
            updateClassResourceMaxes(levelInput?.value, null); // Recalculate class resources
        });

        // UI Buttons
        allCollapseToggles?.forEach(button => button.addEventListener('click', toggleCollapse));
        darkModeToggle?.addEventListener('click', toggleTheme); // No dirty flag for theme
        longRestButton?.addEventListener('click', () => { markSheetDirty(); executeLongRest(); }); // Long rest modifies data
        saveButton?.addEventListener('click', saveData); // save resets flag
        loadFileLabel?.addEventListener('click', () => loadFileInput?.click()); // No dirty flag for triggering load
        loadFileInput?.addEventListener('change', loadData); // load resets flag after success
        printButton?.addEventListener('click', () => window.print()); // No dirty flag for print

        // V6.9 Spell Sort Button Listeners
        sortSpellsLevelButton?.addEventListener('click', () => sortSpells('level'));
        sortSpellsNameButton?.addEventListener('click', () => sortSpells('name'));
    }

    // --- Save/Load Functionality (V7.0 - Expertise checkboxes handled by general checkbox logic) ---
    function saveData() {
        const characterData = {};
        const excludedContainers = ['#spell-list-content', '#weapons-list-content', '#items-list-content', '#manual-resources-list', '.slot-visual-modern'];
        const excludedIds = ['hp-total-display', 'load-file']; // Elements not to save directly

        // Save standard form fields (inputs, textareas, selects that are NOT checkboxes)
        form.querySelectorAll('input:not([type=file]):not([type=checkbox]), textarea, select').forEach(input => {
            // Skip if inside an excluded dynamic list container or is an excluded ID
            if (excludedContainers.some(selector => input.closest(selector)) || excludedIds.includes(input.id)) return;
            // Skip multiclass input if not visible
            if (input.id === 'classlevel' && multiclassInputGroup?.style.display === 'none') return;

            const key = input.name || input.id;
            // Also include resource-max inputs even if they don't have a name (using ID)
            if (key || input.classList.contains('resource-max')) { // Some resource-max might only have ID
                 const finalKey = key || input.id; // Prioritize name, fallback to id
                 if (finalKey) { // Ensure there's a key
                    characterData[finalKey] = input.value;
                 }
            }
        });

        // Save ALL relevant checkboxes (including skill proficiencies and expertise)
        form.querySelectorAll('input[type=checkbox]').forEach(input => {
            // Skip if inside an excluded dynamic list container or visual spell slots
            if (excludedContainers.some(selector => input.closest(selector)) || input.closest('.slot-visual-modern')) return;

            const key = input.name || input.id;
            if (key) { // Ensure there's a key
                characterData[key] = input.checked; // Save boolean state
            }
        });

        // Save Spell Slots
        characterData.spellSlots = {};
        spellSlotsGrid?.querySelectorAll('.spell-slot-level-modern').forEach(slotLevelDiv => {
            const level = slotLevelDiv.dataset.level;
            const totalInput = slotLevelDiv.querySelector('.slot-total-input');
            const usedCheckboxes = slotLevelDiv.querySelectorAll('.slot-visual-modern input[type=checkbox]:checked');
            if (totalInput && level) {
                characterData.spellSlots[`level${level}`] = {
                    total: totalInput.value || '0',
                    used: Array.from(usedCheckboxes).map(cb => cb.dataset.index)
                };
            }
        });

        // Save Dynamic Lists
        characterData.spells = Array.from(spellListContent?.querySelectorAll('.spell-row') || []).map((row) => {
            const index = row.id.split('-').pop(); // Get unique index from row ID
            return {
                prepared: row.querySelector(`input[name="spell_prepared_${index}"]`)?.checked || false,
                level: row.querySelector(`input[name="spell_level_${index}"]`)?.value || '',
                name: row.querySelector(`input[name="spell_name_${index}"]`)?.value || '',
                compV: row.querySelector(`input[name="spell_comp_v_${index}"]`)?.checked || false,
                compS: row.querySelector(`input[name="spell_comp_s_${index}"]`)?.checked || false,
                compM: row.querySelector(`input[name="spell_comp_m_${index}"]`)?.checked || false,
                notes: row.querySelector(`input[name="spell_notes_${index}"]`)?.value || ''
            };
        });
        characterData.weapons = Array.from(weaponsListContent?.querySelectorAll('.attack-row') || []).map(row => {
             const index = row.id.split('-').pop();
             return {
                 name: row.querySelector(`input[name="attack_name_${index}"]`)?.value || '',
                 bonus: row.querySelector(`input[name="attack_bonus_${index}"]`)?.value || '',
                 damage: row.querySelector(`input[name="attack_damage_${index}"]`)?.value || '',
                 notes: row.querySelector(`input[name="attack_notes_${index}"]`)?.value || ''
             };
         });
        characterData.items = Array.from(itemsListContent?.querySelectorAll('.item-row') || []).map(row => {
             const index = row.id.split('-').pop();
             return {
                 equipped: row.querySelector(`input[name="item_equipped_${index}"]`)?.checked || false,
                 name: row.querySelector(`input[name="item_name_${index}"]`)?.value || '',
                 count: row.querySelector(`input[name="item_count_${index}"]`)?.value || '1',
                 notes: row.querySelector(`input[name="item_notes_${index}"]`)?.value || ''
             };
         });
        characterData.manualResources = Array.from(manualResourcesList?.querySelectorAll('.manual-resource-row') || []).map(row => {
             const index = row.id.split('-').pop();
             return {
                 name: row.querySelector(`input[name="manual_resource_name_${index}"]`)?.value || '',
                 current: row.querySelector(`input[name="manual_resource_current_${index}"]`)?.value || '0',
                 max: row.querySelector(`input[name="manual_resource_max_${index}"]`)?.value || '1'
             };
        });

        // Create and Download JSON File
        const jsonData = JSON.stringify(characterData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const charName = document.getElementById('charname')?.value || 'modern_character';
        const fileName = `${charName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_dnd_sheet_v7.0.json`; // V7.0 Bump in filename
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        isSheetDirty = false; // Reset dirty flag after successful save
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
                 if (spellListContent) spellListContent.innerHTML = '';
                 if (weaponsListContent) weaponsListContent.innerHTML = '';
                 if (itemsListContent) itemsListContent.innerHTML = '';
                 if (manualResourcesList) manualResourcesList.innerHTML = '';
                 spellIndexCounter = 0; weaponIndexCounter = 0; itemIndexCounter = 0; manualResourceIndexCounter = 0;
                 spellSlotsGrid?.querySelectorAll('.slot-visual-modern').forEach(vis => vis.innerHTML = '');
                 isSheetDirty = false; // Clear dirty flag initially for load

                 // --- LOAD DATA ---
                 form.querySelectorAll('input:not([type=file]):not([type=checkbox]), textarea, select').forEach(input => {
                     const key = input.name || input.id;
                     const finalKey = key || (input.classList.contains('resource-max') ? input.id : null);
                     // Exclude dynamic list elements and specific non-data IDs, and spell slot totals (handled separately)
                     if (!finalKey || input.closest('#spell-list-content, #weapons-list-content, #items-list-content, #manual-resources-list') || ['hp-total-display', 'load-file'].includes(finalKey) || input.classList.contains('slot-total-input')) return;

                     if (characterData.hasOwnProperty(finalKey)) {
                          input.value = characterData[finalKey];
                     }
                 });

                 // Load ALL relevant checkboxes (including skills proficiency and expertise)
                 form.querySelectorAll('input[type=checkbox]').forEach(input => {
                     const key = input.name || input.id;
                     // Exclude dynamic list checkboxes and spell slot visual checkboxes (handled separately)
                     if (!key || input.closest('#spell-list-content, #weapons-list-content, #items-list-content, #manual-resources-list, .slot-visual-modern')) return;

                      if (characterData.hasOwnProperty(key)) {
                          input.checked = !!characterData[key]; // Ensure boolean coercion
                     } else {
                         // If checkbox data missing in JSON, default to unchecked
                         input.checked = false;
                     }
                 });

                 // --- POST-LOAD PROCESSING for specific elements ---
                 updateMulticlassInputVisibility(); // Show/hide multiclass input based on loaded class_select

                 // Load Dynamic Lists
                 characterData.spells?.forEach(data => { if (spellListContent) spellListContent.appendChild(createSpellRow(spellIndexCounter++, data)); });
                 characterData.weapons?.forEach(data => { if (weaponsListContent) weaponsListContent.appendChild(createWeaponRow(weaponIndexCounter++, data)); });
                 characterData.items?.forEach(data => { if (itemsListContent) itemsListContent.appendChild(createItemRow(itemIndexCounter++, data)); });
                 characterData.manualResources?.forEach(data => { if (manualResourcesList) manualResourcesList.appendChild(createManualResourceRow(manualResourceIndexCounter++, data)); });

                 // Load Spell Slots
                 if (characterData.spellSlots && spellSlotsGrid) {
                     for (let level = 1; level <= 9; level++) {
                         const slotData = characterData.spellSlots[`level${level}`];
                         const totalInput = document.getElementById(`modern-slots-total-${level}`);
                         if (slotData && totalInput) {
                             let loadedTotal = parseInt(slotData.total, 10) || 0;
                             loadedTotal = Math.min(Math.max(loadedTotal, 0), 6); // Cap at 0-6
                             totalInput.value = loadedTotal;
                             generateSpellSlotsVisuals(level, loadedTotal); // Generate visual slots

                             if (slotData.used && Array.isArray(slotData.used)) {
                                 slotData.used.forEach(usedIndexStr => {
                                     const usedIndex = parseInt(usedIndexStr, 10);
                                     // Check if the visual slot exists (it should if total is > 0)
                                     if (!isNaN(usedIndex) && usedIndex > 0 && usedIndex <= loadedTotal) {
                                         const checkbox = document.getElementById(`modern_slot_lvl${level}_used_${usedIndex}`);
                                         if (checkbox) checkbox.checked = true;
                                     }
                                 });
                             }
                         } else if (totalInput) { // If no slotData but input exists, reset it
                             totalInput.value = '0';
                             generateSpellSlotsVisuals(level, 0);
                         }
                     }
                 }

                 // --- FINAL UPDATES ---
                 updateClassResourceVisibility(); // Update visibility based on loaded class
                 updateAllCalculatedFields(); // Recalculate everything based on loaded data
                 applyTheme(localStorage.getItem('dndSheetTheme') || 'light'); // Apply saved theme

                 isSheetDirty = false; // Reset dirty flag *after* successful load and updates
                 showTemporaryMessage('Character data loaded successfully!', 'success');

             } catch (error) {
                 console.error("Error loading or parsing file:", error);
                 showTemporaryMessage('Error loading character data. File might be corrupt or invalid.', 'error');
             } finally {
                 // Reset file input so the same file can be loaded again if needed
                 if (loadFileInput) loadFileInput.value = '';
             }
         };
         reader.onerror = () => {
            showTemporaryMessage('Error reading file.', 'error');
            if (loadFileInput) loadFileInput.value = ''; // Reset file input on error too
        };
         reader.readAsText(file);
    }

    // --- Initial Setup ---
    function initializeSheet() {
        // Add default rows if lists are empty (e.g., for new characters)
        function initializeDefaultRowsIfEmpty(container, addHandler) {
             if (container && !container.querySelector(':scope > *')) { // Check if container is empty
                 addHandler(); // Add one default row
             }
        }

        const savedTheme = localStorage.getItem('dndSheetTheme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);

        // Generate initial empty spell slot visuals based on default '0' values in HTML
        for (let i = 1; i <= 9; i++) {
            const totalInput = document.getElementById(`modern-slots-total-${i}`);
             if (totalInput) { // Should always exist due to inline script in HTML
                 generateSpellSlotsVisuals(i, totalInput.value || 0);
            }
        }

        // Setup listeners BEFORE initial calculations
        setupEventListeners();
        setupBeforeUnloadListener(); // Setup the unsaved changes warning

        // Initial UI state updates & Calculation
        updateMulticlassInputVisibility();
        updateClassResourceVisibility();
        updateAllCalculatedFields(); // Initial calculation of all derived values

        // Add default rows *after* potential load/initial calculation if lists are still empty
         initializeDefaultRowsIfEmpty(spellListContent, addSpellRowHandler);
         initializeDefaultRowsIfEmpty(weaponsListContent, addWeaponRowHandler);
         initializeDefaultRowsIfEmpty(itemsListContent, addItemRowHandler);
         // No default manual resource needed usually

        isSheetDirty = false; // Start clean after initialization

        console.log("Modern D&D Sheet V7.0 Initialized (Added Skill Expertise)"); // V7.0 Bump in log
    }

    // --- Run Initialization ---
    initializeSheet();

}); // End DOMContentLoaded
