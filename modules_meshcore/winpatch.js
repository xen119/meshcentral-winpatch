/**
 * Client-side plugin UI — inject floating button and call server plugin handler
 * version: v0.2.4
 */

"use strict";

function consoleaction(args, rights, sessionid, parent) {
    try {
        if (!args || args.action !== "plugin" || args.plugin !== "winpatch") return;

        if (args.pluginaction === "runUpdate") {
            var nodeid = args.nodeId || args.nodeid;
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
                // Execute PowerShell with arguments: import PSWindowsUpdate and run Install-WindowsUpdate verbosely
                child = cp.execFile(process.env['windir'] + '\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', [
                    '-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-Command', 'try { Import-Module PSWindowsUpdate -ErrorAction Stop; $result = Install-WindowsUpdate -AcceptAll -AutoReboot -IgnoreReboot -Verbose *>&1; $result | Out-String } catch { $_ | Out-String }'
                ], { windowsHide: true }, function(error, stdout, stderr){
                    try {
                        var out = (stdout == null ? '' : String(stdout));
                        var err = (stderr == null ? '' : String(stderr));
                        var exitCode = (error && typeof error.code === 'number') ? error.code : 0;
                        var message = '';
                        if (out && out.trim().length) { message = out.trim(); }
                        if (err && err.trim().length) { message = message ? (message + '\n' + err.trim()) : err.trim(); }
                        if (!message) {
                            message = 'Command completed (exit ' + exitCode + ') with no stdout/stderr.';
                        }
                        parent.SendCommand({
                            action: "plugin",
                            plugin: "winpatch",
                            pluginaction: "updateResult",
                            nodeid: nodeid,
                            ok: !error,
                            exitCode: exitCode,
                            stdout: out,
                            stderr: err,
                            output: message
                        });
                    } catch (ex) {
                        parent.SendCommand({ action: "plugin", plugin: "winpatch", pluginaction: "updateResult", nodeid: nodeid, ok: false, output: 'Callback error: ' + String(ex) });
                    }
                });
            } else {
                child = cp.exec(cmd, function(error, stdout, stderr){
                    try {
                        var out = (stdout == null ? '' : String(stdout));
                        var err = (stderr == null ? '' : String(stderr));
                        var exitCode = (error && typeof error.code === 'number') ? error.code : 0;
                        var message = '';
                        if (out && out.trim().length) { message = out.trim(); }
                        if (err && err.trim().length) { message = message ? (message + '\n' + err.trim()) : err.trim(); }
                        if (!message) {
                            message = 'Command completed (exit ' + exitCode + ') with no stdout/stderr.';
                        }
                        parent.SendCommand({
                            action: "plugin",
                            plugin: "winpatch",
                            pluginaction: "updateResult",
                            nodeid: nodeid,
                            ok: !error,
                            exitCode: exitCode,
                            stdout: out,
                            stderr: err,
                            output: message
                        });
                    } catch (ex) {
                        parent.SendCommand({ action: "plugin", plugin: "winpatch", pluginaction: "updateResult", nodeid: nodeid, ok: false, output: 'Callback error: ' + String(ex) });
                    }
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
