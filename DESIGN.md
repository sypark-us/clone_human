---
name: Clone Human
description: Korean factory roguelike in an industrial wasteland at dusk
colors:
  background: "#10191b"
  panel: "#182426"
  raised: "#202e30"
  line: "#354443"
  text: "#e8e8da"
  muted: "#a2b0aa"
  gold: "#dbba79"
  green: "#a7c9a1"
  rust: "#e0a185"
typography:
  display:
    fontFamily: "Noto Sans KR, sans-serif"
    fontSize: "clamp(30px, 3vw, 45px)"
    fontWeight: 750
    lineHeight: 1.4
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Noto Sans KR, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Noto Sans KR, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
rounded:
  control: "4px"
  panel: "6px"
  dialog: "7px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "#172021"
    rounded: "{rounded.control}"
    padding: "11px 21px"
  button-primary-hover:
    backgroundColor: "#eccd91"
  button-secondary:
    backgroundColor: "#263632"
    rounded: "{rounded.control}"
    padding: "11px 21px"
---

# Clone Human design system

## Overview

The implemented world is an industrial wasteland at dusk: dark mineral ground, mossy cultivation areas, rusted edges, illuminated machine markings, and restrained gold controls. The factory itself carries the visual interest. Operational panels use compact Korean typography, quiet borders, and clear selected states.

This document records the built interface in `styles.css`, `index.html`, `js/map.js`, and `js/app.js`; it does not introduce a new direction.

## Colors

Graphite-teal backgrounds and slightly lighter panels form the base. Warm off-white carries primary text; green-tinted muted text carries supporting information. Gold marks the main action, selection, current wave, and resource emphasis. Green supports production and success; rust supports enemy and warning states.

Terrain moves from cool ore at the left through muted green in the middle to reddish desert at the right. Machine drawings use a consistent dark chassis with module-specific colored symbols; identity is also supplied by icons, names, and slot numbers.

## Typography

Use the self-hosted Noto Sans KR variable font at `assets/fonts/NotoSansKR-Variable.woff2`, weights 100–900. Korean is the interface language. Resource and combat numbers use tabular numerals.

The welcome heading is the largest text, reducing to 31px on phones. Mission headings use 27px desktop/23px mobile; panel headings use 13–16px. Body defaults to 14px desktop/13px mobile, while compact descriptions use 10–12px and map/rack labels use 8–10px. Preserve explicit text names alongside machine symbols.

## Layout

The game container is capped at 1540px with 32px desktop side padding. Desktop gameplay uses a flexible factory column and a 300px management sidebar separated by 26px. At 1120px the sidebar narrows to 270px; at 850px the game becomes one main column. At 600px, page padding becomes 12px and management sections stack.

The welcome screen pairs a terrain scene with the starting-build form. On phones, the 230px-high scene sits above the heading and form. Three recommended starts are visible; three additional starts are behind a native disclosure.

The map is a 12×7 world with three four-column terrain zones. Its mobile minimum width is 570px and it scrolls inside its viewport to preserve cell targets. A mobile caption explains horizontal swiping; the scale reset is labeled `기본 배율`. The production rack retains eight ordered slots. The command bar stays near the bottom of the viewport while the document scrolls.

## Elevation & Depth

Panels use tonal separation and thin borders. Shadows are reserved for elevated commands, dialogs, toasts, and machinery. The command bar uses a downward soft shadow (`0 9px 30px #0006`); dialogs use a broader shadow (`0 20px 70px #0009`). Machine illustrations combine an authored perspective chassis with a ground shadow.

## Shapes

Controls have restrained 4px corners, panels approximately 5–6px, and dialogs 7px. One-pixel borders organize dense information. Wave markers are small circles; machine pads and offer controls remain compact rectangles. The terrain stays organic underneath the regular build grid.

## Components

- **Primary action:** gold fill, dark text, at least 45px tall. The command label follows game phase: start, pause, resume, next wave, or restart. Disabled controls fade to 40% opacity.
- **Secondary and quiet controls:** muted green surfaces or transparent surfaces with thin borders. Hover brightens the surface; keyboard focus uses a 2px gold outline with 4px offset.
- **Factory map:** bitmap terrain beneath a subtle grid, vector belts, module drawings, slot numbers, and short names. Gold outlines show selection. Empty pads are visibly distinct from machines. Belts animate only while production runs.
- **Production and choices:** eight-slot rack, three module offers, two route choices, and an inspector repeat the same machine artwork and labels. Selected loadouts and slots use gold borders with olive-tinted fill.
- **Combat:** authored clone and enemy drawings, a compact health track, turn count, and damage report connect the factory to battle outcomes. Motion uses conveyor flow, active-machine movement, and projectiles; reduced-motion preferences disable animations and transitions.
- **Guidance and status:** a native help dialog, inline build instruction, phase message, toast, local-save status, and expandable combat log explain available actions. A save failure produces a persistent sticky warning above either screen at every width, with a one-time toast on entering failure; successful saves clear it. The warning uses warm rust-brown fill with pale cream text. Music and effects have independent labeled toggles.
- **Browser surfaces:** selection colors, thin themed scrollbars, native dark controls, and visible keyboard focus extend the same palette.

## Do's and Don'ts

- Do preserve the industrial-dusk palette, Korean copy, terrain zones, and matching vector machine family.
- Do keep meaningful actions and state in real HTML/SVG controls above the decorative bitmap.
- Do use slot numbers, names, outlines, and icons together; color alone does not identify machines or selection.
- Do retain mobile map scrolling and provide truthful scale/navigation labels.
- Don't embed interface text or controls in the background artwork.
- Don't shrink the entire map to phone width if that makes build cells difficult to tap.
