# MeshCentral Patch Management Plugin (Scaffold)

Windows-focused patch management plugin scaffold for MeshCentral. It adds device-page buttons to scan for updates, show results in a modal, and apply all or selected updates. Results are cached per device.

Features
- Device-page toolbar buttons: Scan, Apply All
- Modal UI listing updates with checkboxes and Select All
- Apply Selected (requires PSWindowsUpdate on agent)
- Apply All (PSWindowsUpdate preferred, UsoClient fallback)
- Caches last scan per node (uses MeshCentral DB if available)

Install
1) Ensure plugins are enabled in your MeshCentral server config (e.g., `"plugins": { "enabled": true }`).
2) Install this plugin by pointing MeshCentral to this folder’s `config.json` (serve as a raw URL or copy into the MeshCentral plugins location depending on your setup).
3) Open a device page; you should see the new toolbar buttons.

Usage
- Scan: Click "Scan for Updates"; results appear in a modal when ready.
- Apply All: Installs all available updates without auto-reboot.
- Apply Selected: Tick desired KBs and click Apply Selected (PSWindowsUpdate required).

Notes
- Selective install is only supported when PSWindowsUpdate is available on the device. UsoClient fallback cannot target specific KBs.
- The plugin listens for agent console output and parses JSON tagged lines; ensure your MeshCentral version exposes necessary server APIs.
- Future expansion: Linux/macOS support, scheduling, policies, progress streaming, and reboot coordination.

