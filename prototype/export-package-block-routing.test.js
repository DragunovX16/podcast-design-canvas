"use strict";

// Guards the export package handoff blocking-warning route (#583): a required-item
// block points back to the screen that owns the fix, as a real link.
// Run with: `node prototype/export-package-block-routing.test.js`

const fs = require("fs");
const vm = require("vm");
const path = require("path");
const assert = require("assert");

const dir = __dirname;
const root = path.join(dir, "..");
const html = fs.readFileSync(path.join(dir, "export-package-handoff.html"), "utf8");
const shell = fs.readFileSync(path.join(root, "preview", "index.html"), "utf8");
const publishNav = fs.readFileSync(path.join(root, "preview", "publish-nav.js"), "utf8");

assert.ok(
  shell.includes("../prototype/export-package-handoff.html"),
  "export package handoff is reachable from the preview shell",
);
assert.ok(
  publishNav.includes('id: "export-package-handoff"'),
  "export package handoff is part of the connected publish prep path",
);
assert.ok(
  shell.includes("../prototype/layout-safe-areas.html"),
  "layout safe areas is reachable from the preview shell",
);

// The warnings render path appends an open-fix link when a warning declares one.
assert.ok(
  html.includes("[tone, title, detail, fixScreen, fixLabel]"),
  "warnings render path reads an optional fix screen + label",
);
assert.ok(html.includes("openLink.href = fixScreen"), "blocking warning renders a link to the owning screen");

// Load the exported data model (Node-built-ins only) to assert the blocked caption
// warning carries speaker-attribution-review as its owner, and that the target exists.
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function makeNode() {
  const node = {
    style: {}, dataset: {}, textContent: "", className: "",
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, appendChild() {}, append() {}, replaceChildren() {},
    querySelector() { return makeNode(); },
  };
  return node;
}
const document = { querySelector: () => makeNode(), createElement: () => makeNode() };
const sandbox = { document, module: { exports: {} }, console };
vm.createContext(sandbox);
vm.runInContext(script, sandbox);
const M = sandbox.module.exports;

const review = M.destinations.youtube.warnings.find((w) => w[0] === "review" && w[1] === "Ignored sponsor overlay warning");
assert.ok(review, "the YouTube package records the ignored sponsor overlay warning");
assert.strictEqual(review[3], "layout-safe-areas.html", "ignored sponsor overlay routes to layout safe areas");
assert.strictEqual(review[4], "layout safe areas", "ignored sponsor overlay names the fix screen in creator-facing copy");
assert.ok(
  fs.existsSync(path.join(dir, "layout-safe-areas.html")),
  "layout safe areas exists as a real screen",
);

// A non-blocking warning without an owner carries no route (no false links).
const omittedNotes = M.destinations.youtube.warnings.find((w) => w[1] === "Show notes omitted");
assert.ok(omittedNotes && omittedNotes[3] === undefined, "informational warnings without an owner do not declare a fix screen");

// Client review blocked warning still routes to speaker attribution review.
const blocked = M.destinations.review.warnings.find((w) => w[0] === "blocked");
assert.ok(blocked, "the client review copy has a blocked warning");
assert.strictEqual(blocked[3], "speaker-attribution-review.html", "blocked caption routes to speaker attribution review");
assert.ok(typeof blocked[4] === "string" && blocked[4].length, "the route carries a creator-facing label");
assert.ok(
  fs.existsSync(path.join(dir, "speaker-attribution-review.html")),
  "the speaker attribution review target exists",
);

// A non-blocking warning carries no route (no false links).
const reviewOnly = M.destinations.review.warnings.find((w) => w[0] === "review" && w[1].startsWith("If exported"));
assert.ok(reviewOnly && reviewOnly[3] === undefined, "non-blocking warnings do not declare a fix screen");

console.log("export package handoff: blocked required item routes to its owning review screen");
