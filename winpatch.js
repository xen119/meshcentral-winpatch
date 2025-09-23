/**
 * @description MeshCentral Windows Patch Management Plugin (force button visible)
 * @license Apache-2.0
 * @version v0.0.7
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
        alert("WinPatch hook fired, scanning DOM...");

        // Dump IDs of all divs
        var divs = document.getElementsByTagName('div');
        var ids = [];
        for (var i = 0; i < divs.length; i++) {
            if (divs[i].id) ids.push(divs[i].id);
        }
        alert("Found div IDs: " + ids.join(", "));

        // Try to inject button into the first found container
        if (divs.length > 0) {
            var target = divs[0];
            if (!document.getElementById('winpatchBtn')) {
                var btn = document.createElement('input');
                btn.type = 'button';
                btn.id = 'winpatchBtn';
                btn.value = 'HELLO WORLD BUTTON';
                btn.onclick = function () { alert('Button clicked!'); };
                target.appendChild(btn);
                alert("Button appended to div id=" + target.id);
            }
        }
    } catch (err) {
        alert("Error: " + err.toString());
    }
};



    return obj;
};
