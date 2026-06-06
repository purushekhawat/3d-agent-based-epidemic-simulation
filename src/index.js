import * as THREE from "three";
import { WebGLRenderer, Scene, Camera } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Matrix4, Vector3 } from "three";
import * as dat from "dat.gui";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Flat from "./objects/Flat.gltf";
import Flat2 from "./objects/Flat2.gltf";
import FlatImg from "./objects/HouseTexture1.png";
import House from "./objects/House.gltf";
import HouseImg from "./objects/HouseTexture1.png";

var renderer, camera, scene, controls;
var plane, cube;
var cityWidth = 1300;
var cityLength = 1300;
var t = 0;
var pathsArray = [];
var isBlobGoingBack = false;
var daysPassed = 0;
var probability = function (n) {
  return !!n && Math.random() * 100 <= n;
};
var elapsedDays = 1;

class AStar {
  constructor(start, end) {
    this.start = { x: start.x, z: start.z, g: 0, f: 0, parent: null };
    this.end = { x: end.x, z: end.z };
    this.openList = [];
    this.closedList = [];
  }
  heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
  }
  getNeighbors(node) {
    let neighbors = [];
    let dirs = [[-250, 0], [250, 0], [0, -250], [0, 250]];
    for (let d of dirs) {
      let nx = node.x + d[0];
      let nz = node.z + d[1];
      if (nx >= 25 && nx <= 1275 && nz >= 25 && nz <= 1275) {
        neighbors.push({ x: nx, z: nz, g: 0, f: 0, parent: null });
      }
    }
    return neighbors;
  }
  findPath() {
    this.start.f = this.heuristic(this.start, this.end);
    this.openList.push(this.start);
    while (this.openList.length > 0) {
      this.openList.sort((a, b) => a.f - b.f);
      let current = this.openList.shift();
      this.closedList.push(current);
      if (current.x === this.end.x && current.z === this.end.z) {
        let path = [];
        let curr = current;
        while (curr) {
          path.push(new THREE.Vector3(curr.x, 5, curr.z));
          curr = curr.parent;
        }
        return path.reverse();
      }
      let neighbors = this.getNeighbors(current);
      for (let neighbor of neighbors) {
        if (this.closedList.find(n => n.x === neighbor.x && n.z === neighbor.z)) continue;
        let gScore = current.g + 250;
        let existing = this.openList.find(n => n.x === neighbor.x && n.z === neighbor.z);
        if (!existing || gScore < existing.g) {
          neighbor.parent = current;
          neighbor.g = gScore;
          neighbor.f = neighbor.g + this.heuristic(neighbor, this.end);
          if (!existing) this.openList.push(neighbor);
        }
      }
    }
    return [new THREE.Vector3(this.start.x, 5, this.start.z), new THREE.Vector3(this.end.x, 5, this.end.z)];
  }
}

const control = {
  play: true,
  tSpeed: 0.001,
  peopleCount: 100,
  infectedBlobs: 10,
  contactedWithBlobs: 10,
  infectionChance: 5,
  showPaths: false,
  maskMandate: false,
  socialDistancing: false,
  lockdown: false,
  reload: function () {
    this.play = false;
    resetBlobs();
    pathsArray = [];
    generatePopulation();
    this.play = true;
  },
  stopAnimation: function () {
    this.play = !this.play;
    if (this.play) animate();
  },
};

init();
generatePopulation();
initControls();
animate();

