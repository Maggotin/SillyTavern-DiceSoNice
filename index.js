import { animation_duration } from '../../../../script.js';
import { getContext, renderExtensionTemplateAsync } from '../../../extensions.js';
import { POPUP_TYPE, callGenericPopup } from '../../../popup.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from '../../../slash-commands/SlashCommandArgument.js';
import { commonEnumProviders } from '../../../slash-commands/SlashCommandCommonEnumsProvider.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { isTrueBoolean } from '../../../utils.js';
export { MODULE_NAME };

const MODULE_NAME = 'dice';
const TEMPLATE_PATH = 'third-party/SillyTavern-DiceSoNice';

// Define default settings
const defaultSettings = Object.freeze({
    functionTool: false,
});

// Define a function to get or initialize settings
function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();

    // Initialize settings if they don't exist
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }

    // Ensure all default keys exist (helpful after updates)
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(extensionSettings[MODULE_NAME], key)) {
            extensionSettings[MODULE_NAME][key] = defaultSettings[key];
        }
    }

    return extensionSettings[MODULE_NAME];
}

// Load a script and return a promise
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.onload = () => {
            console.log('Dice: Loaded', src);
            resolve(true);
        };
        script.onerror = (error) => {
            console.error('Dice: Failed to load', src, error);
            reject(error);
        };
        document.head.appendChild(script);
    });
}

// Load RPG Dice Roller library with all dependencies
async function loadDiceRoller() {
    // Check if already loaded
    if (window.rpgDiceRoller || window.dice) {
        return true;
    }

    // CRITICAL: Set up crypto BEFORE loading random-js
    // random-js needs crypto.getRandomValues()
    if (typeof window.crypto === 'undefined') {
        window.crypto = {};
    }
    
    if (typeof window.crypto.getRandomValues !== 'function') {
        console.warn('Dice: Providing crypto.getRandomValues polyfill using Math.random');
        window.crypto.getRandomValues = function(array) {
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
            return array;
        };
    }

    // Get the extension base path
    const scripts = document.querySelectorAll('script[src*="SillyTavern-DiceSoNice"]');
    let basePath = 'scripts/extensions/third-party/SillyTavern-DiceSoNice/';
    
    if (scripts.length > 0) {
        const scriptSrc = scripts[0].src;
        const match = scriptSrc.match(/(.*\/SillyTavern-DiceSoNice\/)/);
        if (match) {
            basePath = match[1];
        }
    }

    try {
        // Load dependencies in order: mathjs -> random-js -> dice-roller
        await loadScript(basePath + 'lib/math.js');
        await loadScript(basePath + 'lib/random-js.umd.min.js');
        await loadScript(basePath + 'lib/rpg-dice-roller.umd.min.js');
        
        // Check if the library is available
        if (window.rpgDiceRoller || window.dice || window.DiceRoll) {
            console.log('Dice: RPG Dice Roller loaded successfully');
            console.log('Dice: Library available as', 
                window.rpgDiceRoller ? 'window.rpgDiceRoller' : 
                window.dice ? 'window.dice' : 
                'window.DiceRoll');
            return true;
        } else {
            throw new Error('Library loaded but not accessible');
        }
    } catch (error) {
        console.error('Dice: Failed to load dice roller or dependencies', error);
        throw error;
    }
}

// Get DiceRoll constructor from the loaded library
function getDiceRoll() {
    // Try common global names
    if (window.rpgDiceRoller?.DiceRoll) return window.rpgDiceRoller.DiceRoll;
    if (window.dice?.DiceRoll) return window.dice.DiceRoll;
    if (window.DiceRoll) return window.DiceRoll;
    
    console.error('Dice: DiceRoll constructor not found');
    return null;
}

/**
 * Roll the dice using RPG Dice Roller library.
 * @param {string} customDiceFormula Dice formula
 * @param {boolean} quiet Suppress chat output
 * @param {string} description Optional roll description
 * @returns {Promise<string>} Roll result
 */
