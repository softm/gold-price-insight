(function (root) {
  "use strict";
  const CONSENT_KEY = "goldsignal.ads.choice.v1";
  const CONSENT_TTL = 180 * 24 * 60 * 60 * 1000;
  const isApp = (ua) => /GoldSignalAndroid\/|AdMobNative\/|;\s*wv\)/i.test(ua || "");
  function surface({ protocol, hostname, userAgent, search }, config) {
    if (isApp(userAgent)) return "off";
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
    if (local && new URLSearchParams(search).get("ads-preview") === "1") return "preview";
    if (protocol !== "https:" || hostname !== "goldsignal.designboard.net") return "off";
    return config?.enabled === true && config.provider === "adfit"
      && /^DAN-[A-Za-z0-9]+$/.test(config.adfitUnit)
      && config.width === 320 && config.height === 100 ? "adfit" : "off";
  }
  function readChoice(raw, now = Date.now()) {
    try {
      const value = JSON.parse(raw);
      if (value?.version !== 1 || !["allow", "deny"].includes(value.choice)
          || !Number.isFinite(value.at) || value.at > now || now - value.at >= CONSENT_TTL) return null;
      return value.choice;
    } catch { return null; }
  }
  function choiceRecord(choice, now = Date.now()) {
    if (!["allow", "deny"].includes(choice)) throw new TypeError("Invalid ad choice");
    return JSON.stringify({ version: 1, choice, at: now });
  }
  const api = Object.freeze({ CONSENT_KEY, CONSENT_TTL, isApp, surface, readChoice, choiceRecord });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GoldSignalAdsCore = api;
})(typeof window !== "undefined" ? window : globalThis);
