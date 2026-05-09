import './style.css';
import * as THREE from 'three';
import { granuleCount } from './biology/betaCellModel';
import { GranuleSystem } from './objects/GranuleSystem';
import { createBetaCellShell } from './objects/betaCellShell';
import { createGolgiRegion } from './objects/golgiRegion';
import { createMembraneRing } from './objects/membraneRing';
import { createNucleus } from './objects/nucleus';
import { createSceneContext } from './scene/createSceneContext';
import { createSceneInfo, createSceneNote, getAppMount } from './utils/dom';

const { scene, camera, renderer, controls } = createSceneContext(getAppMount());

scene.add(createBetaCellShell());
scene.add(createNucleus());
scene.add(createGolgiRegion());
scene.add(createMembraneRing());

const granules = new GranuleSystem();
scene.add(granules);

createSceneNote();
createSceneInfo(granuleCount);

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);

  granules.update(deltaTime);
  controls.update();
  renderer.render(scene, camera);
}

animate();
