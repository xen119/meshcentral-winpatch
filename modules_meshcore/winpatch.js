/**
 * Client-side plugin UI — inject floating button and call server plugin handler
 * Version: 0.0.13
 */

"use strict";

module.exports.winpatch = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.exports = ["onDeviceRefreshEnd"];

    obj.onDeviceRefreshEnd = function () {
        try {
            // Same visible log hook as before
            writeDeviceEvent(encodeURIComponent(currentNode._id));
            Q('d2devEvent').value = Date().toLocaleString() + ': WinPatch hook fired';
            focusTextBox('d2devEvent');

            if (!document.getElementById('winpatchFloatingBtn')) {
                var btn = document.createElement('button');
                btn.id = 'winpatchFloatingBtn';
                btn.innerText = 'Run Windows Update';

                // Floating style
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
                    // Log intent in device events
                    writeDeviceEvent(encodeURIComponent(currentNode._id));
                    Q('d2devEvent').value = Date().toLocaleString() + ': WinPatch - request send to server';
                    focusTextBox('d2devEvent');

                    // Prepare payload: keep small and serializable
                    var payload = {
                        nodeid: currentNode._id,
                        // you can change the command to a full script path or inline PS later
                        command: "powershell -NoProfile -ExecutionPolicy Bypass -Command \"Install-WindowsUpdate -AcceptAll -AutoReboot\""
                    };

                    // Call server plugin handler via meshserver.performAction('plugin', ...)
                    // Many MeshCentral UIs expose meshserver.performAction; if yours does, use it.
                    try {
                        if (typeof meshserver !== 'undefined' && typeof meshserver.performAction === 'function') {
                            meshserver.performAction('plugin', { plugin: 'winpatch', nodeid: payload.nodeid, data: { action: 'run', payload: payload } },
                                function (res) {
                                    if (res && res.ok) {
                                        alert('Update command sent to server — check device event log for progress.');
                                    } else {
                                        alert('Server rejected request: ' + (res && res.error ? res.error : 'unknown'));
                                    }
                                }
                            );
                            return;
                        }
                    } catch (e) {
                        // fall through to try other APIs
                    }

                    // Fallback: try meshserver.sendAction (older/newer UIs differ)
                    try {
                        if (typeof meshserver !== 'undefined' && typeof meshserver.sendAction === 'function') {
                            meshserver.sendAction({ action: 'plugin', plugin: 'winpatch', nodeid: payload.nodeid, data: { action: 'run', payload: payload } },
                                function (res) {
                                    if (res && res.ok) {
                                        alert('Update command sent to server — check device event log for progress.');
                                    } else {
                                        alert('Server rejected request: ' + (res && res.error ? res.error : 'unknown'));
                                    }
                                }
                            );
                            return;
                        }
                    } catch (e) {}

                    // Last fallback: alert and log (we still recorded the intent in device events)
                    alert('Unable to contact server-side plugin from UI. Action logged only.');
                };

                document.body.appendChild(btn);
            }
        } catch (err) {
            console.log("winpatch:onDeviceRefreshEnd error:", err);
        }
    };

    return obj;
};
