import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_PATH = path.resolve(process.cwd(), "dist/data/market.json");
const GOLD_URL = "https://api.gold-api.com/price/XAU";
const FX_URL = "https://api.frankfurter.dev/v2/rate/usd/krw";

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "goldsignal-data-collector/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

function assertRange(label, value, minimum, maximum) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} is outside the expected range`);
  }
}

async function readPreviousData() {
  try {
    return JSON.parse(await readFile(DATA_PATH, "utf8"));
  } catch {
    return { history: [] };
  }
}

async function main() {
  const [goldPayload, fxPayload, previous] = await Promise.all([
    fetchJson(GOLD_URL),
    fetchJson(FX_URL),
    readPreviousData(),
  ]);

  const goldUsdOz = Number(goldPayload.price);
  const usdKrw = Number(fxPayload.rate);
  assertRange("gold price", goldUsdOz, 500, 20_000);
  assertRange("USD/KRW", usdKrw, 500, 3_000);

  const generatedAt = new Date().toISOString();
  const observationDate = String(fxPayload.date || goldPayload.updatedAt || generatedAt).slice(0, 10);
  const previousHistory = Array.isArray(previous.history) ? previous.history : [];
  const history = previousHistory
    .filter((entry) => entry && entry.date !== observationDate)
    .concat({ date: observationDate, goldUsdOz, usdKrw })
    .slice(-366);

  const output = {
    schemaVersion: 1,
    generatedAt,
    market: {
      goldUsdOz,
      usdKrw,
      domesticPremiumPct: 0,
      goldUpdatedAt: goldPayload.updatedAt || generatedAt,
      fxDate: fxPayload.date || observationDate,
    },
    sources: [
      { name: "Gold API", url: GOLD_URL },
      { name: "Frankfurter", url: FX_URL },
    ],
    history,
  };

  await mkdir(path.dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Collected XAU/USD ${goldUsdOz} and USD/KRW ${usdKrw} for ${observationDate}`);
}

await main();
