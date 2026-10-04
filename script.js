const pageLinks = document.querySelectorAll("[data-page-link]");
const pages = document.querySelectorAll(".page");
const navLinks = document.querySelectorAll(".nav-link");
const loginModal = document.querySelector("#login-modal");
const qrModal = document.querySelector("#qr-modal");
const viewerModal = document.querySelector("#modal3DViewer");
const toast = document.querySelector("#toast");
let toastTimeout;
let threeScene = null;
let threeCamera = null;
let threeRenderer = null;
let orbitControls = null;
let gltfLoader = null;
let viewerAnimationFrame = 0;
let viewerResizeObserver = null;
let activeModelId = "heart";
let qrRequestId = 0;
let modelLoadId = 0;
let appOriginPromise = null;
let viewerLabelModel = null;

const anatomyModels = {
  heart: {
    name: "Human Heart",
    anatomy: "human heart",
    category: "CARDIOLOGY",
    modelId: "heart",
    assetUrl: "/assets/realistic_human_heart/scene.gltf",
    code: "SA / MDL-01",
    stats: [["STROKE VOLUME", "70 mL"], ["HEART RATE", "72 BPM"], ["LATENCY", "8 ms"], ["FIELD", "360°"]],
    specifications: [["Chambers", "4"], ["Primary function", "Blood circulation"], ["Major valves", "4"], ["View", "Anterior"]],
    callouts: [["Left atrium", "0.22m 0.44m 0.25m"], ["Aorta", "-0.18m 0.9m 0.1m"], ["Right ventricle", "-0.28m -0.12m 0.3m"]]
  },
  respiratory: {
    name: "Respiratory System",
    anatomy: "respiratory system",
    category: "RESPIRATORY",
    modelId: "respiratory",
    assetUrl: "/assets/respiratory-system%20(1)/source/respiratorySystem.glb",
    code: "SA / MDL-02",
    stats: [["ALVEOLAR SURFACE", "70 m²"], ["TIDAL VOLUME", "500 mL"], ["LATENCY", "11 ms"], ["FIELD", "360°"]],
    specifications: [["Lung pairs", "2"], ["Gas exchange", "Alveoli"], ["Airway", "Tracheobronchial"], ["View", "Anterior"]],
    callouts: [["Trachea", "0m 0.72m 0.1m"], ["Right lung", "-0.48m -0.05m 0.36m"], ["Bronchi", "0.35m 0.05m 0.1m"]]
  },
  brain: {
    name: "Cerebral Cortex",
    anatomy: "cerebral cortex",
    category: "NEUROLOGY",
    modelId: "brain",
    assetUrl: "/assets/brain-diagram/source/BrainDiagram3D.glb",
    code: "SA / MDL-03",
    stats: [["NEURONS", "≈ 86 B"], ["HEMISPHERES", "2"], ["LATENCY", "6 ms"], ["FIELD", "360°"]],
    specifications: [["Primary regions", "4 lobes"], ["Cortical type", "Neocortex"], ["Main role", "Integration"], ["View", "Lateral"]],
    callouts: [["Cerebral cortex", "-0.43m 0.1m 0.55m"], ["Cerebellum", "0m -0.72m 0.2m"], ["Brainstem", "0m -0.72m 0.22m"]]
  },
  eye: {
    name: "Ocular Structure",
    anatomy: "ocular structure",
    category: "VISUAL",
    modelId: "eye",
    assetUrl: "/assets/realistic_human_eye/scene.gltf",
    code: "SA / MDL-04",
    stats: [["APERTURE", "≈ 7 mm"], ["RETINAL LAYERS", "10"], ["LATENCY", "13 ms"], ["FIELD", "≈ 200°"]],
    specifications: [["Optical elements", "Cornea + lens"], ["Neural output", "Optic nerve"], ["Photoreceptors", "Rods + cones"], ["View", "Lateral"]],
    callouts: [["Cornea", "-0.08m 0.03m 0.58m"], ["Lens", "-0.08m 0.03m 0.25m"], ["Optic nerve", "1.08m 0.03m 0m"]]
  },
  skeleton: {
    name: "Human Skeleton",
    anatomy: "human skeleton",
    category: "ORTHOPEDIC",
    modelId: "skeleton",
    assetUrl: "/assets/human-skeleton/source/human_skeleton_high_detailed.glb",
    code: "SA / MDL-05",
    stats: [["BONES", "206"], ["JOINTS", "360+"], ["LATENCY", "9 ms"], ["FIELD", "360°"]],
    specifications: [["Skeleton type", "Axial + appendicular"], ["Primary role", "Support + movement"], ["Bone tissue", "Compact + spongy"], ["View", "Anterior"]],
    callouts: [["Skull", "0m 1.18m 0.23m"], ["Vertebral column", "0m 0.4m 0.08m"], ["Femur", "0.34m -0.92m 0m"]]
  }
};

