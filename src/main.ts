import './style.css';
import * as THREE from 'three';
import { CalciumField } from './objects/CalciumField';
import { ExocytosisSystem } from './objects/ExocytosisSystem';
import { GranuleSystem } from './objects/GranuleSystem';
import { MicrotubuleNetwork } from './objects/MicrotubuleNetwork';
import { createBetaCellShell } from './objects/betaCellShell';
import { createGolgiRegion } from './objects/golgiRegion';
import { createMembraneRing } from './objects/membraneRing';
import { createNucleus } from './objects/nucleus';
import { createSceneContext } from './scene/createSceneContext';
import { createSceneInfo, createSceneNote, createStimulationControl, getAppMount } from './utils/dom';

const { scene, camera, renderer, controls } = createSceneContext(getAppMount());

scene.add(createBetaCellShell());
scene.add(createNucleus());
scene.add(createGolgiRegion());
scene.add(createMembraneRing());

const calciumField = new CalciumField();
scene.add(calciumField);

const microtubules = new MicrotubuleNetwork();
scene.add(microtubules);

const exocytosis = new ExocytosisSystem();
scene.add(exocytosis);

const granules = new GranuleSystem(undefined, microtubules);
granules.setExocytosisEventHandler((event) => {
  exocytosis.trigger(event);
});
scene.add(granules);

createSceneNote();
const sceneInfo = createSceneInfo(granules.getCount());
sceneInfo.updateStateCounts(granules.getStateCounts());
createStimulationControl(0.15, (value) => {
  granules.setStimulationLevel(value);
  calciumField.setStimulationLevel(value);
});

const clock = new THREE.Clock();
let statusElapsed = 0;

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);
  statusElapsed += deltaTime;

  granules.update(deltaTime);
  calciumField.update(deltaTime);
  exocytosis.update(deltaTime);
  if (statusElapsed >= 0.5) {
    sceneInfo.updateStateCounts(granules.getStateCounts());
    statusElapsed = 0;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
