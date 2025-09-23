/**
 * @description MeshCentral Windows Patch Management Plugin
 * @license Apache-2.0
 * @version v0.0.8
 */

"use strict";

module.exports.winpatch = function (parent) {
    var obj = {};
    obj.parent = parent;

    // Export the hook so MeshCentral calls it
    obj.exports = ["onDeviceRefreshEnd"];

    obj.onDeviceRefreshEnd = function () {
        try {
            // Confirm hook fired (same as sample plugin)
            writeDeviceEvent(encodeURIComponent(currentNode._id));
            Q('d2devEvent').value = Date().toLocaleString() + ': WinPatch hook fired';
            focusTextBox('d2devEvent');

            // Pick a device button slot container
            var container = document.getElementById('devViewPageButton5');
            if (!container) container = document.getElementById('devViewPageButton4');
            if (!container) container = document.getElementById('devViewPageButton3');

            if (container && !document.getElementById('winpatchBtn')) {
                var btn = document.createElement('input');
                btn.type = 'button';
                btn.id = 'winpatchBtn';
                btn.className = 'button';
                btn.value = 'Run Windows Update';

                btn.onclick = function () {
                    writeDeviceEvent(encodeURIComponent(currentNode._id));
                    Q('d2devEvent').value = Date().toLocaleString() +
                        ': WinPatch - Run Windows Update requested';
                    focusTextBox('d2devEvent');

                    alert('Run Windows Update requested for ' + currentNode.name);
                };

                container.appendChild(btn);
            }
        } catch (err) {
            console.log("winpatch:onDeviceRefreshEnd error:", err);
        }
    };

    return obj;
};
