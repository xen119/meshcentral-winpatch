/**
 * Client-side plugin UI — inject floating button and call server plugin handler
 * version: v0.2.4
 */

"use strict";

(function () {
    if (process.platform !== "win32" && process.platform !== "linux") return;

    var pluginName = "winpatch";

    addServerListener(pluginName, function (msg) {
        try {
            if (!msg || msg.pluginaction !== "runUpdate") return;

            var os = require('os').platform();
            var cmd;

            if (os === "win32") {
                // Requires PSWindowsUpdate installed on the endpoint
                cmd = "powershell.exe -Command Install-WindowsUpdate -AcceptAll -AutoReboot";
            } else {
                cmd = "bash -c 'apt-get update && apt-get -y upgrade'";
            }

            process.exec(cmd, function (exitCode, stdout, stderr) {
                sendAgentMsg(pluginName, {
                    pluginaction: "updateResult",
                    ok: (exitCode === 0),
                    stdout: stdout ? stdout.toString() : "",
                    stderr: stderr ? stderr.toString() : ""
                });
            });
        } catch (e) {
            sendAgentMsg(pluginName, {
                pluginaction: "updateResult",
                ok: false,
                error: e.toString()
            });
        }
    });
})();
