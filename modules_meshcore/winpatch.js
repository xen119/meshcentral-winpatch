/**
 * Client-side plugin UI - inject floating button and call server plugin handler
 * version: v0.2.4
 */

"use strict";

var childProcess = require("child_process");
var fs = require("fs");
var osModule = require("os");

function consoleaction(args, rights, sessionid, parent) {
    try {
        if (!args || args.action !== "plugin" || args.plugin !== "winpatch") { return; }

        if (args.pluginaction === "runUpdate") {
            var nodeid = args.nodeId || args.nodeid;
            var platform = osModule.platform();
            var child;

            function handleResult(error, stdout, stderr) {
                try {
                    var out = (stdout == null ? "" : stdout.toString());
                    var err = (stderr == null ? "" : stderr.toString());
                    var exitCode = (error && typeof error.code === "number") ? error.code : 0;
                    var messageParts = [];
                    if (out && out.trim().length) { messageParts.push(out.trim()); }
                    if (err && err.trim().length) { messageParts.push(err.trim()); }
                    if (!messageParts.length) {
                        if (!error && exitCode === 0) {
                            messageParts.push("No updates available (command produced no output).");
                        } else {
                            messageParts.push("Command completed (exit " + exitCode + ") with no stdout/stderr.");
                        }
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
                        output: messageParts.join("\n\n")
                    });
                } catch (ex) {
                    parent.SendCommand({
                        action: "plugin",
                        plugin: "winpatch",
                        pluginaction: "updateResult",
                        nodeid: nodeid,
                        ok: false,
                        output: "Callback error: " + String(ex)
                    });
                }
            }

            if (platform === "win32") {
                var tmpFile = null;
                try {
                    var scriptLines = [
                        "try {",
                        "    if (-not (Get-Module -ListAvailable -Name PSWindowsUpdate)) {",
                        "        throw \"PSWindowsUpdate module not found. Install it for all users with: Install-Module PSWindowsUpdate -Scope AllUsers\";",
                        "    }",
                        "    if (-not ([bool](Get-Service -Name wuauserv -ErrorAction SilentlyContinue))) {",
                        "        throw \"Windows Update service (wuauserv) is not available on this system.\";",
                        "    }",
                        "    if ((Get-Service -Name wuauserv).Status -ne \"Running\") {",
                        "        Start-Service -Name wuauserv -ErrorAction Stop;",
                        "    }",
                        "    Import-Module PSWindowsUpdate -ErrorAction Stop;",
                        "    $usedMicrosoftUpdate = $true;",
                        "    $updates = Get-WindowsUpdate -MicrosoftUpdate -IgnoreUserInput -ErrorAction SilentlyContinue;",
                        "    if (-not $updates) {",
                        "        $usedMicrosoftUpdate = $false;",
                        "        $updates = Get-WindowsUpdate -IgnoreUserInput -ErrorAction SilentlyContinue;",
                        "    }",
                        "    $scanSummary = if ($updates) {",
                        "        $updates | Select-Object KBArticleID, Title, Size, MsrcSeverity, IsDownloaded, IsInstalled | Format-Table -AutoSize | Out-String",
                        "    } else {",
                        "        \"No applicable updates detected.\"",
                        "    };",
                        "    $installOutput = $null;",
                        "    if ($updates) {",
                        "        $installParams = @{",
                        "            AcceptAll       = $true;",
                        "            AutoReboot      = $true;",
                        "            IgnoreReboot    = $true;",
                        "            IgnoreUserInput = $true;",
                        "            Verbose         = $true;",
                        "            ErrorAction     = \"Continue\"",
                        "        };",
                        "        if ($usedMicrosoftUpdate) { $installParams[\"MicrosoftUpdate\"] = $true; }",
                        "        $installOutput = Install-WindowsUpdate @installParams *>&1;",
                        "    }",
                        "    $installText = if ($installOutput) {",
                        "        $installOutput | Out-String",
                        "    } else {",
                        "        \"Install-WindowsUpdate not invoked because no updates were returned by Get-WindowsUpdate.\"",
                        "    };",
                        "    $sourceInfo = \"Scan source: \" + ($usedMicrosoftUpdate ? \"Microsoft Update\" : \"Windows Update only\");",
                        "    $output = @(",
                        "        \"=== Get-WindowsUpdate ===\",",
                        "        $sourceInfo,",
                        "        $scanSummary.TrimEnd(),",
                        "        \"=== Install-WindowsUpdate ===\",",
                        "        $installText.TrimEnd()",
                        "    );",
                        "    $output -join [System.Environment]::NewLine",
                        "} catch {",
                        "    ($_ | Out-String).Trim()",
                        "}"
                    ];
                    var scriptContent = scriptLines.join("\r\n");
                    var tempDir = (typeof osModule.tmpdir === "function" ? osModule.tmpdir() : null) || process.env["TEMP"] || process.env["TMP"] || "C:\\Windows\\Temp";
                    var sep = tempDir.charAt(tempDir.length - 1);
                    if (sep !== "\\" && sep !== "/") {
                        tempDir += "\\";
                    }
                    tmpFile = tempDir + "winpatch-" + Date.now() + ".ps1";
                    fs.writeFileSync(tmpFile, scriptContent, { encoding: "utf8" });
                    child = childProcess.execFile(process.env["windir"] + "\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                        ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmpFile],
                        { windowsHide: true },
                        function (error, stdout, stderr) {
                            if (tmpFile) { try { fs.unlinkSync(tmpFile); } catch (e) {} tmpFile = null; }
                            handleResult(error, stdout, stderr);
                        });
                } catch (prepErr) {
                    if (tmpFile) { try { fs.unlinkSync(tmpFile); } catch (e) {} }
                    parent.SendCommand({
                        action: "plugin",
                        plugin: "winpatch",
                        pluginaction: "updateResult",
                        nodeid: nodeid,
                        ok: false,
                        output: "Failed to prepare PowerShell script: " + String(prepErr)
                    });
                }
            } else {
                child = childProcess.exec("bash -c 'apt-get update && apt-get -y upgrade'", function (error, stdout, stderr) {
                    handleResult(error, stdout, stderr);
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
