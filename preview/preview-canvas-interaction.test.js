"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const script = html.match(/<script>\s*\(function \(\) \{([\s\S]*?)\}\(\)\);\s*<\/script>/);

assert.ok(script, "preview shell exposes an inline example-canvas controller");

function makeClassList(node, initial) {
  const values = new Set((initial || "").split(/\s+/).filter(Boolean));
  function sync() {
    node.className = Array.from(values).join(" ");
  }
  sync();
  return {
    add(name) {
      values.add(name);
      sync();
    },
    remove(name) {
      values.delete(name);
      sync();
    },
    contains(name) {
      return values.has(name);
    },
    toggle(name, force) {
      if (force === undefined ? !values.has(name) : force) {
        values.add(name);
      } else {
        values.delete(name);
      }
      sync();
    },
  };
}

function createElement(tagName, options = {}) {
  const node = {
    tagName,
    dataset: options.dataset || {},
    attributes: { ...(options.attributes || {}) },
    children: [],
    parentNode: null,
    className: options.className || "",
    textContent: options.textContent || "",
    href: options.href || "",
    value: "",
    listeners: {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === "class") {
        this.className = String(value);
        this.classList = makeClassList(this, this.className);
      }
      if (name === "href") this.href = String(value);
    },
    removeAttribute(name) {
      delete this.attributes[name];
      if (name === "href") this.href = "";
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    insertBefore(child, before) {
      child.parentNode = this;
      const index = this.children.indexOf(before);
      if (index === -1) {
        this.children.unshift(child);
      } else {
        this.children.splice(index, 0, child);
      }
      return child;
    },
    querySelector(selector) {
      return this.children.find((child) => child.className.split(" ").includes(selector.slice(1))) || null;
    },
    remove() {
      if (!this.parentNode) return;
      const index = this.parentNode.children.indexOf(this);
      if (index >= 0) this.parentNode.children.splice(index, 1);
      this.parentNode = null;
    },
  };
  node.classList = makeClassList(node, node.className);
  return node;
}

const chips = [
  createElement("button", { className: "drag-chip", dataset: { track: "host" } }),
  createElement("button", { className: "drag-chip", dataset: { track: "guest" } }),
  createElement("button", { className: "drag-chip", dataset: { track: "broll" } }),
];

const zones = [
  createElement("div", { className: "drop-zone host", dataset: { slot: "host" } }),
  createElement("div", { className: "drop-zone guest", dataset: { slot: "guest" } }),
  createElement("div", { className: "drop-zone broll", dataset: { slot: "broll" } }),
];

zones.forEach((zone) => {
  zone.appendChild(createElement("span", { className: "slot-label" }));
  zone.appendChild(createElement("span", { className: "slot-note" }));
});

const ids = {
  "canvas-slot-status": createElement("p"),
  "canvas-reset": createElement("button"),
  "canvas-continue": createElement("a"),
  "canvas-continue-note": createElement("p"),
};

const document = {
  querySelectorAll(selector) {
    if (selector === ".drag-chip") return chips;
    if (selector === ".drop-zone[data-slot]") return zones;
    if (selector === ".drop-zone.filled") return zones.filter((zone) => zone.classList.contains("filled"));
    return [];
  },
  querySelector(selector) {
    const match = selector.match(/\.drop-zone\[data-slot="([^"]+)"\]/);
    if (match) {
      return zones.find((zone) => zone.dataset.slot === match[1]) || null;
    }
    return null;
  },
  getElementById(id) {
    return ids[id] || null;
  },
  createElement(tagName) {
    return createElement(tagName);
  },
};

vm.runInNewContext(script[1], { document });

assert.equal(ids["canvas-continue"].attributes["aria-disabled"], "true", "continue starts disabled");

chips[0].listeners.click();
assert.equal(chips[0].attributes["aria-pressed"], "true", "clicking host chip selects it");
assert.match(
  ids["canvas-slot-status"].textContent,
  /Selected Host track · Dana Brooks\. Choose the host slot\./,
  "status explains which slot to activate after selecting host",
);

zones[0].listeners.keydown({ key: "Enter", preventDefault() {} });
assert.equal(zones[0].classList.contains("filled"), true, "keyboard activation places host into its slot");
assert.equal(chips[0].attributes["aria-pressed"], "false", "placing a track clears its selected state");
assert.equal(ids["canvas-continue"].attributes["aria-disabled"], "true", "continue stays gated after host alone");

zones[1].listeners.click();
assert.match(
  ids["canvas-slot-status"].textContent,
  /Pick a track first, then choose its slot\./,
  "activating a slot without a selected track prompts for a track first",
);

chips[1].listeners.click();
zones[1].listeners.click();
assert.equal(zones[1].classList.contains("filled"), true, "click activation places guest into its slot");
assert.equal(
  ids["canvas-continue"].attributes["aria-disabled"],
  "false",
  "filling host and guest enables the continue handoff",
);
assert.equal(
  ids["canvas-continue"].href,
  "./app.html#speaker-role-mapping?path=episode",
  "enabled continue points at the speaker-role handoff",
);

ids["canvas-reset"].listeners.click();
assert.equal(zones[0].classList.contains("filled"), false, "reset clears host placement");
assert.equal(zones[1].classList.contains("filled"), false, "reset clears guest placement");
assert.equal(ids["canvas-continue"].attributes["aria-disabled"], "true", "reset re-gates the continue handoff");
assert.equal(chips[0].attributes["aria-pressed"], "false", "reset leaves host unselected");
assert.equal(chips[1].attributes["aria-pressed"], "false", "reset leaves guest unselected");

console.log("preview shell canvas interaction: select-then-place path passes the continue gate");