async function doDiceRoll(customDiceFormula, quiet = false, description = '') {
    let value = typeof customDiceFormula === 'string' ? customDiceFormula.trim() : $(this).data('value');

    if (value == 'custom') {
        value = await callGenericPopup('Enter the dice formula:<br><i>(for example, <tt>2d6</tt>)</i>', POPUP_TYPE.INPUT, '', { okButton: 'Roll', cancelButton: 'Cancel' });
    }

    if (!value) {
        return '';
    }

    const DiceRoll = getDiceRoll();
    if (!DiceRoll) {
        toastr.error('Dice roller not loaded');
        return '[Dice roller not loaded]';
    }

    try {
        const roll = new DiceRoll(value);
        const resultString = `${roll.total} (${roll.output})`;
        
        if (!quiet) {
            const context = getContext();
            const rollLabel = description ? `${description}: ${value}` : value;
            context.sendSystemMessage('generic', `${context.name1} rolls ${rollLabel}. The result is: ${resultString}`, { isSmallSys: true });
        }
        
        return resultString;
    } catch (error) {
        console.error('Dice: Roll failed', error);
        toastr.warning('Invalid dice formula');
        return '[Invalid dice formula]';
    }
}

async function addDiceRollButton() {
    const buttonHtml = await renderExtensionTemplateAsync(TEMPLATE_PATH, 'button');
    const dropdownHtml = await renderExtensionTemplateAsync(TEMPLATE_PATH, 'dropdown');
    const settingsHtml = await renderExtensionTemplateAsync(TEMPLATE_PATH, 'settings');

    const getWandContainer = () => $(document.getElementById('dice_wand_container') ?? document.getElementById('extensionsMenu'));
    getWandContainer().append(buttonHtml);

    const getSettingsContainer = () => $(document.getElementById('dice_container') ?? document.getElementById('extensions_settings2'));
    getSettingsContainer().append(settingsHtml);

    const settings = getSettings();
    $('#dice_function_tool').prop('checked', settings.functionTool).on('change', function () {
        settings.functionTool = !!$(this).prop('checked');
        SillyTavern.getContext().saveSettingsDebounced();
        registerFunctionTools();
    });

    $(document.body).append(dropdownHtml);
    
    const button = $('#roll_dice');
    const dropdown = $('#dice_dropdown');
    dropdown.hide();

    // Initialize dice builder state
    let diceFormula = [];
    
    const formulaDisplay = $('#dice_formula');
    const rollButton = $('#dice_roll_built');
    const clearButton = $('#dice_clear');
    const descriptionInput = $('#dice_description');

    function updateFormulaDisplay() {
        const formulaText = diceFormula.join(' ');
        if (diceFormula.length === 0) {
            formulaDisplay.val('');
            rollButton.prop('disabled', true);
        } else {
            formulaDisplay.val(formulaText);
            rollButton.prop('disabled', false);
        }
    }

    // Sync manual edits back to formula array
    formulaDisplay.on('input', function (e) {
        e.stopPropagation();
        const value = $(this).val().trim();
        if (value) {
            // Parse the input into formula array (simple split on spaces for now)
            diceFormula = value.split(/\s+/).filter(Boolean);
            rollButton.prop('disabled', false);
        } else {
            diceFormula = [];
            rollButton.prop('disabled', true);
        }
    });

    function addToFormula(value) {
        // Check if clicking same die type consecutively - consolidate quantity
        if (diceFormula.length > 0) {
            const lastItem = diceFormula[diceFormula.length - 1];
            const diceMatch = lastItem.match(/^(\d*)d(\d+|F|\%)$/);
            const isDieRoll = value.match(/^d(\d+|F|\%)$/);
            
            // If last item is a die and we're adding the same die type, consolidate
            if (diceMatch && isDieRoll && value === `d${diceMatch[2]}`) {
                const qty = parseInt(diceMatch[1] || '1') + 1;
                diceFormula[diceFormula.length - 1] = `${qty}d${diceMatch[2]}`;
                updateFormulaDisplay();
                return;
            }
            
            // Smart formatting: add '+' between dice/modifiers if needed
            const needsOperator = !lastItem.match(/[+\-]$/) && !value.match(/^[+\-!khdl]/);
            if (needsOperator && !value.match(/^[+\-!khdl]/)) {
                diceFormula.push('+');
            }
        }
        diceFormula.push(value);
        updateFormulaDisplay();
    }

    // Ability selector popup
    async function showAbilitySelector() {
        const abilitiesHtml = `
            <div class="ability-selector-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 10px;">
                <button class="menu_button ability-choice" data-ability="Strength">STR</button>
                <button class="menu_button ability-choice" data-ability="Dexterity">DEX</button>
                <button class="menu_button ability-choice" data-ability="Constitution">CON</button>
                <button class="menu_button ability-choice" data-ability="Intelligence">INT</button>
                <button class="menu_button ability-choice" data-ability="Wisdom">WIS</button>
                <button class="menu_button ability-choice" data-ability="Charisma">CHA</button>
            </div>
        `;
        
        const container = $('<div>').html(abilitiesHtml);
        $(document.body).append(container);
        
        return new Promise((resolve) => {
            container.find('.ability-choice').on('click', function() {
                const ability = $(this).data('ability');
                container.remove();
                resolve(ability);
            });
            
            // Handle popup close/cancel
            setTimeout(() => {
                if (container.parent().length === 0) {
                    resolve(null);
                }
            }, 100);
        });
    }

    // Skill selector popup
    async function showSkillSelector() {
        const skills = [
            'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics',
            'Deception', 'History', 'Insight', 'Intimidation',
            'Investigation', 'Medicine', 'Nature', 'Perception',
            'Performance', 'Persuasion', 'Religion', 'Sleight of Hand',
            'Stealth', 'Survival'
        ];
        
        const skillsHtml = `
            <div class="skill-selector-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 10px; max-height: 400px; overflow-y: auto;">
                ${skills.map(skill => `<button class="menu_button skill-choice" data-skill="${skill}">${skill}</button>`).join('')}
            </div>
        `;
        
        const container = $('<div>').html(skillsHtml);
        $(document.body).append(container);
        
        return new Promise((resolve) => {
            container.find('.skill-choice').on('click', function() {
                const skill = $(this).data('skill');
                container.remove();
                resolve(skill);
            });
            
            // Handle popup close/cancel
            setTimeout(() => {
                if (container.parent().length === 0) {
                    resolve(null);
                }
            }, 100);
        });
    }

    // Hit dice selector popup
    async function showHitDiceSelector() {
        const hitDiceHtml = `
            <div class="hitdice-selector-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 10px;">
                <button class="menu_button hitdice-choice" data-die="d6">d6</button>
                <button class="menu_button hitdice-choice" data-die="d8">d8</button>
                <button class="menu_button hitdice-choice" data-die="d10">d10</button>
                <button class="menu_button hitdice-choice" data-die="d12">d12</button>
            </div>
        `;
        
        const container = $('<div>').html(hitDiceHtml);
        $(document.body).append(container);
        
        return new Promise((resolve) => {
            container.find('.hitdice-choice').on('click', function() {
                const die = $(this).data('die');
                container.remove();
                resolve(die);
            });
            
            // Handle popup close/cancel
            setTimeout(() => {
                if (container.parent().length === 0) {
                    resolve(null);
                }
            }, 100);
        });
    }

    // Dice type buttons
    $('.dice-type-btn').on('click', function (e) {
        e.stopPropagation();
        const die = $(this).data('die');
        addToFormula(die);
    });

    // Modifier buttons
    $('.dice-modifier-btn').on('click', function (e) {
        e.stopPropagation();
        const modifier = $(this).data('modifier');
        addToFormula(modifier);
    });

    // Preset buttons
    $('.dice-preset-btn').on('click', async function (e) {
        e.stopPropagation();
        const formula = $(this).data('formula');
        const description = $(this).data('description');
        const requiresSelection = $(this).data('requires-selection');
        
        // Handle presets that need user selection
        if (requiresSelection === 'ability') {
            const ability = await showAbilitySelector();
            if (ability) {
                diceFormula = ['d20'];
                descriptionInput.val(`${ability} Check`);
                updateFormulaDisplay();
            }
            return;
        } else if (requiresSelection === 'skill') {
            const skill = await showSkillSelector();
            if (skill) {
                diceFormula = ['d20'];
                descriptionInput.val(skill);
                updateFormulaDisplay();
            }
            return;
        } else if (requiresSelection === 'hitdice') {
            const die = await showHitDiceSelector();
            if (die) {
                diceFormula = [die];
                descriptionInput.val('Hit Dice');
                updateFormulaDisplay();
            }
            return;
        }
        
        // Standard preset handling
        diceFormula = [formula];
        updateFormulaDisplay();
        
        // Auto-fill description if preset has one and field is empty
        if (description && !descriptionInput.val().trim()) {
            descriptionInput.val(description);
        }
    });

    // Clear button
    clearButton.on('click', function (e) {
        e.stopPropagation();
        diceFormula = [];
        descriptionInput.val('');
        updateFormulaDisplay();
    });

    // Roll built formula
    rollButton.on('click', function (e) {
        e.stopPropagation();
        if (diceFormula.length > 0) {
            const formula = diceFormula.join('').replace(/\s+/g, '');
            const description = descriptionInput.val().trim();
            
            dropdown.fadeOut(animation_duration);
            doDiceRoll(formula, false, description);
            diceFormula = [];
            descriptionInput.val('');
            updateFormulaDisplay();
        }
    });

    // Custom input button
    $('#dice_custom_input').on('click', async function (e) {
        e.stopPropagation();
        dropdown.fadeOut(animation_duration);
        await doDiceRoll('custom', false);
    });

    const popper = SillyTavern.libs.Popper.createPopper(button.get(0), dropdown.get(0), {
        placement: 'top',
    });

    $(document).on('click touchend', function (e) {
        const target = $(e.target);
        if (target.is(dropdown) || target.closest(dropdown).length) return;
        if (target.is(button) && !dropdown.is(':visible')) {
            e.preventDefault();

            dropdown.fadeIn(animation_duration);
            popper.update();
        } else {
            dropdown.fadeOut(animation_duration);
        }
    });
}

