/**
 * @description MeshCentral Windows Patch Management Plugin (force button visible)
 * @license Apache-2.0
 * @version v0.0.4
 */

"use strict";

module.exports.winpatch = function (parent) {
    var obj = {};
    obj.parent = parent;

    // Export the hook so MeshCentral calls it
    obj.exports = [
        "onDeviceRefreshEnd"
    ];

    // Called whenever a device page refreshes
    obj.onDeviceRefreshEnd = function () {
        try {
            // Same behaviour as the sample plugin, so you know hook fired
            writeDeviceEvent(encodeURIComponent(currentNode._id));
            Q('d2devEvent').value = Date().toLocaleString() + ': WinPatch hook fired';
            focusTextBox('d2devEvent');

            // Always add the button at the very top of the page
            if (!Q('winpatchBtn')) {
                var btn = document.createElement('input');
                btn.type = 'button';
                btn.id = 'winpatchBtn';
                btn.className = 'button';
                btn.value = 'Run Windows Update';

                btn.onclick = function () {
                    // Log the click
                    writeDeviceEvent(encodeURIComponent(currentNode._id));
                    Q('d2devEvent').value = Date().toLocaleString() + ': WinPatch button clicked';
                    focusTextBox('d2devEvent');

                    // For now just show alert — replace with actual agent command later
                    alert('Run Windows Update requested for ' + currentNode.name);
                };

                // Put button at very top of <body> so it’s always visible
                document.body.insertBefore(btn, document.body.firstChild);
            }
        } catch (err) {
            console.log("winpatch:onDeviceRefreshEnd error:", err);
        }
    };

    return obj;
};
