# 🎵 MediaWidget

A sleek, lightweight, system-wide desktop media controller and audio visualizer for Windows 10 & 11. Built with Electron and Windows SMTC (System Media Transport Controls).


---

## ✨ Features

- 🎧 **Native Windows SMTC Integration** — Seamlessly captures track title, artist, album art, position, and duration from Spotify, browsers (YouTube, SoundCloud), and other supported Windows media players.
- ⚡ **Smart Auto-Show / Auto-Hide** — Automatically appears on your desktop when Spotify plays and gently hides when playback stops.
- 🌊 **Real-Time Sine Wave Progress Bar** — High-precision timeline tracking interpolated client-side for ultra-smooth rendering.
- 🎛️ **Quick Media Controls** — Play, Pause, Next Track, Previous Track, and Volume Mute at your fingertips.
- 🔢 **Zero Keyboard Interruptions** — Interacts with Windows media keys via low-level native Win32 APIs, eliminating the annoying Num-Lock toggling bug found in typical `SendKeys` scripts.
- 🎨 **Theme Switcher** — Click the theme button to cycle between **Dark**, **Light**, **Translucent**, and **Transparent (Glass)** modes.
- 📦 **One-Click Installer** — Packaged into a standalone Windows installer (`.exe`) with no prerequisite Node.js installation required.

---

## 🚀 Quick Download & Installation (For Users)

1. Head over to the **[Releases](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/releases)** section.
2. Download the latest installer: **`MediaWidget Setup 1.0.0.exe`**.
3. Double-click the file to install. It will automatically:
   - Install the application into your local user directory.
   - Place a **MediaWidget** shortcut on your Desktop and in the Start Menu.
   - Launch the widget immediately.

---

## 🛠️ Building From Source (For Developers)

### Prerequisites

- **OS:** Windows 10 (1809+) or Windows 11 (x64)
- **Runtime:** [Node.js](https://nodejs.org/) (v18 or newer recommended)
- **Package Manager:** `npm`

### Installation

1. **Clone the repository:**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm start
   ```

4. **Build the single-click NSIS installer:**
   ```bash
   npm run dist
   ```
   The compiled installer `.exe` will be generated inside the `dist/` folder.

---

## 🏗️ Architecture Overview

- **Electron Main Process (`src/main.js`):** Manages the frameless, always-on-top transparent toolbar window and dispatches native Windows media key commands using C# P/Invoke `keybd_event`.
- **Background Media Server (`src/media-server.js`):** Runs as a dedicated Node.js child process to interface with the native `@coooookies/windows-smtc-monitor` C++ addon without Electron ABI mismatch.
- **Frontend Renderer (`src/renderer.js`):** Renders the 60 FPS HTML5 Canvas sine-wave progress bar and EQ visualizer.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
