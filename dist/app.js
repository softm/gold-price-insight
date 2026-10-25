(function () {
  "use strict";

  const OUNCE_IN_GRAMS = 31.1034768;
  const PRICE_UNITS = Object.freeze({
    don: { grams: 3.75, label: "1돈(3.75g)", short: "1돈", factor: "3.75" },
    gram: { grams: 1, label: "1g", short: "1g", factor: "1" },
    troy: { grams: OUNCE_IN_GRAMS, label: "1트로이온스(31.1034768g)", short: "1트로이온스", factor: "31.1034768" },
  });
  const UNIT_STORAGE_KEY = "goldSignalPriceUnitV1";
  const TARGET_STORAGE_KEY = "goldSignalTargetPerGramV1";
  function getStoredUnit() {
    try {
      const value = localStorage.getItem(UNIT_STORAGE_KEY);
      return Object.hasOwn(PRICE_UNITS, value) ? value : "don";
    } catch (_) { return "don"; }
  }
  let latestMarketSnapshot = null;
  let marketHistory = [];
  let marketLoaded = false;
  const horizons = {
    7: { label: "7일", base: 0.008, bull: 0.027, bear: -0.022, volatility: 0.024 },
    30: { label: "30일", base: 0.024, bull: 0.071, bear: -0.046, volatility: 0.038 },
    90: { label: "90일", base: 0.058, bull: 0.128, bear: -0.083, volatility: 0.061 },
    365: { label: "1년", base: 0.116, bull: 0.235, bear: -0.142, volatility: 0.105 },
  };

  const state = {
    horizon: 30,
    scenario: "base",
    priceUnit: getStoredUnit(),
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
    priceUnitHeading: document.querySelector("#priceUnitHeading"),
    chartPriceUnit: document.querySelector("#chartPriceUnit"),
    targetUnitLabel: document.querySelector("#targetUnitLabel"),
    calculationFormula: document.querySelector("#calculationFormula"),
    marketInsight: document.querySelector("#marketInsight"),
    scenarioInsight: document.querySelector("#scenarioInsight"),
    goldInsight: document.querySelector("#goldInsight"),
    dailyBrief: document.querySelector("#dailyBrief"),
    watchPoint: document.querySelector("#watchPoint"),
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

  function getPriceUnit() { return PRICE_UNITS[state.priceUnit]; }
    function formatUnitPrice(pricePerGram) { return won.format(pricePerGram * getPriceUnit().grams); }
    function formatChartAxis(pricePerGram) {
      const v = pricePerGram * getPriceUnit().grams;
      if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(2)}백만`;
      if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}만`;
      return Math.round(v).toLocaleString("ko-KR");
    }
    function updateUnitDisplay() {
      const unit = getPriceUnit();
      els.priceUnitHeading.textContent = `국제 금값 원화 환산 추정가 · ${unit.label}`;
      els.chartPriceUnit.textContent = `KRW / ${unit.label}`;
      els.targetUnitLabel.textContent = `${unit.label} 목표가`;
      els.calculationFormula.textContent = `국제 금값(USD/트로이온스) ÷ ${OUNCE_IN_GRAMS} × 원·달러 환율 × (1 + 국내 프리미엄/100) × ${unit.factor}g으로 ${unit.short} 원화 환산 추정가를 계산합니다.`;
      els.footerSource.textContent = `기준 단위: KRW / ${unit.label} · ${marketLoaded ? "Gold API · Frankfurter" : "기본 가정 시뮬레이션"}`;
      els.targetInput.placeholder = String(Math.round(getCurrentPrice() * unit.grams / 100) * 100);
      document.querySelectorAll("[data-price-unit]").forEach((button) => {
        const active = button.dataset.priceUnit === state.priceUnit;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }
    function getSavedTargetPerGram() {
      try {
        const stored = Number(localStorage.getItem(TARGET_STORAGE_KEY));
        if (Number.isFinite(stored) && stored > 0) return stored;
        const legacy = Number(localStorage.getItem("goldSignalTarget"));
        if (Number.isFinite(legacy) && legacy > 0) {
          localStorage.setItem(TARGET_STORAGE_KEY, String(legacy));
          return legacy;
        }
      } catch (_) { /* Storage can be disabled. */ }
      return 0;
    }

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
      els.chartLabels.insertAdjacentHTML("beforeend", `<text x="3" y="${y + 3}">${formatChartAxis(value)}</text>`);
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
      els.chartTooltip.textContent = `${formatUnitPrice(nearest.value)} / ${getPriceUnit().short}`;
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

    updateUnitDisplay();
    els.currentPrice.textContent = formatUnitPrice(current);
    els.horizonLabel.textContent = horizons[state.horizon].label;
    els.directionText.textContent = direction;
    els.forecastReason.textContent = reason;
    els.forecastRange.textContent = `${formatUnitPrice(rangeLow)} — ${formatUnitPrice(rangeHigh)}`;
    els.forecastPrice.textContent = formatUnitPrice(target);
    els.forecastChange.textContent = formatPercent(rate);
    els.forecastChange.classList.toggle("positive", rate >= 0);
    els.forecastChange.style.color = rate < 0 ? "#d58b80" : "";
    els.confidenceScore.textContent = confidence;
    els.confidenceRing.style.setProperty("--score", confidence);
    els.confidenceRing.setAttribute("aria-label", `전망 신뢰도 ${confidence}점`);
    els.chartCenter.textContent = formatUnitPrice(target);
    els.chartDelta.textContent = `현재 대비 ${formatPercent(rate)}`;
    els.chartDelta.style.color = rate >= 0 ? "var(--green)" : "var(--red)";
    els.premiumOutput.value = `${state.premium > 0 ? "+" : ""}${state.premium.toFixed(1)}%`;
    els.sentimentOutput.value = ["강한 위험 선호", "위험 선호", "약한 위험 선호", "중립", "약한 안전 선호", "안전 선호", "강한 안전 선호"][state.sentiment + 3];
    updateSliderFill(els.premiumInput);
    updateSliderFill(els.sentimentInput);
    renderChart(current, target);
    updateTargetStatus(current);
    renderInsights(current, target, rangeLow, rangeHigh, rate);
  }

  function renderInsights(current, target, rangeLow, rangeHigh, rate) {
    const unit = getPriceUnit();
    if (latestMarketSnapshot && marketHistory.length > 1) {
      const start = marketHistory.find((row) => row && row.date && row.date < latestMarketSnapshot.date && Number(row.goldUsdOz) > 0 && Number(row.usdKrw) > 0);
      if (start) {
        const goldDelta = latestMarketSnapshot.goldUsdOz / Number(start.goldUsdOz) - 1;
        const fxDelta = latestMarketSnapshot.usdKrw / Number(start.usdKrw) - 1;
        const wonDelta = latestMarketSnapshot.goldUsdOz * latestMarketSnapshot.usdKrw / (Number(start.goldUsdOz) * Number(start.usdKrw)) - 1;
        const measuredPerGram = latestMarketSnapshot.goldUsdOz / OUNCE_IN_GRAMS * latestMarketSnapshot.usdKrw * (1 + latestMarketSnapshot.premium / 100);
        els.marketInsight.textContent = `${start.date} → ${latestMarketSnapshot.date} 수집 자료: 국제 금값 ${formatPercent(goldDelta)}, 환율 ${formatPercent(fxDelta)}, 원화 환산가 ${formatPercent(wonDelta)}. 최근 수집 ${unit.short} 환산가는 약 ${formatUnitPrice(measuredPerGram)}입니다.`;
        els.dailyBrief.textContent = `최근 원화 환산 금값은 ${wonDelta >= 0 ? "상승" : "하락"}했습니다. 국제 금값(${formatPercent(goldDelta)})과 원·달러 환율(${formatPercent(fxDelta)})을 함께 살펴보세요.`;
      } else {
        els.marketInsight.textContent = `현재 입력 가정의 ${unit.short} 환산가는 ${formatUnitPrice(current)}입니다. 최근 수집 이력은 거래일과 갱신 시점에 따라 다를 수 있습니다.`;
        els.dailyBrief.textContent = "국제 금값과 원·달러 환율을 함께 봐야 원화 금시세를 이해할 수 있습니다.";
      }
    } else {
      els.marketInsight.textContent = `현재 입력 기준 ${unit.short} 원화 환산가는 ${formatUnitPrice(current)}입니다. 수집된 이력이 충분해지면 실제 기록에 근거해 변화를 비교합니다.`;
      els.dailyBrief.textContent = `${unit.short} 기준 ${formatUnitPrice(current)}. 국제 금값·환율·국내 프리미엄을 함께 확인해 보세요.`;
    }
    els.watchPoint.textContent = `입력값 · 국제 금 US$${state.goldUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}/트로이온스 · USD/KRW ${state.exchange.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}`;
    const scenario = { bull: "상승", base: "기본", bear: "하락" }[state.scenario];
    els.scenarioInsight.textContent = `${horizons[state.horizon].label} ${scenario} 시나리오에서 ${unit.short} 중심 전망은 ${formatUnitPrice(target)}(${formatPercent(rate)}), 범위는 ${formatUnitPrice(rangeLow)}~${formatUnitPrice(rangeHigh)}입니다. 가정에 따른 시뮬레이션이며 실제 시세를 보장하지 않습니다.`;
    const fxImpact = state.goldUsd / OUNCE_IN_GRAMS * 10 * (1 + state.premium / 100) * unit.grams;
    els.goldInsight.textContent = `국제 금값이 같고 환율만 달러당 10원 상승하면 ${unit.short} 원화 환산가는 약 ${won.format(fxImpact)} 올라갑니다. 금 실물 매수·매도에는 부가세·가공비·매매 스프레드 등이 추가될 수 있습니다.`;
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
      if (!Number.isFinite(gold) || gold <= 0 || !Number.isFinite(exchange) || exchange <= 0) throw new Error("invalid market data");
      latestMarketSnapshot = {
        goldUsdOz: gold, usdKrw: exchange,
        premium: Number.isFinite(premium) ? premium : 0,
        date: typeof payload?.market?.fxDate === "string" ? payload.market.fxDate : String(payload.generatedAt || "").slice(0, 10),
      };
      marketHistory = Array.isArray(payload.history) ? payload.history : [];
      marketLoaded = true;

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
      updateUnitDisplay();

      const sourceDate = payload?.market?.fxDate || payload.generatedAt;
      const parsedDate = new Date(sourceDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        els.todayLabel.textContent = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(parsedDate);
      }
      render();
    } catch (_) {
      els.dataStatus.innerHTML = "<span></span> 기본 데이터 · 시뮬레이션";
      updateUnitDisplay();
    }
  }

  function updateTargetStatus(currentPerGram) {
    const saved = getSavedTargetPerGram();
    if (!saved) {
      els.targetStatus.textContent = "저장된 목표가가 없습니다.";
      return;
    }
    const delta = (saved / currentPerGram - 1) * 100;
    const label = `${formatUnitPrice(saved)} / ${getPriceUnit().short}`;
    els.targetStatus.textContent = delta > 0
      ? `저장됨 · 현재 환산가보다 ${delta.toFixed(1)}% 높은 목표 ${label}`
      : `저장됨 · 현재 환산가가 목표 ${label}보다 ${Math.abs(delta).toFixed(1)}% 높습니다`;
  }

  document.querySelectorAll("[data-price-unit]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = button.dataset.priceUnit;
        if (!Object.hasOwn(PRICE_UNITS, next) || next === state.priceUnit) return;
        const draft = els.targetInput.value.trim();
        const perGram = draft ? Number(draft) / getPriceUnit().grams : null;
        state.priceUnit = next;
        try { localStorage.setItem(UNIT_STORAGE_KEY, next); } catch (_) { /* Storage blocked. */ }
        if (perGram !== null && Number.isFinite(perGram)) {
          els.targetInput.value = String(Math.round(perGram * getPriceUnit().grams));
        }
        render();
      });
    });
    const saved = getSavedTargetPerGram();
    if (saved > 0) els.targetInput.value = String(Math.round(saved * getPriceUnit().grams));

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
    if (!Number.isFinite(target) || target <= 0 || target > 1000000000) {
      showToast("유효한 목표가를 입력해 주세요.");
      return;
    }
    try {
      localStorage.setItem(TARGET_STORAGE_KEY, String(target / getPriceUnit().grams));
      updateTargetStatus(getCurrentPrice());
    } catch (_) {
      showToast("브라우저 저장 기능이 차단되어 있습니다.");
      return;
    }
    showToast("목표가를 이 브라우저에 저장했어요.");
  });

  document.querySelector("#copyBrief").addEventListener("click", async () => {
    const rate = getOutlookRate();
    const message = `[금시그널 ${horizons[state.horizon].label} 전망] ${describeOutlook(rate)[0]} · 중심값 ${formatUnitPrice(getCurrentPrice() * (1 + rate))} / ${getPriceUnit().short} (${formatPercent(rate)}) — 시뮬레이션이며 투자 조언이 아닙니다.`;
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
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js?v=20261025-unit5", { updateViaCache: "none" }).catch(() => {}));
  }
})();
