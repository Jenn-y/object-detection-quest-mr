import * as THREE from "three";
import { XRButton } from "three/addons/webxr/XRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";


const api = "https://10ee-161-3-42-237.ngrok-free.app";

let camera, scene, renderer, roi, loadingText, noObjectsText, bigbb;
let controller1, controllerGrip1;
const roiGroup = new THREE.Group();
      
const socket = io(api, {
  transports: ["polling"],
  extraHeaders: {
    "ngrok-skip-browser-warning": true,
  },
});
const scalingFactorWidth = 1032 / 1723 / 2055;
const scalingFactorHeight = 817.78 / 1276 / 2000;
let zOffset;

socket.on("new_prediction", (data) => {
  console.log("Received new prediction data");
  visualizeBoundingBoxes(data);
});

let font;
const loader = new FontLoader();
loader.load(
  "https://unpkg.com/three@0.159.0/examples/fonts/helvetiker_regular.typeface.json",
  function (response) {
    font = response;
    loadingText = createTextMesh(font, "Object detection in progress..", 0.015, 0x0B4F71); 
    loadingText.position.set(-0.13, 0.03, -0.3);
    loadingText.visible = false;
    noObjectsText = createTextMesh(font, "- No objects detected -", 0.015, 0x0B4F71); 
    noObjectsText.position.set(-0.13, 0.03, -0.3);
    noObjectsText.visible = false;
    init();
  }
);

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd9e2ec);

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.2, 0.3);

  scene.add(new THREE.HemisphereLight(0xcccccc, 0x999999, 3));

  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(0, 6, 0);
  light.castShadow = true;
  light.shadow.camera.top = 2;
  light.shadow.camera.bottom = -2;
  light.shadow.camera.right = 2;
  light.shadow.camera.left = -2;
  light.shadow.mapSize.set(4096, 4096);
  scene.add(light);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  renderer.xr.cameraAutoUpdate = false;

  container.appendChild(renderer.domElement);

  const sessionInit = {
    requiredFeatures: ["hand-tracking"],
    optionalFeatures: ["depth-sensing"],
    depthSensing: {
      usagePreference: ["gpu-optimized"],
      dataFormatPreference: [],
    },
  };

  document.body.appendChild(XRButton.createButton(renderer, sessionInit));

  // controllers
  controller1 = renderer.xr.getController( 0 );
  scene.add( controller1 );

  controller1.addEventListener('connected', (event) => {
    controller1.gamepad = event.data.gamepad;
    console.log('Right controller connected');
  });

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
  scene.add(controllerGrip1);
  
  roi = drawROIBox();
  roi.add(loadingText);
  roi.add(noObjectsText);
  bigbb = drawInvisibleROI({ minX: 0, minY: 0, maxX: 0.5, maxY: 0.37 }, -0.35, 0)
  roi.add(bigbb);
  bigbb.visible = false;
    
  zOffset = roi.position.z - 0.05;
  scene.add(roi);

  const menuGeometry = new THREE.PlaneGeometry(1.1, 0.65);
  const menuMaterial = new THREE.MeshPhongMaterial({ color: 0x000000, opacity: 0.8, transparent: true});
  const menuMesh = new THREE.Mesh(menuGeometry, menuMaterial);
  menuMesh.position.set(-0.02, 1.57, -1);

  const welcomeText = createTextMesh(font, "Instructions", 0.04);
  welcomeText.position.set(-0.5, 0.25, 0.01);
  menuMesh.add(welcomeText);

  const instructionText1 = createTextMesh(font, "You will perform object identification in mixed reality.", 0.02);
  instructionText1.position.set(-0.5, 0.15, 0.01);
  menuMesh.add(instructionText1);

  const instructionText2 = createTextMesh(font, "Find objects in your environment and look at them through the box view.", 0.02);
  instructionText2.position.set(-0.5, 0.1, 0.01);
  menuMesh.add(instructionText2);

  const aButtonText = createTextMesh(font, "Press                 button to identify objects.", 0.02);
  aButtonText.position.set(-0.5, 0, 0.01);
  menuMesh.add(aButtonText);

  const bButtonText = createTextMesh(font, "Press                 button to clear the view.", 0.02);
  bButtonText.position.set(-0.5, -0.1, 0.01);
  menuMesh.add(bButtonText);

  const triggerText = createTextMesh(font, "Hold and release the right trigger to display instructions.", 0.02);
  triggerText.position.set(-0.5, -0.2, 0.01);
  menuMesh.add(triggerText);

  const noteText = createTextMesh(font, "NOTE: Do not move while the object detection is in progress.", 0.02);
  noteText.position.set(-0.5, -0.25, 0.01);
  menuMesh.add(noteText);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('./assets/Oculus_A.png', function (texture) {
    const aButtonIcon = createIconMesh(texture, 0.08);
    aButtonIcon.position.set(-0.37, 0.01, 0.01);
    menuMesh.add(aButtonIcon);
  });

  textureLoader.load('./assets/Oculus_B.png', function (texture) {
    const bButtonIcon = createIconMesh(texture, 0.08);
    bButtonIcon.position.set(-0.37, -0.09, 0.01);
    menuMesh.add(bButtonIcon);
  });
  
  menuMesh.visible = false;
  scene.add(menuMesh);

  controller1.addEventListener('selectstart', function () {
    menuMesh.visible = true;
  });
  controller1.addEventListener('selectend', function () {
    menuMesh.visible = false;
  });

  window.addEventListener("resize", onWindowResize);
}

