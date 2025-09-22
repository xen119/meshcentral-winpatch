/**
* MeshCentral Patch Management (Windows) selective install + persistence
*/
"use strict";

module.exports.patch = function(parent) {
  const obj = {};
  obj.parent = parent;

  // Web UI exports (client-side hook names)
  obj.exports = [
    "onDeviceToolbar",
    "scanNode",
    "applyAll",
    "applySelected",
    "onMessage"
  ];

  // ===== Client-side UI =====
  // Basic in-page modal helper
  function ensureModal() {
    if (typeof Q !== 'function') return;
    if (!Q('patchModal')) {
      const d = document.createElement('div');
      d.id = 'patchModal';
      d.style.position = 'fixed';
      d.style.left = '50%';
      d.style.top = '20%';
      d.style.transform = 'translateX(-50%)';
      d.style.minWidth = '620px';
      d.style.maxWidth = '80%';
      d.style.background = '#1f1f1f';
      d.style.border = '1px solid #444';
      d.style.borderRadius = '6px';
      d.style.zIndex = 10000;
      d.style.display = 'none';
      d.innerHTML = `
        <div style="padding:12px 12px 0 12px; display:flex; align-items:center; justify-content:space-between;">
          <div style="font-weight:600">Patch Scan Results</div>
          <button id="patchModalClose" class="dialogCloseButton" title="Close">×</button>
        </div>
        <div id="patchModalBody" style="padding:12px; max-height:50vh; overflow:auto; font-size:12px"></div>
        <div style="padding:12px; display:flex; gap:8px; justify-content:space-between; align-items:center;">
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="checkbox" id="patchSelectAll"></input>
            <label for="patchSelectAll">Select All</label>
          </div>
          <div>
            <button id="patchApplySelectedBtn" class="dialogOkButton">Apply Selected</button>
            <button id="patchApplyAllBtn" class="dialogButton">Apply All</button>
            <button id="patchCancelBtn" class="dialogCancelButton">Close</button>
          </div>
        </div>`;
      document.body.appendChild(d);
      const hide = ()=>{ d.style.display='none'; };
      document.getElementById('patchModalClose').onclick = hide;
      document.getElementById('patchCancelBtn').onclick = hide;
      document.getElementById('patchApplyAllBtn').onclick = function(){ if (typeof plugin_call==='function') plugin_call('patch.applyAll'); };
      document.getElementById('patchApplySelectedBtn').onclick = function(){
        const checks = Array.from(document.querySelectorAll('#patchModalBody input[type=checkbox][data-kb]')).filter(c=>c.checked).map(c=>c.getAttribute('data-kb'));
        if (typeof plugin_call==='function') plugin_call('patch.applySelected', { kbs: checks });
      };
      document.getElementById('patchSelectAll').onclick = function(){
        const checks = document.querySelectorAll('#patchModalBody input[type=checkbox][data-kb]');
        checks.forEach(c=>{ c.checked = document.getElementById('patchSelectAll').checked; });
      };
    }
    return Q('patchModal');
  }

  function showScanResults(data){
    const modal = ensureModal(); if (!modal) return;
    const body = document.getElementById('patchModalBody');
    const updates = (data && data.updates) || [];
    if (!updates.length) {
      body.innerHTML = '<div>No updates found or scanner unavailable.</div>';
    } else {
      const rows = updates.map(u=>{
        const sev = (u.Severity||'').toString();
        const reboot = u.Reboot? 'Yes':'No';
        const id = (u.Id||'').toString();
        const title = (u.Title||'').toString();
        const kbAttr = id.replace(/"/g,'');
        return `<label style="display:grid; grid-template-columns: 26px 140px 1fr 110px 80px; gap:8px; padding:6px 0; border-bottom:1px solid #333; align-items:center;">
                  <input type="checkbox" data-kb="${kbAttr}">
                  <div style="color:#aaa">${id}</div>
                  <div>${title}</div>
                  <div>${sev}</div>
                  <div>${reboot}</div>
                </label>`;
      }).join('');
      body.innerHTML = `
        <div style="display:grid; grid-template-columns: 26px 140px 1fr 110px 80px; gap:8px; padding:6px 0; border-bottom:1px solid #555; font-weight:600">
          <div></div><div>KB/ID</div><div>Title</div><div>Severity</div><div>Reboot</div>
        </div>${rows}`;
    }
    modal.style.display = 'block';
  }

  // Adds buttons to the device page toolbar
  obj.onDeviceToolbar = function() {
    try {
      if (typeof addDevicePageToolbarButton === 'function') {
        addDevicePageToolbarButton({ id:'patch-scan', tooltip:'Scan for Updates', icon:'fa fa-sync', onclick: function(){ if (typeof plugin_call==='function') { plugin_call('patch.scan'); } } });
        addDevicePageToolbarButton({ id:'patch-apply', tooltip:'Apply All Updates', icon:'fa fa-download', onclick: function(){ if (typeof plugin_call==='function') { plugin_call('patch.applyAll'); } } });
      }
    } catch (e) { console.log('patch plugin toolbar error', e); }
  };

  // UI-callable helpers
  obj.scanNode = function() { try { if (typeof plugin_call === 'function') { plugin_call('patch.scan'); } } catch (e) {} };
  obj.applyAll = function() { try { if (typeof plugin_call === 'function') { plugin_call('patch.applyAll'); } } catch (e) {} };
  obj.applySelected = function(opts) { try { if (typeof plugin_call === 'function') { plugin_call('patch.applySelected', opts||{}); } } catch (e) {} };

  // Receive messages from server
  obj.onMessage = function(msg) {
    try {
      if (!msg || msg.plugin !== 'patch') return;
      if (msg.cmd === 'scanResult' && msg.data) { showScanResults(msg.data); }
      if (msg.cmd === 'applyResult' && msg.data) {
        if (typeof showToast === 'function') { showToast(msg.data.ok ? 'Patch installation started' : ('Failed: ' + (msg.data.error||''))); }
      }
    } catch (e) {}
  };

  // ===== Server-side =====
  // Simple persistence using server DB if available
  function db() { return (parent && parent.parent && parent.parent.db) ? parent.parent.db : null; }
  async function saveScan(nodeid, payload) {
    try {
      const database = db();
      if (database && database.Set) {
        await database.Set('plugin_patch_scan_'+nodeid, payload);
      } else {
        // fallback to memory
        mem.scans.set(nodeid, payload);
      }
    } catch (e) { mem.scans.set(nodeid, payload); }
  }
  async function loadScan(nodeid) {
    try {
      const database = db();
      if (database && database.Get) {
        const v = await database.Get('plugin_patch_scan_'+nodeid);
        return v || null;
      }
    } catch (e) {}
    return mem.scans.get(nodeid)||null;
  }

  // Runtime job tracking and memory store
  const pending = new Map(); // key: jobid -> { ws, nodeid, type, buffer }
  const mem = { scans: new Map() };
  let jobSeq = 1;

  function newJob(nodeid, type, ws) {
    const id = `${Date.now()}-${jobSeq++}`;
    const job = { id, nodeid, type, ws, buffer: '', done: false };
    pending.set(id, job);
    return job;
  }

  function completeJob(job, payload) {
    if (job.done) return;
    job.done = true;
    if (job.type === 'scan' && payload && payload.updates) { saveScan(job.nodeid, payload).catch(()=>{}); }
    try { if (job.ws && job.ws.send) { job.ws.send(JSON.stringify({ action:'plugin', plugin:'patch', cmd: job.type === 'scan' ? 'scanResult' : 'applyResult', data: payload })); } } catch(e){}
    pending.delete(job.id);
  }

  function runOnAgent(nodeid, shellCommand, type, ws) {
    const server = parent && parent.parent;
    if (!server) return;
    const job = newJob(nodeid, type, ws);
    const tag = `plugin/patch/${job.id}`;

    function eventHandler(source, event) {
      if (!event || event.action !== 'console') return;
      if (event.nodeid !== nodeid) return;
      const msg = (event.msg || event.value || '');
      if (typeof msg !== 'string') return;
      if (msg.indexOf(tag) === -1) return;
      const line = msg.substring(msg.indexOf(tag) + tag.length).trim();
      job.buffer += line;
      try {
        if (job.buffer.indexOf('{') !== -1 && job.buffer.lastIndexOf('}') > job.buffer.indexOf('{')) {
          const jsonStr = job.buffer.substring(job.buffer.indexOf('{'), job.buffer.lastIndexOf('}')+1);
          const data = JSON.parse(jsonStr);
          completeJob(job, Object.assign({ nodeid }, data));
        }
      } catch (e) {}
    }

    server.AddEventDispatchHook && server.AddEventDispatchHook(eventHandler);

    const wrapped = `${shellCommand} | ForEach-Object { Write-Output \"${tag} \" + $_ }`;
    const cmd = { action:'msg', type:'console', value: wrapped };
    if (server.sendCommandFromServer2) {
      server.sendCommandFromServer2(nodeid, cmd);
      setTimeout(function(){ if (!pending.has(job.id)) return; completeJob(job, { ok:false, error:'Timeout waiting for agent output' }); }, 30000);
    } else {
      completeJob(job, { ok:false, error:'Server API not available' });
    }
  }

  // Windows PowerShell scripts
  const psScan = `
$ErrorActionPreference = 'SilentlyContinue'
$os = (Get-CimInstance Win32_OperatingSystem).Caption
$hasPswu = Get-Module -ListAvailable -Name PSWindowsUpdate
$result = @()
if ($hasPswu) {
  try {
    Import-Module PSWindowsUpdate -ErrorAction Stop | Out-Null
    $updates = Get-WindowsUpdate -AcceptAll -IgnoreReboot -MicrosoftUpdate -WindowsUpdate -NotCategory 'Drivers' -WhatIf:$false -Verbose:$false -ErrorAction SilentlyContinue
    foreach ($u in $updates) {
      $kb = try { $u.KB } catch { $null }
      if (-not $kb -and $u.KBArticleIDs) { $kb = ($u.KBArticleIDs | Select-Object -First 1) }
      $result += [pscustomobject]@{ Id=$kb; Title=$u.Title; Severity=([string]::Join(',', @($u.MsrcSeverity))); Reboot=($u.AutoSelectOnWebSites -eq $true) }
    }
  } catch {}
}
@{ ok = $true; os=$os; updates = $result } | ConvertTo-Json -Compress -Depth 4
`;

  function psApplySelected(kbs) {
    const kbFilter = (Array.isArray(kbs) ? kbs : []).filter(x=>!!x).map(x=>`${'$'}_ -match "${'${'}(x+'').replace(/"/g,'\\"')${'}'}"`).join(' -or ');
    // This JavaScript builds a PowerShell script string
    let body = `
$ErrorActionPreference = 'SilentlyContinue'
$hasPswu = Get-Module -ListAvailable -Name PSWindowsUpdate
$rc = 0
if ($hasPswu) {
  try {
    Import-Module PSWindowsUpdate -ErrorAction Stop | Out-Null
    $sel = @()
    $updates = Get-WindowsUpdate -MicrosoftUpdate -WindowsUpdate -NotCategory 'Drivers' -AcceptAll -IgnoreReboot -ErrorAction SilentlyContinue
    foreach ($u in $updates) {
      $kb = try { $u.KB } catch { $null }
      if (-not $kb -and $u.KBArticleIDs) { $kb = ($u.KBArticleIDs | Select-Object -First 1) }
      if (${kbFilter ? `(${kbFilter})` : '$true'}) { $sel += $u }
    }
    if ($sel.Count -gt 0) { $sel | Install-WindowsUpdate -AcceptAll -AutoReboot:$false -IgnoreReboot -Verbose:$false -ErrorAction Continue | Out-Null }
    $rc = 0
  } catch { $rc = 1 }
} else {
  # Fallback has no select capability via UsoClient; acknowledge
  $rc = 2
}
@{ ok = ($rc -eq 0); code = $rc } | ConvertTo-Json -Compress -Depth 2
`;
    return body;
  }

  const psApplyAll = `
$ErrorActionPreference = 'SilentlyContinue'
$hasPswu = Get-Module -ListAvailable -Name PSWindowsUpdate
$rc = 0
if ($hasPswu) {
  try {
    Import-Module PSWindowsUpdate -ErrorAction Stop | Out-Null
    Install-WindowsUpdate -AcceptAll -AutoReboot:$false -IgnoreReboot -MicrosoftUpdate -WindowsUpdate -NotCategory 'Drivers' -Verbose:$false -ErrorAction Continue | Out-Null
    $rc = $LASTEXITCODE
    if (-not $rc) { $rc = 0 }
  } catch { $rc = 1 }
} else {
  try {
    UsoClient StartScan | Out-Null
    UsoClient StartDownload | Out-Null
    UsoClient StartInstall | Out-Null
    $rc = 0
  } catch { $rc = 1 }
}
@{ ok = ($rc -eq 0); code = $rc } | ConvertTo-Json -Compress -Depth 2
`;

  function runOnWindows(nodeid, ps, type, ws) {
    const command = 'powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ' + JSON.stringify(ps);
    runOnAgent(nodeid, command, type, ws);
  }

  // Server hooks
  if (parent && parent.parent) {
    const server = parent.parent;
    if (server.addServerHook) {
      server.addServerHook('patch.scan', function (ws, req) {
        const nodeid = (req && req.nodeid) || (ws && ws.query && ws.query.nodeid) || (req && req.query && req.query.nodeid);
        if (!nodeid) { try { ws.send(JSON.stringify({ action:'plugin', plugin:'patch', cmd:'scanResult', data:{ ok:false, error:'Missing nodeid' } })); } catch(e){} return; }
        runOnWindows(nodeid, psScan, 'scan', ws);
      });

      server.addServerHook('patch.applyAll', function (ws, req) {
        const nodeid = (req && req.nodeid) || (ws && ws.query && ws.query.nodeid) || (req && req.query && req.query.nodeid);
        if (!nodeid) { try { ws.send(JSON.stringify({ action:'plugin', plugin:'patch', cmd:'applyResult', data:{ ok:false, error:'Missing nodeid' } })); } catch(e){} return; }
        runOnWindows(nodeid, psApplyAll, 'apply', ws);
      });

      server.addServerHook('patch.applySelected', function (ws, req) {
        const nodeid = (req && req.nodeid) || (ws && ws.query && ws.query.nodeid) || (req && req.query && req.query.nodeid);
        const kbs = (req && req.kbs) || (req && req.body && req.body.kbs) || [];
        if (!nodeid) { try { ws.send(JSON.stringify({ action:'plugin', plugin:'patch', cmd:'applyResult', data:{ ok:false, error:'Missing nodeid' } })); } catch(e){} return; }
        const ps = psApplySelected(kbs);
        runOnWindows(nodeid, ps, 'apply', ws);
      });

      // Optional: expose last scan
      server.addServerHook('patch.lastScan', async function (ws, req) {
        const nodeid = (req && req.nodeid) || (ws && ws.query && ws.query.nodeid) || (req && req.query && req.query.nodeid);
        const data = await loadScan(nodeid);
        try { ws.send(JSON.stringify({ action:'plugin', plugin:'patch', cmd:'scanResult', data: data||{ ok:false } })); } catch(e){}
      });
    }
  }

  return obj;
};

