---

titulo: "Nexo Dashboard"
versao: "v1.0"
data\_criacao: 2025-07-16
ultima\_atualizacao: 2025-07-16
node: \["ModelingNode"]
proposito: \["Project Documentation"]
origem: \["Canvas"]
reutilizavel: true
status: "ativo"
dependencias: \[]
tags: \["electron", "dashboard", "readme"]
escopo: "local"
privacidade: "privado"
acessibilidade: "GPTBuilder"
----------------------------

# Nexo Dashboard

![MIT License](https://img.shields.io/badge/license-MIT-green.svg)
![Node.js >=14](https://img.shields.io/badge/node-%3E=14.0.0-brightgreen)
![Electron](https://img.shields.io/badge/built%20with-electron-blue)

---

## Overview

**Nexo Dashboard** is a cross-platform desktop application built with Electron. It enables you to display and launch applications, scripts, and web links in an organized and customizable interface. The dashboard automatically scans the Windows Start Menu for installed applications, supports manual entries for portable or custom apps, and allows quick access to categorized web bookmarks.

---

## Features

### Local Applications

* Automatic synchronization with Windows Start Menu shortcuts (auto-refresh).
* Manual management of portable and custom applications (via editable JSON).
* Simple organization and maintenance using categories, tags, and filters.

### Web Bookmarks

* Import and organize bookmarks from Edge/Chrome using JSON.
* Categorization, tagging, and two-level menu navigation for fast discovery.
* Responsive, card-based UI with built-in search and filtering.

---

## Quick Start

For sample configuration, see the files in the `data/` folder.

1. **Clone or download this repository.**
2. **Install dependencies:**

   ```bash
   npm install
   ```
3. **Launch in development mode:**

   ```bash
   npm run start
   ```
4. **Package for distribution:**

   ```bash
   npm run build
   ```

---

## Installation

1. Ensure Node.js (v14+) and npm are installed on your system.
2. In the project root, install dependencies:

   ```bash
   npm install
   ```
3. *(Optional)* Install Electron globally for CLI usage:

   ```bash
   npm install -g electron
   ```

---

## Platform Support & Prerequisites

* **Windows:** 10 or higher (64-bit). PowerShell is required for Start Menu scanning.
* **macOS & Linux:** Basic Electron support (manual path management for custom entries).
* **General prerequisites:**

  * Node.js (v14+)
  * npm (v6+)
  * *(Optional)* Python/Bash for advanced scripts.

---

## API & Extensibility

The dashboard exposes both a Node.js API (for internal scripting) and a CLI command for ad-hoc scans and integration:

### Node.js API

```js
const { scanStartMenu, loadJSON } = require('./scripts/helpers');

// Scan Start Menu and update apps_startmenu.json
testscanStartMenu();

// Load custom apps and web links
const customApps = loadJSON('data/apps_custom.json');
const webLinks   = loadJSON('data/links_web.json');
```

### CLI Usage

```bash
# Launch a one-off scan from project root
node scripts/scan_startmenu.js

# Or via npm script (if configured):
npm run scan
```

These interfaces enable integration into external workflows, scheduled tasks, or automation scripts.

---

## Configuration Files

* **data/apps\_startmenu.json:** Auto-generated list of Start Menu apps.
* **data/apps\_custom.json:** Manually managed portable or custom apps.
* **data/links\_web.json:** Web bookmarks loaded at startup.

---

## Architecture

Nexo Dashboard follows a modular, maintainable structure:

* **Main Process** (`src/main.js`): Handles file I/O, scanning, and the main application window.
* **Renderer Process** (`src/renderer.js`): Renders the UI and manages user interaction.
* **Scripts** (`scripts/`): Utilities for scanning and parsing shortcuts, data import/export.
* **Data** (`data/`): JSON configuration files—your single source of truth.
* **Assets** (`assets/icons/`): Icons for apps and links.

---

## Project Structure

```
Nexo_Dashboard/
├── assets/                    # Static assets (icons, images)
│   └── icons/                 # Application and link icons
├── data/                      # JSON configuration files (apps and web links)
│   ├── apps_startmenu.json    # Auto-generated Start Menu apps
│   ├── apps_custom.json       # User-defined portable/custom apps
│   └── links_web.json         # Imported web bookmarks
├── scripts/                   # Utility scripts for scanning and parsing
│   ├── scan_startmenu.js
│   └── helpers.js
├── src/                       # Source code for main and renderer processes
│   ├── main.js                # Electron main process entry
│   ├── renderer.js            # Browser UI logic
│   ├── index.html             # Dashboard HTML template
│   └── style.css              # Dashboard styling
├── package.json               # Node/Electron project metadata and dependencies
└── README.md                  # Project documentation
```

---

## Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the repository and create your feature branch (`git checkout -b feature/my-feature`).
2. Write clear, documented code and update or add tests where appropriate.
3. Commit your changes (`git commit -m 'Add feature XYZ'`).
4. Push to your fork and open a Pull Request.
5. Describe your contribution and reference any related issues.

For major changes, please open an issue first to discuss your idea before submitting code.

---

## Maintainer

* **Nuno Salvação**
  [nexo-modeling@outlook.com](mailto:nexo-modeling@outlook.com)

---

## License

This project is licensed under the MIT License — a permissive open source license that allows commercial and private use, modification, and distribution.
See the [LICENSE](LICENSE) file for details.

---

## Uninstall

To remove the application (manual install cleanup):

1. **Delete the application folder.**
2. **Remove user configuration files:**

   ```bash
   rm -rf ~/.config/Nexo_Dashboard
   ```
3. **Windows-specific:**

   * Clear any Start Menu shortcuts created.
   * (Optional) Remove registry entries:

     ```powershell
     Remove-Item -Path "HKCU:\Software\Nexo_Dashboard" -Recurse -ErrorAction SilentlyContinue
     ```
4. **macOS-specific:**

   * Remove user preferences:

     ```bash
     rm -rf ~/Library/Preferences/com.nexo_dashboard.plist
     ```
5. **Package manager installs:**
   If installed via a package manager or installer, use the corresponding uninstall command (e.g., `winget uninstall NexoDashboard` or `brew remove nexo-dashboard`).

---

## Acknowledgments

* [Electron](https://www.electronjs.org/) team and contributors.
* Inspiration from various dashboard UIs.