function createTextMesh(font, text, size, color = 0xffffff) {
  const geometry = new TextGeometry(text, {
    font: font,
    size: size,
    height: 0.001,
  });
  const material = new THREE.MeshBasicMaterial({ color: color });
  return new THREE.Mesh(geometry, material);
}

function createIconMesh(texture, size) {
  const iconGeometry = new THREE.PlaneGeometry(size, size);
  const iconMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  return new THREE.Mesh(iconGeometry, iconMaterial);
}

let previousButtonStates = [];
function checkControllerButtons() {
  if (controller1.gamepad) {
    controller1.gamepad.buttons.forEach((button, index) => {
      const prevState = previousButtonStates[index] || false;
      if (button.pressed && !prevState) {
        if (index === 4) {
          console.log('A button on right controller pressed');
          loadingText.visible = true;
          startPipeline();
        } else if (index === 5) {
          console.log('B button on right controller pressed');
          clearBoundingBoxes();
        }
      } 
      previousButtonStates[index] = button.pressed;
    });
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.xr.updateCamera(camera);
  checkControllerButtons();

  if (roi) {
    var pLocal = new THREE.Vector3(0, 0, -0.35);

    var target = pLocal.applyMatrix4(camera.matrixWorld);

    roi.position.copy(target);

    roi.lookAt(camera.position);
  }
  renderer.render(scene, camera);
}

function startPipeline() {
  fetch(api + "/run-script", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": true,
    },
  })
    .then((response) => response.json())
    .then((data) => console.log(data.status))
    .catch((error) => console.error(error));
}

function clearBoundingBoxes() {
  roiGroup.children = [];
}

function visualizeBoundingBoxes(data) {
  console.log(data)

  if (data.length === 0) {
    loadingText.visible = false;
    noObjectsText.visible = true;

    setTimeout(() => {
      noObjectsText.visible = false;
    }, 3000);

    return;
  }

  const roiWorldPosition = new THREE.Vector3();
  const roiWorldQuaternion = new THREE.Quaternion();
  const roiWorldScale = new THREE.Vector3();
  bigbb.matrixWorld.decompose(roiWorldPosition, roiWorldQuaternion, roiWorldScale);

  data.forEach((item) => {
    let [xmin, ymin, xmax, ymax] = item.bbox;
    console.log(xmin, ymin, xmax, ymax);

    xmin *= scalingFactorWidth;
    ymin *= scalingFactorHeight;
    xmax *= scalingFactorWidth;
    ymax *= scalingFactorHeight;

    console.log(xmin, ymin, xmax, ymax);
    
    const geometry1 = getGeometry(xmin, ymin, xmax, ymax, 0.00);
    const geometry2 = getGeometry(xmin, ymin, xmax, ymax, 0.0005);

    const material = new THREE.LineBasicMaterial({ color: 0x0B4F71 });
    const line = new THREE.Group();
    const line1 = new THREE.Line(geometry1, material);
    const line2 = new THREE.Line(geometry2, material);
    line.add(line1);
    line.add(line2);
    
    const linePosition = new THREE.Vector3(0, 0, 0);
    linePosition.applyMatrix4(bigbb.matrixWorld);

    if (font) {
      const mesh = createTextMesh(font, item.name, 0.014, 0xAB091E);
      mesh.position.x = xmin;
      mesh.position.y = -ymin + 0.01;
      mesh.position.z = zOffset;
      line.add(mesh);
    }

    line.position.copy(linePosition);
    line.rotation.copy(roi.rotation);
    line.position.x -= 0.018;
    line.position.y -= 0.03;
    line.position.z = roiWorldPosition.z - 0.34; 
    roiGroup.add(line);
  });

  loadingText.visible = false;
  scene.add(roiGroup);
}

function getGeometry(xmin, ymin, xmax, ymax, padding) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array([
    xmin - padding, -ymin + padding, zOffset,
    xmax + padding, -ymin + padding, zOffset,
    xmax + padding, -ymax - padding, zOffset,
    xmin - padding, -ymax - padding, zOffset,
    xmin - padding, -ymin + padding, zOffset,
  ]);

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

function drawROIBox() {
  const canvas = document.createElement('canvas');
  const width = 2064 * 2;
  const height = 2208 * 2;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  ctx.fillRect(0, 0, width, height);

  const holeWidth = 2064/2;
  const holeHeight = 2208/2.7;
  const holeX = (width - holeWidth) / 2;
  const holeY = (height - holeHeight) / 2 - 100;

  ctx.clearRect(holeX, holeY, holeWidth, holeHeight);

  const texture = new THREE.CanvasTexture(canvas);

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.7,
  });

  const sprite = new THREE.Sprite(material);

  return sprite;
}

function drawInvisibleROI(roi, zOffset, padding) {
  const regionGeometry = new THREE.BufferGeometry();
  const regionPositions = new Float32Array([
    roi.minX - padding, -roi.minY + padding, zOffset,
    roi.maxX + padding, -roi.minY + padding, zOffset,
    roi.maxX + padding, -roi.maxY - padding, zOffset,
    roi.minX - padding, -roi.maxY - padding, zOffset,
    roi.minX - padding, -roi.minY + padding, zOffset,
  ]);
  regionGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(regionPositions, 3)
  );
  const regionMaterial = new THREE.LineBasicMaterial({ color: 0x166086 });
  const regionLine = new THREE.Line(regionGeometry, regionMaterial);
  regionLine.position.x = -0.25;
  regionLine.position.y = 0.23;

  return regionLine;
}
