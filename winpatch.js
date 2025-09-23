/**
 * @description MeshCentral Windows Patch Management Plugin (server + client injection)
 * @license Apache-2.0
 * @version v0.0.13
 */

"use strict";

module.exports.winpatch = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.pluginName = "winpatch";

    // Export hooks for UI injection
    obj.exports = ["onDeviceRefreshEnd"];

    // Client-side: inject floating button
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
                    if (typeof meshserver !== 'undefined' && typeof meshserver.performAction === 'function') {
                        meshserver.performAction('plugin', {
                            plugin: 'winpatch',
                            nodeid: currentNode._id,
                            data: {
                                action: 'run',
                                command: "powershell -NoProfile -ExecutionPolicy Bypass -Command \"Install-WindowsUpdate -AcceptAll -AutoReboot\""
                            }
                        }, function (res) {
                            alert(res && res.ok ? 'Command sent to server' : 'Failed: ' + (res.error || 'unknown'));
                        });
                    } else {
                        alert('meshserver.performAction not available');
                    }
                };

                document.body.appendChild(btn);
            }
        } catch (err) {
            console.log("winpatch:onDeviceRefreshEnd error:", err);
        }
    };

    // Server-side: register handler
    obj.server_startup = function () {
        if (parent.webserver && parent.webserver.pluginHandler) {
            parent.webserver.pluginHandler[obj.pluginName] = function (user, action, query, body, req, res) {
                try {
                    const nodeid = (body && body.nodeid) || query.nodeid;
                    const data = (body && body.data) || query.data;
                    if (!nodeid || !data || !data.command) {
                        res.send({ ok: false, error: 'invalid request' });
                        return;
                    }
                    parent.parent.SendCommandToAgent(nodeid, { type: 'run', command: data.command });
                    res.send({ ok: true });
                } catch (e) {
                    res.send({ ok: false, error: e.toString() });
                }
            };
        }
    };

    return obj;
};
