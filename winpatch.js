/**
 * @description MeshCentral Windows Patch Management Plugin (client + server)
 * @license Apache-2.0
 * @version v0.1.1
 */

"use strict";

module.exports.winpatch = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.pluginName = "winpatch";

    // --- CLIENT (Web UI) ---
    obj.exports = ["onDeviceRefreshEnd"];

    obj.onDeviceRefreshEnd = function () {
        try {
            // Floating button (always visible)
            if (!document.getElementById('winpatchFloatingBtn')) {
                var btn = document.createElement('button');
                btn.id = 'winpatchFloatingBtn';
                btn.innerText = 'Run Windows Update';
                btn.style.position = 'fixed';
                btn.style.bottom = '20px';
                btn.style.right = '20px';
                btn.style.zIndex = 9999;
                btn.style.padding = '10px 16px';
                btn.style.background = '#0078d7';
                btn.style.color = '#fff';
                btn.style.border = 'none';
                btn.style.borderRadius = '6px';
                btn.style.cursor = 'pointer';
                btn.style.fontSize = '14px';
                btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

                btn.onclick = function () {
                    // SAFER smoke test command first (creates C:\temp\mesh-test.txt)
                    // Swap to Windows Update after end-to-end works.
                    var psCmd = "powershell -NoProfile -ExecutionPolicy Bypass -Command \"New-Item -ItemType Directory -Force -Path C:\\\\temp | Out-Null; 'hello from mesh' | Out-File -Encoding ascii C:\\\\temp\\\\mesh-test.txt\"";

                    var payload = {
                        action: 'run',
                        command: psCmd
                        // To switch to Windows Update later:
                        // command: "powershell -NoProfile -ExecutionPolicy Bypass -Command \"Install-WindowsUpdate -AcceptAll -AutoReboot\""
                    };

                    // POST directly to plugin handler (no meshserver.performAction dependency)
                    var xhr = new XMLHttpRequest();
                    xhr.open("POST", "pluginHandler.ashx?plugin=winpatch&nodeid=" + encodeURIComponent(currentNode._id), true);
                    xhr.setRequestHeader("Content-Type", "application/json");
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState === 4) {
                            var raw = xhr.responseText || '';
                            console.log("[winpatch] server response:", raw);
                            try {
                                var res = JSON.parse(raw);
                                if (res && res.ok) {
                                    alert("Command sent to server. Check device for C:\\temp\\mesh-test.txt");
                                } else {
                                    alert("Server error: " + (res && res.error ? res.error : 'unknown'));
                                }
                            } catch (e) {
                                alert("Raw server response: " + raw);
                            }
                        }
                    };
                    xhr.send(JSON.stringify({ data: payload }));
                };

                document.body.appendChild(btn);
            }
        } catch (err) {
            console.log("[winpatch] onDeviceRefreshEnd error:", err);
        }
    };

    // --- SERVER (Node.js on MeshCentral) ---
    obj.server_startup = function () {
        try {
            if (parent.webserver && parent.webserver.pluginHandler) {
                parent.webserver.pluginHandler[obj.pluginName] = function (user, action, query, body, req, res) {
                    try {
                        // Normalize inputs
                        var nodeid = (query && query.nodeid) || (body && body.nodeid);
                        var data = (body && body.data) || null;

                        // Some servers hand us a string body; try parse
                        if (!data && typeof body === 'string') {
                            try { var parsed = JSON.parse(body); data = parsed && parsed.data; } catch (e) {}
                        }

                        // Validate
                        if (!nodeid || !data || !data.command) {
                            res.setHeader('Content-Type', 'application/json');
                            res.send(JSON.stringify({ ok: false, error: 'invalid request (nodeid/command missing)' }));
                            return;
                        }

                        // Forward to agent: run arbitrary command
                        try {
                            parent.parent.SendCommandToAgent(nodeid, { type: 'run', command: data.command });
                            res.setHeader('Content-Type', 'application/json');
                            res.send(JSON.stringify({ ok: true }));
                        } catch (ex) {
                            // If this call isn't available in your build, you'll see error here.
                            res.setHeader('Content-Type', 'application/json');
                            res.send(JSON.stringify({ ok: false, error: 'SendCommandToAgent failed: ' + ex.toString() }));
                        }
                    } catch (e) {
                        res.setHeader('Content-Type', 'application/json');
                        res.send(JSON.stringify({ ok: false, error: e.toString() }));
                    }
                };
            }
        } catch (e) {
            try {
                parent.debug('[winpatch] server_startup error: ' + e.toString());
            } catch (_) {}
        }
    };

    return obj;
};