const anatomyLabels = {
  heart: [
    { text: "Superior vena cava", side: "left", color: "#4285ff", point: [-0.32, 0.38, 0.3] },
    { text: "Aortic arch", side: "right", color: "#ff5948", point: [0.22, 0.42, 0.1] },
    { text: "Right atrium", side: "left", color: "#ed3348", point: [-0.26, 0.13, 0.3] },
    { text: "Pulmonary artery", side: "right", color: "#28c6ed", point: [0.37, 0.3, 0.25] },
    { text: "Tricuspid valve", side: "left", color: "#d549e8", point: [-0.08, -0.03, 0.38] },
    { text: "Left atrium", side: "right", color: "#19cce8", point: [0.27, 0.13, 0.3] },
    { text: "Right ventricle", side: "left", color: "#59daeb", point: [-0.2, -0.25, 0.34] },
    { text: "Mitral valve", side: "right", color: "#54df69", point: [0.1, -0.02, 0.38] },
    { text: "Inferior vena cava", side: "left", color: "#df35d5", point: [-0.28, -0.43, 0.22] },
    { text: "Left ventricle", side: "right", color: "#ff493d", point: [0.23, -0.27, 0.34] },
    { text: "Pulmonary veins", side: "left", color: "#2ba9e4", point: [-0.36, 0.24, 0.15] },
    { text: "Interventricular septum", side: "right", color: "#ffce55", point: [0.02, -0.3, 0.25] }
  ],
  respiratory: [
    { text: "Frontal sinus", side: "left", color: "#ff714d", point: [-0.12, 0.48, 0.34] },
    { text: "Nasopharynx", side: "right", color: "#fb8f57", point: [0.08, 0.37, 0.34] },
    { text: "Pharynx", side: "left", color: "#ffbd55", point: [-0.08, 0.29, 0.38] },
    { text: "Larynx", side: "right", color: "#f3624d", point: [0.08, 0.21, 0.36] },
    { text: "Trachea", side: "left", color: "#ff884f", point: [-0.02, 0.1, 0.4] },
    { text: "Bronchial tree", side: "right", color: "#ffe05f", point: [0.02, -0.04, 0.42] },
    { text: "Right pleura", side: "left", color: "#dd568f", point: [-0.38, -0.18, 0.35] },
    { text: "Left lung", side: "right", color: "#f16d5d", point: [0.38, -0.12, 0.38] },
    { text: "Right lung", side: "left", color: "#f57588", point: [-0.38, 0.04, 0.38] },
    { text: "Diaphragm", side: "right", color: "#e7a34a", point: [0.1, -0.44, 0.2] }
  ],
  brain: [
    { text: "Frontal lobe", side: "left", color: "#ff493e", point: [-0.32, 0.18, 0.38] },
    { text: "Parietal lobe", side: "right", color: "#42b7e8", point: [0.25, 0.3, 0.42] },
    { text: "Temporal lobe", side: "left", color: "#b759cf", point: [-0.34, -0.14, 0.38] },
    { text: "Occipital lobe", side: "right", color: "#58e64c", point: [0.4, 0.02, 0.35] },
    { text: "Central sulcus", side: "left", color: "#f09c32", point: [0.02, 0.32, 0.44] },
    { text: "Corpus callosum", side: "right", color: "#f2d044", point: [0.0, 0.02, 0.42] },
    { text: "Thalamus", side: "left", color: "#8b70bf", point: [-0.1, -0.08, 0.42] },
    { text: "Cerebellum", side: "right", color: "#dc8e9a", point: [0.15, -0.38, 0.35] },
    { text: "Hypothalamus", side: "left", color: "#e9a56b", point: [-0.04, -0.2, 0.4] },
    { text: "Brainstem", side: "right", color: "#e4ad59", point: [0.03, -0.45, 0.25] }
  ],
  eye: [
    { text: "Sclera", side: "left", color: "#e9d8bf", point: [-0.28, 0.16, 0.28] },
    { text: "Retina", side: "right", color: "#e85b49", point: [0.34, 0.2, -0.28] },
    { text: "Cornea", side: "left", color: "#46c9e9", point: [-0.28, 0.04, 0.48] },
    { text: "Optic nerve", side: "right", color: "#e9c066", point: [0.46, 0.0, 0.02] },
    { text: "Iris", side: "left", color: "#25aee7", point: [-0.13, 0.04, 0.46] },
    { text: "Vitreous chamber", side: "right", color: "#ef7355", point: [0.2, 0.0, 0.14] },
    { text: "Lens", side: "left", color: "#f5cd75", point: [0.0, 0.04, 0.35] },
    { text: "Choroid", side: "right", color: "#a94a42", point: [0.35, -0.18, -0.24] },
    { text: "Ciliary body", side: "left", color: "#d78b53", point: [-0.08, 0.2, 0.32] },
    { text: "Aqueous chamber", side: "right", color: "#46b9d9", point: [-0.12, -0.12, 0.42] }
  ],
  skeleton: [
    { text: "Cranium", side: "left", color: "#e8d9b7", point: [-0.04, 0.45, 0.28] },
    { text: "Clavicle", side: "right", color: "#f1cf83", point: [0.24, 0.25, 0.18] },
    { text: "Sternum", side: "left", color: "#f5e8cb", point: [-0.04, 0.13, 0.3] },
    { text: "Rib cage", side: "right", color: "#dfcca2", point: [0.28, 0.04, 0.25] },
    { text: "Vertebral column", side: "left", color: "#bacbd0", point: [-0.04, -0.02, -0.05] },
    { text: "Pelvis", side: "right", color: "#eddaa9", point: [0.17, -0.31, 0.2] },
    { text: "Humerus", side: "left", color: "#f1e4c7", point: [-0.35, 0.01, 0.12] },
    { text: "Radius & ulna", side: "right", color: "#d5c69f", point: [0.4, -0.12, 0.08] },
    { text: "Femur", side: "left", color: "#f2e4c7", point: [-0.2, -0.48, 0.12] },
    { text: "Tibia & fibula", side: "right", color: "#cec19e", point: [0.2, -0.43, 0.1] }
  ]
};

function showPage(pageName) {
  const page = document.querySelector(`[data-page="${pageName}"]`);
  if (!page) return;

  pages.forEach((item) => item.classList.toggle("active", item === page));
  navLinks.forEach((link) => {
    const isActive = link.dataset.pageLink === pageName ||
      (pageName === "model-detail" && link.dataset.pageLink === "explore");
    link.classList.toggle("active", isActive);
  });
  document.querySelector("#main-nav").classList.remove("open");
  document.querySelector("#mobile-menu-button").setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (pageName === "ar") {
    updateVirtualQr(activeModelId);
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("show"), 2700);
}

function getApiErrorMessage(error) {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return "Cannot reach the SurgicalAI API. Run `npm start` in the project folder, then try again.";
  }
  return error.message;
}

function openModal(modal) {
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  const focusTarget = modal.querySelector("input, button");
  if (focusTarget) focusTarget.focus();
}

function closeModal(modal) {
  modal.classList.add("hidden");
  if (
    loginModal.classList.contains("hidden") &&
    qrModal.classList.contains("hidden") &&
    viewerModal.classList.contains("hidden")
  ) {
    document.body.style.overflow = "";
  }
  if (modal === viewerModal) stopThreeViewer();
}

pageLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showPage(link.dataset.pageLink);
  });
});

document.querySelector("#mobile-menu-button").addEventListener("click", (event) => {
  const nav = document.querySelector("#main-nav");
  const isOpen = nav.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(isOpen));
});

document.querySelector("#get-started").addEventListener("click", () => openModal(loginModal));
document.querySelectorAll("[data-open-qr]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector("#qr-error").classList.add("hidden");
    openModal(qrModal);
  });
});
document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => closeModal(button.closest(".modal-backdrop")));
});
document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeModal(backdrop);
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal-backdrop:not(.hidden)").forEach(closeModal);
  }
});

document.querySelector("#toggle-password").addEventListener("click", (event) => {
  const password = document.querySelector("#password");
  const visible = password.type === "text";
  password.type = visible ? "password" : "text";
  event.currentTarget.setAttribute("aria-label", visible ? "Show password" : "Hide password");
});

document.querySelector("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#login-form").classList.add("hidden");
  document.querySelector("#authenticated-state").classList.remove("hidden");
  window.setTimeout(() => {
    closeModal(loginModal);
    document.querySelector("#login-form").classList.remove("hidden");
    document.querySelector("#authenticated-state").classList.add("hidden");
    showPage("explore");
    showToast("Authenticated — welcome to your anatomy lab.");
  }, 1450);
});

document.querySelectorAll(".category-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".category-tab").forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    let visibleCount = 0;
    document.querySelectorAll(".model-card").forEach((card) => {
      const visible = tab.dataset.category === "ALL" || card.dataset.category === tab.dataset.category;
      card.classList.toggle("hidden", !visible);
      if (visible) visibleCount += 1;
    });
    document.querySelector("#model-count").textContent = String(visibleCount).padStart(2, "0");
  });
});

async function fetchAnatomy(part) {
  const response = await fetch(`/api/anatomy/${encodeURIComponent(part)}`);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Could not load anatomy information.");
  }
  return result;
}

