# Graphics and typography evidence

Prepared on 2026-10-10 for the Korean single-player factory roguelike.

## Delivered assets

| File | Size | Details |
| --- | ---: | --- |
| `assets/factory-terrain.png` | 2,991,887 bytes | 1672 × 941 px, generated landscape bitmap |
| `assets/fonts/NotoSansKR-Variable.woff2` | 3,908,448 bytes | Complete Noto Sans KR variable font; weight 100–900 |
| `assets/fonts/OFL.txt` | 4,388 bytes | Original SIL Open Font License 1.1 from the official font directory |

## Landscape provenance and inspection

- Generated with the built-in `image_gen` tool. No external paid CLI/API fallback was used.
- Original generated file: `/home/sypark/.codex/generated_images/01a126ed-efa4-7593-ae68-efd38cc94fd2/exec-40b2a3de-25c7-40f5-bb5d-59b9df45016d.png`.
- The original was copied unchanged into the project. No third-party game artwork was used as input.
- SHA-256: `e85f766dae21673ac17f4ac13697a812e424a89f71ce35c83688c8635cb32b96`.
- Visually inspected the generated image: muted blue ore at the left, mossy green ground near the middle/top, rust-red desert at the right, and ruined industrial structures limited to the perimeter. The large dark central construction area remains empty.
- The bitmap contains no text, UI panels, grid, labels, characters, or central machines. Interactive machines and grid belong to the application layer.
- The image is nearly 16:9. Its center should remain aligned with the build area when cropped.

### Final generation prompt

```text
Use case: stylized-concept
Asset type: original wide landscape background for a polished Korean single-player factory-building roguelike game, behind real interactive vector machines.
Primary request: a top-down 2D illustrated industrial wasteland at dusk, atmospheric richly textured pixel-art game terrain. The left zone contains sparse muted blue-gray ore flecks and slate rubble; the middle zone has desaturated mossy green bio-lab ground; the right zone transitions naturally into a subdued reddish rust desert. Reserve a very large clear dark central build space, about 65 percent of the image, with only subtle organic ground texture. Scenic distant ruined factory silhouettes, pipes, old metal walls and tiny amber glows are allowed only along the extreme outer edges and corners.
Style/medium: refined hand-crafted pixel-art game environment, crisp tiny pixel clusters, restrained dramatic lighting, no painted blur, high detail at the borders and quiet usable detail in the center.
Composition/framing: landscape 16:9, flat orthographic bird's-eye top-down camera, no horizon line, no sky. All ground on one flat plane, wide open central rectangle without any structures or obstructions; soft vignette at perimeter.
Lighting/mood: twilight industrial atmosphere, dark graphite ground, warm amber ember accents at edges, subtle teal bioluminescence near left outer edge, gentle dusty haze at corners.
Constraints: absolutely no text, letters, numbers, logos, watermark, UI, interface panels, grid lines, tiles, icons, labels, arrows, characters, prominent vehicles, conveyor belts or machines in the central area. Do not create a fake screenshot. The map must remain readable with user-built colorful vector factory machines overlaid later.
```

## Font provenance and executed checks

- Official source repository: https://github.com/google/fonts/tree/main/ofl/notosanskr
- Downloaded full variable TTF: https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf
- Downloaded license: https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/OFL.txt
- GitHub API reported latest source-font change at commit `4efc2774c63917927efe769ca845def6bd6debae` (2022-12-09).
- Compressed the official 10,414,588-byte TTF to WOFF2 with FontTools and Brotli, preserving the complete character map and variable font axis. Removed the redundant TTF after verification; no system fonts were installed and no runtime font CDN is required.
- Executed FontTools checks: 23,174 Unicode code points; variable `wght` axis 100–900; Korean sample `공장생산전력건설연구철광석클론인간복제체벨트소환설치이동선택해제` fully covered; reopening the WOFF2 preserves the character-map count.
- These are file/coverage checks. Browser rendering and the application's actual font assignment must be verified by the integration owner.

### Integration CSS

Use the following from the project-root stylesheet, or use its equivalent in inline CSS:

```css
@font-face {
  font-family: "Noto Sans KR";
  src: url("./assets/fonts/NotoSansKR-Variable.woff2") format("woff2");
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}
```

Set Korean UI text to `font-family: "Noto Sans KR", sans-serif;`. For Canvas-rendered Korean text, wait for `document.fonts.load('500 16px "Noto Sans KR"')` before the first definitive render, or redraw when it resolves.
