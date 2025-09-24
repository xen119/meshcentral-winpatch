/**
 * Client-side plugin UI — inject floating button and call server plugin handler
 * version: v0.2.4
 */

"use strict";

function consoleaction(args, rights, sessionid, parent) {
    try {
        if (!args || args.action !== "plugin" || args.plugin !== "winpatch") return;

        if (args.pluginaction === "runUpdate") {
            var os = require("os").platform();
            var cmd;

            if (os === "win32") {
                // PSWindowsUpdate must be installed on the endpoint
                cmd = "powershell.exe -Command Install-WindowsUpdate -AcceptAll -AutoReboot";
            } else {
                cmd = "bash -c 'apt-get update && apt-get -y upgrade'";
            }

            // Use MeshAgent's exec2
            process.exec2(cmd, function (exitCode, stdout, stderr) {
                parent.SendCommand({
                    action: "plugin",
                    plugin: "winpatch",
                    pluginaction: "updateResult",
                    ok: (exitCode === 0),
                    output: stderr && stderr.length ? stderr.toString() : stdout.toString()
                });
            });
        }
    } catch (e) {
        parent.SendCommand({
            action: "plugin",
            plugin: "winpatch",
            pluginaction: "updateResult",
            ok: false,
            output: "Execution failed: " + e.toString()
        });
    }
}

module.exports = { consoleaction: consoleaction };
