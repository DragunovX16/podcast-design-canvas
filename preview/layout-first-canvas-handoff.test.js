"use strict";

// Guards the layout-first example canvas handoff: the creator can continue into
// speaker roles after placing the required host and guest tracks, while b-roll stays optional.
// Run with: `node preview/layout-first-canvas-handoff.test.js`

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

class Element {
  constructor(tagName, id = "", className = "") {
    this.tagName = tagName;
    this.id = id;
    this.className = className;
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.listeners = {};
    this.dataset = {};
    this.textContent = "";
    this.href = "";
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "href") {
      this.href = String(value);
    }
  }

  removeAttribute(name) {
    delete this.attributes[name];
    if (name === "href") {
      this.href = "";
    }
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  insertBefore(node, before) {
    node.parentNode = this;
    const index = this.children.indexOf(before);
    if (index === -1) {
      this.children.unshift(node);
    } else {
      this.children.splice(index, 0, node);
    }
    return node;
  }

  appendChild(node) {
    node.parentNode = this;
    this.children.push(node);
    return node;
  }

  remove() {
    if (!this.parentNode) {
      return;
    }
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  querySelector(selector) {
    if (selector === ".placed-track") {
      return this.children.find((child) => child.className === "placed-track") || null;
    }
    if (selector === ".placed-remove") {
      return this.children.find((child) => child.className === "placed-remove") || null;
    }
    const slotMatch = selector.match(/^\.drop-zone\[data-slot="([^"]+)"\]$/);
    if (slotMatch) {
      return zones.find((zone) => zone.dataset.slot === slotMatch[1]) || null;
    }
    return null;
  }

  click() {
    if (this.listeners.click) {
      this.listeners.click({ target: this });
    }
  }

  get classList() {
    const element = this;
    const split = () => element.className.split(/\s+/).filter(Boolean);
    return {
      add(name) {
        const next = new Set(split());
        next.add(name);
        element.className = [...next].join(" ");
      },
      remove(name) {
        element.className = split().filter((entry) => entry !== name).join(" ");
      },
      contains(name) {
        return split().includes(name);
      },
    };
  }
}

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const script = html.match(/<script>\s*\(function \(\) \{([\s\S]*?)\}\(\)\);\s*<\/script>/)[1];

const chips = ["host", "guest", "broll"].map((track) => {
  const chip = new Element("button", "", "drag-chip");
  chip.dataset.track = track;
  chip.attributes["aria-pressed"] = "false";
  return chip;
});

const zones = ["host", "guest", "broll"].map((slot) => {
  const zone = new Element("div", "", `drop-zone ${slot}`);
  zone.dataset.slot = slot;
  const label = new Element("span");
  label.className = "slot-label";
  zone.children.push(label);
  return zone;
});

const slotStatus = new Element("p", "canvas-slot-status");
slotStatus.textContent = "0 of 2 required speaker videos ready. Optional b-roll can be added later.";
const resetButton = new Element("button", "canvas-reset");
const continueLink = new Element("a", "canvas-continue");
continueLink.attributes["aria-disabled"] = "true";
continueLink.textContent = "Fill required speaker slots to continue";
const continueNote = new Element("p", "canvas-continue-note");
continueNote.textContent = "Place the host and guest into the layout before continuing into speaker roles. Optional b-roll can be added later.";

const document = {
  querySelector(selector) {
    const slotMatch = selector.match(/^\.drop-zone\[data-slot="([^"]+)"\]$/);
    if (slotMatch) {
      return zones.find((zone) => zone.dataset.slot === slotMatch[1]) || null;
    }
    return null;
  },
  querySelectorAll(selector) {
    if (selector === ".drag-chip") return chips;
    if (selector === ".drop-zone[data-slot]") return zones;
    if (selector === ".drop-zone.filled") {
      return zones.filter((zone) => zone.classList.contains("filled"));
    }
    return [];
  },
  getElementById(id) {
    return {
      "canvas-slot-status": slotStatus,
      "canvas-reset": resetButton,
      "canvas-continue": continueLink,
      "canvas-continue-note": continueNote,
    }[id] || null;
  },
  createElement(tagName) {
    return new Element(tagName);
  },
};

vm.runInNewContext(script, { document });

assert.strictEqual(continueLink.attributes["aria-disabled"], "true");
assert.strictEqual(continueLink.href, "");
assert.match(continueNote.textContent, /before continuing into speaker roles/);

function drop(slot, track) {
  const zone = zones.find((entry) => entry.dataset.slot === slot);
  zone.listeners.drop({
    preventDefault() {},
    dataTransfer: {
      getData() {
        return track;
      },
    },
  });
}

drop("host", "guest");
assert.match(slotStatus.textContent, /different slot/);
assert.strictEqual(continueLink.attributes["aria-disabled"], "true");

drop("host", "host");
drop("guest", "guest");
assert.strictEqual(continueLink.attributes["aria-disabled"], "false");
assert.strictEqual(continueLink.href, "./app.html#speaker-role-mapping?path=episode");
assert.strictEqual(continueLink.textContent, "Continue to speaker roles →");
assert.match(slotStatus.textContent, /Required speaker videos ready/);
assert.match(continueNote.textContent, /Optional b-roll can be added later/);
assert.equal(zones.find((zone) => zone.dataset.slot === "broll").classList.contains("filled"), false);

drop("broll", "broll");
assert.strictEqual(continueLink.attributes["aria-disabled"], "false");
assert.strictEqual(continueLink.href, "./app.html#speaker-role-mapping?path=episode");
assert.match(slotStatus.textContent, /Optional b-roll is in place\./);
assert.match(continueNote.textContent, /Optional b-roll is in place\./);

resetButton.click();
assert.strictEqual(continueLink.attributes["aria-disabled"], "true");
assert.strictEqual(continueLink.href, "");
assert.strictEqual(slotStatus.textContent, "0 of 2 required speaker videos ready. Optional b-roll can be added later.");

// Select-then-place: choosing a chip and activating its slot unlocks Continue without a
// pointer, so keyboard and touch users can clear the gated canvas.
function keydown(zone, key) {
  zone.listeners.keydown({ key, preventDefault() {} });
}

chips[0].click();
assert.strictEqual(chips[0].attributes["aria-pressed"], "true", "clicking the host chip selects it");
assert.match(slotStatus.textContent, /Choose the host slot/, "selection explains which slot to activate");
keydown(zones.find((zone) => zone.dataset.slot === "host"), "Enter");
assert.strictEqual(
  zones.find((zone) => zone.dataset.slot === "host").classList.contains("filled"),
  true,
  "activating the host slot places the selected host track",
);
assert.strictEqual(
  zones.find((zone) => zone.dataset.slot === "host").querySelector(".placed-track").textContent,
  "Host track · Dana Brooks",
  "slot activation writes the same placed-track label as a drop",
);
assert.strictEqual(chips[0].attributes["aria-pressed"], "false", "placing a track clears its selected state");
keydown(zones.find((zone) => zone.dataset.slot === "guest"), " ");
assert.match(slotStatus.textContent, /Pick a track first/, "activating an empty slot prompts for track selection");
chips[1].click();
keydown(zones.find((zone) => zone.dataset.slot === "guest"), " ");
assert.strictEqual(
  continueLink.attributes["aria-disabled"],
  "false",
  "selecting chips and activating host and guest unlocks Continue just like dragging",
);
assert.strictEqual(
  continueLink.href,
  "./app.html#speaker-role-mapping?path=episode",
  "select-then-place carries the same speaker-roles handoff target",
);
assert.match(slotStatus.textContent, /Required speaker videos ready/, "select-then-place updates readiness identically");

// A non-activating key is a no-op, so Tab still moves focus instead of placing.
keydown(zones.find((zone) => zone.dataset.slot === "broll"), "Tab");
assert.strictEqual(
  zones.find((zone) => zone.dataset.slot === "broll").classList.contains("filled"),
  false,
  "a non-activating key does not place a selected track",
);

// Per-track remove: a creator can clear a single placed track without resetting the whole
// layout. Host and guest are both filled from the keyboard block above.
const hostZone = zones.find((zone) => zone.dataset.slot === "host");
const guestZone = zones.find((zone) => zone.dataset.slot === "guest");
const hostRemove = hostZone.querySelector(".placed-remove");
assert.ok(hostRemove, "a placed track exposes a per-track remove control");
assert.strictEqual(hostRemove.attributes["aria-label"], "Remove Host track · Dana Brooks", "the remove control is labelled per track");
hostRemove.listeners.click({ stopPropagation() {} });
assert.strictEqual(hostZone.classList.contains("filled"), false, "removing a track clears just that slot");
assert.strictEqual(hostZone.querySelector(".placed-track"), null, "the placed track and its remove control are gone");
assert.strictEqual(guestZone.classList.contains("filled"), true, "removing one track leaves the others placed");
assert.strictEqual(continueLink.attributes["aria-disabled"], "true", "Continue re-gates after a required track is removed");
// Re-placing the cleared slot restores readiness.
chips[0].click();
keydown(hostZone, "Enter");
assert.strictEqual(continueLink.attributes["aria-disabled"], "false", "re-placing the removed track restores Continue");

console.log("layout-first canvas handoff: continue unlocks after required speaker videos while b-roll stays optional");
