<div align="center">

# 💀 Doom Slayer

### Stop Doomscrolling. Start Living.

[![Live Demo](https://img.shields.io/badge/Demo-Live-a855f7?style=for-the-badge&logo=vercel&logoColor=white)](https://doom-slayer.vercel.app)
[![No Backend](https://img.shields.io/badge/Backend-None-10b981?style=for-the-badge)](.)
[![Privacy](https://img.shields.io/badge/Privacy-100%25_Local-6366f1?style=for-the-badge)](.)

<br />

**AI-powered focus assistant that catches you looking at your phone and roasts you back to productivity.**

*All processing happens locally in your browser. No data ever leaves your device.*

<br />

[Features](#-features) • [Quick Start](#-quick-start) • [How It Works](#-how-it-works) • [Tech Stack](#-tech-stack) • [Deploy](#-deploy)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **AI Face Tracking** | MediaPipe FaceMesh with 468 facial landmarks for accurate head pose detection |
| � **Live Statistics** | Track focused time, distracted time, and alert count in real-time |
| �🔥 **Motivational Roasts** | 20+ harsh but effective messages to snap you back to reality |
| 🎵 **Custom Punishment** | Set your own YouTube video (defaults to the classic Rickroll) |
| 📌 **Picture-in-Picture** | Float the webcam above other apps for true background monitoring |
| ⚙️ **Adjustable Sensitivity** | Fine-tune detection to match your posture habits |
| 🔒 **100% Private** | Zero backend, zero tracking, everything runs client-side |

---

## 🚀 Quick Start

### Option 1: Open directly
```bash
# Clone and open
git clone https://github.com/your-username/doom-slayer.git
cd doom-slayer
open index.html   # macOS
# or: xdg-open index.html   # Linux
# or: start index.html      # Windows
```

### Option 2: Local server (recommended)
```bash
# Python
python3 -m http.server 8000

# Node.js
npx serve .
```
Then open [http://localhost:8000](http://localhost:8000)

---

## 🧠 How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Webcam Feed   │ ──▶ │  MediaPipe       │ ──▶ │  Head Pose      │
│                 │     │  FaceMesh (468   │     │  Analysis       │
│                 │     │  landmarks)      │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   � Roast +    │ ◀── │  State Machine   │ ◀── │  Doomscroll     │
│   🎵 Rickroll   │     │  (Stability)     │     │  Detection      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

**Detection Algorithm:**
1. **Baseline Calibration** - First 30 frames establish your normal posture
2. **Head Pose Analysis** - Nose/chin/forehead positions detect looking down
3. **State Stability** - Frame counting prevents false positives
4. **Punishment Trigger** - Persistent doomscrolling triggers roast + video

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **MediaPipe FaceMesh** | 468-point facial landmark detection |
| **Vanilla JavaScript** | Zero dependencies, pure ES modules |
| **CSS3** | Glassmorphism, neon accents, animations |
| **YouTube Embed API** | Punishment video playback |

---

## 📁 Project Structure

```
doom-slayer/
├── index.html          # Single-page application
├── css/
│   └── styles.css      # Premium dark theme
├── js/
│   ├── app.js          # Main controller & UI
│   ├── detector.js     # MediaPipe face detection
│   └── roasts.js       # Message collections
├── README.md
└── LICENSE
```

---

## 🌐 Deploy

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod
```

### GitHub Pages
1. Go to Settings → Pages
2. Source: Deploy from branch → `main` → `/ (root)`
3. Done!

> **Note:** This is a static site with no backend. Hosting costs are essentially zero.

---

## ⚙️ Configuration

| Setting | Default | Location |
|---------|---------|----------|
| Sensitivity | 55% | Settings panel |
| Punishment Video | Rickroll | Settings panel (any YouTube URL) |
| Roast Cooldown | 3 seconds | `js/app.js` line 49 |
| Detection Threshold | 3 frames | `js/detector.js` line 12 |

---

## 🤝 Contributing

Contributions welcome! Ideas:
- [ ] Sound effects / alarm audio
- [ ] Session history with charts
- [ ] Browser extension version
- [ ] Mobile PWA support

---

## 📄 License

MIT License - Free to use, modify, and distribute.

---

<div align="center">

**Stay focused. Stay productive. 💪**

Made with ❤️ by developers who also doomscroll too much

</div>
