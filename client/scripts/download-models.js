const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";

const MODELS = [
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_expression_model-weights_manifest.json",
  "face_expression_model-shard1"
];

const modelsDir = path.join(__dirname, "../public/models");
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

console.log("[FaceTracking] Downloading face-api models to", modelsDir);

MODELS.forEach(model => {
  const url = `${BASE_URL}/${model}`;
  const dest = path.join(modelsDir, model);
  if (fs.existsSync(dest)) {
    console.log(`[FaceTracking] Model ${model} already exists, skipping.`);
    return;
  }
  const file = fs.createWriteStream(dest);
  https.get(url, res => {
    if (res.statusCode !== 200) {
      console.error(`[FaceTracking] Failed to download ${model}: HTTP ${res.statusCode}`);
      return;
    }
    res.pipe(file);
    file.on("finish", () => {
      file.close();
      console.log(`[FaceTracking] Successfully downloaded: ${model}`);
    });
  }).on("error", err => {
    fs.unlink(dest, () => {});
    console.error(`[FaceTracking] Error downloading ${model}:`, err.message);
  });
});
