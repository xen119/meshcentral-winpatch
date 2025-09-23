/**
* @description MeshCentral Windows Patch Management Plugin
* @author
* @license Apache-2.0
* @version v0.0.1
*/

"use strict";

module.exports.winpatch = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.exports = [
        "onDeviceRefreshEnd" // hook: when device info is refreshed
    ];

    // Add a Patch Management button when viewing a Windows device
    obj.onDeviceRefreshEnd = function () {
        if (!currentNode || !currentNode.agent || currentNode.agent.id.toLowerCase().indexOf("win") === -1) return;

        // Insert button into device UI
        var container = Q('d2devButtonBar');
        if (!Q('winpatchBtn')) {
            var btn = document.createElement('input');
            btn.type = 'button';
            btn.id = 'winpatchBtn';
            btn.value = 'Run Windows Update';
            btn.onclick = function () {
                // Send a message to the agent to trigger Windows Update
                sendAgentCommand(currentNode._id, {
                    action: "powershell",
                    value: "Install-WindowsUpdate -AcceptAll -AutoReboot"
                });
                alert('Windows Update triggered on ' + currentNode.name);
            };
            container.appendChild(btn);
        }
    };

    return obj;
}
