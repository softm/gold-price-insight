(function () {
  "use strict";

  const OUNCE_IN_GRAMS = 31.1035;
  const horizons = {
    7: { label: "7일", base: 0.008, bull: 0.027, bear: -0.022, volatility: 0.024 },
    30: { label: "30일", base: 0.024, bull: 0.071, bear: -0.046, volatility: 0.038 },
    90: { label: "90일", base: 0.058, bull: 0.128, bear: -0.083, volatility: 0.061 },
    365: { label: "1년", base: 0.116, bull: 0.235, bear: -0.142, volatility: 0.105 },
  };

  const state = {
    horizon: 30,
    scenario: "base",
    goldUsd: 3330,
    exchange: 1395,
    premium: 0,
    sentiment: 1,
  };

  const marketBaseline = {
    goldUsd: state.goldUsd,
    exchange: state.exchange,
    premium: state.premium,
    sentiment: state.sentiment,
  };

  const els = {
    currentPrice: document.querySelector("#currentPrice"),
    currentChange: document.querySelector("#currentChange"),
    horizonLabel: document.querySelector("#horizonLabel"),
    directionText: document.querySelector("#directionText"),
    forecastReason: document.querySelector("#forecastReason"),
    forecastRange: document.querySelector("#forecastRange"),
    forecastPrice: document.querySelector("#forecastPrice"),
    forecastChange: document.querySelector("#forecastChange"),
    confidenceScore: document.querySelector("#confidenceScore"),
    confidenceRing: document.querySelector(".confidence-ring"),
    chartCenter: document.querySelector("#chartCenter"),
    chartDelta: document.querySelector("#chartDelta"),
    goldPriceInput: document.querySelector("#goldPriceInput"),
    exchangeInput: document.querySelector("#exchangeInput"),
    premiumInput: document.querySelector("#premiumInput"),
    premiumOutput: document.querySelector("#premiumOutput"),
    sentimentInput: document.querySelector("#sentimentInput"),
    sentimentOutput: document.querySelector("#sentimentOutput"),
    chart: document.querySelector("#forecastChart"),
    chartGrid: document.querySelector("#chartGrid"),
    chartLabels: document.querySelector("#chartLabels"),
    chartArea: document.querySelector("#chartArea"),
    chartLine: document.querySelector("#chartLine"),
    chartEndpoint: document.querySelector("#chartEndpoint"),
    chartTooltip: document.querySelector("#chartTooltip"),
    dataStatus: document.querySelector("#dataStatus"),
    priceCaption: document.querySelector("#priceCaption"),
    footerSource: document.querySelector("#footerSource"),
    todayLabel: document.querySelector("#todayLabel"),
    targetForm: document.querySelector("#targetForm"),
    targetInput: document.querySelector("#targetInput"),
    targetStatus: document.querySelector("#targetStatus"),
    toast: document.querySelector("#toast"),
  };

  const won = new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  });

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getCurrentPrice() {
    return (state.goldUsd / OUNCE_IN_GRAMS) * state.exchange * (1 + state.premium / 100);
  }

  function getOutlookRate() {
    const selected = horizons[state.horizon][state.scenario];
    const sentimentBoost = state.sentiment * (state.horizon <= 30 ? 0.004 : 0.008);
    return selected + sentimentBoost;
  }

  function getConfidence() {
    const horizonPenalty = state.horizon === 365 ? 13 : state.horizon === 90 ? 7 : 0;
    const premiumPenalty = Math.abs(state.premium) > 6 ? 6 : 0;
    const scenarioPenalty = state.scenario === "base" ? 0 : 5;
    return clamp(68 + Math.abs(state.sentiment) * 2 - horizonPenalty - premiumPenalty - scenarioPenalty, 42, 78);
  }

  function formatPercent(value) {
    return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
  }

  function describeOutlook(rate) {
    if (rate >= 0.1) return ["강한 상승", "안전자산 선호와 환율 효과가 함께 작동하는 공격적인 상승 시나리오입니다."];
    if (rate >= 0.025) return ["상승 우위", "안전자산 수요와 국내 환율 효과가 금리 부담보다 크게 반영됐습니다."];
    if (rate >= 0.005) return ["완만한 상승", "달러 강세 부담보다 안전자산 수요와 국내 환율 효과가 조금 더 크게 반영됐습니다."];
    if (rate > -0.01) return ["방향 탐색", "상승 재료와 하락 재료가 맞서며 뚜렷한 방향을 기다리는 구간입니다."];
    if (rate > -0.06) return ["완만한 조정", "위험 선호 회복과 금리 부담이 안전자산 수요를 다소 앞서는 시나리오입니다."];
    return ["하락 압력", "금리와 달러가 동시에 강해지는 상황을 가정한 방어적 시나리오입니다."];
  }

  function updateSliderFill(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const value = Number(input.value);
    const progress = ((value - min) / (max - min)) * 100;
    input.style.background = `linear-gradient(to right, #bbb8ae 0 ${Math.max(progress - 16, 0)}%, #c79a35 ${Math.max(progress - 16, 0)}% ${progress}%, #dedbd1 ${progress}% 100%)`;
  }

  function buildPath(points) {
    return points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  }

  function generateSeries(current, target, count) {
    const rate = target / current - 1;
    return Array.from({ length: count }, (_, index) => {
      const t = index / (count - 1);
      const ease = t * t * (3 - 2 * t);
      const wave = Math.sin(t * Math.PI * 3.2) * (1 - t) * 0.009;
      const micro = Math.sin(t * Math.PI * 11.5) * (1 - t) * 0.0025;
      return current * (1 + rate * ease + wave + micro);
    });
  }

  function renderChart(current, target) {
    const values = generateSeries(current, target, 34);
    const volatility = horizons[state.horizon].volatility;
    const low = Math.min(...values, current * (1 - volatility)) * 0.985;
    const high = Math.max(...values, current * (1 + volatility)) * 1.015;
    const left = 70;
    const right = 815;
    const top = 24;
    const bottom = 250;
    const points = values.map((value, index) => ({
      x: left + (index / (values.length - 1)) * (right - left),
      y: bottom - ((value - low) / (high - low)) * (bottom - top),
      value,
    }));

    const linePath = buildPath(points);
    els.chartLine.setAttribute("d", linePath);
    els.chartArea.setAttribute("d", `${linePath} L${right},${bottom} L${left},${bottom} Z`);
    els.chartEndpoint.setAttribute("transform", `translate(${points.at(-1).x}, ${points.at(-1).y})`);

    els.chartGrid.innerHTML = "";
    els.chartLabels.innerHTML = "";
    for (let i = 0; i < 4; i += 1) {
      const y = top + (i / 3) * (bottom - top);
      const value = high - (i / 3) * (high - low);
      els.chartGrid.insertAdjacentHTML("beforeend", `<line x1="${left}" x2="${right}" y1="${y}" y2="${y}"></line>`);
      els.chartLabels.insertAdjacentHTML("beforeend", `<text x="3" y="${y + 3}">${Math.round(value / 1000).toLocaleString("ko-KR")}천</text>`);
    }

    const labelMap = state.horizon === 7 ? ["오늘", "2일", "4일", "7일"]
      : state.horizon === 30 ? ["오늘", "10일", "20일", "30일"]
        : state.horizon === 90 ? ["오늘", "1개월", "2개월", "3개월"]
          : ["오늘", "4개월", "8개월", "1년"];
    labelMap.forEach((label, index) => {
      const x = left + (index / 3) * (right - left);
      els.chartLabels.insertAdjacentHTML("beforeend", `<text x="${x}" y="280" text-anchor="${index === 0 ? "start" : index === 3 ? "end" : "middle"}">${label}</text>`);
    });

    els.chart.onpointermove = (event) => {
      const rect = els.chart.getBoundingClientRect();
      const chartX = ((event.clientX - rect.left) / rect.width) * 840;
      const nearest = points.reduce((best, point) => Math.abs(point.x - chartX) < Math.abs(best.x - chartX) ? point : best, points[0]);
      const visualX = (nearest.x / 840) * rect.width;
      const visualY = (nearest.y / 300) * rect.height;
      els.chartTooltip.textContent = won.format(nearest.value);
      els.chartTooltip.style.left = `${visualX}px`;
      els.chartTooltip.style.top = `${visualY}px`;
      els.chartTooltip.classList.add("is-visible");
      els.chartTooltip.setAttribute("aria-hidden", "false");
    };
    els.chart.onpointerleave = () => {
      els.chartTooltip.classList.remove("is-visible");
      els.chartTooltip.setAttribute("aria-hidden", "true");
    };
  }

  function render() {
    const current = getCurrentPrice();
    const rate = getOutlookRate();
    const target = current * (1 + rate);
    const spread = horizons[state.horizon].volatility * (state.scenario === "base" ? 0.62 : 0.78);
    const rangeLow = target * (1 - spread);
    const rangeHigh = target * (1 + spread);
    const [direction, reason] = describeOutlook(rate);
    const confidence = getConfidence();

    els.currentPrice.textContent = won.format(current);
    els.horizonLabel.textContent = horizons[state.horizon].label;
    els.directionText.textContent = direction;
    els.forecastReason.textContent = reason;
    els.forecastRange.textContent = `${won.format(rangeLow)} — ${won.format(rangeHigh)}`;
    els.forecastPrice.textContent = won.format(target);
    els.forecastChange.textContent = formatPercent(rate);
    els.forecastChange.classList.toggle("positive", rate >= 0);
    els.forecastChange.style.color = rate < 0 ? "#d58b80" : "";
    els.confidenceScore.textContent = confidence;
    els.confidenceRing.style.setProperty("--score", confidence);
    els.confidenceRing.setAttribute("aria-label", `전망 신뢰도 ${confidence}점`);
    els.chartCenter.textContent = won.format(target);
    els.chartDelta.textContent = `현재 대비 ${formatPercent(rate)}`;
    els.chartDelta.style.color = rate >= 0 ? "var(--green)" : "var(--red)";
    els.premiumOutput.value = `${state.premium > 0 ? "+" : ""}${state.premium.toFixed(1)}%`;
    els.sentimentOutput.value = ["강한 위험 선호", "위험 선호", "약한 위험 선호", "중립", "약한 안전 선호", "안전 선호", "강한 안전 선호"][state.sentiment + 3];
    updateSliderFill(els.premiumInput);
    updateSliderFill(els.sentimentInput);
    renderChart(current, target);
    updateTargetStatus(current);
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => els.toast.classList.remove("is-visible"), 1900);
  }

  function formatCollectedAt(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "최근 수집";
    return new Intl.DateTimeFormat("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(date);
  }

  async function loadAutomatedMarketData() {
    try {
      const response = await fetch("./data/market.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`market data ${response.status}`);
      const payload = await response.json();
      const gold = Number(payload?.market?.goldUsdOz);
      const exchange = Number(payload?.market?.usdKrw);
      const premium = Number(payload?.market?.domesticPremiumPct ?? 0);
      if (!Number.isFinite(gold) || !Number.isFinite(exchange)) throw new Error("invalid market data");

      state.goldUsd = clamp(gold, 1000, 10000);
      state.exchange = clamp(exchange, 800, 2500);
      state.premium = clamp(premium, -5, 12);
      Object.assign(marketBaseline, {
        goldUsd: state.goldUsd,
        exchange: state.exchange,
        premium: state.premium,
      });
      els.goldPriceInput.value = state.goldUsd.toFixed(2);
      els.exchangeInput.value = state.exchange.toFixed(2);
      els.premiumInput.value = state.premium;
      els.currentChange.textContent = "자동 환산";
      els.priceCaption.textContent = "자동 수집한 국제 금값과 원·달러 환율로 계산";
      els.dataStatus.innerHTML = `<span></span> 자동 수집 · ${formatCollectedAt(payload.generatedAt)}`;
      els.footerSource.textContent = "기준 단위: KRW / 1g · Gold API · Frankfurter";

      const sourceDate = payload?.market?.fxDate || payload.generatedAt;
      const parsedDate = new Date(sourceDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        els.todayLabel.textContent = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(parsedDate);
      }
      render();
    } catch (_) {
      els.dataStatus.innerHTML = "<span></span> 기본 데이터 · 시뮬레이션";
      els.footerSource.textContent = "기준 단위: KRW / 1g · 마지막 기본 데이터";
    }
  }

  function updateTargetStatus(currentPrice) {
    const savedTarget = Number(localStorage.getItem("goldSignalTarget"));
    if (!savedTarget) {
      els.targetStatus.textContent = "저장된 목표가가 없습니다.";
      return;
    }
    els.targetInput.value = savedTarget;
    const difference = ((savedTarget / currentPrice) - 1) * 100;
    els.targetStatus.textContent = difference > 0
      ? `저장됨 · 현재 기준가보다 ${difference.toFixed(1)}% 높은 ${won.format(savedTarget)}`
      : `저장됨 · 현재 기준가가 목표가를 ${Math.abs(difference).toFixed(1)}% 웃돌고 있어요`;
  }

  document.querySelectorAll("[data-horizon]").forEach((button) => {
    button.addEventListener("click", () => {
      state.horizon = Number(button.dataset.horizon);
      document.querySelectorAll("[data-horizon]").forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });

  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.addEventListener("click", () => {
      state.scenario = button.dataset.scenario;
      document.querySelectorAll("[data-scenario]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", String(active));
      });
      render();
    });
  });

  [els.goldPriceInput, els.exchangeInput, els.premiumInput, els.sentimentInput].forEach((input) => {
    input.addEventListener("input", () => {
      state.goldUsd = clamp(Number(els.goldPriceInput.value) || 3330, 1000, 7000);
      state.exchange = clamp(Number(els.exchangeInput.value) || 1395, 800, 2500);
      state.premium = Number(els.premiumInput.value);
      state.sentiment = Number(els.sentimentInput.value);
      render();
    });
  });

  document.querySelector("#resetInputs").addEventListener("click", () => {
    Object.assign(state, { ...marketBaseline, horizon: 30, scenario: "base" });
    els.goldPriceInput.value = state.goldUsd;
    els.exchangeInput.value = state.exchange;
    els.premiumInput.value = state.premium;
    els.sentimentInput.value = state.sentiment;
    document.querySelectorAll("[data-horizon]").forEach((item) => item.classList.toggle("is-active", item.dataset.horizon === "30"));
    document.querySelectorAll("[data-scenario]").forEach((item) => {
      const active = item.dataset.scenario === "base";
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });
    render();
    showToast("기본 가정으로 되돌렸어요.");
  });

  document.querySelector("#resetAll").addEventListener("click", () => {
    document.querySelector("#resetInputs").click();
  });

  els.targetForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const target = Number(els.targetInput.value);
    if (!target || target < 10000) return;
    localStorage.setItem("goldSignalTarget", String(Math.round(target)));
    updateTargetStatus(getCurrentPrice());
    showToast("목표가를 이 브라우저에 저장했어요.");
  });

  document.querySelector("#copyBrief").addEventListener("click", async () => {
    const rate = getOutlookRate();
    const message = `[금시그널 ${horizons[state.horizon].label} 전망] ${describeOutlook(rate)[0]} · 중심값 ${won.format(getCurrentPrice() * (1 + rate))} (${formatPercent(rate)}) — 시뮬레이션이며 투자 조언이 아닙니다.`;
    try {
      await navigator.clipboard.writeText(message);
      showToast("인사이트를 복사했어요.");
    } catch (_) {
      showToast("복사 권한을 확인해 주세요.");
    }
  });

  document.querySelector("#shareInsight").addEventListener("click", () => {
    document.querySelector("#copyBrief").click();
  });

  document.querySelector("#themeButton").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    showToast(document.body.classList.contains("dark") ? "다크 테마를 켰어요." : "라이트 테마를 켰어요.");
  });

  document.querySelector("#profileButton").addEventListener("click", () => {
    showToast("개인 설정은 다음 버전에서 제공됩니다.");
  });

  const today = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date());
  els.todayLabel.textContent = today;

  const sections = [...document.querySelectorAll("main section[id]")];
  const navLinks = [...document.querySelectorAll(".nav-item, .mobile-nav a")];
  const scrollRoot = document.querySelector("#main-content");
  let navigationFrame = 0;
  function updateActiveNavigation() {
    const top = scrollRoot.getBoundingClientRect().top;
    const header = document.querySelector(".topbar");
    const stickyHeader = getComputedStyle(header).position === "sticky" ? header.getBoundingClientRect().height : 0;
    const readingLine = top + stickyHeader + 32;
    const atBottom = scrollRoot.scrollTop > 0 && scrollRoot.scrollTop + scrollRoot.clientHeight >= scrollRoot.scrollHeight - 2;
    const visible = atBottom ? sections.at(-1)
      : sections.filter((section) => section.getBoundingClientRect().top <= readingLine).at(-1) || sections[0];
    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${visible.id}`;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }
  function queueNavigationUpdate() {
    if (navigationFrame) return;
    navigationFrame = requestAnimationFrame(() => { navigationFrame = 0; updateActiveNavigation(); });
  }
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(queueNavigationUpdate, {
      root: scrollRoot, rootMargin: "0px 0px -60%", threshold: [0, 0.2, 0.6],
    });
    sections.forEach((section) => observer.observe(section));
  }
  scrollRoot.addEventListener("scroll", queueNavigationUpdate, { passive: true });
  window.addEventListener("resize", queueNavigationUpdate, { passive: true });
  window.addEventListener("hashchange", queueNavigationUpdate);
  if ("ResizeObserver" in window) new ResizeObserver(queueNavigationUpdate).observe(scrollRoot);
  queueNavigationUpdate();

  render();
  loadAutomatedMarketData();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js?v=20261022-adfit1", { updateViaCache: "none" }).catch(() => {}));
  }
})();
