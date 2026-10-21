(function () {
  "use strict";

  // This module owns one placement and one SDK insertion for the document.
  if (window.GoldSignalAds) return;
  const config = window.GOLD_SIGNAL_ADFIT;
  const dock = document.getElementById("goldAdDock");
  const panel = document.getElementById("goldAdPanel");
  const host = document.getElementById("goldAdHost");
  const toggle = document.getElementById("goldAdToggle");
  const toggleText = document.getElementById("goldAdToggleText");
  const status = document.getElementById("goldAdStatus");
  const mobileNav = document.querySelector(".mobile-nav");
  if (!dock || !panel || !host || !toggle || !toggleText || !status) return;

  const authorized = Boolean(config?.enabled && location.protocol === "https:"
    && config.allowedHosts?.includes(location.hostname));
  let expanded = true;
  let sdkStarted = false;
  let sdkReady = false;
  let attempted = false;
  let phase = "idle";
  let suspension = "";
  let selectedSlot = null;
  let adElement = null;
  let timeout = 0;
  let timeoutStarted = 0;
  let timeoutRemaining = Math.min(30000, Math.max(15000, Number(config?.timeoutMs) || 30000));
  let scheduled = 0;

  try { expanded = sessionStorage.getItem(config?.storageKey) !== "1"; } catch (_) {}

  function editing() {
    const focused = document.activeElement;
    return Boolean(focused && (focused.matches("input, select, textarea") || focused.isContentEditable));
  }

  function visibleWidth() {
    const viewportWidth = window.visualViewport?.width || document.documentElement.clientWidth;
    const hostStyle = getComputedStyle(host);
    const sidePadding = parseFloat(hostStyle.paddingLeft) + parseFloat(hostStyle.paddingRight);
    return Math.max(0, Math.min(dock.clientWidth, viewportWidth, document.documentElement.clientWidth) - sidePadding);
  }

  function validSlot(slot) {
    return slot && /^DAN-[A-Za-z0-9]+$/.test(slot.unit)
      && ((slot.width === 728 && slot.height === 90) || (slot.width === 320 && slot.height === 100));
  }

  function syncMeasurements() {
    const dockHeight = dock.hidden ? 0 : Math.ceil(dock.getBoundingClientRect().height);
    const navHeight = mobileNav ? Math.ceil(mobileNav.getBoundingClientRect().height) : 0;
    document.body.style.setProperty("--gold-ad-dock-height", `${dockHeight}px`);
    document.body.style.setProperty("--gold-mobile-nav-height", `${navHeight}px`);
  }

  function pauseTimeout() {
    if (!timeout) return;
    clearTimeout(timeout);
    timeout = 0;
    timeoutRemaining = Math.max(0, timeoutRemaining - (Date.now() - timeoutStarted));
  }

  function resetTimeout() {
    pauseTimeout();
    timeoutRemaining = Math.min(30000, Math.max(15000, Number(config.timeoutMs) || 30000));
  }

  function syncTimeout(visible) {
    if (!visible || !["loading-sdk", "loading"].includes(phase)) { pauseTimeout(); return; }
    if (timeout) return;
    timeoutStarted = Date.now();
    timeout = window.setTimeout(() => {
      timeout = 0;
      fail(phase === "loading-sdk" ? "sdk-timeout" : "timeout");
    }, timeoutRemaining);
  }

  function removeAd() {
    // destroy is exposed by the supplied SDK and ends this unit's SDK lifecycle.
    if (adElement && typeof window.adfit?.destroy === "function") {
      try { window.adfit.destroy(selectedSlot.unit); } catch (_) {}
    }
    adElement?.remove();
  }

  function fail(reason) {
    if (phase === "failed") return;
    pauseTimeout();
    phase = "failed";
    suspension = reason;
    removeAd();
    dock.hidden = true;
    dock.dataset.state = phase;
    dock.dataset.reason = reason;
    syncMeasurements();
  }

  function startSdk() {
    if (sdkStarted) return;
    sdkStarted = true;
    phase = "loading-sdk";
    dock.dataset.state = phase;

    // The supplied SDK exposes this readiness queue. Wait until its initial
    // document scan has finished before adding our sole placement; hiding the
    // dock during download must not strand an unregistered <ins> in the page.
    window.kakaoAdFit = window.kakaoAdFit || { cmd: [] };
    window.kakaoAdFit.cmd.push(() => {
      window.setTimeout(() => {
        if (phase === "failed") return;
        sdkReady = true;
        phase = "ready";
        resetTimeout();
        sync();
      }, 0);
    });

    const sdk = document.createElement("script");
    sdk.id = "goldSignalAdFitSdk";
    sdk.async = true;
    sdk.charset = "utf-8";
    sdk.src = config.scriptUrl;
    sdk.onerror = () => fail("sdk-unavailable");
    document.head.appendChild(sdk);
  }

  function requestAd(slot) {
    if (attempted || !sdkReady || !expanded || dock.hidden || document.hidden || editing()) return;
    if (typeof window.adfit?.render !== "function") { fail("sdk-unavailable"); return; }

    // Keep this selection for the page lifetime. Resizing never swaps/reloads units.
    selectedSlot = slot;
    attempted = true;
    phase = "loading";
    dock.dataset.state = phase;
    host.style.setProperty("--gold-ad-width", `${slot.width}px`);
    host.style.setProperty("--gold-ad-height", `${slot.height}px`);
    status.hidden = false;

    adElement = document.createElement("ins");
    adElement.className = "kakao_ad_area";
    adElement.style.display = "none";
    adElement.dataset.adUnit = slot.unit;
    adElement.dataset.adWidth = String(slot.width);
    adElement.dataset.adHeight = String(slot.height);
    adElement.dataset.adOnload = "goldSignalAdLoaded";
    adElement.dataset.adOnfail = "goldSignalAdFailed";
    host.appendChild(adElement);

    // These callback attributes and render(element) are exposed by the supplied SDK.
    window.goldSignalAdLoaded = (element) => {
      if (element !== adElement || phase === "failed") return;
      pauseTimeout();
      phase = "loaded";
      status.hidden = true;
      dock.dataset.state = phase;
      sync();
    };
    window.goldSignalAdFailed = (element) => {
      if (element === adElement) fail("no-ad");
    };

    resetTimeout();
    try { window.adfit.render(adElement); } catch (_) { fail("render-error"); }
  }

  function sync() {
    if (!authorized || phase === "failed") {
      dock.hidden = true;
      if (!authorized) dock.dataset.reason = "unapproved-host";
      syncTimeout(false);
      syncMeasurements();
      return;
    }

    suspension = document.hidden ? "background" : navigator.onLine === false ? "offline" : editing() ? "editing" : "";
    dock.hidden = Boolean(suspension);
    dock.dataset.reason = suspension;
    dock.dataset.state = phase;
    panel.hidden = !expanded;
    dock.dataset.expanded = String(expanded);
    toggle.setAttribute("aria-expanded", String(expanded));
    toggleText.textContent = expanded ? "광고 접기" : "광고 펼치기";

    let candidate = selectedSlot;
    if (!dock.hidden) {
      const width = visibleWidth();
      candidate = selectedSlot || (width >= 728 ? config.desktop : config.mobile);
      if (!validSlot(candidate)) { fail("unconfigured"); return; }
      host.style.setProperty("--gold-ad-height", `${candidate.height}px`);
      if (width < candidate.width) {
        suspension = "insufficient-width";
        dock.dataset.reason = suspension;
        dock.hidden = true;
      }
      const viewportHeight = Math.min(window.innerHeight, window.visualViewport?.height || window.innerHeight);
      const navHeight = mobileNav?.getBoundingClientRect().height || 0;
      const expectedDockHeight = Math.ceil(dock.getBoundingClientRect().height);
      if (!dock.hidden && viewportHeight - navHeight - expectedDockHeight < 200) {
        suspension = "insufficient-height";
        dock.dataset.reason = suspension;
        dock.hidden = true;
      }
    }

    syncMeasurements();
    const visible = !dock.hidden && expanded;
    if (visible) {
      if (!sdkStarted) startSdk();
      if (sdkReady) requestAd(candidate);
    }
    syncTimeout(visible);
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = requestAnimationFrame(() => { scheduled = 0; sync(); });
  }

  toggle.addEventListener("click", () => {
    expanded = !expanded;
    try { sessionStorage.setItem(config.storageKey, expanded ? "0" : "1"); } catch (_) {}
    sync();
  });

  // Input work gets all available space; the user's saved preference is unchanged.
  document.addEventListener("focusin", sync);
  document.addEventListener("focusout", () => window.setTimeout(sync, 0));
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("resize", scheduleSync, { passive: true });
  window.visualViewport?.addEventListener("resize", scheduleSync, { passive: true });
  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);
  window.addEventListener("pageshow", sync);
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(syncMeasurements);
    observer.observe(dock);
    if (mobileNav) observer.observe(mobileNav);
  }

  window.GoldSignalAds = Object.freeze({
    getStatus: () => Object.freeze({
      authorized,
      expanded,
      sdkStarted,
      sdkReady,
      attempted,
      phase,
      suspension,
      unit: selectedSlot?.unit || null,
      width: selectedSlot?.width || null,
      height: selectedSlot?.height || null,
    }),
  });
  sync();
})();
