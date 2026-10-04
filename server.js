require("dotenv").config();

const express = require("express");
const cors = require("cors");
const QRCode = require("qrcode");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_SYSTEM_INSTRUCTION =
  "You are SurgicalAI, an expert medical, anatomical, and surgical AI assistant. Provide concise, clinically grounded, accurate answers to any questions regarding human anatomy, physiological systems, pathology, medical conditions, and surgical procedures.";
const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
const geminiModel = geminiApiKey && !geminiApiKey.startsWith("YOUR_")
  ? new GoogleGenerativeAI(geminiApiKey).getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: GEMINI_SYSTEM_INSTRUCTION
  })
  : null;

if (!geminiModel) {
  console.warn("GEMINI_API_KEY is not configured; chat will use built-in anatomy responses.");
}

app.use(cors());
app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  if (req.path.split("/").some((segment) => segment.startsWith("."))) {
    return res.status(404).end();
  }
  return next();
});
app.use(express.static(__dirname));

const anatomy = {
  "respiratory system": {
    category: "RESPIRATORY",
    description:
      "The respiratory system exchanges oxygen and carbon dioxide between the atmosphere and circulating blood.",
    clinicalBreakdown: [
      "Air travels through the nasal cavity, pharynx, larynx, trachea, and branching bronchi.",
      "Alveoli provide a large, thin-walled surface for pulmonary gas exchange.",
      "The diaphragm and intercostal muscles generate the pressure changes needed for ventilation."
    ]
  },
  "lungs": {
    category: "RESPIRATORY",
    description:
      "The paired lungs are the primary organs of respiration, containing branching airways and alveoli.",
    clinicalBreakdown: [
      "The right lung has three lobes; the left lung has two lobes and a cardiac notch.",
      "The visceral and parietal pleura surround each lung and form a low-friction pleural space.",
      "Pulmonary arteries carry deoxygenated blood to the alveoli; pulmonary veins return oxygenated blood."
    ]
  },
  "cerebral cortex": {
    category: "NEUROLOGY",
    description:
      "The cerebral cortex is the folded outer layer of the cerebrum, supporting perception, language, and voluntary action.",
    clinicalBreakdown: [
      "The frontal lobe supports executive function, speech production, and motor planning.",
      "The parietal lobe integrates somatic sensation and spatial information.",
      "The temporal and occipital lobes contribute to memory, auditory processing, and vision."
    ]
  },
  "brain": {
    category: "NEUROLOGY",
    description:
      "The brain is the central organ of the nervous system, coordinating sensation, movement, cognition, and autonomic function.",
    clinicalBreakdown: [
      "The cerebrum contains paired hemispheres connected by the corpus callosum.",
      "The cerebellum coordinates balance and movement; the brainstem regulates essential autonomic functions.",
      "The meninges and cerebrospinal fluid help protect and support the central nervous system."
    ]
  },
  "human heart": {
    category: "CARDIOLOGY",
    description:
      "The human heart is a muscular, four-chambered pump that maintains pulmonary and systemic circulation.",
    clinicalBreakdown: [
      "The right atrium receives systemic venous blood; the right ventricle pumps it through the pulmonary valve.",
      "Oxygenated blood returns to the left atrium and is ejected by the left ventricle through the aortic valve.",
      "The coronary arteries arise from the aortic root and supply the myocardium."
    ]
  },
  "heart": {
    category: "CARDIOLOGY",
    description:
      "The heart is a muscular, four-chambered pump that maintains pulmonary and systemic circulation.",
    clinicalBreakdown: [
      "The right atrium receives systemic venous blood; the right ventricle pumps it through the pulmonary valve.",
      "Oxygenated blood returns to the left atrium and is ejected by the left ventricle through the aortic valve.",
      "The coronary arteries arise from the aortic root and supply the myocardium."
    ]
  },
  "femur": {
    category: "ORTHOPEDIC",
    description:
      "The femur is the longest and strongest bone in the body, spanning the hip and knee joints.",
    clinicalBreakdown: [
      "The femoral head articulates with the acetabulum; the neck connects it to the shaft.",
      "The distal femoral condyles articulate with the tibia and patella.",
      "Femoral fractures may compromise surrounding vessels, nerves, and weight-bearing function."
    ]
  },
  "ocular structure": {
    category: "VISUAL",
    description:
      "The ocular structures focus incoming light and convert it into neural signals for visual processing.",
    clinicalBreakdown: [
      "The cornea and lens refract light toward the retina.",
      "Photoreceptors in the retina convert light into electrical signals carried by the optic nerve.",
      "The iris regulates pupil diameter and the amount of light entering the eye."
    ]
  },
  "human skeleton": {
    category: "ORTHOPEDIC",
    description:
      "The adult human skeleton provides structural support, protects organs, and enables movement.",
    clinicalBreakdown: [
      "The axial skeleton includes the skull, vertebral column, ribs, and sternum.",
      "The appendicular skeleton includes the limb bones and the pectoral and pelvic girdles.",
      "Bone marrow supports hematopoiesis, while remodeling maintains bone strength and mineral balance."
    ]
  }
};

