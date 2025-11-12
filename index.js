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

/**
 * Roll the dice using SillyTavern's built-in dice roller.
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

    const isValid = SillyTavern.libs.droll.validate(value);

    if (isValid) {
        const result = SillyTavern.libs.droll.roll(value);
        if (!result) {
            return '[Roll failed]';
        }
        
        // Format the result string consistently for both chat and macros
        const resultString = `${result.total} (${result.rolls.join(', ')})`;
        
        if (!quiet) {
            const context = getContext();
            context.sendSystemMessage('generic', `${context.name1} rolls a ${value}. The result is: ${resultString}`, { isSmallSys: true });
        }
        
        // Always return the formatted string for macro compatibility
        return resultString;
    } else {
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
        SillyTavern.getContext().registerMacro('rolls', async (args) => {
            // Convert input to string and trim whitespace
            const input = String(args ?? '').trim();
            
            if (!input) {
                return '[Error: Empty dice formula]';
            }

            // Clean the input
            let formula = input.replace(/['"]/g, '');

            const isValid = SillyTavern.libs.droll.validate(formula);
            if (!isValid) {
                console.debug(`Invalid roll formula: ${formula}`);
                return `[Error: Invalid formula "${formula}"]`;
            }

            const result = SillyTavern.libs.droll.roll(formula);
            if (!result) {
                return `[Error: Failed to roll ${formula}]`;
            }

            return `${result.total} (${result.rolls.join(', ')})`;
        });

    } catch (error) {
        console.error('Dice: Error registering macros', error);
    }
}

jQuery(async function () {
    try {
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
    }
});
