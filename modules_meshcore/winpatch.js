/**
 * Client-side plugin UI — inject floating button and call server plugin handler
 * version: v0.2.3
 */

"use strict";

function consoleaction(args, rights, sessionid, parent) {
    if (args.pluginaction === "runUpdate") {
        var os = require('os').platform();
        var cp = require('child_process');
        var cmd;

        if (os === "win32") {
            // Requires PSWindowsUpdate module on the endpoint
            cmd = "powershell.exe -Command Install-WindowsUpdate -AcceptAll -AutoReboot";
        } else {
            cmd = "bash -c 'apt-get update && apt-get -y upgrade'";
        }

        cp.exec(cmd, function (err, stdout, stderr) {
            parent.SendCommand({
                action: "plugin",
                plugin: "winpatch",
                pluginaction: "updateResult",
                nodeId: parent.dbNodeKey,
                output: err ? stderr : stdout
            });
        });
    }
}

module.exports = { consoleaction: consoleaction };
