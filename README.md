# 🔥 Firebase RTDB UltraConsole

> A Next-Generation Visual Management Console & Interactive Tree Editor for **Firebase Realtime Database** and **Offline JSON Datasets**.

![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase_RTDB-Live-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 🌟 Overview

**Firebase RTDB UltraConsole** provides a modern, fast, and feature-rich web console designed for developers, data managers, and content creators. It bridges the gap between local offline JSON editing and live online Firebase Realtime Database management.

Whether you are working offline with local files or syncing live with an online Firebase RTDB, **UltraConsole** provides an intuitive 2-zone interactive tree workspace, automatic data type detection, full undo/redo transaction history, and 1-click dataset push capabilities.

---

## ✨ Key Features

### ⚡ Dual Operational Modes
- 📁 **Local Offline JSON File Mode**: Work 100% offline with zero external network dependencies. Import, modify, and save `.json` files directly to your disk.
- 🔥 **Live Firebase RTDB Mode**: Connect directly to your online Firebase Realtime Database with live 2-way WebSockets synchronization (`onValue()`, `set()`, `update()`, `remove()`).

### 🌲 Interactive JSON Tree Workspace
- **Visual Node Hierarchy**: Expand, collapse, inspect, and navigate complex nested JSON structures with depth indicators.
- **Smart Auto-Type Detection**: Automatically detects and parses `string`, `number`, `boolean`, `null`, `array`, and `object` types on the fly.
- **In-Place Tree Edits**: Add child nodes, edit values, rename keys, and delete subtree nodes directly from the UI.
- **Path Breadcrumbs**: Clickable breadcrumb bar displaying the full node path with instant copy options (`Copy Path`, `Copy JSON`).

### 🚀 1-Click Firebase Config Snippet Auto-Parse
Paste your raw JavaScript configuration code block straight from the Firebase Console:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "my-project.firebaseapp.com",
  databaseURL: "https://my-project-default-rtdb.firebaseio.com",
  projectId: "my-project"
};
```
Click **Auto-Parse & Fill** to extract `databaseURL`, `apiKey`, `projectId`, and `authDomain` instantly!

### 📤 1-Click Push Local Data to Live Database
- Upload any local `.json` file or preset database directly into your online Firebase Database root in a single click.

### 📚 Preloaded Datasets
- **Textbook & Questions DB**: Comprehensive preloaded database for Class 6–9 English & Hindi textbook questions, chapters, and media references.
- **E-Commerce Store**: Products, users, order metadata, and stock tracking.
- **Gaming Leaderboard**: Players, high scores, server status, and online metrics.
- **Smart Home IoT**: Sensor telemetry, device status, and automation rules.

### 🔍 Deep Tree Search (Ctrl+F)
- Real-time search across all keys and values in the database tree with match highlights and count badges.

### ⏪ Transaction History Stack (Ctrl+Z / Ctrl+Y)
- 50-step undo and redo transaction stack ensures full edit safety.

---

## 🔒 Security & Secrets Protection

- **No Server-Side Secret Storage**: All Firebase credentials and Database URLs are stored exclusively in your browser's `localStorage` (`firebase_rtdb_config`).
- **Git Ignore Security**: The repository includes a pre-configured `.gitignore` file that automatically excludes secret files, `.env` configurations, build outputs, and node modules:
  ```gitignore
  .env
  .env.*
  firebase-config.json
  secrets.json
  node_modules/
  dist/
  ```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` or `yarn`

### 1. Clone the Repository
```bash
git clone https://github.com/AshuSriwastav07/FirebaseRTDB-UltraConsole.git
cd FirebaseRTDB-UltraConsole
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
```
The optimized production bundle will be generated in the `dist/` directory.

---

## 🌐 How to Connect Your Live Firebase Realtime Database

1. Open **Firebase RTDB UltraConsole** in your browser.
2. In the top header bar, click the 🔥 **Live Firebase RTDB** tab.
3. Click **RTDB Credentials** (or click **Enter Firebase Database Credentials** in the alert banner).
4. Go to your [Firebase Console](https://console.firebase.google.com/) $\rightarrow$ **Project Settings** $\rightarrow$ **General** $\rightarrow$ **Your Apps**.
5. Copy your `firebaseConfig` object and paste it into the **Quick Auto-Fill** box, then click **Auto-Parse & Fill**. *(Alternatively, just enter your Database URL `https://your-app-default-rtdb.firebaseio.com`)*.
6. **Ensure Database Security Rules (Test Mode)**:
   In Firebase Console $\rightarrow$ **Realtime Database** $\rightarrow$ **Rules**, allow read/write access for testing:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
7. Click **Connect to Live RTDB**. The status dot will turn 🟢 **Green** (`Live RTDB Sync`), and your online database will load live in the tree viewer!

---

## 📁 Project Structure

```
FirebaseRTDB-UltraConsole/
├── dist/                     # Compiled production build
├── src/
│   ├── components/
│   │   ├── Breadcrumb.tsx   # Path navigation bar
│   │   ├── TopBar.tsx       # Main header with mode selector, search & sample DBs
│   │   ├── Modals/
│   │   │   ├── FirebaseConfigModal.tsx  # RTDB connection modal & snippet parser
│   │   │   └── RawJsonModal.tsx        # Raw JSON view & copy modal
│   │   ├── RightPanel/
│   │   │   └── RightPanel.tsx          # Node inspector, add key & edit form
│   │   └── TreeView/
│   │       ├── TreeNode.tsx            # Recursive tree node component
│   │       └── TreeViewContainer.tsx   # Left tree panel container
│   ├── hooks/
│   │   ├── useFirebaseRtdb.ts         # Live Firebase WebSockets hook
│   │   └── useJsonEditor.ts           # State, undo/redo & JSON editing logic
│   ├── types/
│   │   └── json.ts                    # TypeScript interfaces & types
│   ├── utils/
│   │   ├── jsonOperations.ts          # Immutable tree updates & path helpers
│   │   ├── sampleData.ts              # Preloaded datasets (Class 6-9, E-Commerce, etc.)
│   │   └── typeDetection.ts           # Automatic type detection & parsing
│   ├── App.tsx                        # Main application container
│   ├── main.tsx                       # React application entry point
│   └── index.css                      # Global styles & Tailwind utilities
├── index.html                 # HTML template
├── package.json               # Dependencies & scripts
├── tailwind.config.js         # Custom Firebase dark theme config
├── tsconfig.json              # TypeScript compiler configuration
└── vite.config.ts             # Vite build configuration
```

---

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS 3 (Firebase Dark Console Palette)
- **Database Integration**: Firebase JS SDK 10 (Realtime Database `firebase/database`)
- **Icons**: Lucide React

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to check the [Issues page](https://github.com/AshuSriwastav07/FirebaseRTDB-UltraConsole/issues).

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

Made with ❤️ by **[Ashu Sriwastav](https://github.com/AshuSriwastav07)**