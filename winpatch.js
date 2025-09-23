/**
* @description MeshCentral Windows Patch Management Plugin
* @license Apache-2.0
* @version v0.0.2
*/

"use strict";

module.exports.winpatch = function (parent) {
    var obj = {};
    obj.parent = parent;

    // IMPORTANT: export the hook so MeshCentral calls it
    obj.exports = [
        "onDeviceRefreshEnd"
    ];

    // Called whenever a device page refreshes
    obj.onDeviceRefreshEnd = function () {
        try {
            if (!currentNode || !currentNode.agent) return;
            // Only add button for Windows agents
            if (currentNode.agent.id.toLowerCase().indexOf("win") === -1) return;

            var container = Q('d2devButtonBar');
            if (!container || Q('winpatchBtn')) return; // already added

            var btn = document.createElement('input');
            btn.type = 'button';
            btn.id = 'winpatchBtn';
            btn.className = 'button';
            btn.value = 'Run Windows Update';

            btn.onclick = function () {
                meshserver.sendCommand(currentNode._id, {
                    type: "powershell",
                    command: "Install-WindowsUpdate -AcceptAll -AutoReboot"
                });
                alert('Windows Update triggered on ' + currentNode.name);
            };

            container.appendChild(btn);
        } catch (e) {
            console.log("winpatch error:", e);
        }
    };

    return obj;
}
