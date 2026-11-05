const { test } = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { main, md } = require('../index.js');
test('summary written, outputs set, fail_on_serious honoured, never "compliant"', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ wordpress: true, summary: { problems: 3, serious: 2, fixed_by_free_plugin: 1 }, findings: [{ rule: 'image-alt', title: 'Images without alt text', impact: 'critical', count: 2, how: 'Add alt text | describing the image', fixed_by_free_plugin: true }], note: 'Automated checks find many problems, not all.', free_plugin: { url: 'https://wordpress.org/plugins/fixlight/' } }), { status: 200 });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-')); const sum = path.join(dir, 'summary.md'); const out = path.join(dir, 'out.txt');
  Object.assign(process.env, { INPUT_URL: 'https://a.example/\nhttps://b.example/', INPUT_API_KEY: 'k', INPUT_FAIL_ON_SERIOUS: 'true', INPUT_MAX_SERIOUS: '3', GITHUB_STEP_SUMMARY: sum, GITHUB_OUTPUT: out });
  try {
    assert.equal(await main(), 1); // 4 serious over 2 urls > 3
    const s = fs.readFileSync(sum, 'utf8'); assert.match(s, /Images without alt text/); assert.doesNotMatch(s, /compliant/i); assert.match(s, /Fixlight plugin/);
    assert.match(fs.readFileSync(out, 'utf8'), /serious=4/);
    process.env.INPUT_FAIL_ON_SERIOUS = 'false'; assert.equal(await main(), 0);
    assert.match(md('https://x', { status: 429, body: { limits: { per_hour: 20, per_day: 200 } } }), /rate limited/);
  } finally { globalThis.fetch = realFetch; }
});
