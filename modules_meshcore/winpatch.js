/**
 * Client-side plugin UI — inject floating button and call server plugin handler
 * version: v0.2.4
 */

"use strict";

function consoleaction(args, rights, sessionid, parent) {
    if (args.pluginaction === "runUpdate") {
        var os = require('os').platform();
        var cmd;

        if (os === "win32") {
            // Needs PSWindowsUpdate module on endpoint
            cmd = "powershell.exe -Command Install-WindowsUpdate -AcceptAll -AutoReboot";
        } else {
            cmd = "bash -c 'apt-get update && apt-get -y upgrade'";
        }

        try {
            process.exec(cmd, function (exitCode, stdout, stderr) {
                parent.SendCommand({
                    action: "plugin",
                    plugin: "winpatch",
                    pluginaction: "updateResult",
                    nodeId: parent.dbNodeKey,
                    output: stderr && stderr.length ? stderr : stdout
                });
            });
        } catch (e) {
            parent.SendCommand({
                action: "plugin",
                plugin: "winpatch",
                pluginaction: "updateResult",
                nodeId: parent.dbNodeKey,
                output: "Execution failed: " + e.toString()
            });
        }
    }
}

module.exports = { consoleaction: consoleaction };
