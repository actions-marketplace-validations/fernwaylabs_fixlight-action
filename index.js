// Fixlight Accessibility Scan: a GitHub Action with no dependencies. Calls Fixlight's scan API and writes the
// job summary. Never says "compliant". Exit 1 only when fail_on_serious is true and serious problems exceed max_serious.
'use strict';
const fs = require('node:fs');
const API = process.env.FIXLIGHT_SCAN_URL || 'https://fixlight.fernwaylabs.com/api/v1/scan';
const input = (name, d = '') => (process.env['INPUT_' + name.toUpperCase().replace(/ /g, '_')] ?? d).toString();

async function scan(url, key) {
  const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', authorization: `Bearer ${key}`, 'user-agent': 'fixlight-action/1.0 (+https://github.com/fernwaylabs/fixlight-action)' }, body: JSON.stringify({ url }) });
  let body = {}; try { body = await r.json(); } catch { body = {}; }
  return { status: r.status, body };
}

function md(url, res) {
  if (res.status !== 200) {
    const why = { 400: 'not a public web address', 401: 'the API key is not valid', 429: `rate limited (${res.body.limits?.per_hour ?? 20}/hour, ${res.body.limits?.per_day ?? 200}/day)${res.body.more_url ? `; to ask for more: ${res.body.more_url}` : ''}`, 502: `the page did not load: ${res.body.message ?? ''}`, 503: 'the scan service is busy for today (resets 00:00 UTC)' }[res.status] || `HTTP ${res.status}`;
    return `### ${url}\n\nScan not run: ${why}.\n`;
  }
  const b = res.body, s = b.summary || {};
  const rows = (b.findings || []).map(f => `| ${f.impact || ''} | ${f.title || f.rule || ''} | ${f.count ?? ''} | ${f.fixed_by_free_plugin ? 'yes' : ''} | ${(f.how || '').replace(/\|/g, '/').slice(0, 160)} |`).join('\n');
  return `### ${url}\n\n**${s.problems ?? 0} problems** (${s.serious ?? 0} serious or critical)${b.wordpress ? `, ${s.fixed_by_free_plugin ?? 0} fixed by the free [Fixlight plugin](${b.free_plugin?.url || 'https://wordpress.org/plugins/fixlight/'}) on its own` : ''}.${b.cached ? ' (From a scan within the last 24 hours.)' : ''}\n\n| Impact | Problem | Count | Free plugin fixes it | How to fix |\n|---|---|---|---|---|\n${rows}\n\n${b.note ? '_' + b.note + '_' : ''}\n`;
}

async function main() {
  const urls = input('url').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const key = input('api_key');
  if (!urls.length || !key) { console.log('::error::inputs url and api_key are required'); return 1; }
  const totals = { problems: 0, serious: 0, fixed_by_free_plugin: 0 }; const parts = []; let failed = false;
  for (const url of urls) {
    const res = await scan(url, key);
    if (res.status === 200) { const s = res.body.summary || {}; totals.problems += s.problems || 0; totals.serious += s.serious || 0; totals.fixed_by_free_plugin += s.fixed_by_free_plugin || 0; }
    else { failed = failed || res.status === 401; console.log(`::warning::${url}: scan not run (HTTP ${res.status})`); }
    parts.push(md(url, res));
  }
  const summary = `## Fixlight accessibility scan\n\n${parts.join('\n')}\nAutomated checks find many accessibility problems, not all of them; this is not a statement about any law.\n`;
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  else console.log(summary);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `problems=${totals.problems}\nserious=${totals.serious}\nfixed_by_free_plugin=${totals.fixed_by_free_plugin}\n`);
  if (failed) { console.log('::error::the Fixlight API key was rejected'); return 1; }
  if (/^(true|1|yes)$/i.test(input('fail_on_serious', 'false')) && totals.serious > Number(input('max_serious', '0') || 0)) {
    console.log(`::error::${totals.serious} serious accessibility problems (allowed: ${input('max_serious', '0')})`); return 1;
  }
  return 0;
}
if (require.main === module) main().then(code => process.exit(code)).catch(e => { console.log(`::error::${e.message}`); process.exit(1); });
module.exports = { main, md };
