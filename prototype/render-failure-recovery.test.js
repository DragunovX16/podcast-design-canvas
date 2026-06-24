"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "render-failure-recovery.html"), "utf8");
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
const logicScript = scripts[scripts.length - 1].replace(/^<script>|<\/script>$/g, "");

const sandbox = {
  document: {
    querySelector() {
      return {
        className: "",
        textContent: "",
        href: "",
        replaceChildren() {},
        addEventListener() {},
        querySelectorAll() { return []; },
      };
    },
    createElement() {
      return {
        className: "",
        textContent: "",
        append() {},
        querySelectorAll() { return []; },
      };
    },
  },
  module: { exports: {} },
};

vm.runInNewContext(logicScript, sandbox);

const { sampleIssues, stateMeta, issuesFor } = sandbox.module.exports;

assert.strictEqual(sampleIssues.length, 2);
assert.strictEqual(stateMeta["set-aside"].label, "set aside");
assert.match(issuesFor("failed", sampleIssues[0])[0].title, /b-roll asset/i);
assert.match(issuesFor("needs-input", sampleIssues[1])[0].detail, /audio caption quality review/i);
assert.match(issuesFor("exported-around", sampleIssues[1])[0].detail, /package handoff|captions/i);

console.log("render-failure-recovery: recovery states stay creator-facing");
