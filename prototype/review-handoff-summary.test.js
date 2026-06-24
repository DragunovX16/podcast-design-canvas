"use strict";

// Guards the review handoff summary publish-prep screen (#583).
// Run with: `node prototype/review-handoff-summary.test.js`

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(__dirname, "review-handoff-summary.html"), "utf8");
const publishNav = fs.readFileSync(path.join(root, "preview", "publish-nav.js"), "utf8");
const shell = fs.readFileSync(path.join(root, "preview", "index.html"), "utf8");

const inlineScript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .find((source) => source.includes("const reviewItems = ["));

assert.ok(inlineScript, "review handoff summary has an inline behavior model");
new vm.Script(inlineScript);

const sandbox = { module: { exports: {} } };
vm.runInNewContext(inlineScript, sandbox);

assert.ok(html.includes('../preview/publish-nav.js"'), "review handoff summary loads publish navigation");
assert.ok(html.includes('data-publish-step="review-handoff-summary"'), "review handoff summary declares its publish step");
assert.ok(publishNav.includes('id: "review-handoff-summary"'), "publish nav includes review handoff summary");
assert.ok(shell.includes("../prototype/review-handoff-summary.html"), "preview shell links to review handoff summary");

assert.strictEqual(sandbox.module.exports.reviewerAudiences.length, 5);
assert.strictEqual(sandbox.module.exports.deadlines.length, 3);
assert.strictEqual(sandbox.module.exports.reviewItems.length, 5);
assert.strictEqual(sandbox.module.exports.summaryCountsFor(sandbox.module.exports.itemsForAudience("client")).needsDecision, 2);
assert.strictEqual(sandbox.module.exports.summaryCountsFor(sandbox.module.exports.itemsForAudience("guest")).notRelevant, 3);
assert.strictEqual(sandbox.module.exports.reviewCopyStatus(sandbox.module.exports.itemsForAudience("sponsor")), "blocked");
assert.strictEqual(sandbox.module.exports.deadlineLabel("48h"), "Need decision in 48 hours");
assert.strictEqual(sandbox.module.exports.canSendSummary(sandbox.module.exports.itemsForAudience("host")), true);

for (const owner of [
  "audio-caption-quality-review.html",
  "contextual-broll-moments.html",
  "layout-safe-areas.html",
  "thumbnail-cover-frame.html",
  "episode-metadata-publishing.html",
]) {
  assert.ok(inlineScript.includes(owner), `review handoff can open ${owner}`);
  assert.ok(fs.existsSync(path.join(__dirname, owner)), `fix screen exists: ${owner}`);
}

assert.ok(!/<textarea\b/i.test(html), "review handoff summary avoids free-text areas");
assert.ok(!/<input[^>]+type="text"/i.test(html), "review handoff summary avoids text inputs");
assert.ok(!/render logs|encoder/i.test(html), "review handoff summary avoids internal pipeline details");
assert.ok(!/innerHTML/.test(inlineScript), "review handoff summary script builds dynamic UI without innerHTML");

console.log("review handoff summary: reviewer-facing publish handoff stays connected");