function registerFunctionTools() {
    try {
        const { registerFunctionTool, unregisterFunctionTool } = SillyTavern.getContext();
        if (!registerFunctionTool || !unregisterFunctionTool) {
            console.debug('Dice: function tools are not supported');
            return;
        }

        unregisterFunctionTool('RollTheDice');

        // Function tool is disabled by the settings
        const settings = getSettings();
        if (!settings.functionTool) {
            return;
        }

        const rollDiceSchema = Object.freeze({
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'object',
            properties: {
                who: {
                    type: 'string',
                    description: 'The name of the persona rolling the dice (optional)',
                },
                formula: {
                    type: 'string',
                    description: 'A dice formula to roll (e.g., 2d6, 4d6kh3, 2d20!, 1d20+5, d20)',
                },
                quiet: {
                    type: 'boolean',
                    description: 'Do not display the result in chat (default: false)',
                },
            },
            required: ['formula'],
        });

        registerFunctionTool({
            name: 'RollTheDice',
            displayName: 'Dice Roll',
            description: 'Rolls the dice using the provided formula and returns the numeric result. Supports various formats like 2d6 (basic), 4d6kh3 (keep highest 3), 2d20! (exploding), or 1d20+5 (with modifier). Use when it is necessary to roll the dice to determine the outcome of an action or when the user requests it.',
            parameters: rollDiceSchema,
            action: async (args) => {
                const formula = String(args?.formula ?? 'd20');
                const quiet = Boolean(args?.quiet ?? true);
                const who = typeof args?.who === 'string' ? args.who.trim() : '';

                const roll = await doDiceRoll(formula, quiet);
                const prefix = who ? `${who} rolls a ${formula}.` : `Roll ${formula}.`;
                const result = `${prefix} The result is: ${roll}`;
                return result;
            },
            formatMessage: () => '',
        });
    } catch (error) {
        console.error('Dice: Error registering function tools', error);
    }
}

