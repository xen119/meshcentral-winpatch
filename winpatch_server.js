/**
 * Server-side plugin: accepts UI requests and forwards command to agent
 * Version: 0.0.11-server
 *
 * Place this file at the plugin root (server-side module).
 */

"use strict";

module.exports = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.pluginName = "winpatch";

    // Expose server_startup so MeshCentral loads this module on server startup
    obj.server_startup = function () {
        parent.debug('[winpatch] server_startup');
        // Register a plugin handler for UI -> server RPC if webserver.pluginHandler usage is available
        try {
            if (parent.webserver && parent.webserver.pluginHandler) {
                parent.webserver.pluginHandler[obj.pluginName] = function (user, action, query, body, req, res) {
                    try {
                        // 'body' should contain: { action: 'run', payload: { nodeid, command } }
                        var data = (body && body.data) || query.data;
                        if (!data || !data.action || !data.payload) {
                            res.send({ ok: false, error: 'invalid request' });
                            return;
                        }

                        // Only accept 'run' action for now
                        if (data.action !== 'run') {
                            res.send({ ok: false, error: 'unsupported action' });
                            return;
                        }

                        var payload = data.payload || {};
                        var nodeid = payload.nodeid;
                        var command = payload.command;

                        if (!nodeid || !command) {
                            res.send({ ok: false, error: 'missing nodeid or command' });
                            return;
                        }

                        // Look up node info
                        var device = parent.db ? parent.db.GetNode(nodeid) : null;
                        if (!device) {
                            // Fallback: try using parent.webserver.GetNodeWithRights (older APIs)
                            try { device = parent.webserver.GetNodeWithRights(parent.db, nodeid, 0xFFFFFFFF); } catch (e) {}
                        }
                        if (!device) {
                            res.send({ ok: false, error: 'device not found' });
                            return;
                        }

                        // Build the agent command structure. We will request the agent to run a command.
                        // Use a plugin message envelope (agent-side plugin must be listening for 'winpatch' messages),
                        // or use SendCommandToAgent to run an ad-hoc remote command.
                        // Using SendCommandToAgent with 'run' is compatible with many MeshAgent setups.
                        try {
                            parent.parent.SendCommandToAgent(device._id, { type: 'run', command: command });
                            parent.debug('[winpatch] forwarded command to agent %s', nodeid);
                            res.send({ ok: true });
                        } catch (ex) {
                            parent.debug('[winpatch] SendCommandToAgent error: %s', ex.toString());
                            // Try plugin message approach as a fallback
                            try {
                                parent.parent.SendPluginMessageToAgent(device._id, obj.pluginName, { action: 'run', command: command });
                                res.send({ ok: true, fallback: 'pluginmsg' });
                            } catch (ex2) {
                                res.send({ ok: false, error: 'failed to send command to agent' });
                            }
                        }
                    } catch (e) {
                        parent.debug('[winpatch] plugin handler error: ' + e.toString());
                        try { res.send({ ok: false, error: e.toString() }); } catch {}
                    }
                };
                parent.debug('[winpatch] plugin handler registered');
            } else {
                parent.debug('[winpatch] webserver.pluginHandler not available in this MeshCentral build');
            }
        } catch (e) {
            parent.debug('[winpatch] server_startup registration failed: ' + e.toString());
        }
    };

    return obj;
};
