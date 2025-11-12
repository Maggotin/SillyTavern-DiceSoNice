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
 * @returns {Promise<string>} Roll result
 */
async function doDiceRoll(customDiceFormula, quiet = false) {
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
            context.sendSystemMessage('generic', `${context.name1} rolls a ${value}. The result is: ${resultString}`, { isSmallSys: true });
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
    $('#dice_dropdown li').on('click', function () {
        dropdown.fadeOut(animation_duration);
        doDiceRoll($(this).data('value'), false);
    });
    const button = $('#roll_dice');
    const dropdown = $('#dice_dropdown');
    dropdown.hide();

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

function registerMacros() {
    try {
        const { registerMacro, unregisterMacro } = SillyTavern.getContext();

        // Unregister the built-in simple roller (silent fail if not exists)
        try {
            unregisterMacro('roll');
            console.log('Dice: Unregistered built-in "roll" macro');
        } catch (e) {
            console.log('Dice: Built-in "roll" macro not found (this is fine)');
        }

        // Register our advanced roller under the standard 'roll' name
        registerMacro('roll', (args) => {
            const input = String(args ?? '').trim();
            
            console.log('Dice (Advanced): Macro called with formula:', input);
            
            if (!input) {
                return '[Error: Empty dice formula]';
            }

            const formula = input.replace(/['"]/g, '');
            
            const DiceRoll = getDiceRoll();
            if (!DiceRoll) {
                console.error('Dice (Advanced): DiceRoll constructor not found');
                return '[Dice roller not loaded]';
            }

            try {
                const roll = new DiceRoll(formula);
                const result = String(roll.total);
                console.log('Dice (Advanced): Macro result for', formula, '=', result);
                return result;
            } catch (error) {
                console.error('Dice (Advanced): Macro roll failed for formula:', formula, error);
                return '[Invalid dice formula]';
            }
        });

        console.log('Dice: Advanced "roll" macro registered successfully (replaces built-in)');

    } catch (error) {
        console.error('Dice: Error registering macros', error);
    }
}

jQuery(async function () {
    try {
        // Load dice roller library first
        await loadDiceRoller();
        
        await addDiceRollButton();
        registerFunctionTools();
        registerMacros();
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
