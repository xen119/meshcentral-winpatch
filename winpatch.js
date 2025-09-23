/**
 * @description MeshCentral Windows Patch Management Plugin (UI + server)
 * @license Apache-2.0
 * @version v0.2.0
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
                    // Simple smoke test first: create C:\temp\mesh-test.txt
                    var cmd = "powershell -NoProfile -ExecutionPolicy Bypass -Command \"New-Item -ItemType Directory -Force -Path C:\\\\temp | Out-Null; 'hello from mesh' | Out-File -Encoding ascii C:\\\\temp\\\\mesh-test.txt\"";

                    // Use MeshCentral's built-in sendMeshCmd to call our server plugin
                    if (typeof sendMeshCmd === 'function') {
                        sendMeshCmd("plugin", {
                            plugin: "winpatch",
                            nodeid: currentNode._id,
                            data: { action: "run", command: cmd }
                        });
                        alert("Command request sent to server, check device shortly.");
                    } else {
                        alert("sendMeshCmd not available in this UI build.");
                    }
                };

                document.body.appendChild(btn);
            }
        } catch (err) {
            console.log("[winpatch] onDeviceRefreshEnd error:", err);
        }
    };

    // --- SERVER (Node.js on MeshCentral) ---
    obj.server_startup = function () {
        if (parent.webserver && parent.webserver.pluginHandler) {
            parent.webserver.pluginHandler[obj.pluginName] = function (user, action, query, body, req, res) {
                try {
                    var nodeid = (body && body.nodeid) || (query && query.nodeid);
                    var data = (body && body.data) || (query && query.data);

                    if (nodeid && data && data.command) {
                        parent.parent.SendCommandToAgent(nodeid, { type: 'run', command: data.command });
                        res.send({ ok: true });
                    } else {
                        res.send({ ok: false, error: "invalid request" });
                    }
                } catch (e) {
                    res.send({ ok: false, error: e.toString() });
                }
            };
        }
    };

    return obj;
};
