<div align="center">

# 💀 Doom Slayer

### Stop Doomscrolling. Start Living.

[![Live Demo](https://img.shields.io/badge/Demo-Live-a855f7?style=for-the-badge&logo=vercel&logoColor=white)](https://doom-slayer.vercel.app)
[![No Backend](https://img.shields.io/badge/Backend-None-10b981?style=for-the-badge)](.)
[![Privacy](https://img.shields.io/badge/Privacy-100%25_Local-6366f1?style=for-the-badge)](.)

<br />

**AI-powered focus assistant that catches you not looking at your screen and roasts you back to productivity.**

*All processing happens locally in your browser. No data ever leaves your device.*

<br />

[Features](#-features) • [Quick Start](#-quick-start) • [How It Works](#-how-it-works) • [Tech Stack](#-tech-stack) • [Deploy](#-deploy)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **AI Face Tracking** | MediaPipe FaceMesh with 468 facial landmarks |
| 👁️ **Eye Gaze Detection** | Tracks where your eyes are looking in real-time |
| 📱 **Phone Detection** | COCO-SSD AI detects smartphones in your webcam view |
| 📊 **Live Statistics** | Track focused time, distracted time, and alert count |
| 🔥 **Motivational Roasts** | 20+ harsh but effective messages to snap you back |
| 🎵 **Custom Punishment** | Set your own YouTube video for punishment |
| 📌 **Picture-in-Picture** | Float the webcam above other apps |
| ⚙️ **Adjustable Sensitivity** | Fine-tune detection to match your habits |
| 🔒 **100% Private** | Zero backend, everything runs client-side |

---

## 🚀 Quick Start

### Option 1: Open directly
```bash
git clone https://github.com/santos-sanz/doom-slayer.git
cd doom-slayer
open index.html   # macOS
```

### Option 2: Local server (recommended)
```bash
python3 -m http.server 8000
# or: npx serve .
```
Then open [http://localhost:8000](http://localhost:8000)

---

## 🧠 How It Works

The app detects when you're **not looking at your screen**:

| Detection | Method |
|-----------|--------|
| 👇 Looking down | Head tilt + eye gaze tracking |
| 👈👉 Looking away | Eye iris position (left/right) |
| 🔄 Head turned | Face rotation analysis |
| 📱 Phone visible | COCO-SSD object detection |

**Visual Overlays:**
- 🟢 Face bounding box (color = status)
- 🟣 Eye tracking boxes
- 🩷 Phone detection box (when phone visible)
- 📊 Real-time debug info (head/eyes/score)

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **MediaPipe FaceMesh** | 468-point facial landmark + iris tracking |
| **TensorFlow.js COCO-SSD** | Phone/object detection |
| **Vanilla JavaScript** | Zero dependencies, ES modules |
| **CSS3** | Glassmorphism, neon accents |

---

## 📁 Project Structure

```
doom-slayer/
├── index.html          # Single-page application
├── css/styles.css      # Premium dark theme
├── js/
│   ├── app.js          # Main controller & UI
│   ├── detector.js     # Face + phone detection
│   └── roasts.js       # Message collections
└── README.md
```

---

## 🌐 Deploy

### Vercel (Recommended)
```bash
npm i -g vercel && vercel
```

### GitHub Pages
Settings → Pages → Deploy from `main` → `/ (root)`

> **Note:** Static site with no backend. Hosting is essentially free.

---

## ⚙️ Configuration

| Setting | Default | Location |
|---------|---------|----------|
| Sensitivity | 55% | Settings panel |
| Punishment Video | Rickroll | Settings (any YouTube URL) |
| Detection Threshold | 3 frames | `detector.js` |

---

## 📄 License

MIT License - Free to use, modify, and distribute.

---

<div align="center">

**Stay focused. Stay productive. 💪**

</div>
