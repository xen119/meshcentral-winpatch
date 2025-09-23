/**
 * @description MeshCentral Windows Patch Management Plugin (floating overlay button)
 * @license Apache-2.0
 * @version v0.0.9
 */

"use strict";

module.exports.winpatch = function (parent) {
    var obj = {};
    obj.parent = parent;

    obj.exports = ["onDeviceRefreshEnd"];

    obj.onDeviceRefreshEnd = function () {
        try {
            // Confirm hook fired (like sample plugin)
            writeDeviceEvent(encodeURIComponent(currentNode._id));
            Q('d2devEvent').value = Date().toLocaleString() + ': WinPatch hook fired';
            focusTextBox('d2devEvent');

            // Add floating button overlay, independent of MeshCentral containers
            if (!document.getElementById('winpatchFloatingBtn')) {
                var btn = document.createElement('button');
                btn.id = 'winpatchFloatingBtn';
                btn.innerText = 'Run Windows Update';

                // Style it so it's always visible in bottom-right corner
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
                    writeDeviceEvent(encodeURIComponent(currentNode._id));
                    Q('d2devEvent').value = Date().toLocaleString() +
                        ': WinPatch - Run Windows Update requested';
                    focusTextBox('d2devEvent');

                    alert('Run Windows Update requested for ' + currentNode.name);
                };

                document.body.appendChild(btn);
            }
        } catch (err) {
            console.log("winpatch:onDeviceRefreshEnd error:", err);
        }
    };

    return obj;
};
