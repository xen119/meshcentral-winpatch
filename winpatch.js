/**
 * @description MeshCentral Windows Patch Management Plugin (force button visible)
 * @license Apache-2.0
 * @version v0.0.6
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
        alert("WinPatch hook fired, searching for iframe...");

        // Find all iframes
        var iframes = document.getElementsByTagName('iframe');
        var targetDoc = null;

        for (var i = 0; i < iframes.length; i++) {
            try {
                // Look for iframe that has the device page inside
                var doc = iframes[i].contentDocument || iframes[i].contentWindow.document;
                if (doc && doc.getElementById('d2devEvent')) {
                    targetDoc = doc;
                    break;
                }
            } catch (e) { }
        }

        if (!targetDoc) {
            alert("Could not find device iframe");
            return;
        }

        // Now inject button into that iframe's body
        if (!targetDoc.getElementById('winpatchBtn')) {
            var btn = targetDoc.createElement('input');
            btn.type = 'button';
            btn.id = 'winpatchBtn';
            btn.value = 'HELLO WORLD BUTTON';
            btn.onclick = function () { alert('Button inside iframe clicked!'); };

            targetDoc.body.appendChild(btn);
            alert("Button appended inside iframe body");
        }
    } catch (err) {
        alert("Error: " + err.toString());
    }
};


    return obj;
};