jQuery(async function () {
    try {
        // Load dice roller library first
        await loadDiceRoller();
        
        await addDiceRollButton();
        registerFunctionTools();
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'roll',
            aliases: ['r', 'rolls'],
            callback: (args, value) => {
                const quiet = isTrueBoolean(String(args.quiet));
                return doDiceRoll(String(value), quiet);
            },
            helpString: 'Roll the dice using various formats (e.g., 2d6, 4d6kh3, 2d20!, 1d20+5).',
            returns: 'roll result',
            namedArgumentList: [
                SlashCommandNamedArgument.fromProps({
                    name: 'quiet',
                    description: 'Do not display the result in chat',
                    isRequired: false,
                    typeList: [ARGUMENT_TYPE.BOOLEAN],
                    defaultValue: String(false),
                    enumProvider: commonEnumProviders.boolean('trueFalse'),
                }),
            ],
            unnamedArgumentList: [
                SlashCommandArgument.fromProps({
                    description: 'dice formula, e.g. 2d6',
                    isRequired: true,
                    typeList: [ARGUMENT_TYPE.STRING],
                }),
            ],
        }));
    } catch (error) {
        console.error('Failed to load DiceSoNice extension:', error);
        toastr.error('Failed to load Dice extension. Check console for details.');
    }
});
