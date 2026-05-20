const REGION_FACTORS: Record<string, number> = {
  south: 900,
  central: 830,
  east: 820,
  north: 760,
};

const CITY_TO_REGION: Record<string, string> = {
  köln: "central", koeln: "central", cologne: "central",
  düsseldorf: "central", duesseldorf: "central",
  frankfurt: "central", bonn: "central", essen: "central",
  dortmund: "central", münster: "central", muenster: "central",
  aachen: "central", wuppertal: "central",
  münchen: "south", muenchen: "south", munich: "south",
  stuttgart: "south", freiburg: "south", augsburg: "south",
  nürnberg: "south", nuernberg: "south", karlsruhe: "south",
  berlin: "east", leipzig: "east", dresden: "east",
  chemnitz: "east", potsdam: "east", halle: "east",
  magdeburg: "east", erfurt: "east", jena: "east",
  hamburg: "north", bremen: "north", kiel: "north",
  hannover: "north", lübeck: "north", luebeck: "north",
  rostock: "north",
};

const ORIENTATION_FACTORS: Record<string, number> = {
  S: 1.00, Süd: 1.00, Sued: 1.00,
  SE: 0.92, SW: 0.92, SO: 0.92,
  E: 0.78, W: 0.78, Ost: 0.78, West: 0.78,
  NE: 0.55, NW: 0.55, NO: 0.55,
  N: 0.35, Nord: 0.35,
};

function detectRegion(cityOrRegion: string): string {
  const key = cityOrRegion.toLowerCase().trim();
  if (key in REGION_FACTORS) return key;
  if (key in CITY_TO_REGION) return CITY_TO_REGION[key];
  return "central";
}

export interface RoiInput {
  kwp: number;
  region: string;
  orientation: string;
  consumptionKwh: number;
  selfConsumption: number;
  pricePerKwh: number;
  hardwareCost: number;
  subsidy: number;
  feedInTariff?: number;
  degradationPerYear?: number;
  priceInflationPerYear?: number;
}

export interface RoiResult {
  region: string;
  regionFactor: number;
  orientation: string;
  orientationFactor: number;
  kwp: number;
  annualGeneration: number;
  annualSelfUsed: number;
  annualFedIn: number;
  yearOneSavings: number;
  netInvestment: number;
  paybackSimpleYears: number;
  paybackDiscountedYear: number | null;
  lifetime25ySavings: number;
  lifetime25yNet: number;
  coverageOfConsumption: number;
}

export function computeRoi(input: RoiInput): RoiResult {
  const feedInTariff = input.feedInTariff ?? 0;
  const degradation = input.degradationPerYear ?? 0.005;
  const inflation = input.priceInflationPerYear ?? 0.02;

  const regionKey = detectRegion(input.region);
  const regionFactor = REGION_FACTORS[regionKey] ?? 830;
  const orientFactor = ORIENTATION_FACTORS[input.orientation] ?? 1.0;

  const annualGeneration = input.kwp * regionFactor * orientFactor;
  const annualSelfUsed = annualGeneration * input.selfConsumption;
  const annualFedIn = annualGeneration - annualSelfUsed;

  const yearOneSavings =
    annualSelfUsed * input.pricePerKwh + annualFedIn * feedInTariff;

  const netInvestment = input.hardwareCost - input.subsidy;

  const paybackSimple =
    yearOneSavings > 0 ? netInvestment / yearOneSavings : Infinity;

  let cumulative = 0;
  let paybackYear: number | null = null;

  for (let year = 1; year <= 25; year++) {
    const gen = annualGeneration * Math.pow(1 - degradation, year - 1);
    const price = input.pricePerKwh * Math.pow(1 + inflation, year - 1);
    const feedPrice = feedInTariff * Math.pow(1 + inflation, year - 1);
    const savings =
      gen * input.selfConsumption * price +
      gen * (1 - input.selfConsumption) * feedPrice;
    cumulative += savings;
    if (paybackYear === null && cumulative >= netInvestment) {
      paybackYear = year;
    }
  }

  const coverage =
    input.consumptionKwh > 0 ? annualSelfUsed / input.consumptionKwh : 0;

  return {
    region: regionKey,
    regionFactor,
    orientation: input.orientation,
    orientationFactor: orientFactor,
    kwp: input.kwp,
    annualGeneration: Math.round(annualGeneration),
    annualSelfUsed: Math.round(annualSelfUsed),
    annualFedIn: Math.round(annualFedIn),
    yearOneSavings: Math.round(yearOneSavings),
    netInvestment,
    paybackSimpleYears: Math.round(paybackSimple * 10) / 10,
    paybackDiscountedYear: paybackYear,
    lifetime25ySavings: Math.round(cumulative),
    lifetime25yNet: Math.round(cumulative - netInvestment),
    coverageOfConsumption: Math.round(coverage * 1000) / 10,
  };
}
