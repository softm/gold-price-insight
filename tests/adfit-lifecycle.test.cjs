const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const dist = path.join(__dirname, "..", "dist");
const configSource = fs.readFileSync(path.join(dist, "adfit-config.js"), "utf8");
const adsSource = fs.readFileSync(path.join(dist, "adfit.js"), "utf8");

// A small DOM/SDK boundary fake. No SDK or real ad network is loaded by these tests.
function page({ width = 390, height = 844, host = "goldsignal.designboard.net", collapsed = false } = {}) {
  let now = 0;
  let sequence = 0;
  const timers = new Map();
  const events = new Map();
  const renders = [];
  const destroys = [];

  class Element {
    constructor(id) {
      this.id = id;
      this.hidden = false;
      this.dataset = {};
      this.attributes = {};
      this.children = [];
      this.events = {};
      this.clientWidth = width;
      this.style = { setProperty: (key, value) => { this.style[key] = value; } };
    }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener(type, listener) { this.events[type] = listener; }
    appendChild(child) { this.children.push(child); child.parent = this; }
    remove() { this.parent.children = this.parent.children.filter((child) => child !== this); }
    getBoundingClientRect() {
      if (this.hidden) return { height: 0 };
      if (this.id === "nav") return { height: context.visualViewport.width <= 820 ? 64 : 0 };
      return { height: elements.goldAdPanel.hidden ? 44 : 178 };
    }
  }
  const elements = Object.fromEntries([
    "goldAdDock", "goldAdPanel", "goldAdHost", "goldAdToggle", "goldAdToggleText", "goldAdStatus",
  ].map((id) => [id, new Element(id)]));
  const head = new Element("head");
  const nav = new Element("nav");
  const storage = new Map(collapsed ? [["goldSignalAd:collapsed:v1", "1"]] : []);
  const document = {
    hidden: false,
    activeElement: { editing: false, matches() { return this.editing; } },
    documentElement: { clientWidth: width },
    body: new Element("body"),
    head,
    getElementById: (id) => elements[id],
    querySelector: () => nav,
    createElement: (tag) => new Element(tag),
    addEventListener: (type, listener) => events.set(`document:${type}`, listener),
  };
  const context = {
    document,
    location: { protocol: "https:", hostname: host },
    navigator: { onLine: true },
    innerHeight: height,
    visualViewport: { width, height, addEventListener() {} },
    sessionStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    getComputedStyle: () => ({ paddingLeft: "0", paddingRight: "0" }),
    Date: class extends Date { static now() { return now; } },
    setTimeout: (callback, delay = 0) => {
      timers.set(++sequence, { callback, at: now + delay });
      return sequence;
    },
    clearTimeout: (id) => timers.delete(id),
    addEventListener: (type, listener) => events.set(type, listener),
    ResizeObserver: class { observe() {} },
  };
  context.window = context;
  context.requestAnimationFrame = (callback) => context.setTimeout(callback, 0);
  vm.createContext(context);
  vm.runInContext(configSource, context);
  vm.runInContext(adsSource, context);

  function advance(milliseconds = 0) {
    now += milliseconds;
    let due;
    while ((due = [...timers].find(([, timer]) => timer.at <= now))) {
      timers.delete(due[0]);
      due[1].callback();
    }
  }
  function emit(type) { events.get(type)?.(); advance(); }
  function readySdk() {
    context.adfit = {
      render: (element) => renders.push(element),
      destroy: (unit) => destroys.push(unit),
    };
    context.kakaoAdFit.cmd.forEach((callback) => callback());
    // The SDK scans the page after its readiness queue. Our ins must not exist yet.
    assert.equal(elements.goldAdHost.children.length, 0);
    advance();
  }
  return {
    context, document, elements, head, renders, destroys, advance, emit, readySdk,
    state: () => context.GoldSignalAds.getStatus(),
    click: () => elements.goldAdToggle.events.click(),
    loaded: () => context.goldSignalAdLoaded(renders[0]),
    resize(nextWidth, nextHeight = height) {
      elements.goldAdDock.clientWidth = nextWidth;
      document.documentElement.clientWidth = nextWidth;
      context.visualViewport.width = nextWidth;
      context.innerHeight = nextHeight;
      context.visualViewport.height = nextHeight;
      emit("resize");
    },
  };
}

test("a remembered collapse makes no initial SDK or ad request", () => {
  const p = page({ collapsed: true });
  assert.equal(p.head.children.length, 0);
  assert.equal(p.state().attempted, false);
  p.click();
  assert.equal(p.head.children.length, 1);
  p.readySdk();
  assert.equal(p.renders.length, 1);
  assert.equal(p.state().width, 320);
});

