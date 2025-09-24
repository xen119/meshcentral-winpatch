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
                // Needs PSWindowsUpdate on endpoint
                cmd = "powershell.exe -Command Install-WindowsUpdate -AcceptAll -AutoReboot";
            } else {
                cmd = "bash -c 'apt-get update && apt-get -y upgrade'";
            }

            process.exec(cmd, function (exitCode, stdout, stderr) {
                parent.SendCommand({
                    action: "plugin",
                    plugin: "winpatch",
                    pluginaction: "updateResult",
                    nodeId: parent.dbNodeKey,
                    ok: (exitCode === 0),
                    stdout: stdout ? stdout.toString() : "",
                    stderr: stderr ? stderr.toString() : ""
                });
            });
        }
    } catch (e) {
        parent.SendCommand({
            action: "plugin",
            plugin: "winpatch",
            pluginaction: "updateResult",
            nodeId: parent.dbNodeKey,
            ok: false,
            error: e.toString()
        });
    }
}

module.exports = { consoleaction: consoleaction };

