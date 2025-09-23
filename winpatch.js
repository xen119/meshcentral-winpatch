/**
 * @description MeshCentral Windows Patch Management Plugin (force button visible)
 * @license Apache-2.0
 * @version v0.0.5
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
        alert("WinPatch hook fired, about to add button");

        var btn = document.createElement('input');
        btn.type = 'button';
        btn.id = 'winpatchBtn';
        btn.value = 'HELLO WORLD BUTTON';
        btn.onclick = function () { alert('Button clicked!'); };

        document.body.appendChild(btn);

        alert("Button appended to body");
    } catch (err) {
        alert("Error: " + err.toString());
    }
};

    return obj;
};