app.get("/api/app-origin", (req, res) => {
  const requestHost = req.get("host");
  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol = forwardedProtocol || req.protocol;
  const requestedHostname = req.hostname;
  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(requestedHostname);
  let hostname = requestedHostname;

  if (isLoopback) {
    const candidates = Object.values(os.networkInterfaces())
      .flatMap((addresses) => addresses || [])
      .filter((address) => address.family === "IPv4" && !address.internal && !address.address.startsWith("169.254."))
      .map((address) => address.address)
      .sort((a, b) => {
        const rank = (ip) => ip.startsWith("192.168.") ? 0 : ip.startsWith("10.") ? 1 : ip.startsWith("172.") ? 2 : 3;
        return rank(a) - rank(b);
      });
    hostname = candidates[0] || requestedHostname;
  }

  const hostPort = requestHost?.match(/:\d+$/)?.[0] || "";
  return res.json({ origin: `${protocol}://${hostname}${hostPort}` });
});

const modelAssets = {
  heart: {
    name: "Human Heart",
    category: "CARDIOLOGY",
    glbUrl: "/api/models/heart.glb",
    sourceUrl:
      "https://sketchfab.com/3d-models/human-heart-anatomy-labeled-1b7bfb07e6b24dd891099395ed98e989",
    thumbnailUrl:
      "https://media.sketchfab.com/models/1b7bfb07e6b24dd891099395ed98e989/thumbnails/39ece424e2144e16b6458d14d7895be3/5b0bd19021d44737bf7b1171cfea55d1.jpeg",
    sourceType: "sketchfab-reference"
  },
  respiratory: {
    name: "Respiratory System",
    category: "RESPIRATORY",
    glbUrl: "/api/models/respiratory.glb",
    sourceUrl:
      "https://www.researchgate.net/figure/t-shows-names-for-regions-in-the-respiratory-internal-organ-model_fig3_327077397",
    sourceType: "diagram-reference"
  },
  brain: {
    name: "Cerebral Cortex",
    category: "NEUROLOGY",
    glbUrl: "/api/models/brain.glb",
    sourceUrl:
      "https://www.magnific.com/premium-ai-image/human-brain-anatomy_416210613.htm",
    sourceType: "image-reference"
  },
  eye: {
    name: "Ocular Structure",
    category: "VISUAL",
    glbUrl: "/api/models/eye.glb",
    thumbnailUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4wkRS9Ct_Tu4ZCM1K9ZbGkmdKEvXnfB__GbL09btAIA&s=10",
    sourceType: "image"
  },
  skeleton: {
    name: "Human Skeleton",
    category: "ORTHOPEDIC",
    glbUrl: "/api/models/skeleton.glb",
    sourceUrl:
      "https://sketchfab.com/3d-models/skeleton-names-of-human-skeleton-0c66fa3be6584d72a455accab123f1bd",
    thumbnailUrl:
      "https://media.sketchfab.com/models/0c66fa3be6584d72a455accab123f1bd/thumbnails/6935e261d1e74fe6b947fb05754fdad6/e19d0990e7264e1abe1e41a777e5c2ba.jpeg",
    sourceType: "sketchfab-reference"
  }
};

