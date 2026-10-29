(() => {
  "use strict";
  const core = window.GoldSignalAdsCore;
  if (!core) return;
  const config = window.GoldSignalAdConfig;
  const mode = core.surface({ ...location, protocol: location.protocol, hostname: location.hostname,
    search: location.search, userAgent: navigator.userAgent }, config);
  if (mode === "off") return;
  const panel = document.getElementById("adPreferences");
  const slot = document.getElementById("adSlot");
  const banner = document.getElementById("adBanner");
  const status = document.getElementById("adStatus");
  const settings = document.getElementById("adSettings");
  const allow = document.getElementById("adAllow");
  const deny = document.getElementById("adDeny");
  if (!panel || !slot || !banner || !status || !settings || !allow || !deny) return;
  let storage;
  let choice = null;
  try { storage = window.localStorage; choice = core.readChoice(storage.getItem(core.CONSENT_KEY)); } catch {}
  let attempted = false;
  let sdkLoaded = false;
  let nearViewport = false;
  let observer;
  let timer;
  settings.hidden = false;
  panel.hidden = choice !== null;
  slot.hidden = choice !== "allow";
  if (mode === "preview") status.textContent = "로컬 미리보기 · 실제 광고 요청 없음";

  function hideAd(message) {
    clearTimeout(timer);
    banner.replaceChildren();
    slot.hidden = true;
    status.textContent = message;
  }
  function requestIfAllowed() {
    if (attempted || choice !== "allow" || !nearViewport || document.hidden || !navigator.onLine
        || banner.clientWidth < config.width) return;
    attempted = true;
    if (mode === "preview") {
      const mock = document.createElement("div");
      mock.className = "ad-preview";
      mock.textContent = "광고 레이아웃 미리보기 · 320 × 100\n실제 광고가 아닙니다";
      banner.append(mock);
      return;
    }
    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.style.width = "100%";
    ins.dataset.adUnit = config.adfitUnit;
    ins.dataset.adWidth = String(config.width);
    ins.dataset.adHeight = String(config.height);
    ins.dataset.adOnfail = "goldSignalAdNoFill";
    window.goldSignalAdNoFill = () => hideAd("현재 표시할 광고가 없습니다.");
    banner.append(ins);
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kas/static/ba.min.js";
    script.async = true;
    script.onerror = () => hideAd("광고를 불러오지 못했습니다. 시세 기능은 계속 이용할 수 있습니다.");
    sdkLoaded = true;
    document.head.append(script);
    timer = window.setTimeout(() => {
      if (!banner.querySelector("iframe")) hideAd("광고 응답이 없어 광고 영역을 접었습니다.");
    }, 30000);
  }
  function watchSlot() {
    if (choice !== "allow") return;
    slot.hidden = false;
    if (observer) observer.disconnect();
    observer = new IntersectionObserver((entries) => {
      nearViewport = entries.some((entry) => entry.isIntersecting);
      requestIfAllowed();
    }, { rootMargin: "150px" });
    observer.observe(slot);
  }
  function saveChoice(next) {
    try {
      if (!storage) throw new Error("Storage unavailable");
      storage.setItem(core.CONSENT_KEY, core.choiceRecord(next));
    } catch {
      status.textContent = "선택을 저장할 수 없어 광고를 요청하지 않습니다. 브라우저 저장소 설정을 확인해 주세요.";
      return;
    }
    choice = next;
    if (next === "deny") {
      observer?.disconnect();
      hideAd("광고 사용 안 함을 저장했습니다.");
      if (sdkLoaded) { location.reload(); return; }
      attempted = false;
    } else {
      status.textContent = mode === "preview" ? "로컬 미리보기 · 실제 광고 요청 없음" : "광고 허용을 저장했습니다. 하단 광고 영역이 보일 때 요청합니다.";
      watchSlot();
    }
  }
  allow.addEventListener("click", () => saveChoice("allow"));
  deny.addEventListener("click", () => saveChoice("deny"));
  settings.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) { panel.scrollIntoView({ block: "center", behavior: "smooth" }); allow.focus({preventScroll:true}); }
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== core.CONSENT_KEY && event.key !== null) return;
    choice = core.readChoice(event.key === null ? null : event.newValue);
    if (choice !== "allow") {
      hideAd("다른 창에서 광고 선택이 변경됐습니다.");
      if (sdkLoaded) location.reload();
    } else watchSlot();
  });
  document.addEventListener("visibilitychange", requestIfAllowed);
  window.addEventListener("online", requestIfAllowed);
  window.addEventListener("resize", requestIfAllowed);
  watchSlot();
})();
