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

var fs = require('fs');
var path = require('path');

module.exports.winpatch = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.VIEWS = __dirname + '/views/';
    obj.lastResults = {};
    obj.scheduleFile = path.join(__dirname, 'winpatch-schedules.json');
    obj.schedules = {};
    obj.scheduleTimer = null;

    function loadSchedules() {
        try {
            if (fs.existsSync(obj.scheduleFile)) {
                var raw = fs.readFileSync(obj.scheduleFile, 'utf8');
                obj.schedules = JSON.parse(raw || '{}') || {};
            }
        } catch (e) {
            obj.schedules = {};
        }

        var now = new Date();
        var needsSave = false;
        Object.keys(obj.schedules).forEach(function (nodeId) {
            var sched = obj.schedules[nodeId];
            if (!sched || typeof sched !== 'object') { delete obj.schedules[nodeId]; needsSave = true; return; }
            if (!sched.frequency || !sched.time) { return; }
            if (!sched.enabled && typeof sched.enabled !== 'undefined') { return; }
            if (!sched.nextRun || isNaN(Number(sched.nextRun)) || Number(sched.nextRun) <= now.getTime()) {
                sched.nextRun = computeNextRun(sched, now);
                needsSave = true;
            }
        });

        if (needsSave) { saveSchedules(); }
    }

    function saveSchedules() {
        try {
            fs.writeFileSync(obj.scheduleFile, JSON.stringify(obj.schedules, null, 2));
        } catch (e) {
            console.log('winpatch: unable to save schedules', e);
        }
    }

    function cloneSchedule(schedule) {
        return schedule ? JSON.parse(JSON.stringify(schedule)) : null;
    }

    function computeNextRun(schedule, fromDate) {
        try {
            var base = fromDate ? new Date(fromDate) : new Date();
            var parts = (schedule.time || '02:00').split(':');
            var hour = parseInt(parts[0], 10);
            var minute = parseInt(parts[1], 10);
            if (isNaN(hour) || isNaN(minute)) { hour = 2; minute = 0; }

            var target = new Date(base);
            target.setSeconds(0, 0);
            target.setHours(hour, minute, 0, 0);

            if (schedule.frequency === 'weekly') {
                var desired = typeof schedule.dayOfWeek === 'number' ? schedule.dayOfWeek : parseInt(schedule.dayOfWeek || 0, 10);
                if (isNaN(desired) || desired < 0 || desired > 6) { desired = 0; }
                var current = target.getDay();
                var diff = (desired - current + 7) % 7;
                if (diff === 0 && target <= base) { diff = 7; }
                target.setDate(target.getDate() + diff);
            } else { // daily default
                if (target <= base) {
                    target.setDate(target.getDate() + 1);
                }
            }

            return target.getTime();
        } catch (e) {
            return Date.now() + (6 * 60 * 60 * 1000); // fallback 6 hours later
        }
    }

    function dispatchToUi(message) {
        try {
            message = message || {};
            message.plugin = 'winpatch';
            if (typeof pluginHandler !== 'undefined' && pluginHandler.dispatchEvent) {
                pluginHandler.dispatchEvent('winpatch', message);
            }
        } catch (e) {}
    }

    function sendRunUpdate(nodeId, reason) {
        if (!nodeId) { return false; }
        try {
            var agent = obj.parent.parent.webserver.wsagents[nodeId];
            if (!agent) { throw new Error('agent offline'); }
            agent.send(JSON.stringify({
                action: 'plugin',
                plugin: 'winpatch',
                pluginaction: 'runUpdate',
                nodeId: nodeId,
                reason: reason || 'manual'
            }));
            return true;
        } catch (e) {
            console.log('winpatch: failed to send command', e);
            return false;
        }
    }

    function evaluateSchedules() {
        var now = Date.now();
        var changed = false;
        Object.keys(obj.schedules).forEach(function (nodeId) {
            var sched = obj.schedules[nodeId];
            if (!sched || sched.enabled === false) { return; }
            if (!sched.nextRun) {
                sched.nextRun = computeNextRun(sched);
                changed = true;
                return;
            }
            if (sched.nextRun <= now) {
                var success = sendRunUpdate(nodeId, 'scheduled');
                sched.lastRun = now;
                sched.lastStatus = success ? 'queued' : 'agent offline';
                sched.nextRun = computeNextRun(sched, new Date(now + 60000));
                changed = true;
                dispatchToUi({ pluginaction: 'scheduleTriggered', nodeId: nodeId, schedule: cloneSchedule(sched) });
            }
        });
        if (changed) { saveSchedules(); }
    }

    function ensureScheduleTimer() {
        if (obj.scheduleTimer) { return; }
        obj.scheduleTimer = setInterval(evaluateSchedules, 60 * 1000);
        // run soon after startup
        setTimeout(evaluateSchedules, 5 * 1000);
    }

    function handleSetSchedule(nodeId, scheduleInput) {
        if (!nodeId) {
            dispatchToUi({ pluginaction: 'scheduleError', nodeId: nodeId, message: 'Missing node id for schedule.' });
            return;
        }

        var frequency = (scheduleInput.frequency || '').toLowerCase();
        if (frequency !== 'daily' && frequency !== 'weekly') {
            dispatchToUi({ pluginaction: 'scheduleError', nodeId: nodeId, message: 'Unsupported frequency. Choose daily or weekly.' });
            return;
        }

        var time = scheduleInput.time || '02:00';
        if (!/^\d{1,2}:\d{2}$/.test(time)) {
            dispatchToUi({ pluginaction: 'scheduleError', nodeId: nodeId, message: 'Time must be in HH:MM format.' });
            return;
        }

        var enabled = (scheduleInput.enabled === false) ? false : true;
        var dayOfWeek = null;
        if (frequency === 'weekly') {
            dayOfWeek = parseInt(scheduleInput.dayOfWeek, 10);
            if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) { dayOfWeek = 0; }
        }

        var schedule = {
            nodeId: nodeId,
            frequency: frequency,
            time: time,
            dayOfWeek: dayOfWeek,
            enabled: enabled,
            lastRun: obj.schedules[nodeId] ? obj.schedules[nodeId].lastRun || null : null
        };

        schedule.nextRun = computeNextRun(schedule);

        obj.schedules[nodeId] = schedule;
        saveSchedules();
        dispatchToUi({ pluginaction: 'scheduleSaved', nodeId: nodeId, schedule: cloneSchedule(schedule) });
    }

    function handleClearSchedule(nodeId) {
        if (!nodeId) {
            dispatchToUi({ pluginaction: 'scheduleError', nodeId: nodeId, message: 'Missing node id.' });
            return;
        }
        if (obj.schedules[nodeId]) {
            delete obj.schedules[nodeId];
            saveSchedules();
        }
        dispatchToUi({ pluginaction: 'scheduleCleared', nodeId: nodeId });
    }

    loadSchedules();
    ensureScheduleTimer();

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
        var action = command.pluginaction;
        var nodeId = command.nodeId || command.nodeid;
        switch (action) {
            case "runUpdate":
                if (!sendRunUpdate(nodeId, 'manual')) {
                    dispatchToUi({ pluginaction: 'runUpdateFailed', nodeId: nodeId, message: 'Agent is offline or command could not be queued.' });
                }
                break;

            case "getSchedule":
                dispatchToUi({ pluginaction: 'scheduleData', nodeId: nodeId, schedule: cloneSchedule(obj.schedules[nodeId]) });
                break;

            case "setSchedule":
                handleSetSchedule(nodeId, command.schedule || {});
                break;

            case "clearSchedule":
                handleClearSchedule(nodeId);
                break;

            case "updateResult":
                try { console.log("winpatch: result:", command.output); } catch(_){ }
                try {
                    var k = command.nodeid || command.nodeId || '_';
                    obj.lastResults[k] = command;
                    if (obj.schedules[k]) {
                        obj.schedules[k].lastStatus = (command.ok === false) ? 'failed' : 'completed';
                        obj.schedules[k].lastRun = Date.now();
                        saveSchedules();
                        dispatchToUi({ pluginaction: 'scheduleData', nodeId: k, schedule: cloneSchedule(obj.schedules[k]) });
                    }
                } catch(_){ }
                // Dispatch to plugin tab listeners
                dispatchToUi(command);
                // Proactively dispatch to UI sessions as plugin event
                try {
                    obj.parent.parent.webserver.DispatchEvent(['server-users'], obj, { nolog: true, action: 'plugin', plugin: 'winpatch', pluginaction: 'updateResult', nodeid: command.nodeid || command.nodeId, output: command.output });
                } catch(_){ }
                break;
            default:
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
                    dispatchToUi(msg);
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