app.get("/api/model-assets", (req, res) => {
  res.set("Cache-Control", "public, max-age=3600");
  return res.json(modelAssets);
});

function createAnatomyGlb(modelId) {
  const shapes = [];
  const sphere = (center, scale, color, segments = 16, rings = 12, wave = 0) => {
    const positions = [];
    const indices = [];
    for (let ring = 0; ring <= rings; ring += 1) {
      const v = ring / rings;
      const phi = v * Math.PI;
      for (let segment = 0; segment <= segments; segment += 1) {
        const u = segment / segments;
        const theta = u * Math.PI * 2;
        const ripple = wave ? 1 + wave * Math.sin(theta * 7) * Math.sin(phi * 5) : 1;
        positions.push(
          center[0] + Math.sin(phi) * Math.cos(theta) * scale[0] * ripple,
          center[1] + Math.cos(phi) * scale[1] * ripple,
          center[2] + Math.sin(phi) * Math.sin(theta) * scale[2] * ripple
        );
      }
    }
    for (let ring = 0; ring < rings; ring += 1) {
      for (let segment = 0; segment < segments; segment += 1) {
        const a = ring * (segments + 1) + segment;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    shapes.push({ positions, indices, color });
  };
  const cylinder = (start, end, radius, color, sides = 10) => {
    const direction = [
      end[0] - start[0],
      end[1] - start[1],
      end[2] - start[2]
    ];
    const length = Math.hypot(...direction) || 1;
    const axis = direction.map((value) => value / length);
    const reference = Math.abs(axis[1]) > 0.92 ? [1, 0, 0] : [0, 1, 0];
    const cross = (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
    const u = cross(axis, reference);
    const uLength = Math.hypot(...u) || 1;
    u.forEach((value, index) => { u[index] = value / uLength; });
    const v = cross(axis, u);
    const positions = [];
    const indices = [];
    for (let endIndex = 0; endIndex < 2; endIndex += 1) {
      const origin = endIndex ? end : start;
      for (let side = 0; side < sides; side += 1) {
        const angle = side / sides * Math.PI * 2;
        positions.push(
          origin[0] + radius * (u[0] * Math.cos(angle) + v[0] * Math.sin(angle)),
          origin[1] + radius * (u[1] * Math.cos(angle) + v[1] * Math.sin(angle)),
          origin[2] + radius * (u[2] * Math.cos(angle) + v[2] * Math.sin(angle))
        );
      }
    }
    for (let side = 0; side < sides; side += 1) {
      const next = (side + 1) % sides;
      indices.push(side, sides + side, next, next, sides + side, sides + next);
    }
    shapes.push({ positions, indices, color });
  };

  if (modelId === "heart") {
    sphere([-0.25, -0.12, 0], [0.34, 0.55, 0.3], "#d83f60");
    sphere([0.25, -0.12, 0], [0.34, 0.55, 0.3], "#f36b83");
    sphere([-0.22, 0.44, 0], [0.25, 0.3, 0.25], "#f27b91");
    sphere([0.22, 0.44, 0], [0.25, 0.3, 0.25], "#c93658");
    cylinder([-0.18, 0.55, 0], [-0.18, 1.05, 0], 0.1, "#ed665e");
    cylinder([0.18, 0.5, 0], [0.3, 1.08, 0], 0.11, "#db4968");
    cylinder([0.2, 0.57, 0], [0.58, 0.96, 0], 0.075, "#2995d0");
    cylinder([-0.28, 0.42, 0], [-0.44, 0.88, 0], 0.07, "#48b6df");
  } else if (modelId === "respiratory") {
    sphere([-0.48, -0.05, 0], [0.42, 0.75, 0.36], "#e9859d", 20, 16);
    sphere([0.48, -0.05, 0], [0.42, 0.75, 0.36], "#d9688c", 20, 16);
    cylinder([0, 1.12, 0], [0, 0.25, 0], 0.11, "#f4d9bd", 12);
    cylinder([0, 0.32, 0], [-0.35, 0.05, 0], 0.07, "#f3a6a1");
    cylinder([0, 0.32, 0], [0.35, 0.05, 0], 0.07, "#f3a6a1");
    for (let index = 0; index < 4; index += 1) {
      const y = -0.05 - index * 0.2;
      cylinder([-0.35, y, 0], [-0.62, y - 0.18, 0], 0.025, "#ffd2bd", 7);
      cylinder([0.35, y, 0], [0.62, y - 0.18, 0], 0.025, "#ffd2bd", 7);
    }
  } else if (modelId === "brain") {
    sphere([-0.43, 0.1, 0], [0.56, 0.68, 0.55], "#a348a8", 24, 18, 0.045);
    sphere([0.43, 0.1, 0], [0.56, 0.68, 0.55], "#cf69b7", 24, 18, 0.045);
    sphere([0, -0.72, 0], [0.2, 0.48, 0.22], "#e5a35a");
    sphere([0, -0.12, 0.49], [0.18, 0.28, 0.09], "#f0a5d4");
  } else if (modelId === "eye") {
    sphere([0, 0, 0], [0.76, 0.56, 0.62], "#f4eee2", 24, 18);
    sphere([-0.08, 0.03, 0.58], [0.28, 0.28, 0.12], "#29a9e0", 18, 12);
    sphere([-0.08, 0.03, 0.69], [0.13, 0.14, 0.055], "#071421", 16, 10);
    sphere([-0.12, 0.12, 0.73], [0.04, 0.04, 0.02], "#ffffff", 10, 8);
    cylinder([0.5, 0, 0], [1.08, 0, 0], 0.16, "#f2bd77", 12);
  } else if (modelId === "skeleton") {
    const bone = "#f1e5c8";
    sphere([0, 1.18, 0], [0.27, 0.31, 0.23], bone, 16, 12);
    sphere([0, 1.2, 0.19], [0.12, 0.1, 0.08], "#7895a2", 12, 8);
    cylinder([0, 0.88, 0], [0, -0.3, 0], 0.075, bone, 8);
    for (let index = 0; index < 6; index += 1) {
      const y = 0.73 - index * 0.16;
      sphere([0, y, 0], [0.105, 0.055, 0.09], index % 2 ? "#b6c9c8" : bone, 10, 8);
      const width = 0.38 + (index < 3 ? index * 0.055 : (5 - index) * 0.04);
      cylinder([0, y, 0], [-width, y - 0.09, 0.02], 0.025, bone, 7);
      cylinder([0, y, 0], [width, y - 0.09, 0.02], 0.025, bone, 7);
    }
    sphere([0, -0.42, 0], [0.39, 0.19, 0.22], "#d8cba9");
    for (const side of [-1, 1]) {
      cylinder([side * 0.2, -0.42, 0], [side * 0.34, -0.92, 0], 0.07, bone, 8);
      cylinder([side * 0.34, -0.92, 0], [side * 0.38, -1.38, 0], 0.052, "#d4c79f", 8);
      cylinder([side * 0.3, 0.48, 0], [side * 0.53, -0.08, 0], 0.05, bone, 8);
      cylinder([side * 0.53, -0.08, 0], [side * 0.62, -0.61, 0], 0.035, "#d4c79f", 8);
      sphere([side * 0.62, -0.68, 0], [0.12, 0.09, 0.1], bone, 10, 8);
    }
  } else {
    return null;
  }

  const binaryParts = [];
  const bufferViews = [];
  const accessors = [];
  let byteOffset = 0;
  const appendBuffer = (array, target) => {
    const data = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const padding = (4 - data.length % 4) % 4;
    binaryParts.push(data, Buffer.alloc(padding));
    const viewIndex = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: data.length, target });
    byteOffset += data.length + padding;
    return viewIndex;
  };
  const materials = [];
  const meshes = [];
  const nodes = [];

  shapes.forEach((shape, index) => {
    const positionArray = new Float32Array(shape.positions);
    const indexArray = new Uint16Array(shape.indices);
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let vertex = 0; vertex < positionArray.length; vertex += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], positionArray[vertex + axis]);
        max[axis] = Math.max(max[axis], positionArray[vertex + axis]);
      }
    }
    const positionView = appendBuffer(positionArray, 34962);
    const indexView = appendBuffer(indexArray, 34963);
    const positionAccessor = accessors.length;
    accessors.push({
      bufferView: positionView,
      componentType: 5126,
      count: positionArray.length / 3,
      type: "VEC3",
      min,
      max
    });
    const indexAccessor = accessors.length;
    accessors.push({
      bufferView: indexView,
      componentType: 5123,
      count: indexArray.length,
      type: "SCALAR",
      min: [0],
      max: [positionArray.length / 3 - 1]
    });
    const channels = shape.color.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16) / 255);
    materials.push({
      name: `${modelId}-material-${index}`,
      pbrMetallicRoughness: {
        baseColorFactor: [...channels, 1],
        metallicFactor: 0.05,
        roughnessFactor: 0.55
      },
      doubleSided: true
    });
    meshes.push({
      name: `${modelId}-part-${index}`,
      primitives: [{ attributes: { POSITION: positionAccessor }, indices: indexAccessor, material: index }]
    });
    nodes.push({ mesh: index });
  });

  const binary = Buffer.concat(binaryParts);
  const gltf = {
    asset: { version: "2.0", generator: "SurgicalAI anatomy model builder" },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, index) => index) }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: binary.length }]
  };
  const json = Buffer.from(JSON.stringify(gltf));
  const jsonPadding = (4 - json.length % 4) % 4;
  const jsonChunk = Buffer.concat([json, Buffer.alloc(jsonPadding, 0x20)]);
  const binaryPadding = (4 - binary.length % 4) % 4;
  const binaryChunk = Buffer.concat([binary, Buffer.alloc(binaryPadding)]);
  const totalLength = 12 + 8 + jsonChunk.length + 8 + binaryChunk.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binaryHeader = Buffer.alloc(8);
  binaryHeader.writeUInt32LE(binaryChunk.length, 0);
  binaryHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, jsonChunk, binaryHeader, binaryChunk]);
}