function addViewerSphere(parent, position, scale, color, detail = 32, ripple = false) {
  const geometry = new THREE.SphereGeometry(1, detail, Math.max(12, Math.floor(detail * 0.7)));
  if (ripple) {
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      const wave = 1 + 0.025 * Math.sin(x * 16) * Math.sin(y * 11) * Math.sin(z * 13);
      positions.setXYZ(index, x * wave, y * wave, z * wave);
    }
    geometry.computeVertexNormals();
  }
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.48,
    metalness: 0.08,
    emissive: color,
    emissiveIntensity: 0.12
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

function addViewerTube(parent, points, radius, color, segments = 48) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const geometry = new THREE.TubeGeometry(curve, segments, radius, 9, false);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: 0.08,
    emissive: color,
    emissiveIntensity: 0.15
  });
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  return mesh;
}

function addViewerCylinder(parent, start, end, radius, color) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const direction = new THREE.Vector3().subVectors(to, from);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), 14),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.08 })
  );
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  parent.add(mesh);
  return mesh;
}

function addViewerHeart(parent) {
  addViewerSphere(parent, [-0.28, -0.05, 0], [0.42, 0.7, 0.34], "#d83f60");
  addViewerSphere(parent, [0.28, -0.05, 0], [0.42, 0.7, 0.34], "#f36b83");
  addViewerSphere(parent, [-0.26, 0.63, 0], [0.3, 0.34, 0.29], "#f27b91");
  addViewerSphere(parent, [0.25, 0.63, 0], [0.3, 0.34, 0.29], "#c93658");
  addViewerTube(parent, [[-0.13, 0.72, 0], [-0.2, 1.04, 0], [-0.23, 1.35, 0]], 0.12, "#ed665e");
  addViewerTube(parent, [[0.2, 0.68, 0], [0.24, 1.03, 0], [0.4, 1.29, 0]], 0.13, "#db4968");
  addViewerTube(parent, [[0.22, 0.69, 0], [0.55, 1.02, 0], [0.65, 1.25, 0]], 0.09, "#2995d0");
  addViewerTube(parent, [[-0.31, 0.63, 0], [-0.55, 0.94, 0], [-0.54, 1.14, 0]], 0.08, "#48b6df");
}

function addViewerRespiratory(parent) {
  addViewerSphere(parent, [-0.54, -0.03, 0], [0.46, 0.8, 0.38], "#e9859d");
  addViewerSphere(parent, [0.54, -0.03, 0], [0.46, 0.8, 0.38], "#d9688c");
  addViewerTube(parent, [[0, 1.42, 0], [0, 0.72, 0], [0, 0.28, 0]], 0.11, "#f4d9bd");
  addViewerTube(parent, [[0, 0.35, 0], [-0.32, 0.12, 0], [-0.45, -0.02, 0]], 0.075, "#f3a6a1");
  addViewerTube(parent, [[0, 0.35, 0], [0.32, 0.12, 0], [0.45, -0.02, 0]], 0.075, "#f3a6a1");
  for (let index = 0; index < 5; index += 1) {
    const y = -0.13 - index * 0.19;
    addViewerTube(parent, [[-0.38, y, 0], [-0.69, y - 0.17, 0.04], [-0.78, y - 0.25, 0.08]], 0.022, "#ffd2bd", 18);
    addViewerTube(parent, [[0.38, y, 0], [0.69, y - 0.17, 0.04], [0.78, y - 0.25, 0.08]], 0.022, "#ffd2bd", 18);
  }
}

function addViewerBrain(parent) {
  addViewerSphere(parent, [-0.43, 0.15, 0], [0.64, 0.75, 0.56], "#a348a8", 48, true);
  addViewerSphere(parent, [0.43, 0.15, 0], [0.64, 0.75, 0.56], "#cf69b7", 48, true);
  addViewerSphere(parent, [0, -0.72, -0.02], [0.24, 0.45, 0.24], "#e5a35a");
  for (let side of [-1, 1]) {
    for (let index = 0; index < 5; index += 1) {
      const x = side * (0.15 + index * 0.11);
      addViewerTube(parent, [[x, 0.56, 0.5], [x - side * 0.08, 0.3, 0.54], [x, 0.02, 0.55]], 0.012, "#f0a5d4", 20);
    }
  }
}

function addViewerEye(parent) {
  addViewerSphere(parent, [0, 0, 0], [0.78, 0.57, 0.63], "#f4eee2", 40);
  addViewerSphere(parent, [-0.08, 0.02, 0.57], [0.3, 0.3, 0.12], "#29a9e0", 30);
  addViewerSphere(parent, [-0.08, 0.02, 0.685], [0.14, 0.15, 0.055], "#071421", 28);
  addViewerSphere(parent, [-0.13, 0.1, 0.73], [0.045, 0.045, 0.02], "#ffffff", 16);
  addViewerTube(parent, [[0.49, 0, 0], [0.79, 0.03, 0], [1.18, 0.03, 0]], 0.13, "#f2bd77", 24);
}

function addViewerSkeleton(parent) {
  const bone = "#f1e5c8";
  addViewerSphere(parent, [0, 1.43, 0], [0.29, 0.32, 0.25], bone, 24);
  addViewerSphere(parent, [0, 1.34, 0.2], [0.12, 0.1, 0.08], "#7895a2", 16);
  addViewerTube(parent, [[0, 1.11, 0], [0, 0.68, 0], [0, -0.46, 0]], 0.075, bone, 32);
  for (let index = 0; index < 6; index += 1) {
    const y = 0.86 - index * 0.16;
    const width = index < 3 ? 0.46 + index * 0.035 : 0.54 - (index - 3) * 0.05;
    addViewerSphere(parent, [0, y, 0], [0.1, 0.055, 0.09], "#b6c9c8", 12);
    addViewerTube(parent, [[0, y, 0], [-width * 0.65, y - 0.12, 0.06], [-width, y - 0.19, 0]], 0.024, bone, 20);
    addViewerTube(parent, [[0, y, 0], [width * 0.65, y - 0.12, 0.06], [width, y - 0.19, 0]], 0.024, bone, 20);
  }
  addViewerSphere(parent, [0, -0.59, 0], [0.43, 0.2, 0.22], "#d8cba9", 22);
  for (const side of [-1, 1]) {
    addViewerTube(parent, [[side * 0.2, -0.55, 0], [side * 0.34, -1.02, 0], [side * 0.37, -1.49, 0]], 0.075, bone, 24);
    addViewerTube(parent, [[side * 0.3, 0.6, 0], [side * 0.54, 0.05, 0], [side * 0.63, -0.53, 0]], 0.045, "#d4c79f", 24);
    addViewerSphere(parent, [side * 0.64, -0.61, 0], [0.12, 0.1, 0.1], bone, 14);
  }
}

function createModelGroup(modelId) {
  const group = new THREE.Group();
  const builders = {
    heart: addViewerHeart,
    respiratory: addViewerRespiratory,
    brain: addViewerBrain,
    eye: addViewerEye,
    skeleton: addViewerSkeleton
  };
  builders[modelId](group);
  group.userData.modelId = modelId;
  return group;
}

