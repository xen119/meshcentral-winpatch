/**
 * @description MeshCentral Windows Patch Management Plugin (AJAX direct)
 * @license Apache-2.0
 * @version v0.2.1
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

                btn.onclick = function () {
                    // Smoke test: create C:\temp\mesh-test.txt
                    var psCmd = "powershell -NoProfile -ExecutionPolicy Bypass -Command \"New-Item -ItemType Directory -Force -Path C:\\\\temp | Out-Null; 'hello from mesh' | Out-File -Encoding ascii C:\\\\temp\\\\mesh-test.txt\"";

                    var payload = {
                        nodeid: currentNode._id,
                        data: { action: "run", command: psCmd }
                    };

                    fetch("plugin.ashx?plugin=winpatch", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    })
                    .then(r => r.text())
                    .then(t => {
                        console.log("[winpatch] raw server response:", t);
                        try {
                            var res = JSON.parse(t);
                            if (res.ok) {
                                alert("Server accepted request. Check C:\\temp\\mesh-test.txt");
                            } else {
                                alert("Server error: " + (res.error || "unknown"));
                            }
                        } catch (e) {
                            alert("Unexpected server response: " + t);
                        }
                    })
                    .catch(err => alert("AJAX error: " + err.toString()));
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
                        res.setHeader("Content-Type", "application/json");
                        res.send(JSON.stringify({ ok: true }));
                    } else {
                        res.setHeader("Content-Type", "application/json");
                        res.send(JSON.stringify({ ok: false, error: "invalid request" }));
                    }
                } catch (e) {
                    res.setHeader("Content-Type", "application/json");
                    res.send(JSON.stringify({ ok: false, error: e.toString() }));
                }
            };
        }
    };

    return obj;
};