app.get("/api/models/:modelId.glb", (req, res) => {
  const model = createAnatomyGlb(req.params.modelId);
  if (!model) {
    return res.status(404).json({ error: "3D anatomy model not found." });
  }
  res.set("Cache-Control", "public, max-age=3600");
  res.type("model/gltf-binary").send(model);
});

app.get("/api/anatomy/:part", (req, res) => {
  const requestedPart = decodeURIComponent(req.params.part)
    .replace(/[-_]+/g, " ")
    .trim()
    .toLowerCase();
  const result = anatomy[requestedPart];

  if (!result) {
    return res.status(404).json({
      error: "Anatomy entry not found.",
      supportedParts: Object.keys(anatomy)
    });
  }

  return res.json({ part: requestedPart, ...result });
});

function getBuiltInMedicalReply(message) {
  const query = message.toLowerCase();
  if (/\b(fever|febrile|high temperature|chills)\b/.test(query)) {
    return [
      "**General fever care**",
      "I’m sorry you’re feeling unwell. For an uncomplicated fever, you can:",
      "- Rest, drink fluids regularly, and wear light, comfortable clothing.",
      "- Check your temperature with a thermometer and keep track of how long the fever lasts.",
      "- If you’re considering an over-the-counter fever medicine, follow its package directions and check with a pharmacist or clinician if you’re unsure whether it’s safe for you. Don’t give aspirin to a child or teenager unless a clinician specifically advises it.",
      "",
      "**Get urgent medical help** for difficulty breathing, confusion or difficulty waking, a seizure, a stiff neck, a concerning rash, blue or grey lips, or signs of severe dehydration. A baby under 3 months with a temperature of 38°C (100.4°F) or higher needs urgent medical assessment. Contact a healthcare professional if the fever is getting worse, lasts more than 3 days, or you’re worried.",
      "",
      "_This is general guidance, not a diagnosis. Gemini is currently unavailable; consult a qualified healthcare professional for advice about your situation._"
    ].join("\n");
  }

  const topics = [
    { terms: ["respirat", "lung", "pulmonary", "bronch", "alveol"], part: "respiratory system" },
    { terms: ["cerebral", "brain", "cortex", "neurolog", "cerebell"], part: "brain" },
    { terms: ["heart", "cardiac", "cardiology", "ventricle", "atrium"], part: "human heart" },
    { terms: ["eye", "ocular", "retina", "cornea", "vision"], part: "ocular structure" },
    { terms: ["skeleton", "bone", "femur", "fracture"], part: query.includes("femur") ? "femur" : "human skeleton" }
  ];
  const topic = topics.find(({ terms }) => terms.some((term) => query.includes(term)));
  const entry = topic ? anatomy[topic.part] : null;

  if (!entry) {
    return "Gemini is currently unavailable, so I can only provide built-in anatomy references. Try asking about the heart, respiratory system, brain, eye, skeleton, or femur. For personal symptoms or treatment decisions, please consult a qualified healthcare professional.";
  }

  return [
    `**${entry.category} · ${topic.part.replace(/\b\w/g, (letter) => letter.toUpperCase())}**`,
    entry.description,
    "",
    ...entry.clinicalBreakdown.map((item) => `- ${item}`),
    "",
    "_Gemini is currently unavailable. This built-in reference is for education, not personal diagnosis or treatment._"
  ].join("\n");
}

