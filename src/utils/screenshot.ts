import * as THREE from 'three';

const defaultScreenshotFilename = 'insulin-granule-demo-screenshot.png';

export function saveRendererScreenshot(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  filename = defaultScreenshotFilename
): void {
  renderer.render(scene, camera);

  renderer.domElement.toBlob((blob) => {
    if (!blob) {
      console.warn('Unable to export screenshot from the WebGL canvas.');
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }, 'image/png');
}
