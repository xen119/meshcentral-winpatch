/**
 * winpatch.js
 * MeshCentral plugin (UI + server) for simple patch/command run
 * version: v0.2.4
 *
 * - Exports: onDeviceRefreshEnd (client hook)
 * - Server: registers plugin handler under parent.webserver.pluginHandler['winpatch']
 *
 * Notes:
 * - This file expects your plugin's config.json shortName to be "winpatch".
 * - Client sends a harmless smoke-test command (creates C:\temp\mesh-test.txt).
 *   After you confirm it works, replace the client command string with your Windows
 *   Update command/script.
 */

"use strict";

module.exports.winpatch = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.VIEWS = __dirname + '/views/';

    obj.exports = [ "onDeviceRefreshEnd" ];

    // --- UI Tab Injection ---
    obj.onDeviceRefreshEnd = function () {
        pluginHandler.registerPluginTab({
            tabTitle: 'WinPatch',
            tabId: 'pluginWinPatch'
        });
        QA('pluginWinPatch',
            '<iframe id="pluginIframeWinPatch" style="width:100%; height:400px; overflow:auto" ' +
            'frameBorder=0 src="/pluginadmin.ashx?pin=winpatch&user=1" />');
    };

    // --- Serve UI view ---
    obj.handleAdminReq = function (req, res, user) {
        if (req.query.user == 1) {
            res.render(obj.VIEWS + 'user', {});
            return;
        }
        res.sendStatus(401);
    };

    // --- Handle actions from UI ---
    obj.serveraction = function (command) {
        switch (command.pluginaction) {
            case "runUpdate":
                try {
                    obj.parent.parent.webserver.wsagents[command.nodeId].send(JSON.stringify({
                        action: "plugin",
                        plugin: "winpatch",
                        pluginaction: "runUpdate"
                    }));
                } catch (e) {
                    console.log("winpatch: failed to send command", e);
                }
                break;

            case "updateResult":
                console.log("winpatch: result:", command.output);
                break;
        }
    };

    obj.server_startup = function () {
        if (parent.parent.AddPluginHandler) {
            parent.parent.AddPluginHandler("winpatch", function (msg) {
                // msg comes from sendAgentMsg in meshcore
                if (msg && msg.pluginaction === "updateResult") {
                    try { console.log("winpatch: agent message:", JSON.stringify(msg)); } catch (ex) { }
                    // Relay to any web tabs
                    pluginHandler.dispatchEvent("winpatch", msg);
                    // Also emit to active user sessions as a fallback
                    try {
                        obj.parent.parent.webserver.DispatchEvent(['server-users'], obj, { nolog: true, action: 'plugin', plugin: 'winpatch', pluginaction: 'updateResult', output: msg.output });
                    } catch (e) { }
                }
            });
        }
    };


    return obj;
}