app.post("/api/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 8000) {
    return res.status(400).json({
      success: false,
      error: "Provide a message between 1 and 8000 characters."
    });
  }

  if (!geminiModel) {
    return res.json({ success: true, reply: getBuiltInMedicalReply(message) });
  }

  try {
    const result = await geminiModel.generateContent(message);
    const responseText = result.response.text().trim();
    if (!responseText) {
      throw new Error("Gemini returned an empty response.");
    }
    return res.json({ success: true, reply: responseText, source: "gemini" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      "Gemini chat request failed; using built-in response:",
      geminiApiKey ? errorMessage.replaceAll(geminiApiKey, "[redacted]") : errorMessage
    );
    return res.json({ success: true, reply: getBuiltInMedicalReply(message) });
  }
});

app.post("/api/generate-qr", async (req, res, next) => {
  const bodyPart =
    typeof req.body?.bodyPart === "string" ? req.body.bodyPart.trim() : "";
  const targetUrl =
    typeof req.body?.url === "string" ? req.body.url.trim() : "";

  if ((!bodyPart && !targetUrl) || bodyPart.length > 100 || targetUrl.length > 1200) {
    return res.status(400).json({
      error: "Provide a bodyPart (up to 100 characters) or a URL (up to 1200 characters)."
    });
  }

  if (targetUrl) {
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return res.status(400).json({ error: "The QR target must be a valid URL." });
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: "The QR target must use HTTP or HTTPS." });
    }
  }

  const anchor = targetUrl || `surgicalai://ar-anchor/${encodeURIComponent(bodyPart)}`;

  try {
    const dataUrl = await QRCode.toDataURL(anchor, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 1024,
      color: {
        dark: "#00d2ff",
        light: "#070c14"
      }
    });

    return res.json({ bodyPart, anchor, dataUrl });
  } catch (error) {
    return next(error);
  }
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  return res.sendFile(path.join(__dirname, "index.html"));
});

app.use((error, req, res, next) => {
  console.error("Request failed:", error);
  if (res.headersSent) {
    return next(error);
  }
  return res.status(500).json({ error: "An unexpected server error occurred." });
});

app.listen(PORT, () => {
  console.log(`SurgicalAI is running at http://localhost:${PORT}`);
});
