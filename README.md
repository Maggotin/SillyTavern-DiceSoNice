# SillyTavern-DiceSoNice

A comprehensive dice rolling extension for SillyTavern with support for standard and advanced dice notation, powered by the [RPG Dice Roller](https://dice-roller.github.io/documentation/) library.

## How to install

Install: Extensions → Install extension → paste this URL:

https://github.com/Maggotin/SillyTavern-DiceSoNice

## How to use

This extension provides four ways to roll dice, each suited for different situations:

| Method | Best for | Output |
|---|---|---|
| `{{roll}}` / `{{dice}}` macro | Embedding results in prompts, cards, STscript | Number only |
| `/roll` slash command | Rolling in chat with configurable send mode | Full breakdown in chat |
| Function tool | AI-triggered rolls during conversation | Result returned to AI |
| Wand menu | Quick manual rolls via UI with send mode picker | Full breakdown in chat |
| Roll history | Reviewing past rolls | Floating panel |

### `{{roll}}` / `{{dice}}` macro

Requires the **Experimental Macro Engine** (User Settings > Chat/Message Handling).

This extension overrides SillyTavern's built-in `{{roll}}` macro (which uses the limited `droll` library) with the full [RPG Dice Roller](https://dice-roller.github.io/documentation/) engine. `{{dice}}` is an alias that works identically. Use either — they share the same handler.

Use anywhere macros work — character cards, prompt templates, STscript, etc. Returns just the numeric result.

```txt
{{roll 1d20}}          → e.g. 14
{{roll 4d6kh3}}        → e.g. 13
{{roll 2d20kh1}}       → e.g. 17
{{roll 1d20+5}}        → e.g. 19
{{roll 3d6!}}          → e.g. 22
{{roll 5d10>=8}}       → e.g. 2
{{roll 6}}             → e.g. 4 (shorthand for 1d6)
```

`{{dice ...}}` works exactly the same way for all of the above.

**In a character card or prompt:**

```txt
{{char}} swings their sword. The attack roll is {{roll 1d20+5}} against AC 15.
They deal {{roll 2d6+3}} slashing damage.
```

**In STscript:**

```stscript
/setvar key=attack {{roll 1d20+5}}
/setvar key=damage {{roll 2d6+3}}
/sys {{char}} rolls {{getvar::attack}} to hit and deals {{getvar::damage}} damage.
```

### `/roll` slash command

Rolls dice and posts the result in chat with a full breakdown. Named arguments must come before the formula.

```txt
/roll 2d6                              Roll two 6-sided dice
/r 1d20+5                              Short alias
/roll 4d6kh3                           Roll 4d6, keep highest 3
/roll 2d6+3 # Fire damage              Roll with a description label
/roll send=sys 1d20+5                  Roll as narrator (visible to LLM, triggers response)
/roll send=user desc="Attack" 1d20+5   Roll as user with a label
/roll send=none 2d6                    Roll quietly (no chat message)
```

#### Send modes

Control how the roll result appears in chat and whether the LLM can see it:

| Mode | Chat appearance | LLM sees it? | Auto-triggers response? |
|------|----------------|-------------|------------------------|
| `smallsys` | Small system message (default) | No | No |
| `sys` | Narrator message | Yes | Yes |
| `char` | Character message | Yes | No |
| `user` | User message | Yes | Yes |
| `none` | No message | No | No |

#### Named arguments

| Argument | Description |
|----------|-------------|
| `send=` | Send mode (see above). Default: `smallsys` |
| `desc=` | Label for the roll, e.g. `desc="Attack Roll"` |
| `quiet=` | Legacy — same as `send=none`. Default: `false` |

The `/roll` command shows detailed output including which dice were kept, dropped, exploded, etc. Use `send=none` or `quiet=true` to suppress the chat message and just get the value (useful in STscript pipelines).

**STscript with /roll:**

```stscript
/roll send=none 1d20+5 | /setvar key=attack
/roll send=none 2d6+3 | /setvar key=damage
/sys Attack: {{getvar::attack}}, Damage: {{getvar::damage}}
```

### Function tool (AI integration)

Requires a compatible Chat Completion backend. See [Function Calling](https://docs.sillytavern.app/for-contributors/function-calling/) for more information. Enable in the extension settings.

The AI can trigger dice rolls during conversation. Just ask naturally:

```txt
Roll a d20
Roll 4d6 and keep the highest 3
Roll a d20 and reroll any 1s
Roll some fudge dice
```

### Wand menu

A visual dice builder in the extensions wand menu.

1. Open the wand menu and click "Roll Dice".
2. Build a formula using the dice type buttons, modifiers, and D&D presets — or type directly into the formula field.
3. Optionally add a description and choose a **Send As** mode (Private, Narrator, Character, User, or Quiet).
4. Click **Roll** or press **Enter**.

The send mode selection persists across rolls while the menu is open.

### Roll history

A floating scroll icon appears in the bottom-left corner of the screen. Click it to open a panel showing your recent rolls (up to 50) in reverse chronological order.

Each entry shows the timestamp, send mode, formula, description, result total, and full breakdown. Use the trash icon to clear the history. Roll history is in-memory only and clears on page reload.

---

## Dice Notation Reference

All notation below works with every method (`{{dice}}`, `/roll`, function tool, wand menu). This extension uses the [RPG Dice Roller](https://dice-roller.github.io/documentation/) library — the full library documentation is available [here](https://dice-roller.github.io/documentation/guide/notation/dice.html).

### Basic Rolls

```
NdS       N dice with S sides (N defaults to 1)
```

```
d6        Roll a single 6-sided die
2d20      Roll two 20-sided dice
4d6       Roll four 6-sided dice
d%        Percentile die (same as d100)
4dF       Four Fudge/Fate dice (-1, 0, or +1 each)
dF.1      Fudge variant (4 blanks, 1 plus, 1 minus)
```

### Arithmetic & Math Functions

```
1d20+5       Add 5
2d6-1        Subtract 1
3d10*2       Multiply by 2
4d6/2        Divide by 2
3d20**4      Exponent (power of 4)
d15%2        Modulus (remainder)
(1d6+2)*3    Parenthesis for order of operations
(4-2)d10     Use math to determine number of dice
3d(2*6)      Use math to determine die sides
```

Math functions: `abs`, `ceil`, `cos`, `exp`, `floor`, `log`, `max`, `min`, `pow`, `round`, `sign`, `sin`, `sqrt`, `tan`

```
round(4d10/3)    Round the result
floor(2d6/2)     Round down
ceil(3d8/2)      Round up
abs(2d6-10)      Absolute value
max(2d6, 2d8)    Higher of two rolls
min(4d10, 3d12)  Lower of two rolls
```

### Min / Max Modifiers

```
4d6min3      Any roll below 3 counts as 3
4d6max3      Any roll above 3 counts as 3
```

### Exploding Dice

When a die hits the trigger value, roll another die and add it.

```
3d6!         Explode on max (6): [4, 6!, 6!, 2] = 18
3d6!!        Compound — add re-rolls to same die: [4, 14!!] = 18
3d6!p        Penetrate — subtract 1 from re-rolls: [6!p, 5!p, 3, 1] = 15
3d6!!p       Compound + penetrate
```

With [compare points](#compare-points):

```
3d6!>=5      Explode on 5 or 6
3d6!!>4      Compound on rolls > 4
3d6!p=6      Penetrate only on 6
```

### Re-roll

Discard the roll and roll again. `r` keeps re-rolling, `ro` re-rolls once.

```
d6r          Re-roll 1s until no 1s remain
d6ro         Re-roll 1s once (may still be a 1)
3d6r<3       Re-roll anything less than 3, repeatedly
3d6ro<=2     Re-roll values ≤ 2, once each
```

### Unique

Re-roll duplicates until all dice show different values.

```
4d6u         All four must be unique
4d6uo        Re-roll duplicates once (may still have dupes)
4d6u=5       Only re-roll duplicates that equal 5
```

### Keep / Drop

```
4d6k3        Keep highest 3 (D&D ability scores)
4d6kh3       Keep highest 3 (explicit)
2d20kh1      Keep highest (D&D advantage)
2d20kl1      Keep lowest (D&D disadvantage)
4d10d1       Drop lowest 1
4d10dl2      Drop lowest 2 (explicit)
4d10dh1      Drop highest 1
4d10dh1dl1   Drop highest and lowest (trimmed average)
```

### Target Success (Dice Pool)

Count how many dice meet a condition instead of summing values:

```
5d10>=8      Count rolls ≥ 8 (World of Darkness): [2, 4, 6*, 3, 8*] = 2
4d6>4        Count rolls > 4: [1, 3, 5*, 6*] = 2
6d10>=6      Count successes (Shadowrun style)
2d6=6        Only 6s count: [4, 6*] = 1
```

### Target Failure

Must follow a success target. Each failure subtracts 1 from the success count:

```
4d6>4f<3     Rolls > 4 are successes, rolls < 3 subtract: [2_, 5*, 4, 5*] = 1
```

### Critical Success / Failure

Visual markers only — no effect on values:

```
2d20cs         Highlight natural 20s as critical success
2d20cf         Highlight natural 1s as critical failure
4d10cs>7cf<3   Highlight 8+ as crit success, ≤ 2 as crit failure
```

### Sorting

```
4d6s         Sort ascending: [1, 3, 4, 5]
4d6sa        Sort ascending (explicit)
4d6sd        Sort descending: [5, 4, 3, 1]
```

### Group Rolls

Roll multiple expressions as separate groups:

```
{2d6, 1d8}       Roll groups separately, sum totals
{2d6, 1d8}k1     Keep the group with the highest total
{2d6, 1d8}d1     Drop the group with the lowest total
{4d6+2d8, 3d20+3, 5d10+1}>40   Count groups totaling > 40 as successes
```

### Roll Descriptions

Add a label **after** the dice notation. Descriptions are not parsed as notation.

**Inline** — use `#` or `//` after the roll:

```
4d6 # Fire damage
2d10 // Ice damage
4d6dl2 // Drop the lowest two
```

**Block** — use `[ ... ]` or `/* ... */` after the roll:

```
1d20+5 [attack]
2d6+3 [damage]
1d20+2 /* saving throw */
{4d6, 2d10} /* multiple damage types */
```

Anything inside a description is ignored: `2d10 // bonus 2d10! / 3` won't parse the extra dice.

### Compare Points

Used by exploding, re-roll, unique, target, and critical modifiers:

```
=X       Equal to X
!=X      Not equal to X
<>X      Not equal to X (alternative — required with exploding, see below)
>X       Greater than X
<X       Less than X
>=X      Greater than or equal to X
<=X      Less than or equal to X
```

**`!=` trap with exploding dice:** `2d6!!=4` looks like "explode on not-4" but actually creates a compound roll on 4. Use `<>` instead:

```
2d6!!=4      WRONG — this compounds on 4
2d6!<>4      Correct — explode on any value that isn't 4
```

**Target after compare-point modifiers:** A target compare point can't directly follow a modifier that already uses one, because it'll be read as part of that modifier:

```
2d6!>3       Means: explode on rolls > 3 (NOT "target > 3 with exploding")
2d6>3!       Correct: target success > 3, explode on max
2d6>3!<4     Target success > 3, explode on rolls < 4
```

### Combining Modifiers

Modifiers run in a fixed order regardless of notation order:

```
4d6kh3+2          Keep highest 3, add 2
2d20ro<2kh1       Re-roll 1s once, keep highest (super advantage)
3d6!+1d8          Exploding 3d6, plus 1d8
5d10>=8           Count successes ≥ 8 (World of Darkness)
4d6min3kh3        Min value 3, keep highest 3
4d10cs>7cf<3sd    Mark crits, sort descending
{2d6!!, 1d8!}k1   Exploding groups, keep highest
```

**Modifier execution order:** min → max → explode/compound/penetrate → re-roll → unique → keep → drop → target success → target failure → critical success → critical failure → sorting

---

## Powered by RPG Dice Roller

This extension uses the [RPG Dice Roller](https://dice-roller.github.io/documentation/) library for dice notation. For the complete notation reference, visit the [documentation](https://dice-roller.github.io/documentation/).

RPG Dice Roller is licensed under the MIT License.

Credits:
- Based on the original Extension-Dice by Cohee#1207, enhanced with the RPG Dice Roller library.
- RPG Dice Roller library © 2018-2024 Lee Langley, licensed under MIT License.

## License

This extension is licensed under the AGPL-3.0 license. The RPG Dice Roller library is licensed separately under the MIT License.
