import { animation_duration } from '../../../../script.js';
import { getContext } from '../../../extensions.js';
import { POPUP_TYPE, callGenericPopup } from '../../../popup.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from '../../../slash-commands/SlashCommandArgument.js';
import { commonEnumProviders } from '../../../slash-commands/SlashCommandCommonEnumsProvider.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { isTrueBoolean } from '../../../utils.js';
export { MODULE_NAME };

const MODULE_NAME = 'dice';

// Add script tags for dependencies
function loadDependencies() {
    return new Promise((resolve, reject) => {
        const scripts = [
            {
                src: 'https://unpkg.com/mathjs@11.8.2/lib/browser/math.js',
                integrity: 'sha384-X31NN2duBz9kUTJtCMX7cR8kpKjlPyWQFKkKE1HUGzQKWXgvz+XxUZdSC0CGCWZH'
            },
            {
                src: 'https://cdn.jsdelivr.net/npm/random-js@2.1.0/dist/random-js.umd.min.js',
                integrity: 'sha384-/Bw1XO5tVn9+Z+YpuT+qO1FAyAOxMvUA1QCFnv+AcCJibx3MLvmvypVtLnSYTbJV'
            },
            {
                src: 'https://cdn.jsdelivr.net/npm/@dice-roller/rpg-dice-roller@5.3.0/lib/umd/bundle.min.js',
                integrity: 'sha384-Ry7+XjCnuVVnLKiQCQ/7ZXI4xsm9QLlXtYI4SXtjq3mLI95XFQpWzTcDCXVwMU9'
            }
        ];
        
        let loaded = 0;
        scripts.forEach(scriptData => {
            const script = document.createElement('script');
            script.src = scriptData.src;
            script.integrity = scriptData.integrity;
            script.crossOrigin = 'anonymous';
            script.async = false;
            script.onload = () => {
                loaded++;
                if (loaded === scripts.length) {
                    resolve();
                }
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    });
}

/**
 * Helper function to check if a string contains only digits
 * @param {string} str - The string to check
 * @returns {boolean} - Whether the string contains only digits
 */
function isDigitsOnly(str) {
    return /^\d+$/.test(str);
}

/**
 * Enhanced dice roller with support for advanced notation using RPG Dice Roller library
 */
const droll = (() => {
    /**
     * Validates a dice notation string
     * @param {string} formula - The dice notation to validate
     * @returns {boolean} - Whether the notation is valid
     */
    function validate(formula) {
        try {
            // Reject overly complex formulas
            if (formula.length > 100) {
                console.warn(`Formula too long: "${formula}"`);
                return false;
            }
            
            // Handle digit-only case
            if (isDigitsOnly(formula)) return true;
            
            // Handle '1+2' and other basic arithmetic expressions
            if (/^\d+[+\-]\d+$/.test(formula)) return true;
            
            // Use RPG Dice Roller to validate
            new rpgDiceRoller.DiceRoll(formula);
            return true;
        } catch (error) {
            console.error(`Invalid formula: "${formula}"`, error);
            return false;
        }
    }

    /**
     * Rolls dice according to the provided formula
     * @param {string} formula - The dice notation to roll
     * @returns {Object|boolean} - The roll result or false if invalid
     */
    function roll(formula) {
        // Handle single number case
        if (isDigitsOnly(formula)) {
            formula = `1d${formula}`;
        }
        
        // Handle 'd20' case (no leading number)
        if (formula.startsWith('d')) {
            formula = '1' + formula;
        }

        try {
            const diceRoll = new rpgDiceRoller.DiceRoll(formula);
            const rollDetails = [];
            
            // Process all dice groups
            diceRoll.rolls.forEach(rollGroup => {
                if (Array.isArray(rollGroup)) {
                    // Handle dice rolls
                    const groupDetails = rollGroup.map(result => {
                        if (typeof result === 'object') {
                            let text = result.value.toString();
                            // Add modifiers in order
                            if (result.exploded) text += '!';
                            if (result.dropped) text += 'd';
                            if (result.rerolled) text += 'r';
                            if (result.calculationValue !== result.value) {
                                text += `[${result.calculationValue}]`;
                            }
                            return text;
                        }
                        return result.toString();
                    });
                    rollDetails.push(groupDetails.join(', '));
                } else if (typeof rollGroup === 'object' && rollGroup.operator) {
                    // Handle operators between groups
                    rollDetails.push(rollGroup.operator);
                } else {
                    // Handle modifiers and static numbers
                    rollDetails.push(String(rollGroup));
                }
            });
            
            // Format to match the expected output format
            return {
                total: diceRoll.total,
                rolls: rollDetails.join(' '),
                formula: formula
            };
        } catch (error) {
            console.error(`Failed to roll formula: "${formula}"`, error);
            return false;
        }
    }
    
    return {
        validate,
        roll
    };
})();

/**
 * Roll the dice.
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

    const isValid = droll.validate(value);

    if (isValid) {
        const result = droll.roll(value);
        if (!result) {
            return '[Roll failed]';
        }
        
        // Format the result string consistently for both chat and macros
        const resultString = `${result.total} (${result.rolls})`;
        
        if (!quiet) {
            const context = getContext();
            context.sendSystemMessage('generic', `${context.name1} rolls a ${value}. The result is: ${resultString}`);
        }
        
        // Always return the formatted string for macro compatibility
        return resultString;
    } else {
        toastr.warning('Invalid dice formula');
        return '[Invalid dice formula]';
    }
}

function addDiceRollButton() {
    const buttonHtml = `
    <div id="roll_dice" class="list-group-item flex-container flexGap5">
        <div class="fa-solid fa-dice extensionsMenuExtensionButton" title="Roll Dice" /></div>
        Roll Dice
    </div>
        `;
    const dropdownHtml = `
    <div id="dice_dropdown">
        <ul class="list-group">
            <li class="list-group-item" data-value="d4">d4</li>
            <li class="list-group-item" data-value="d6">d6</li>
            <li class="list-group-item" data-value="d8">d8</li>
            <li class="list-group-item" data-value="d10">d10</li>
            <li class="list-group-item" data-value="d12">d12</li>
            <li class="list-group-item" data-value="d20">d20</li>
            <li class="list-group-item" data-value="d100">d100</li>
            <li class="list-group-item" data-value="custom">...</li>
        </ul>
    </div>`;

    const getWandContainer = () => $(document.getElementById('dice_wand_container') ?? document.getElementById('extensionsMenu'));
    getWandContainer().append(buttonHtml);

    $(document.body).append(dropdownHtml);
    $('#dice_dropdown li').on('click', function () {
        dropdown.fadeOut(animation_duration);
        doDiceRoll($(this).data('value'), false);
    });
    const button = $('#roll_dice');
    const dropdown = $('#dice_dropdown');
    dropdown.hide();

    let popper = Popper.createPopper(button.get(0), dropdown.get(0), {
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
        const { registerFunctionTool } = getContext();
        if (!registerFunctionTool) {
            console.debug('Dice: function tools are not supported');
            return;
        }

        const rollDiceSchema = Object.freeze({
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'object',
            properties: {
                who: {
                    type: 'string',
                    description: 'The name of the persona rolling the dice',
                },
                formula: {
                    type: 'string',
                    description: 'A dice formula to roll (e.g., 2d6, 4d6kh3, 2d20!, 1d20+5, d20)',
                },
            },
            required: [
                'who',
                'formula',
            ],
        });

        registerFunctionTool({
            name: 'RollTheDice',
            displayName: 'Dice Roll',
            description: 'Rolls the dice using the provided formula and returns the numeric result. Supports various formats like 2d6 (basic), 4d6kh3 (keep highest 3), 2d20! (exploding), or 1d20+5 (with modifier). Use when it is necessary to roll the dice to determine the outcome of an action or when the user requests it.',
            parameters: rollDiceSchema,
            action: async (args) => {
                if (!args?.formula) args = { formula: 'd20' };
                const roll = await doDiceRoll(args.formula, true);
                const result = args.who ? `${args.who} rolls a ${args.formula}. The result is: ${roll}` : `The result of a ${args.formula} roll is: ${roll}`;
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

            // Handle digit-only case (e.g., "20" -> "1d20")
            if (isDigitsOnly(formula)) {
                formula = `1d${formula}`;
            }

            // Handle 'd' prefix case (e.g., "d20" -> "1d20")
            if (formula.startsWith('d') && isDigitsOnly(formula.substring(1))) {
                formula = `1${formula}`;
            }

            const isValid = droll.validate(formula);
            if (!isValid) {
                console.debug(`Invalid roll formula: ${formula}`);
                return `[Error: Invalid formula "${formula}"]`;
            }

            const result = droll.roll(formula);
            if (!result) {
                return `[Error: Failed to roll ${formula}]`;
            }

            return `${result.total} (${result.rolls})`;
        });

    } catch (error) {
        console.error('Dice: Error registering macros', error);
    }
}

jQuery(async function () {
    try {
        await loadDependencies();
        addDiceRollButton();
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