function init() {
  document.querySelector(".case-counter").innerHTML =
    control.infectedBlobs + "/" + control.peopleCount;
  document.querySelector(".day-counter").innerHTML = elapsedDays;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(new THREE.Color(0xffffff));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );
  camera.position.y = 1300;
  camera.position.z = 0;
  camera.position.x = -600;
  scene.add(camera);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.screenSpacePanning = false;
  controls.maxPolarAngle = Math.PI * 0.45;
  controls.minPolarAngle = Math.PI * 0.0;
  controls.minDistance = 200;
  controls.maxDistance = 3000;
  controls.smoothZoom = true;
  controls.zoomSpeed = 2;
  var skyBoxGeometry = new THREE.BoxGeometry(10000, 10000, 10000);
  var skyBoxMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.BackSide,
  });
  var skyBox = new THREE.Mesh(skyBoxGeometry, skyBoxMaterial);
  scene.add(skyBox);
  scene.fog = new THREE.Fog(skyBoxMaterial.color, 300, 4000);

  var planeGeometry = new THREE.PlaneBufferGeometry(1300, 1300);
  var planeMaterial = new THREE.MeshStandardMaterial({
    color: 0x303030,
    polygonOffset: true,
    polygonOffsetFactor: 5,
    side: THREE.DoubleSide,
  });
  plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.receiveShadow = true;
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);

  var scenePlaneGeometry = new THREE.PlaneBufferGeometry(10000, 10000);
  var scenePlaneMaterial = new THREE.MeshPhongMaterial({
    color: 0xf3f3f3,
    side: THREE.DoubleSide,
  });
  var scenePlane = new THREE.Mesh(scenePlaneGeometry, scenePlaneMaterial);
  scenePlane.rotation.x = -Math.PI / 2;
  scenePlane.position.y = -15;
  scene.add(scenePlane);

  var ambientLight = new THREE.AmbientLight(0x787878, 0.9);
  scene.add(ambientLight);

  var light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(-500, 1000, -300);

  light.shadow.camera.near = 2;
  light.shadow.camera.far = 2000;
  light.shadow.camera.left = -2000;
  light.shadow.camera.right = 2000;
  light.shadow.camera.top = 2000;
  light.shadow.camera.bottom = -2000;

  light.castShadow = true;
  light.shadow.mapSize.height = 3096;
  light.shadow.mapSize.width = 3096;
  scene.add(light);


  generateCity(cityWidth, cityLength);

  window.addEventListener("resize", onWindowResize, false);
}

function resetBlobs() {
  pathsArray.forEach((e) => {
    e.sphere.parent.remove(e.sphere);
  });
  pathsArray = null;
  pathsArray = [];
}

function animate() {
  if (!control.play) return;
  requestAnimationFrame(animate);
  controls.update();
  render();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function generateCity(cityWidth, cityLength) {
  var blockSize = 50;
  var xDistricts = Math.floor(cityWidth / (4 * blockSize + blockSize));
  var yDistricts = Math.floor(cityLength / (4 * blockSize + blockSize));
  for (var i = 0; i < yDistricts; i++) {
    for (var j = 0; j < xDistricts; j++) {
      var xOffset = j * 250 + blockSize + (15 + 40);
      var yOffset = i * 250 + blockSize + (15 + 40);

      var geometry = new THREE.PlaneGeometry(200, 200);
      var material = new THREE.MeshPhongMaterial({
        color: 0xe0e0e0,
        side: THREE.DoubleSide,
        shininess: 10,
      });
      var districtPlane = new THREE.Mesh(geometry, material);
      districtPlane.receiveShadow = true;
      districtPlane.rotation.x = -Math.PI / 2;
      districtPlane.position.y = 1;
      districtPlane.applyMatrix4(
        new THREE.Matrix4().makeTranslation(
          xOffset + 45 - cityWidth / 2,
          0,
          yOffset + 45 - cityLength / 2
        )
      );
      scene.add(districtPlane);

      for (var k = 1; k <= 4; k++) {
        var xShift = isHouseLeft(k) ? 0 : 90;
        var yShift = isHouseUpper(k) ? 0 : 90;
        var matrix = new THREE.Matrix4().makeTranslation(
          xOffset + xShift,
          0,
          yOffset + yShift
        );
        var bldgType = random(0, 100);
        if (bldgType <= 33) {
          generateFlat(Flat, FlatImg, matrix, isHouseLeft(k), 30);
        } else if (bldgType > 33 && bldgType <= 60) {
          generateFlat(Flat2, FlatImg, matrix, isHouseLeft(k), 30);
        } else {
          generateFlat(House, HouseImg, matrix, isHouseLeft(k), 60);
        }
      }
    }
  }
}

function generateFlat(GLTFObject, objTexture, matrix, rotateLeft, scale) {
  var matrixGlobal = new THREE.Matrix4().makeTranslation(
    -cityWidth / 2,
    0,
    -cityLength / 2
  );
  var loader = new GLTFLoader();

  var newMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
  });
  var textureLoader = new THREE.TextureLoader();
  var texture = textureLoader.load(objTexture);
  var rotation = rotateLeft ? -Math.PI / 2 : Math.PI / 2;
  loader.load(
    GLTFObject,
    function (gltf) {
      var flat = gltf.scene.children[0];

      gltf.scene.traverse(function (child) {
        if (child.isMesh) {
          child.material = newMaterial;
          child.material.map = texture;
          child.receiveShadow = false;
          child.castShadow = true;
        }
      });
      flat.visible = true;
      flat.applyMatrix4(matrix);
      flat.applyMatrix4(matrixGlobal);
      flat.position.y = 1;
      flat.rotateY(rotation);
      flat.scale.set(scale, scale, scale);
      scene.add(flat);
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );
}

