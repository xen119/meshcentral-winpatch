/**
 * winpatch.js
 * MeshCentral plugin (UI + server) for simple patch/command run
 * version: v0.2.2
 *
 * - Exports: onDeviceRefreshEnd (client hook)
 * - Server: registers plugin handler under parent.webserver.pluginHandler['winpatch']
 *
 * Notes:
 * - This file expects your plugin's config.json shortName to be "winpatch".
 * - Client sends a harmless smoke-test command (creates C:\temp\mesh-test.txt).
 *   After you confirm it works, replace the client command string with your Windows
 *   Update command/script.
 */

"use strict";

module.exports.winpatch = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.pluginName = "winpatch";

    // --- CLIENT: make the floating button visible in the device UI ---
    obj.exports = ["onDeviceRefreshEnd"];

    obj.onDeviceRefreshEnd = function () {
        try {
            // Avoid duplicate button
            if (document.getElementById('winpatchFloatingBtn')) return;

            // Create button
            var btn = document.createElement('button');
            btn.id = 'winpatchFloatingBtn';
            btn.innerText = 'Run Windows Update';
            btn.style.position = 'fixed';
            btn.style.bottom = '20px';
            btn.style.right = '20px';
            btn.style.zIndex = 99999;
            btn.style.padding = '10px 16px';
            btn.style.background = '#0078d7';
            btn.style.color = '#fff';
            btn.style.border = 'none';
            btn.style.borderRadius = '6px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '14px';
            btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';

            btn.onclick = function () {
                // SAFETY: use a simple test command first to verify the full path
                var testCmd = "powershell -NoProfile -ExecutionPolicy Bypass -Command \"New-Item -ItemType Directory -Force -Path C:\\\\temp | Out-Null; 'hello from mesh' | Out-File -Encoding ascii C:\\\\temp\\\\mesh-test.txt\"";

                // If you confirm the end-to-end works, replace testCmd with your Update command:
                // var updateCmd = "powershell -NoProfile -ExecutionPolicy Bypass -Command \"Install-WindowsUpdate -AcceptAll -AutoReboot\"";

                var payload = {
                    nodeid: currentNode._id,
                    data: { action: "run", command: testCmd }
                };

                // Preferred: use meshserver.send if available (many UI builds expose this)
                try {
                    if (typeof meshserver !== 'undefined' && typeof meshserver.send === 'function') {
                        meshserver.send({
                            action: 'plugin',
                            plugin: obj.pluginName,
                            nodeid: payload.nodeid,
                            data: payload.data
                        }, function (res) {
                            try {
                                if (res && res.ok) {
                                    alert("Command request accepted by server. Check device: C:\\temp\\mesh-test.txt");
                                } else {
                                    alert("Server returned error: " + (res && res.error ? res.error : "unknown"));
                                }
                            } catch (e) {
                                alert("Server response error: " + e.toString());
                            }
                        });
                        return;
                    }
                } catch (e) {
                    // ignore and fallback
                }

                // Fallback 1: try sendMeshCmd if present (older/newer UIs)
                try {
                    if (typeof sendMeshCmd === 'function') {
                        sendMeshCmd("plugin", {
                            plugin: obj.pluginName,
                            nodeid: payload.nodeid,
                            data: payload.data
                        });
                        alert("Command request sent to server (sendMeshCmd). Check device shortly.");
                        return;
                    }
                } catch (e) {}

                // Final fallback: direct fetch to plugin.ashx endpoint
                try {
                    fetch("plugin.ashx?plugin=" + encodeURIComponent(obj.pluginName), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    })
                    .then(function (r) { return r.text(); })
                    .then(function (text) {
                        // log raw server response to console for debugging
                        console.log("[winpatch] raw server response:", text);
                        try {
                            var res = JSON.parse(text);
                            if (res && res.ok) {
                                alert("Server accepted request (fetch). Check device: C:\\temp\\mesh-test.txt");
                            } else {
                                alert("Server error (fetch): " + (res && res.error ? res.error : "unknown"));
                            }
                        } catch (e) {
                            alert("Unexpected server response (fetch). See console for details.");
                            console.log("[winpatch] unexpected response:", text);
                        }
                    })
                    .catch(function (err) {
                        alert("AJAX/fetch error: " + err.toString());
                    });
                    return;
                } catch (e) {
                    alert("Unable to contact server plugin handler from UI. Action logged only.");
                }
            };

            document.body.appendChild(btn);
        } catch (err) {
            console.log("[winpatch] onDeviceRefreshEnd error:", err);
        }
    };

    // --- SERVER: register handler to receive client UI calls and forward to agent ---
    obj.server_startup = function () {
        try {
            if (parent.webserver && parent.webserver.pluginHandler) {
                parent.webserver.pluginHandler[obj.pluginName] = function (user, action, query, body, req, res) {
                    try {
                        // Normalize different body shapes: sometimes body is parsed, sometimes raw string
                        var nodeid = (body && body.nodeid) || (query && query.nodeid);
                        var data = (body && body.data) || (query && query.data);

                        // If body was a raw string, try to parse
                        if (!data && typeof body === "string") {
                            try {
                                var parsed = JSON.parse(body);
                                data = parsed && parsed.data;
                                nodeid = nodeid || (parsed && parsed.nodeid);
                            } catch (x) { /* ignore parse failure */ }
                        }

                        if (!nodeid || !data || !data.command) {
                            res.setHeader("Content-Type", "application/json");
                            res.send(JSON.stringify({ ok: false, error: "invalid request: nodeid or command missing" }));
                            return;
                        }

                        // Forward the run request to the agent
                        try {
                            parent.parent.SendCommandToAgent(nodeid, { type: "run", command: data.command });
                            res.setHeader("Content-Type", "application/json");
                            res.send(JSON.stringify({ ok: true }));
                        } catch (sendErr) {
                            // SendCommandToAgent may not be present/allowed in some builds/policies
                            res.setHeader("Content-Type", "application/json");
                            res.send(JSON.stringify({ ok: false, error: "SendCommandToAgent failed: " + (sendErr && sendErr.toString ? sendErr.toString() : String(sendErr)) }));
                        }
                    } catch (e) {
                        res.setHeader("Content-Type", "application/json");
                        res.send(JSON.stringify({ ok: false, error: (e && e.toString ? e.toString() : String(e)) }));
                    }
                };
                // Optionally log a message on server startup
                try { parent.debug && parent.debug("[winpatch] plugin handler registered"); } catch (_) {}
            } else {
                try { parent.debug && parent.debug("[winpatch] webserver.pluginHandler not available"); } catch (_) {}
            }
        } catch (ex) {
            try { parent.debug && parent.debug("[winpatch] server_startup error: " + ex.toString()); } catch (_) {}
        }
    };

    return obj;
};
