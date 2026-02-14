const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({ storage });

const alerts = [];
const sounds = [
  { id: "default", name: "Default Deterrent", source: "built-in" }
];
const settings = {
  confidenceThreshold: 0.5,
  autoSound: true,
  pushAlerts: true,
  volume: 70,
  selectedSoundId: "default"
};

app.get("/", (req, res) => {
  res.send("Smart Farm Cloud API is running");
});

app.get("/alerts", (req, res) => {
  res.json({ alerts });
});

app.get("/sounds", (req, res) => {
  res.json({ sounds, selectedSoundId: settings.selectedSoundId });
});

app.post("/sounds/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const sound = {
    id: String(Date.now()),
    name: req.file.originalname,
    filename: req.file.filename,
    source: "uploaded"
  };

  sounds.push(sound);
  settings.selectedSoundId = sound.id;
  res.json({ status: "uploaded", sound, selectedSoundId: sound.id });
});

app.post("/sounds/select", (req, res) => {
  const { soundId } = req.body || {};
  const exists = sounds.some((sound) => sound.id === soundId);

  if (!exists) {
    return res.status(404).json({ error: "Sound not found" });
  }

  settings.selectedSoundId = soundId;
  res.json({ status: "selected", selectedSoundId: soundId });
});

app.post("/device/detection", (req, res) => {
  console.log("Detection event:", req.body);
  const confidence = Number(req.body?.confidence) || 0.8;
  const time = req.body?.time || new Date().toLocaleTimeString();
  alerts.unshift({
    id: String(Date.now()),
    time,
    confidence
  });
  res.json({ status: "received" });
});

app.post("/device/command", (req, res) => {
  console.log("Command from app:", req.body);
  res.json({ status: "command sent" });
});

app.get("/settings", (req, res) => {
  res.json({ settings });
});

app.put("/settings", (req, res) => {
  const next = req.body || {};

  if (typeof next.confidenceThreshold === "number") {
    settings.confidenceThreshold = Math.min(
      1,
      Math.max(0, next.confidenceThreshold)
    );
  }

  if (typeof next.autoSound === "boolean") {
    settings.autoSound = next.autoSound;
  }

  if (typeof next.pushAlerts === "boolean") {
    settings.pushAlerts = next.pushAlerts;
  }

  if (typeof next.volume === "number") {
    settings.volume = Math.min(100, Math.max(0, next.volume));
  }

  if (typeof next.selectedSoundId === "string") {
    const exists = sounds.some((sound) => sound.id === next.selectedSoundId);
    if (exists) {
      settings.selectedSoundId = next.selectedSoundId;
    }
  }

  res.json({ status: "updated", settings });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