function random(min, max) {
  return min + Math.random() * (max - min);
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function generatePopulation() {
  document.querySelector(".day-counter").innerHTML = elapsedDays;
  document.querySelector(".case-counter").innerHTML =
    control.infectedBlobs + "/" + control.peopleCount;
  for (var i = 0; i < control.peopleCount; i++) {
    var src = randomHouse();
    var dst = randomHouse();
    generatePath(src, dst);
  }
  pathsArray.forEach((e) => {
    if (control.showPaths) scene.add(e.line);
    scene.add(e.sphere);
  });
  for (var i = 0; i < control.infectedBlobs; i++) {
    pathsArray[i].sphere.material.color = new THREE.Color(0xef233c);
    pathsArray[i].isInfected = true;
  }
}

function generatePath(src, dst) {
  var matrix = new THREE.Matrix4().makeTranslation(
    -cityWidth / 2,
    0,
    -cityLength / 2
  );
  var pointsPath = new THREE.CurvePath();

  var srcX = src[0] % 5 == 0 ? 5 : src[0] % 5;
  var srcY = src[0] % 5 == 0 ? src[0] / 5 : Math.floor(src[0] / 5) + 1;
  var dstX = dst[0] % 5 == 0 ? 5 : dst[0] % 5;
  var dstY = dst[0] % 5 == 0 ? dst[0] / 5 : Math.floor(dst[0] / 5) + 1;

  var s1 = new THREE.Vector3(25 + 250 * (srcX - 1), 5, 25 + 250 * (srcY - 1));
  s1.setX(isHouseLeft(src[1]) ? s1.x : s1.x + 250);
  s1.setZ(isHouseUpper(src[1]) ? s1.z + 80 : s1.z + 170);
  var s01 = new THREE.Vector3(25 + 250 * (srcX - 1), 5, s1.z);
  s01.setX(isHouseLeft(src[1]) ? s1.x + 80 : s1.x - 80);
  var s2 = new THREE.Vector3(s1.x, 5, 25 + 250 * srcY);

  var d1 = new THREE.Vector3(25 + 250 * (dstX - 1), 5, 25 + 250 * (dstY - 1));
  d1.setX(isHouseLeft(dst[1]) ? d1.x : d1.x + 250);
  d1.setZ(isHouseUpper(dst[1]) ? d1.z + 80 : d1.z + 170);
  var d01 = new THREE.Vector3(25 + 250 * (dstX - 1), 5, d1.z);
  d01.setX(isHouseLeft(dst[1]) ? d1.x + 80 : d1.x - 80);
  var d2 = new THREE.Vector3(d1.x, 5, 25 + 250 * dstY);

  var astar = new AStar(s2, d2);
  var pathNodes = astar.findPath();

  s01.applyMatrix4(matrix);
  s1.applyMatrix4(matrix);

  pointsPath.add(new THREE.LineCurve3(s01, s1));
  pointsPath.add(new THREE.LineCurve3(s1, s2.clone().applyMatrix4(matrix)));

  for (let i = 0; i < pathNodes.length - 1; i++) {
    let p1 = pathNodes[i].clone().applyMatrix4(matrix);
    let p2 = pathNodes[i + 1].clone().applyMatrix4(matrix);
    pointsPath.add(new THREE.LineCurve3(p1, p2));
  }

  d2.applyMatrix4(matrix);
  d1.applyMatrix4(matrix);
  d01.applyMatrix4(matrix);

  pointsPath.add(new THREE.LineCurve3(pathNodes[pathNodes.length - 1].clone().applyMatrix4(matrix), d2));
  pointsPath.add(new THREE.LineCurve3(d2, d1));
  pointsPath.add(new THREE.LineCurve3(d1, d01));

  var points = pointsPath.curves.reduce(
    (p, d) => [...p, ...d.getPoints(20)],
    []
  );

  var lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  var lineMaterial = new THREE.LineBasicMaterial({ color: 0xfff2af });
  var road = new THREE.Line(lineGeometry, lineMaterial);
  road.castShadow = true;

  pathsArray.push({
    line: road,
    points: pointsPath,
    sphere: generateBlob(),
    isInfected: false,
    stayHome: Math.random() < 0.7,
  });
}

function generateBlob() {
  var geometry = new THREE.SphereGeometry(6, 20, 20);
  var material = new THREE.MeshBasicMaterial({
    color: 0x0dae62,
    transparent: true,
    opacity: 0.9,
  });
  var sphere = new THREE.Mesh(geometry, material);
  sphere.name = "blob";
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  return sphere;
}

function randomHouse() {
  return [
    Math.floor(Math.random() * Math.floor(25)) + 1,
    Math.floor(Math.random() * Math.floor(4)) + 1,
  ];
}
function isHouseLeft(index) {
  if (index % 2 == 1) {
    return true;
  } else return false;
}
function isHouseUpper(index) {
  if (index <= 2) {
    return true;
  } else return false;
}

function render() {
  pathsArray.forEach((e) => {
    if (control.lockdown && e.stayHome && !e.isInfected) {
      var homePos = e.points.getPoint(0);
      e.sphere.position.set(homePos.x, homePos.y, homePos.z);
    } else {
      var newPos = e.points.getPoint(t);
      e.sphere.position.set(newPos.x, newPos.y, newPos.z);
    }
  });
  if (t - control.tSpeed <= 0 && isBlobGoingBack) {
    isBlobGoingBack = false;
    daysPassed += 1;
    infectBlobs();
  } else if (t + control.tSpeed >= 1 && !isBlobGoingBack) {
    isBlobGoingBack = true;
  }
  t = isBlobGoingBack ? t - control.tSpeed : t + control.tSpeed;
  renderer.render(scene, camera);
}

function infectBlobs() {
  var initInfectedBlobs = control.infectedBlobs;
  for (var i = 0; i < initInfectedBlobs; i++) {
    var contacts = control.contactedWithBlobs;
    if (control.socialDistancing) {
      contacts = Math.max(1, Math.floor(contacts / 2));
    }
    for (var j = 1; j < contacts; j++) {
      var chance = control.infectionChance;
      if (control.maskMandate) {
        chance = chance / 2;
      }
      if (probability(chance)) {
        var blobIndex = randomInt(0, pathsArray.length - 1);
        var targetBlob = pathsArray[blobIndex];
        if (control.lockdown && targetBlob.stayHome && !targetBlob.isInfected) {
           continue;
        }
        if (targetBlob.isInfected == false) {
          targetBlob.sphere.material.color = new THREE.Color(0xef233c);
          targetBlob.isInfected = true;
          control.infectedBlobs += 1;
          document.querySelector(".case-counter").innerHTML = control.infectedBlobs + "/" + control.peopleCount;
        }
      }
    }
  }
  elapsedDays++;
  document.querySelector(".day-counter").innerHTML = elapsedDays;
}

function initControls() {
  var gui = new dat.GUI({ width: 400 });
  
  var policySettings = gui.addFolder("Policy Controls");
  policySettings.add(control, "maskMandate").name("Mask Mandate");
  policySettings.add(control, "socialDistancing").name("Social Distancing");
  policySettings.add(control, "lockdown").name("Lockdown (70% Stay Home)");
  policySettings.open();

  var populationSetings = gui.addFolder("Population");
  populationSetings.add(control, "peopleCount", 50, 500, 2).name("Population (Reload)");
  populationSetings.add(control, "tSpeed", 0.0005, 0.01, 0.000095).name("Blob Speed");
  populationSetings.open();

  var infectionSettings = gui.addFolder("Disease Spread");
  infectionSettings.add(control, "infectedBlobs", 1, 50, 1).name("Infected Blobs (Reload)");
  infectionSettings.add(control, "infectionChance", 1, 50, 1).name("Infection Chance (%)");
  infectionSettings.add(control, "contactedWithBlobs", 1, 50, 1).name("Physical contacts per blob");
  
  var controls = gui.addFolder("Controls");
  controls.add(control, "showPaths").name("Show paths (Reload)");
  controls.add(control, "stopAnimation").name("Play/Stop Simulation");
  controls.add(control, "reload").name("Reload");
  controls.open();
}