test("collapse during SDK download waits for an actual expansion before registering", () => {
  const p = page();
  p.click();
  p.readySdk();
  assert.equal(p.renders.length, 0);
  assert.equal(p.state().phase, "ready");
  p.advance(60000);
  assert.equal(p.state().phase, "ready");
  p.click();
  assert.equal(p.renders.length, 1);
  p.loaded();
  p.click(); p.click(); p.emit("resize"); p.emit("document:visibilitychange");
  assert.equal(p.renders.length, 1);
  assert.equal(p.head.children.length, 1);
});

test("input focus during SDK download postpones registration and returns layout space", () => {
  const p = page();
  p.document.activeElement.editing = true;
  p.emit("document:focusin");
  p.readySdk();
  assert.equal(p.renders.length, 0);
  assert.equal(p.elements.goldAdDock.hidden, true);
  assert.equal(p.document.body.style["--gold-ad-dock-height"], "0px");
  p.document.activeElement.editing = false;
  p.emit("document:focusout");
  assert.equal(p.renders.length, 1);
  p.loaded();
  p.document.activeElement.editing = true; p.emit("document:focusin");
  p.document.activeElement.editing = false; p.emit("document:focusout");
  assert.equal(p.renders.length, 1);
});

test("background time does not exhaust the visible SDK download timeout", () => {
  const p = page();
  p.advance(10000);
  p.document.hidden = true; p.emit("document:visibilitychange");
  p.advance(60000);
  assert.equal(p.state().phase, "loading-sdk");
  p.document.hidden = false; p.emit("document:visibilitychange");
  p.advance(19999);
  assert.equal(p.state().phase, "loading-sdk");
  p.advance(1);
  assert.equal(p.state().phase, "failed");
  assert.equal(p.elements.goldAdDock.hidden, true);
});

test("desktop width changes preserve the selected unit without a new render", () => {
  const p = page({ width: 1200 });
  p.readySdk(); p.loaded();
  assert.equal(p.state().width, 728);
  p.resize(390);
  assert.equal(p.elements.goldAdDock.hidden, true);
  p.resize(1200);
  assert.equal(p.elements.goldAdDock.hidden, false);
  assert.equal(p.renders.length, 1);
  assert.equal(p.state().width, 728);
});

test("a larger viewport retains the mobile unit, and a short viewport temporarily hides it", () => {
  const p = page();
  p.readySdk(); p.loaded();
  p.resize(1000);
  assert.equal(p.state().width, 320);
  p.resize(390, 320);
  assert.equal(p.elements.goldAdDock.hidden, true);
  assert.equal(p.state().expanded, true);
  p.resize(390, 844);
  assert.equal(p.elements.goldAdDock.hidden, false);
  assert.equal(p.renders.length, 1);
});

test("unapproved mirrors and offline bundle hosts never load the SDK", () => {
  for (const host of ["localhost", "softm.github.io", "appassets.androidplatform.net", "goldsignal.designboard.net.example.com"]) {
    const p = page({ host });
    assert.equal(p.state().authorized, false);
    assert.equal(p.head.children.length, 0);
    assert.equal(p.elements.goldAdDock.hidden, true);
  }
});

test("NO_AD and SDK failure remove the whole placement without retries", () => {
  const p = page();
  p.readySdk();
  p.context.goldSignalAdFailed(p.renders[0]);
  assert.equal(p.state().phase, "failed");
  assert.equal(p.elements.goldAdDock.hidden, true);
  assert.equal(p.document.body.style["--gold-ad-dock-height"], "0px");
  assert.equal(p.destroys.length, 1);
  p.emit("online"); p.emit("resize");
  assert.equal(p.renders.length, 1);
  const blocked = page();
  blocked.head.children[0].onerror();
  assert.equal(blocked.state().phase, "failed");
  assert.equal(blocked.elements.goldAdDock.hidden, true);
});

test("the service worker bypasses ad traffic and never returns HTML for a failed script", async () => {
  const handlers = {};
  const offlinePage = new Response("<html>offline app</html>", { headers: { "Content-Type": "text/html" } });
  const scope = {
    URL, Response,
    self: {
      location: { origin: "https://goldsignal.designboard.net" },
      addEventListener: (type, handler) => { handlers[type] = handler; },
    },
    caches: { match: async (request) => request === "./index.html" ? offlinePage : undefined },
    fetch: async () => { throw new Error("offline"); },
  };
  vm.createContext(scope);
  vm.runInContext(fs.readFileSync(path.join(dist, "sw.js"), "utf8"), scope);
  const event = (url, mode = "cors") => ({
    request: { url, mode, method: "GET" },
    respondWith(promise) { this.response = promise; },
  });
  const ad = event("https://t1.kakaocdn.net/kas/static/ba.min.js");
  handlers.fetch(ad);
  assert.equal(ad.response, undefined);
  const script = event("https://goldsignal.designboard.net/missing.js");
  handlers.fetch(script);
  assert.equal((await script.response).type, "error");
  const navigation = event("https://goldsignal.designboard.net/", "navigate");
  handlers.fetch(navigation);
  assert.equal(await navigation.response, offlinePage);
});