function ensureThreeViewer() {
  if (threeRenderer) return;
  if (!window.THREE || !THREE.OrbitControls || !THREE.GLTFLoader) {
    throw new Error("The 3D viewer libraries did not load. Check your internet connection and refresh.");
  }
  const canvas = document.querySelector("#anatomy-canvas");
  threeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  threeRenderer.outputEncoding = THREE.sRGBEncoding;
  gltfLoader = new THREE.GLTFLoader();
  threeScene = new THREE.Scene();
  threeCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  threeCamera.position.set(0, 0.15, 4.6);
  threeScene.add(new THREE.HemisphereLight(0x94dcff, 0x101323, 1.55));
  const keyLight = new THREE.DirectionalLight(0xe5f6ff, 2.5);
  keyLight.position.set(3, 4, 5);
  threeScene.add(keyLight);
  const rimLight = new THREE.PointLight(0x00bce8, 3.1, 9);
  rimLight.position.set(-3, 1, -2);
  threeScene.add(rimLight);
  const grid = new THREE.GridHelper(5, 24, 0x12617a, 0x173449);
  grid.position.y = -1.72;
  grid.material.transparent = true;
  grid.material.opacity = 0.24;
  threeScene.add(grid);
  orbitControls = new THREE.OrbitControls(threeCamera, canvas);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.065;
  orbitControls.minDistance = 2;
  orbitControls.maxDistance = 8;
  orbitControls.target.set(0, 0, 0);
  viewerResizeObserver = new ResizeObserver(resizeThreeViewer);
  viewerResizeObserver.observe(document.querySelector("#viewer-canvas-wrap"));
  resizeThreeViewer();
}

function resizeThreeViewer() {
  if (!threeRenderer) return;
  const target = document.querySelector("#viewer-canvas-wrap");
  const width = target.clientWidth;
  const height = target.clientHeight;
  if (!width || !height) return;
  threeRenderer.setSize(width, height, false);
  threeCamera.aspect = width / height;
  threeCamera.updateProjectionMatrix();
  drawViewerLabelLines();
}

function setViewerAnatomyLabels(modelId) {
  const labels = anatomyLabels[modelId] || [];
  const list = document.querySelector("#viewer-label-list");
  const lines = document.querySelector("#viewer-label-lines");
  const svgNamespace = "http://www.w3.org/2000/svg";
  list.replaceChildren();
  lines.replaceChildren();
  viewerLabelModel = null;
  for (const side of ["left", "right"]) {
    const sideLabels = labels.filter((label) => label.side === side);
    sideLabels.forEach((label, index) => {
      const tag = document.createElement("span");
      tag.className = "anatomy-label-tag";
      tag.dataset.side = side;
      tag.dataset.modelPoint = label.point.join(",");
      tag.style.setProperty("--label-color", label.color);
      tag.style.setProperty("--label-top", `${((index + 1) / (sideLabels.length + 1)) * 100}%`);
      tag.textContent = label.text;
      list.append(tag);

      const path = document.createElementNS(svgNamespace, "path");
      path.classList.add("viewer-label-line");
      path.setAttribute("stroke", label.color);
      lines.append(path);

      const dot = document.createElementNS(svgNamespace, "circle");
      dot.classList.add("viewer-label-dot");
      dot.setAttribute("r", "2.6");
      dot.setAttribute("fill", label.color);
      lines.append(dot);
      tag._leaderLine = path;
      tag._anchorDot = dot;
    });
  }
}

function drawViewerLabelLines() {
  if (!threeCamera || !threeScene) return;
  const container = document.querySelector("#viewer-canvas-wrap");
  const bounds = container.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;

  document.querySelectorAll(".anatomy-label-tag").forEach((tag) => {
    const modelBounds = viewerLabelModel && viewerLabelModel.userData.labelBounds;
    if (!modelBounds) {
      tag._leaderLine.setAttribute("visibility", "hidden");
      tag._anchorDot.setAttribute("visibility", "hidden");
      return;
    }
    const fraction = tag.dataset.modelPoint.split(",").map(Number);
    const worldPoint = modelBounds.center.clone().add(new THREE.Vector3(
      fraction[0] * modelBounds.size.x,
      fraction[1] * modelBounds.size.y,
      fraction[2] * modelBounds.size.z
    ));
    const projected = worldPoint.project(threeCamera);
    const x = (projected.x * 0.5 + 0.5) * bounds.width;
    const y = (-projected.y * 0.5 + 0.5) * bounds.height;
    if (projected.z < -1 || projected.z > 1 || x < 0 || x > bounds.width || y < 0 || y > bounds.height) {
      tag._leaderLine.setAttribute("visibility", "hidden");
      tag._anchorDot.setAttribute("visibility", "hidden");
      return;
    }

    const side = tag.dataset.side;
    const startX = side === "left" ? tag.offsetLeft + tag.offsetWidth : tag.offsetLeft;
    const startY = tag.offsetTop + tag.offsetHeight / 2;
    const elbowX = startX + (x - startX) * 0.52;
    tag._leaderLine.setAttribute("d", `M ${startX} ${startY} L ${elbowX} ${startY} L ${x} ${y}`);
    tag._leaderLine.setAttribute("visibility", "visible");
    tag._anchorDot.setAttribute("cx", String(x));
    tag._anchorDot.setAttribute("cy", String(y));
    tag._anchorDot.setAttribute("visibility", "visible");
  });
}

function disposeThreeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        for (const value of Object.values(material)) {
          if (value && value.isTexture) value.dispose();
        }
        material.dispose();
      });
    }
  });
}

function normalizeLoadedModel(model) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  if (!maxDimension) throw new Error("The GLTF model contains no visible geometry.");
  model.position.sub(center);
  model.scale.multiplyScalar(2.6 / maxDimension);
  model.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(model);
}

