# SillyTavern-DiceSoNice

A comprehensive dice rolling extension for SillyTavern with support for standard and advanced dice notation.

## How to install

Install via the built-in "Download Extensions and Assets" tool. Or use a direct link:

```txt
https://github.com/Maggotin/SillyTavern-DiceSoNice
```

## How to use

### Via the function tool

Requires a compatible Chat Completion backend. See [Function Calling](https://docs.sillytavern.app/for-contributors/function-calling/) for more information.

To roll the dice, just ask for it. For example:

```txt
Roll a d20
Roll 4d6 and keep the highest 3
Roll a d20 and reroll any 1s
Roll some fudge dice
```

### Via the wand menu

A set of classic D&amp;D dice for all your dice rolling needs. Dice rolls are just for show and are not visible in AI prompts.

1. Open the wand menu.
2. Click on the "Roll Dice" item.
3. Select the dice you want to roll:
   - Standard dice (d4, d6, d8, d10, d12, d20, d100)
   - Fudge/Fate dice (dF)
   - Target Roll (for success/failure counting)
   - Custom Formula (for advanced dice notation)

### Via slash commands

You can use the `/roll` or `/r` slash command to roll dice directly in the chat:

```txt
/roll 2d6       # Roll two 6-sided dice
/r 1d20+5       # Short alias for roll command
/roll 3d8 quiet:true  # Roll dice without displaying in chat
```

## Advanced Dice Notation

This extension supports advanced dice notation using the [RPG Dice Roller](https://dice-roller.github.io/documentation/) library. Below is a comprehensive guide to all supported notation types.

### Basic Dice Notation

```
NdS
```

Where:
- `N` is the number of dice to roll (optional, defaults to 1 if omitted)
- `d` is the delimiter indicating a die roll
- `S` is the number of sides on each die

Examples:
- `d6` - Roll a single 6-sided die
- `2d20` - Roll two 20-sided dice
- `4d6` - Roll four 6-sided dice

### Special Dice Types

```
d%    # Percentile die (d100)
dF    # Fudge/Fate die (-1, 0, or +1)
```

Examples:
- `d%` - Roll a percentile die (1-100)
- `4dF` - Roll four Fudge/Fate dice

### Arithmetic Modifiers

```
NdS+X   # Add X to the result
NdS-X   # Subtract X from the result
NdS*X   # Multiply the result by X
NdS/X   # Divide the result by X
```

Examples:
- `1d20+5` - Roll a d20 and add 5
- `2d6-1` - Roll 2d6 and subtract 1
- `3d10*2` - Roll 3d10 and multiply by 2
- `4d6/2` - Roll 4d6 and divide by 2

### Keep/Drop Dice

```
NdSkH   # Keep highest H dice
NdSkL   # Keep lowest L dice
NdSdH   # Drop highest H dice
NdSdL   # Drop lowest L dice
```

Examples:
- `4d6k3` - Roll 4d6 and keep the highest 3 (common for D&D ability scores)
- `2d20kh1` - Roll 2d20 and keep the highest (advantage in D&D 5e)
- `2d20kl1` - Roll 2d20 and keep the lowest (disadvantage in D&D 5e)
- `5d10d2` - Roll 5d10 and drop the lowest 2

### Exploding Dice

```
NdS!    # Explode on maximum value
NdS!X   # Explode on value X
NdS!>X  # Explode on values greater than X
NdS!<X  # Explode on values less than X
```

Examples:
- `3d6!` - Roll 3d6, and for each 6, roll an additional d6
- `3d6!5` - Roll 3d6, and for each 5 or 6, roll an additional d6
- `3d6!>4` - Roll 3d6, and for each result greater than 4, roll an additional d6

### Compounding Exploding Dice

```
NdS!!    # Compound on maximum value
NdS!!X   # Compound on value X
NdS!!>X  # Compound on values greater than X
NdS!!<X  # Compound on values less than X
```

Examples:
- `3d6!!` - Roll 3d6, and for each 6, roll another d6 and add to the same die

### Penetrating Exploding Dice

```
NdS!p    # Penetrate on maximum value
NdS!pX   # Penetrate on value X
NdS!p>X  # Penetrate on values greater than X
NdS!p<X  # Penetrate on values less than X
```

Examples:
- `3d6!p` - Roll 3d6, and for each 6, roll another d6 and subtract 1 from the result

### Rerolling Dice

```
NdSr    # Reroll on minimum value
NdSrX   # Reroll on value X
NdSr>X  # Reroll on values greater than X
NdSr<X  # Reroll on values less than X
```

Examples:
- `3d6r` - Roll 3d6 and reroll any 1s once
- `3d6r2` - Roll 3d6 and reroll any 1s or 2s once
- `3d6r<3` - Roll 3d6 and reroll any values less than 3 once

### Rerolling Dice Repeatedly

```
NdSrr    # Reroll repeatedly on minimum value
NdSrrX   # Reroll repeatedly on value X
NdSrr>X  # Reroll repeatedly on values greater than X
NdSrr<X  # Reroll repeatedly on values less than X
```

Examples:
- `3d6rr` - Roll 3d6 and reroll any 1s until no more 1s appear
- `3d6rr<3` - Roll 3d6 and reroll any values less than 3 until no more appear

### Target Success/Failure Counting

```
NdSt[X]   # Target success (count values >= X)
NdSf[X]   # Target failure (count values <= X)
```

Examples:
- `6d10t[8]` - Roll 6d10 and count successes (values >= 8)
- `6d10f[2]` - Roll 6d10 and count failures (values <= 2)

### Group Rolls

```
{2d6, 1d8}   # Roll multiple dice groups
{2d6, 1d8}k1 # Roll multiple dice groups and keep highest group
```

Examples:
- `{2d6, 1d8}` - Roll 2d6 and 1d8 as separate groups
- `{2d6, 1d8}k1` - Roll 2d6 and 1d8 and keep the highest group

### Roll Descriptions

```
[description] 2d6   # Add a description to a roll
```

Examples:
- `[attack] 1d20+5` - Roll 1d20+5 with the description "attack"
- `[damage] 2d6+3` - Roll 2d6+3 with the description "damage"

### Combining Modifiers

You can combine these modifiers for complex dice expressions:

```
4d6k3+2        # Roll 4d6, keep highest 3, add 2
2d20r<2kh1     # Roll 2d20, reroll 1s, keep highest (super advantage)
3d6!+1d8       # Roll 3d6 with explosions, plus 1d8
6d10t[8]       # Roll 6d10 and count successes (World of Darkness style)
{2d6!!, 1d8!}k1 # Roll exploding 2d6 and exploding 1d8, keep highest group
```

## Detailed Roll Information

When using advanced dice notation, the extension will display detailed information about the roll:

- For keep/drop modifiers: Shows which dice were kept and which were dropped
- For reroll modifiers: Shows which dice were rerolled
- For exploding dice: Shows which dice exploded
- For target success/failure: Shows the number of successes/failures

This helps players understand exactly how the final result was calculated.

## Powered by RPG Dice Roller

This extension uses the [RPG Dice Roller](https://dice-roller.github.io/documentation/) library for advanced dice notation support. For more information about the library and its features, visit the [documentation](https://dice-roller.github.io/documentation/).

RPG Dice Roller is licensed under the MIT License.

Credits: 
- Based on the original extension Extension-Dice by Cohee#1207, but enhanced with additional features and the RPG Dice Roller library.
- RPG Dice Roller library © 2018-2024 Lee Langley, licensed under MIT License.

## License

This extension is licensed under the AGPL-3.0 license. Note that this license applies to the extension code only. The RPG Dice Roller library used by this extension is licensed separately under the MIT License.
