# Insulin Granule Demo

A schematic Three.js visualization of insulin secretory granules maturing, transporting, docking, priming, and fusing in a simplified pancreatic beta-cell.

## Screenshot

Screenshot placeholder:

![Insulin granule schematic screenshot](docs/screenshot-placeholder.png)

## Run Locally

```bash
npm install
npm run dev
npm run build
```

## Biological Narrative

1. Insulin granules mature near the Golgi region.
2. A subset undergoes transport along schematic microtubule-like paths.
3. Granules dock and prime near the plasma membrane, with a schematic secretion-pole region.
4. Calcium stimulation increases fusion probability.
5. Fusion events release schematic insulin signal particles.

## Scientific Caveat

This is a schematic visualization, not a quantitative simulation, and not to scale.

## Technical Stack

- Vite
- TypeScript
- Three.js
- `InstancedMesh` for granule and particle rendering

## Current Limitations

- Not anatomically exact
- Not quantitatively calibrated
- No real microscopy input yet
- No Blender assets yet

## Future Work

- Blender GLB organelles
- Labels
- Secretion-pole refinement
- Published GitHub Pages demo
