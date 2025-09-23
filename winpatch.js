/**
 * @description MeshCentral Windows Patch Management Plugin (server-side)
 * @license Apache-2.0
 * @version v0.0.12
 */

"use strict";

module.exports = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.pluginName = "winpatch";

    // Called when server starts
    obj.server_startup = function () {
        parent.debug('[winpatch] server_startup');

        if (parent.webserver && parent.webserver.pluginHandler) {
            parent.webserver.pluginHandler[obj.pluginName] = function (user, action, query, body, req, res) {
                try {
                    const nodeid = (body && body.nodeid) || query.nodeid;
                    const data = (body && body.data) || query.data;
                    if (!nodeid || !data || !data.command) {
                        res.send({ ok: false, error: 'invalid request' });
                        return;
                    }

                    // Forward command to agent
                    try {
                        parent.parent.SendCommandToAgent(nodeid, { type: 'run', command: data.command });
                        parent.debug('[winpatch] sent command to agent ' + nodeid);
                        res.send({ ok: true });
                    } catch (ex) {
                        parent.debug('[winpatch] SendCommandToAgent error: ' + ex.toString());
                        res.send({ ok: false, error: 'failed to send to agent' });
                    }
                } catch (e) {
                    res.send({ ok: false, error: e.toString() });
                }
            };
        }
    };

    return obj;
};
