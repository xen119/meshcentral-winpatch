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
    obj.lastResults = {};

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
        // JSON endpoint to fetch latest result (per node)
        if (req.query.latest == 1) {
            try {
                var k = req.query.node || '_';
                var m = obj.lastResults[k] || {};
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(m));
                return;
            } catch (ex) {
                res.sendStatus(500); return;
            }
        }
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
                        pluginaction: "runUpdate",
                        nodeId: command.nodeId
                    }));
                } catch (e) {
                    console.log("winpatch: failed to send command", e);
                }
                break;

            case "updateResult":
                try { console.log("winpatch: result:", command.output); } catch(_){ }
                try {
                    var k = command.nodeid || command.nodeId || '_';
                    obj.lastResults[k] = command;
                } catch(_){ }
                // Dispatch to plugin tab listeners
                try { if (typeof pluginHandler !== 'undefined' && pluginHandler.dispatchEvent) { pluginHandler.dispatchEvent('winpatch', command); } } catch(_){ }
                // Proactively dispatch to UI sessions as plugin event
                try {
                    obj.parent.parent.webserver.DispatchEvent(['server-users'], obj, { nolog: true, action: 'plugin', plugin: 'winpatch', pluginaction: 'updateResult', nodeid: command.nodeid || command.nodeId, output: command.output });
                } catch(_){ }
                break;
        }
    };

    obj.server_startup = function () {
        if (parent.parent.AddPluginHandler) {
            try { console.log('winpatch: registering agent message handler'); } catch(_){ }
            parent.parent.AddPluginHandler("winpatch", function (msg) {
                // msg comes from sendAgentMsg in meshcore
                if (msg && msg.pluginaction === "updateResult") {
                    try { console.log("winpatch: agent message:", JSON.stringify(msg)); } catch (ex) { }
                    // Cache last result per node (if provided)
                    try { var k = msg.nodeid || msg.nodeId || '_'; obj.lastResults[k] = msg; } catch (e) { }
                    // Relay to any web tabs (if available in this context)
                    try { if (typeof pluginHandler !== 'undefined' && pluginHandler.dispatchEvent) { pluginHandler.dispatchEvent("winpatch", msg); } } catch (_) {}
                    // Also emit to active user sessions as a fallback
                    try {
                        obj.parent.parent.webserver.DispatchEvent(['server-users'], obj, { nolog: true, action: 'plugin', plugin: 'winpatch', pluginaction: 'updateResult', output: msg.output });
                    } catch (e) { }
                }
            });
        }
    };
    // Ensure agent message handler is registered on load
    try { obj.server_startup(); } catch (e) { }

    return obj;
}