async function setThreeModel(modelId) {
  if (!threeScene) return;
  const requestId = ++modelLoadId;
  setViewerAnatomyLabels(modelId);
  const previous = threeScene.getObjectByName("active-anatomy-model");
  if (previous) {
    threeScene.remove(previous);
    disposeThreeObject(previous);
  }
  const loading = document.querySelector("#viewer-loading");
  loading.classList.remove("hidden");
  loading.innerHTML = "<i></i> LOADING GLTF ANATOMY";
  orbitControls.target.set(0, 0, 0);
  orbitControls.update();

  const finishLoad = (loadedScene, usingFallback = false) => {
    if (requestId !== modelLoadId || viewerModal.classList.contains("hidden")) {
      disposeThreeObject(loadedScene);
      return;
    }
    loadedScene.name = "active-anatomy-model";
    loadedScene.userData.loader = usingFallback ? "procedural-fallback" : "gltf";
    document.querySelector("#viewer-canvas-wrap").dataset.modelLoader =
      usingFallback ? "procedural-fallback" : "gltf";
    const bounds = usingFallback
      ? new THREE.Box3().setFromObject(loadedScene)
      : normalizeLoadedModel(loadedScene);
    if (usingFallback) {
      const center = bounds.getCenter(new THREE.Vector3());
      loadedScene.position.sub(center);
      loadedScene.scale.multiplyScalar(2.6 / Math.max(...bounds.getSize(new THREE.Vector3()).toArray()));
    }
    threeScene.add(loadedScene);
    const framedBounds = new THREE.Box3().setFromObject(loadedScene);
    const size = framedBounds.getSize(new THREE.Vector3());
    const center = framedBounds.getCenter(new THREE.Vector3());
    loadedScene.userData.labelBounds = { center, size };
    viewerLabelModel = loadedScene;
    orbitControls.target.copy(center);
    const radius = Math.max(size.x, size.y, size.z) * 0.5;
    const distance = radius / Math.sin(THREE.MathUtils.degToRad(threeCamera.fov * 0.5)) * 1.15;
    threeCamera.position.set(center.x, center.y + radius * 0.08, center.z + distance);
    orbitControls.minDistance = Math.max(radius * 0.7, 0.5);
    orbitControls.maxDistance = Math.max(radius * 8, 8);
    orbitControls.update();
    loading.classList.add("hidden");
  };

  gltfLoader.load(
    anatomyModels[modelId].assetUrl,
    (gltf) => finishLoad(gltf.scene),
    undefined,
    (error) => {
      if (requestId !== modelLoadId || viewerModal.classList.contains("hidden")) return;
      console.error(`Could not load GLTF model "${modelId}":`, error);
      loading.innerHTML = "<i></i> USING BUILT-IN ANATOMY PREVIEW";
      const fallback = createModelGroup(modelId);
      finishLoad(fallback, true);
    }
  );
}

function animateThreeViewer() {
  if (viewerModal.classList.contains("hidden")) {
    viewerAnimationFrame = 0;
    return;
  }
  viewerAnimationFrame = requestAnimationFrame(animateThreeViewer);
  if (orbitControls) orbitControls.update();
  drawViewerLabelLines();
  if (threeRenderer && threeScene && threeCamera) threeRenderer.render(threeScene, threeCamera);
}

function stopThreeViewer() {
  if (viewerAnimationFrame) cancelAnimationFrame(viewerAnimationFrame);
  viewerAnimationFrame = 0;
}

function openThreeViewer(modelId, anatomy) {
  const config = anatomyModels[modelId];
  activeModelId = modelId;
  document.querySelector("#viewer-title").textContent = config.name;
  document.querySelector("#viewer-category").textContent = config.category;
  document.querySelector("#viewer-description").textContent = anatomy.description;
  document.querySelector("#viewer-model-code").textContent = config.code;
  document.querySelector("#viewer-model-name").textContent = `${config.name.toUpperCase()} · ${config.specifications[3][1].toUpperCase()}`;
  const sourceLink = document.querySelector("#viewer-source-link");
  if (config.sourceUrl) {
    sourceLink.href = config.sourceUrl;
    sourceLink.classList.remove("hidden");
  } else {
    sourceLink.classList.add("hidden");
    sourceLink.removeAttribute("href");
  }
  document.querySelector("#viewer-specs").replaceChildren(...config.specifications.map(([label, value]) => {
    const row = document.createElement("div");
    row.className = "viewer-spec-row";
    const name = document.createElement("span");
    name.textContent = label;
    const spec = document.createElement("b");
    spec.textContent = value;
    row.append(name, spec);
    return row;
  }));
  document.querySelector("#viewer-stats-grid").replaceChildren(...config.stats.map(([label, value], index) => {
    const stat = document.createElement("div");
    stat.className = "viewer-stat";
    const title = document.createElement("span");
    title.textContent = label;
    const reading = document.createElement("b");
    reading.classList.toggle("cyan", index === 0);
    reading.textContent = value;
    stat.append(title, reading);
    return stat;
  }));
  document.querySelector("#viewer-loading").classList.remove("hidden");
  viewerModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  try {
    ensureThreeViewer();
    setThreeModel(modelId);
    resizeThreeViewer();
    if (!viewerAnimationFrame) animateThreeViewer();
  } catch (error) {
    document.querySelector("#viewer-loading").textContent = error.message;
    showToast(error.message);
  }
}

document.querySelectorAll("[data-analyze]").forEach((button) => {
  button.addEventListener("click", async () => {
    button.disabled = true;
    const originalText = button.innerHTML;
    button.textContent = "LOADING ANATOMY...";
    try {
      const card = button.closest(".model-card");
      const modelId = card?.dataset.model;
      const model = anatomyModels[modelId];
      if (!model) throw new Error("This anatomy model is not available.");
      openThreeViewer(modelId, await fetchAnatomy(button.dataset.analyze));
    } catch (error) {
      showToast(getApiErrorMessage(error));
    } finally {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  });
});

document.querySelector("#back-to-library").addEventListener("click", () => showPage("explore"));

function addMessage(message, sender, html = false) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${sender === "user" ? "user-message" : "assistant-message"}`;
  const avatar = document.createElement("span");
  avatar.className = "message-avatar";
  avatar.textContent = sender === "user" ? "U" : "✳";
  const body = document.createElement("div");
  body.className = "message-body";
  const label = document.createElement("span");
  label.className = "message-label";
  label.textContent = sender === "user" ? "YOU · NOW" : "SURGICAL AI · NOW";
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  if (html) {
    bubble.append(message);
  } else {
    bubble.textContent = message;
  }
  body.append(label, bubble);
  wrapper.append(avatar, body);
  const messages = document.querySelector("#chat-messages");
  messages.append(wrapper);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

function appendInlineMarkdown(parent, text) {
  const formatPattern = /(\*\*([^*]+)\*\*|(?<!\*)\*([^*]+)\*(?!\*)|_([^_]+)_)/g;
  let lastIndex = 0;
  let match;
  while ((match = formatPattern.exec(text)) !== null) {
    parent.append(document.createTextNode(text.slice(lastIndex, match.index)));
    const emphasis = document.createElement(match[2] ? "strong" : "em");
    emphasis.textContent = match[2] || match[3] || match[4];
    parent.append(emphasis);
    lastIndex = formatPattern.lastIndex;
  }
  parent.append(document.createTextNode(text.slice(lastIndex)));
}

function renderAssistantMarkdown(markdown) {
  const fragment = document.createDocumentFragment();
  let list = null;

  markdown.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      list = null;
      return;
    }
    const bullet = trimmedLine.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    if (bullet) {
      if (!list) {
        list = document.createElement("ul");
        fragment.append(list);
      }
      const item = document.createElement("li");
      appendInlineMarkdown(item, bullet[1]);
      list.append(item);
      return;
    }

    list = null;
    const heading = trimmedLine.match(/^#{1,3}\s+(.+)$/);
    const paragraph = document.createElement(heading ? "h3" : "p");
    appendInlineMarkdown(paragraph, heading ? heading[1] : trimmedLine);
    fragment.append(paragraph);
  });
  return fragment;
}

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    showPage("assistant");
    const input = document.querySelector("#chat-input");
    input.value = button.dataset.prompt;
    document.querySelector("#chat-form").requestSubmit();
  });
});

document.querySelector("#chat-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#chat-input");
  const sendButton = event.currentTarget.querySelector("button");
  const prompt = input.value.trim();
  if (!prompt) return;

  addMessage(prompt, "user");
  input.value = "";
  sendButton.disabled = true;
  input.disabled = true;
  const thinkingBubble = addMessage("SurgicalAI is thinking...", "assistant");
  thinkingBubble.classList.add("message-thinking");

  try {
    const response = await fetch(`${window.location.origin}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt })
    });
    const result = await response.json();
    if (!response.ok || !result.success || typeof result.reply !== "string") {
      throw new Error(result.error || "The medical assistant could not answer that request.");
    }
    thinkingBubble.classList.remove("message-thinking");
    thinkingBubble.replaceChildren(renderAssistantMarkdown(result.reply));
  } catch (error) {
    thinkingBubble.classList.remove("message-thinking");
    thinkingBubble.textContent = `I couldn’t reach the medical assistant: ${getApiErrorMessage(error)}`;
  } finally {
    sendButton.disabled = false;
    input.disabled = false;
    input.focus();
  }
});

