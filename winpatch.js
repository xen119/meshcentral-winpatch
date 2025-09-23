/**
 * @description MeshCentral Windows Patch Management Plugin
 * @license Apache-2.0
 * @version v0.1.0
 */

"use strict";

module.exports.winpatch = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.pluginName = "winpatch";

    obj.exports = ["onDeviceRefreshEnd"];

    // Client-side hook
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

                btn.onclick = function () {
                    var payload = {
                        action: 'run',
                        command: "powershell -NoProfile -ExecutionPolicy Bypass -Command \"Install-WindowsUpdate -AcceptAll -AutoReboot\""
                    };

                    // Send AJAX POST directly to plugin handler
                    var xhr = new XMLHttpRequest();
                    xhr.open("POST", "pluginHandler.ashx?plugin=winpatch&nodeid=" + encodeURIComponent(currentNode._id), true);
                    xhr.setRequestHeader("Content-Type", "application/json");
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState === 4) {
                            try {
                                var res = JSON.parse(xhr.responseText);
                                if (res.ok) {
                                    alert("Command sent to server, check device events.");
                                } else {
                                    alert("Server error: " + (res.error || 'unknown'));
                                }
                            } catch (e) {
                                alert("Unexpected response from server");
                            }
                        }
                    };
                    xhr.send(JSON.stringify({ data: payload }));
                };

                document.body.appendChild(btn);
            }
        } catch (err) {
            console.log("winpatch:onDeviceRefreshEnd error:", err);
        }
    };

    // Server-side handler
    obj.server_startup = function () {
        if (parent.webserver && parent.webserver.pluginHandler) {
            parent.webserver.pluginHandler[obj.pluginName] = function (user, action, query, body, req, res) {
                try {
                    const nodeid = query.nodeid || (body && body.nodeid);
                    const data = (body && body.data);
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
