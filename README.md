# Insulin Granule Demo

A schematic Three.js visualization of insulin secretory granules maturing, transporting, docking, priming, and fusing in a simplified pancreatic beta-cell.

Live demo: https://do-shima.github.io/insulin-granule-demo/

## Screenshot

![Insulin granule schematic screenshot](docs/screenshot-overview.png)

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

## Implemented Features

- Guided story mode
- Visual control panel
- Toggleable schematic labels and camera presets
- Schematic ER and mitochondria
- Schematic fusion event counter
- Demo-only scientific disclaimer

## Scientific Caveat

This is a schematic visualization, not a quantitative simulation, and not to scale.

Educational demo only. This visualization does not represent real insulin secretion kinetics, secretion rates, granule densities, or quantitative calcium-dependent dynamics. The animation is not a real secretion model: granule state transitions are illustrative, calcium stimulation changes event probability only for demonstration, displayed fusion events are not secretion rates, and granule densities, timing, and spatial localization are not calibrated to experimental data.

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
- Secretion-pole refinement
