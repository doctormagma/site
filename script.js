const params = {
  exposure: 1,
  bloomStrength: 0.87,
  bloomThreshold: 0,
  bloomRadius: 0.26
};
const { min, PI, sqrt, cos, sin, pow, floor } = Math;
const range = (n) =>
  Array(n)
    .fill(0)
    .map((i, j) => i + j);

const sum = (arr) => arr.reduce((acc, cur) => acc + cur, 0);
const slicedSum = (arr, i) => sum(arr.slice(0, i));
const pointsOnSphere = (n) => {
  const pts = [];
  const inc = PI * (3 - sqrt(5));
  const off = 2 / n;
  range(n).forEach((i) => {
    const y = i * off - 1 + off / 2;
    const r = sqrt(1 - y * y);
    const phi = i * inc;
    const x = cos(phi) * r;
    const z = sin(phi) * r;
    pts.push([x, y, z]);
  });
  return pts;
};

const numMap = (value, sMin, sMax, dMin, dMax) => {
  return dMin + ((value - sMin) / (sMax - sMin)) * (dMax - dMin);
};

const colArray = [0xed2225, 0xf99621, 0xf1eb1b, 0x0c9b49, 0x3954a5, 0x93298e];
colArray.reverse();
let camera, controls, scene, renderer, cloud, composer, bloomPass, meshPlanet;
const uniforms = {
  time: { type: "f", value: 1.0 }
};

let { innerWidth, innerHeight } = window;
let canvasSize = min(innerWidth, innerHeight);

init();
animate();

function init() {
  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvasSize, canvasSize);
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(60, 1, 1, 1000);
  camera.position.set(128, 90, 474);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x666666);
  scene.add(ambientLight);

  const renderScene = new THREE.RenderPass(scene, camera);

  bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85
  );
  bloomPass.threshold = params.bloomThreshold;
  bloomPass.strength = params.bloomStrength;
  bloomPass.radius = params.bloomRadius;
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);
  createObjects();
  createGlobe();
  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = 1;
  camera.updateProjectionMatrix();
  innerWidth = window.innerWidth;
  innerHeight = window.innerHeight;
  canvasSize = min(innerWidth, innerHeight);
  composer.setSize(canvasSize, canvasSize);
}

function animate(time) {
  uniforms.time.value = time;
  meshPlanet.rotation.y -= 0.006;
  requestAnimationFrame(animate);
  render();
}

function render() {
  composer.render();
}

function createObjects() {
  const layers = range(6).map((i) => canvasSize * pow(2, i + 1));
  layers.reverse();
  const amount = sum(layers);
  const positions = new Float32Array(amount * 3);
  const colors = new Float32Array(amount * 3);
  const vertex = new THREE.Vector3();
  layers.forEach((layer, layerIndex) => {
    const points = pointsOnSphere(layer);
    points.forEach(([x, y, z], pointIndex) => {
      const index = slicedSum(layers, layerIndex) + pointIndex;
      const color = new THREE.Color(
        colArray[floor(numMap(pointIndex, 0, layer, 0, colArray.length))]
      );
      const radius = 140 + numMap(layerIndex, 0, layers.length, 0, 120);
      vertex.x = radius * x;
      vertex.y = radius * y;
      vertex.z = radius * z;
      vertex.toArray(positions, index * 3);
      color.toArray(colors, index * 3);
    });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("customColor", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: document.querySelector("#vertex-shader").textContent,
    fragmentShader: document.querySelector("#fragment-shader").textContent,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true
  });
  cloud = new THREE.Points(geometry, material);
  scene.add(cloud);
}

function createGlobe() {
  const textureLoader = new THREE.TextureLoader();
  const radius = 100;
  const tilt = 0.409105177;
  const materialNormalMap = new THREE.MeshPhongMaterial({
    specular: 0x333333,
    shininess: 1,
    map: textureLoader.load("https://assets.codepen.io/3685267/earth.jpg"),
    normalScale: new THREE.Vector2(0.85, -0.85)
  });
  const geometry = new THREE.SphereBufferGeometry(radius, 100, 50);
  meshPlanet = new THREE.Mesh(geometry, materialNormalMap);
  meshPlanet.rotation.y = 0;
  meshPlanet.rotation.z = tilt;
  scene.add(meshPlanet);
}