document.querySelector("#qr-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#body-part");
  const button = document.querySelector("#generate-qr-button");
  const resultPanel = document.querySelector("#qr-result");
  const errorPanel = document.querySelector("#qr-error");
  const bodyPart = input.value.trim();

  resultPanel.classList.add("hidden");
  errorPanel.classList.add("hidden");
  button.disabled = true;
  button.innerHTML = "Generating...";

  try {
    const response = await fetch("/api/generate-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bodyPart })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Could not generate the QR code.");
    }

    const qrImage = document.querySelector("#qr-image");
    qrImage.src = result.dataUrl;
    document.querySelector("#qr-result-title").textContent = result.bodyPart;
    document.querySelector("#download-qr").href = result.dataUrl;
    document.querySelector("#download-qr").download =
      `surgicalai-${result.bodyPart.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    resultPanel.classList.remove("hidden");
  } catch (error) {
    errorPanel.textContent = getApiErrorMessage(error);
    errorPanel.classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.innerHTML = 'Generate <span>↗</span>';
  }
});

async function getQrOrigin() {
  if (!appOriginPromise) {
    appOriginPromise = fetch("/api/app-origin")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || typeof result.origin !== "string") {
          throw new Error("Could not determine the address for QR links.");
        }
        return result.origin;
      })
      .catch(() => window.location.origin);
  }
  return appOriginPromise;
}

function getModelUrl(modelId, origin) {
  const model = anatomyModels[modelId];
  if (!model) throw new Error("This anatomy model is not available.");
  return new URL(model.assetUrl, origin).href;
}

function getModelDeepLink(modelId, origin) {
  const model = anatomyModels[modelId];
  const deepLink = new URL("/", origin);
  deepLink.searchParams.set("arModel", getModelUrl(modelId, origin));
  deepLink.searchParams.set("organ", model.name);
  return deepLink.href;
}

async function updateVirtualQr(modelId) {
  const model = anatomyModels[modelId];
  if (!model) return;
  const requestId = ++qrRequestId;
  const image = document.querySelector("#virtual-qr-image");
  const thumb = document.querySelector("#virtual-model-preview");
  const thumbFallback = document.querySelector("#virtual-thumb-fallback");
  const thumbFrame = document.querySelector("#virtual-model-thumbnail");
  const status = document.querySelector("#virtual-qr-status");
  const modelLabel = document.querySelector("#virtual-model-id");
  document.querySelector("#virtual-selected-name").textContent = model.name;
  modelLabel.textContent = `MODEL: ${model.modelId.toUpperCase()}`;
  thumbFrame.className = `virtual-model-thumbnail ${modelId === "heart" ? "heart-icon" : `${modelId}-icon`}`;
  thumb.alt = `${model.name} 3D model preview`;
  thumbFallback.hidden = false;
  thumb.removeAttribute("src");
  thumb.addEventListener("load", () => {
    if (requestId === qrRequestId) thumbFallback.hidden = true;
  }, { once: true });
  thumb.addEventListener("error", (event) => {
    if (requestId !== qrRequestId) return;
    console.error(`Could not load the ${modelId} QR preview model:`, event);
    thumbFallback.hidden = false;
  }, { once: true });
  thumb.setAttribute("src", model.assetUrl);
  status.textContent = "GENERATING QR LINK...";
  image.classList.remove("ready");

  try {
    const origin = await getQrOrigin();
    const response = await fetch("/api/generate-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bodyPart: model.name,
        url: getModelDeepLink(modelId, origin)
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "QR generation failed.");
    if (requestId !== qrRequestId) return;
    image.onload = () => image.classList.add("ready");
    image.onerror = () => {
      status.textContent = "QR IMAGE COULD NOT LOAD";
      image.classList.remove("ready");
    };
    image.src = result.dataUrl;
    status.textContent = "QR LINK READY";
  } catch (error) {
    if (requestId !== qrRequestId) return;
    status.textContent = getApiErrorMessage(error);
    showToast(getApiErrorMessage(error));
  }
}

document.querySelectorAll(".organ-option").forEach((button) => {
  button.addEventListener("click", () => {
    const modelId = button.dataset.organ;
    if (!anatomyModels[modelId]) return;
    activeModelId = modelId;
    document.querySelectorAll(".organ-option").forEach((option) => {
      option.classList.toggle("active", option === button);
    });
    updateVirtualQr(modelId);
  });
});

function initializeStandaloneViewer() {
  const parameters = new URLSearchParams(window.location.search);
  const modelUrlParameter = parameters.get("arModel");
  if (!modelUrlParameter) return;

  let modelUrl;
  try {
    modelUrl = new URL(modelUrlParameter, window.location.origin);
  } catch {
    showToast("The AR model link is invalid.");
    return;
  }
  if (
    modelUrl.origin !== window.location.origin ||
    !Object.values(anatomyModels).some((model) => modelUrl.pathname === model.assetUrl)
  ) {
    showToast("This AR link does not point to a supported SurgicalAI model.");
    return;
  }

  const modelId = Object.entries(anatomyModels)
    .find(([, model]) => modelUrl.pathname === model.assetUrl)[0];
  const model = anatomyModels[modelId];
  const organName = parameters.get("organ") || model.name;
  document.body.classList.add("standalone-mode");
  pages.forEach((page) => page.classList.toggle("active", page.dataset.page === "ar-standalone"));
  document.querySelectorAll(".nav-link").forEach((link) => link.classList.remove("active"));
  document.querySelector("#standalone-organ-name").textContent = organName;

  const viewer = document.querySelector("#ar-model-viewer");
  const poster = viewer.querySelector(".model-poster");
  viewer.querySelectorAll(".ar-callout").forEach((hotspot, index) => {
    const callout = model.callouts[index];
    if (!callout) {
      hotspot.hidden = true;
      return;
    }
    hotspot.hidden = false;
    hotspot.textContent = callout[0];
    hotspot.setAttribute("data-position", callout[1]);
    hotspot.setAttribute("data-normal", "0m 0m 1m");
  });
  viewer.setAttribute("src", modelUrl.href);
  viewer.addEventListener("load", () => poster?.remove(), { once: true });
  viewer.addEventListener("error", () => {
    if (poster) poster.textContent = "MODEL FAILED TO LOAD · CHECK YOUR CONNECTION";
  }, { once: true });
}

document.querySelectorAll("[data-model-preview]").forEach((preview) => {
  const modelId = preview.dataset.modelPreview;
  const model = anatomyModels[modelId];
  if (!model) {
    console.error(`No local anatomy asset is configured for preview "${modelId}".`);
    return;
  }
  preview.setAttribute("src", model.assetUrl);
  preview.addEventListener("error", (event) => {
    console.error(`Could not load the ${modelId} card preview model:`, event);
  }, { once: true });
});

initializeStandaloneViewer();

const quizBanks = {
  heart: {
    easy: [
      { question: "How many chambers does the human heart have?", options: ["Two", "Three", "Four", "Six"], answer: 2 },
      { question: "Which side of the heart pumps blood to the lungs?", options: ["Right side", "Left side", "Both sides directly", "Neither side"], answer: 0 },
      { question: "Which vessels carry blood from the lungs back to the heart?", options: ["Aorta", "Pulmonary veins", "Venae cavae", "Coronary arteries"], answer: 1 }
    ],
    medium: [
      { question: "Which valve lies between the left atrium and left ventricle?", options: ["Tricuspid", "Pulmonary", "Aortic", "Mitral"], answer: 3 },
      { question: "Which chamber ejects blood into the aorta?", options: ["Right atrium", "Right ventricle", "Left atrium", "Left ventricle"], answer: 3 },
      { question: "Which structure normally initiates the heartbeat?", options: ["AV node", "SA node", "Bundle branches", "Purkinje fibers"], answer: 1 }
    ],
    hard: [
      { question: "The left main coronary artery most commonly divides into which two major branches?", options: ["Right marginal and posterior descending", "LAD and circumflex", "Acute marginal and diagonal", "PDA and circumflex"], answer: 1 },
      { question: "During left ventricular systole, which event allows blood to enter the aorta?", options: ["Mitral valve opens", "Aortic valve opens", "Tricuspid valve opens", "Pulmonary valve closes"], answer: 1 },
      { question: "What is the main function of the chordae tendineae during ventricular contraction?", options: ["Open the semilunar valves", "Prevent AV valve leaflets from prolapsing into the atria", "Carry electrical impulses to the ventricles", "Supply blood to the papillary muscles"], answer: 1 }
    ]
  },
  respiratory: {
    easy: [
      { question: "Where does most gas exchange occur in the lungs?", options: ["Trachea", "Alveoli", "Larynx", "Main bronchi"], answer: 1 },
      { question: "Which muscle is the primary driver of quiet inspiration?", options: ["Diaphragm", "Biceps", "Masseter", "Rectus abdominis"], answer: 0 },
      { question: "Which airway connects the larynx to the main bronchi?", options: ["Esophagus", "Pharynx", "Trachea", "Pleura"], answer: 2 }
    ],
    medium: [
      { question: "What is a key function of pulmonary surfactant?", options: ["Increase mucus production", "Reduce alveolar surface tension", "Carry oxygen in plasma", "Contract the diaphragm"], answer: 1 },
      { question: "How many lobes does the right lung normally have?", options: ["One", "Two", "Three", "Four"], answer: 2 },
      { question: "Pulmonary arteries carry blood that is generally:", options: ["Oxygen-rich from the left ventricle", "Oxygen-poor toward the lungs", "Oxygen-rich toward the brain", "Oxygen-poor toward the liver"], answer: 1 }
    ],
    hard: [
      { question: "In an upright person, the ventilation-perfusion ratio is generally highest at the:", options: ["Lung base", "Lung apex", "Hilum only", "Same at every level"], answer: 1 },
      { question: "Which alveolar cell type produces surfactant?", options: ["Type I pneumocytes", "Type II pneumocytes", "Alveolar macrophages", "Ciliated columnar cells"], answer: 1 },
      { question: "During normal inspiration, intrapleural pressure becomes:", options: ["More negative", "Positive throughout", "Equal to arterial pressure", "Unchanged"], answer: 0 }
    ]
  },
  brain: {
    easy: [
      { question: "Which part of the brain is most associated with conscious thought and voluntary action?", options: ["Cerebrum", "Cerebellum", "Medulla only", "Spinal cord"], answer: 0 },
      { question: "Which brain structure helps coordinate balance and movement?", options: ["Thalamus", "Cerebellum", "Amygdala", "Hypothalamus"], answer: 1 },
      { question: "Which lobe is primarily responsible for processing vision?", options: ["Frontal", "Parietal", "Temporal", "Occipital"], answer: 3 }
    ],
    medium: [
      { question: "In most people, Broca's area is important for:", options: ["Speech production", "Visual reflexes", "Balance", "Temperature regulation"], answer: 0 },
      { question: "The parietal lobe is especially important for processing:", options: ["Somatic sensation and spatial information", "Hormone release", "Hearing only", "Cardiac rhythm"], answer: 0 },
      { question: "What is the primary role of the corpus callosum?", options: ["Connect the two cerebral hemispheres", "Produce cerebrospinal fluid", "Control the pupil", "Connect the cerebellum to the spinal cord"], answer: 0 }
    ],
    hard: [
      { question: "Most corticospinal fibers cross to the opposite side at the:", options: ["Midbrain tectum", "Pyramidal decussation in the caudal medulla", "Optic chiasm", "Thalamus"], answer: 1 },
      { question: "The hippocampus is especially important for:", options: ["Formation of new declarative memories", "Primary visual processing", "Initiating skeletal muscle contraction", "Regulating pupil size"], answer: 0 },
      { question: "The basal ganglia contribute most directly to:", options: ["Selecting and modulating movement", "Detecting sound frequency", "Producing cerebrospinal fluid", "Carrying visual input from the retina"], answer: 0 }
    ]
  },
  eye: {
    easy: [
      { question: "Which transparent structure at the front of the eye provides much of its initial refraction?", options: ["Cornea", "Retina", "Optic nerve", "Sclera"], answer: 0 },
      { question: "Which colored structure changes pupil size?", options: ["Choroid", "Iris", "Retina", "Lens capsule"], answer: 1 },
      { question: "Which structure contains the photoreceptors?", options: ["Cornea", "Sclera", "Retina", "Optic disc"], answer: 2 }
    ],
    medium: [
      { question: "Which retinal region provides the sharpest central visual acuity?", options: ["Optic disc", "Fovea centralis", "Ora serrata", "Ciliary body"], answer: 1 },
      { question: "Which structure changes shape to focus on near objects?", options: ["Lens", "Sclera", "Optic nerve", "Conjunctiva"], answer: 0 },
      { question: "Aqueous humor is found in the:", options: ["Anterior segment, including the anterior and posterior chambers", "Vitreous chamber only", "Subarachnoid space", "Optic nerve sheath only"], answer: 0 }
    ],
    hard: [
      { question: "Which photoreceptors are most important for vision in dim light?", options: ["Cones", "Rods", "Ganglion cells", "Bipolar cells"], answer: 1 },
      { question: "Which retinal axons cross at the optic chiasm?", options: ["Fibers from the temporal retina", "Fibers from the nasal retina", "All optic nerve fibers", "No optic nerve fibers"], answer: 1 },
      { question: "Aqueous humor primarily leaves the anterior chamber through the trabecular meshwork into the:", options: ["Canal of Schlemm", "Vitreous body", "Central retinal vein", "Nasolacrimal duct"], answer: 0 }
    ]
  },
  skeleton: {
    easy: [
      { question: "Which is the longest bone in the human body?", options: ["Humerus", "Tibia", "Femur", "Fibula"], answer: 2 },
      { question: "Which bone forms the kneecap?", options: ["Patella", "Talus", "Scapula", "Ulna"], answer: 0 },
      { question: "What is one important function of red bone marrow?", options: ["Produce blood cells", "Make joint cartilage", "Digest bone minerals", "Transmit visual signals"], answer: 0 }
    ],
    medium: [
      { question: "Which group belongs to the axial skeleton?", options: ["Skull, vertebral column, and rib cage", "Arms and shoulder girdle only", "Legs and pelvic girdle only", "Hands and feet only"], answer: 0 },
      { question: "Which bone cell is primarily responsible for forming new bone matrix?", options: ["Osteoclast", "Osteoblast", "Chondrocyte", "Erythrocyte"], answer: 1 },
      { question: "Which joint type freely permits movement and contains a joint cavity?", options: ["Fibrous", "Cartilaginous", "Synovial", "Suture"], answer: 2 }
    ],
    hard: [
      { question: "In adults, the femoral head is supplied mainly by retinacular branches of the:", options: ["Medial circumflex femoral artery", "Inferior epigastric artery", "Anterior tibial artery", "Obturator artery alone"], answer: 0 },
      { question: "The structural unit of compact bone organized around a central canal is the:", options: ["Osteon", "Trabecula", "Epiphysis", "Meniscus"], answer: 0 },
      { question: "Which cell is chiefly responsible for bone resorption?", options: ["Osteoblast", "Osteocyte", "Osteoclast", "Fibroblast"], answer: 2 }
    ]
  }
};

const quizModelLabels = {
  heart: "Human Heart",
  respiratory: "Respiratory System",
  brain: "Cerebral Cortex",
  eye: "Ocular Structure",
  skeleton: "Human Skeleton"
};
let selectedQuizModel = "heart";
let selectedQuizLevel = "easy";
let activeQuizQuestions = [];
let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

function updateQuizSelectionLabel() {
  document.querySelector("#quiz-selected-label").textContent =
    `${quizModelLabels[selectedQuizModel].toUpperCase()} · ${selectedQuizLevel.toUpperCase()}`;
}

document.querySelectorAll("[data-quiz-model]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedQuizModel = button.dataset.quizModel;
    document.querySelectorAll("[data-quiz-model]").forEach((option) => {
      option.classList.toggle("selected", option === button);
    });
    updateQuizSelectionLabel();
  });
});

document.querySelectorAll("[data-quiz-level]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedQuizLevel = button.dataset.quizLevel;
    document.querySelectorAll("[data-quiz-level]").forEach((option) => {
      option.classList.toggle("selected", option === button);
    });
    updateQuizSelectionLabel();
  });
});

function renderQuizQuestion() {
  const question = activeQuizQuestions[quizIndex];
  quizAnswered = false;
  document.querySelector("#quiz-topic-label").textContent =
    `${quizModelLabels[selectedQuizModel].toUpperCase()} · ${selectedQuizLevel.toUpperCase()}`;
  document.querySelector("#quiz-question-number").textContent = String(quizIndex + 1).padStart(2, "0");
  document.querySelector("#quiz-total-questions").textContent = String(activeQuizQuestions.length).padStart(2, "0");
  document.querySelector("#quiz-progress-bar").style.width =
    `${((quizIndex + 1) / activeQuizQuestions.length) * 100}%`;
  document.querySelector("#quiz-question").textContent = question.question;
  document.querySelector("#quiz-result").textContent = "";
  document.querySelector("#quiz-score").textContent = `SCORE ${quizScore} / ${quizIndex}`;
  document.querySelector("#next-question").classList.add("hidden");
  const options = document.querySelector("#quiz-options");
  options.replaceChildren(...question.options.map((text, index) => {
    const button = document.createElement("button");
    button.className = "quiz-option";
    button.textContent = text;
    button.addEventListener("click", () => answerQuizQuestion(index));
    return button;
  }));
}

function answerQuizQuestion(selectedIndex) {
  if (quizAnswered) return;
  quizAnswered = true;
  const correctIndex = activeQuizQuestions[quizIndex].answer;
  const options = [...document.querySelectorAll(".quiz-option")];
  options.forEach((option, index) => {
    option.disabled = true;
    if (index === correctIndex) option.classList.add("correct");
    if (index === selectedIndex && index !== correctIndex) option.classList.add("incorrect");
  });
  if (selectedIndex === correctIndex) {
    quizScore += 1;
    document.querySelector("#quiz-result").textContent = "Correct — great recall.";
  } else {
    document.querySelector("#quiz-result").textContent =
      `Not quite. The correct answer is ${activeQuizQuestions[quizIndex].options[correctIndex]}.`;
  }
  document.querySelector("#quiz-score").textContent = `SCORE ${quizScore} / ${quizIndex + 1}`;
  const nextButton = document.querySelector("#next-question");
  nextButton.textContent = quizIndex === activeQuizQuestions.length - 1 ? "See results →" : "Next question →";
  nextButton.classList.remove("hidden");
}

document.querySelector("#start-quiz").addEventListener("click", () => {
  activeQuizQuestions = quizBanks[selectedQuizModel][selectedQuizLevel];
  quizIndex = 0;
  quizScore = 0;
  document.querySelector("#quiz-question-card").classList.remove("hidden");
  renderQuizQuestion();
  document.querySelector("#quiz-question-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#next-question").addEventListener("click", (event) => {
  if (quizIndex < activeQuizQuestions.length - 1) {
    quizIndex += 1;
    renderQuizQuestion();
    return;
  }
  const percentage = Math.round((quizScore / activeQuizQuestions.length) * 100);
  document.querySelector("#quiz-topic-label").textContent = "QUIZ COMPLETE";
  document.querySelector("#quiz-question").textContent =
    `You scored ${quizScore} out of ${activeQuizQuestions.length} (${percentage}%).`;
  document.querySelector("#quiz-options").replaceChildren();
  document.querySelector("#quiz-progress-bar").style.width = "100%";
  document.querySelector("#quiz-result").textContent =
    percentage === 100 ? "Perfect score — excellent anatomy knowledge." :
      percentage >= 67 ? "Well done. Try another level to keep building your knowledge." :
        "Keep practicing. Choose a different level or model and try again.";
  document.querySelector("#quiz-score").textContent = `FINAL SCORE ${quizScore} / ${activeQuizQuestions.length}`;
  event.currentTarget.classList.add("hidden");
});
