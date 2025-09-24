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

            // Use Node-compatible child_process in MeshAgent modules_meshcore context
            // Prefer execFile for better quoting/args handling
            var cp = require('child_process');
            var child;
            if (os === "win32") {
                // Execute PowerShell with arguments
                child = cp.execFile(process.env['windir'] + '\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', [
                    '-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-Command', 'Install-WindowsUpdate -AcceptAll -AutoReboot'
                ], { windowsHide: true }, function(error, stdout, stderr){
                    parent.SendCommand({
                        action: "plugin",
                        plugin: "winpatch",
                        pluginaction: "updateResult",
                        ok: !error,
                        output: (stderr && stderr.length ? stderr.toString() : stdout.toString()) || (error ? String(error) : '')
                    });
                });
            } else {
                child = cp.exec(cmd, function(error, stdout, stderr){
                    parent.SendCommand({
                        action: "plugin",
                        plugin: "winpatch",
                        pluginaction: "updateResult",
                        ok: !error,
                        output: (stderr && stderr.length ? stderr.toString() : stdout.toString()) || (error ? String(error) : '')
                    });
                });
            }
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
