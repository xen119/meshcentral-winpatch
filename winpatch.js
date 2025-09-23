/**
 * @description MeshCentral Windows Patch Management Plugin (device-side UI)
 * Replaces the simple log test with a real button injected into the device UI.
 * Version: v0.0.3
 */

"use strict";

module.exports.winpatch = function (parent) {
    var obj = {};
    obj.parent = parent;

    // Export the hook so MeshCentral will call it (same pattern as the sample plugin)
    obj.exports = [
        "onDeviceRefreshEnd"
    ];

    // Called when device UI refreshes
    obj.onDeviceRefreshEnd = function () {
        try {
            // Use the same visible log behaviour so you know the hook ran (keeps parity with sample)
            writeDeviceEvent(encodeURIComponent(currentNode._id));
            Q('d2devEvent').value = Date().toLocaleString() + ': WinPatch hook fired';
            focusTextBox('d2devEvent');

            // Find a good place to add a button. Try several common container IDs/classes.
            var container = null;
            try { container = Q('d2devButtonBar'); } catch (e) { container = null; }
            if (!container) try { container = Q('d2devButtons'); } catch (e) { container = null; }
            if (!container) try { container = document.getElementById('deviceButtons'); } catch (e) { container = null; }
            if (!container) try { container = document.querySelector('.device-buttons'); } catch (e) { container = null; }
            if (!container) try { container = document.querySelector('.d2-device-actions'); } catch (e) { container = null; }

            // If we found a container and button not already added, add it
            if (container && !Q('winpatchBtn')) {
                var btn = document.createElement('input');
                btn.type = 'button';
                btn.id = 'winpatchBtn';
                btn.className = 'button';
                btn.value = 'Run Windows Update';

                // Click handler: log the action and attempt to send a command to the agent
                btn.onclick = function () {
                    // Write a device event (same pattern as sample) so action is visible in the device log
                    writeDeviceEvent(encodeURIComponent(currentNode._id));
                    Q('d2devEvent').value = Date().toLocaleString() + ': WinPatch - Run Windows Update requested';
                    focusTextBox('d2devEvent');

                    // Payload to ask the agent to run a PowerShell Windows Update command.
                    // Keep the command simple and obvious; you may change it to a more robust script later.
                    var payload = {
                        type: "powershell",
                        command: "Install-WindowsUpdate -AcceptAll -AutoReboot"
                    };

                    // Try common UI functions to send commands to the agent.
                    // If your MeshCentral UI exposes a different API, replace these lines accordingly.
                    if (typeof sendAgentCommand === 'function') {
                        try { sendAgentCommand(currentNode._id, payload); }
                        catch (e) { alert('sendAgentCommand failed: ' + e.toString()); }
                        return;
                    }

                    if (typeof meshserver !== 'undefined' && meshserver.sendCommand) {
                        try { meshserver.sendCommand(currentNode._id, payload); }
                        catch (e) { alert('meshserver.sendCommand failed: ' + e.toString()); }
                        return;
                    }

                    // If no command API is available, notify user (but we still logged the intent)
                    alert('Agent command API not available in this UI. Action was logged to device events.');
                };

                // Append the button to the container
                container.appendChild(btn);
            }
        } catch (err) {
            // Keep errors visible in the browser console
            console.log("winpatch:onDeviceRefreshEnd error:", err);
        }
    };

    return obj;
};
