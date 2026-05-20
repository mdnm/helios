#!/usr/bin/env python3
"""
Balkonkraftwerk ROI Calculator

Computes payback period, annual savings, and 25-year net return for a
plug-in balcony solar setup in Germany.

Usage:
    python3 roi_calculator.py --kwp 1.8 --region cologne --orientation S \\
        --consumption 2000 --self-consumption 0.93 --price 0.34 \\
        --cost 1050 --subsidy 100

Or interactively (omit --consumption etc. to be prompted).
"""

import argparse
import sys

# Regional yield baseline (kWh/kWp/year for south-facing vertical mount)
REGION_FACTORS = {
    "south": 900,        # Munich, Stuttgart, Freiburg
    "central": 830,      # Cologne, Frankfurt, Düsseldorf — DEFAULT
    "east": 820,         # Berlin, Leipzig, Dresden
    "north": 760,        # Hamburg, Bremen, Kiel
}

# City -> region mapping for convenience
CITY_TO_REGION = {
    "köln": "central", "koeln": "central", "cologne": "central",
    "düsseldorf": "central", "duesseldorf": "central",
    "frankfurt": "central", "bonn": "central", "essen": "central",
    "dortmund": "central", "münster": "central", "muenster": "central",
    "aachen": "central", "wuppertal": "central",
    "münchen": "south", "muenchen": "south", "munich": "south",
    "stuttgart": "south", "freiburg": "south", "augsburg": "south",
    "nürnberg": "south", "nuernberg": "south", "karlsruhe": "south",
    "berlin": "east", "leipzig": "east", "dresden": "east",
    "chemnitz": "east", "potsdam": "east", "halle": "east",
    "magdeburg": "east", "erfurt": "east", "jena": "east",
    "hamburg": "north", "bremen": "north", "kiel": "north",
    "hannover": "north", "lübeck": "north", "luebeck": "north",
    "rostock": "north",
}

# Orientation factor (multiplier of south yield)
ORIENTATION_FACTORS = {
    "S": 1.00, "Süd": 1.00, "Sued": 1.00,
    "SE": 0.92, "SW": 0.92, "SO": 0.92,
    "E": 0.78, "W": 0.78, "Ost": 0.78, "West": 0.78,
    "NE": 0.55, "NW": 0.55, "NO": 0.55,
    "N": 0.35, "Nord": 0.35,
}


def detect_region(city_or_region: str) -> str:
    """Map a city name or region keyword to a regional yield bucket."""
    key = city_or_region.lower().strip()
    if key in REGION_FACTORS:
        return key
    if key in CITY_TO_REGION:
        return CITY_TO_REGION[key]
    # Default to central if unknown
    return "central"


def compute(
    kwp: float,
    region: str,
    orientation: str,
    consumption_kwh: float,
    self_consumption: float,
    price_per_kwh: float,
    hardware_cost: float,
    subsidy: float,
    feed_in_tariff: float = 0.0,
    inverter_degradation_per_year: float = 0.005,
    price_inflation_per_year: float = 0.02,
) -> dict:
    """Run the ROI computation and return a result dict."""
    region_key = detect_region(region)
    region_factor = REGION_FACTORS[region_key]
    orient_factor = ORIENTATION_FACTORS.get(orientation.strip(), 1.00)

    annual_generation = kwp * region_factor * orient_factor
    annual_self_used = annual_generation * self_consumption
    annual_fed_in = annual_generation - annual_self_used

    # Savings = (kWh self-consumed at retail price) + (kWh fed in at feed-in tariff)
    year_one_savings = (
        annual_self_used * price_per_kwh + annual_fed_in * feed_in_tariff
    )

    net_investment = hardware_cost - subsidy

    # Simple payback (no compounding, year-one savings)
    payback_simple = (
        net_investment / year_one_savings if year_one_savings > 0 else float("inf")
    )

    # 25-year cumulative savings with degradation and electricity price inflation
    cumulative = 0.0
    year_of_payback = None
    yearly_breakdown = []
    for year in range(1, 26):
        gen = annual_generation * ((1 - inverter_degradation_per_year) ** (year - 1))
        price = price_per_kwh * ((1 + price_inflation_per_year) ** (year - 1))
        feed_price = feed_in_tariff * ((1 + price_inflation_per_year) ** (year - 1))
        savings = gen * self_consumption * price + gen * (1 - self_consumption) * feed_price
        cumulative += savings
        if year_of_payback is None and cumulative >= net_investment:
            year_of_payback = year
        yearly_breakdown.append({"year": year, "savings": savings, "cumulative": cumulative})

    coverage = annual_self_used / consumption_kwh if consumption_kwh > 0 else 0

    return {
        "region": region_key,
        "region_factor": region_factor,
        "orientation": orientation,
        "orient_factor": orient_factor,
        "kwp": kwp,
        "annual_generation": annual_generation,
        "annual_self_used": annual_self_used,
        "annual_fed_in": annual_fed_in,
        "year_one_savings": year_one_savings,
        "net_investment": net_investment,
        "payback_simple_years": payback_simple,
        "payback_discounted_year": year_of_payback,
        "lifetime_25y_savings": cumulative,
        "lifetime_25y_net": cumulative - net_investment,
        "coverage_of_consumption": coverage,
        "breakdown": yearly_breakdown,
    }


def format_result(r: dict) -> str:
    lines = []
    lines.append("=" * 60)
    lines.append("Balkonkraftwerk ROI Calculation")
    lines.append("=" * 60)
    lines.append(
        f"Configuration: {r['kwp']:.2f} kWp, "
        f"region={r['region']} ({r['region_factor']} kWh/kWp/y baseline), "
        f"orientation={r['orientation']} (×{r['orient_factor']:.2f})"
    )
    lines.append("")
    lines.append("ANNUAL")
    lines.append(f"  Generation:           {r['annual_generation']:>8,.0f} kWh")
    lines.append(f"  Self-consumed:        {r['annual_self_used']:>8,.0f} kWh")
    lines.append(f"  Fed into grid:        {r['annual_fed_in']:>8,.0f} kWh")
    lines.append(f"  Covers consumption:   {r['coverage_of_consumption']*100:>7.1f} %")
    lines.append(f"  Year 1 savings:       {r['year_one_savings']:>8,.0f} €")
    lines.append("")
    lines.append("INVESTMENT")
    lines.append(f"  Net cost (after subsidy):  {r['net_investment']:>6,.0f} €")
    lines.append(f"  Simple payback:            {r['payback_simple_years']:>6.1f} years")
    if r["payback_discounted_year"]:
        lines.append(
            f"  Payback (with 2% price inflation, 0.5%/y degradation): year {r['payback_discounted_year']}"
        )
    lines.append("")
    lines.append("25-YEAR OUTLOOK")
    lines.append(f"  Cumulative savings:        {r['lifetime_25y_savings']:>6,.0f} €")
    lines.append(f"  Net of investment:         {r['lifetime_25y_net']:>6,.0f} €")
    lines.append("=" * 60)
    return "\n".join(lines)


def prompt(label: str, cast=str, default=None):
    suffix = f" [{default}]" if default is not None else ""
    raw = input(f"{label}{suffix}: ").strip()
    if not raw and default is not None:
        return cast(default) if cast is not str else default
    return cast(raw)


def interactive() -> dict:
    print("Balkonkraftwerk ROI Calculator — interactive mode")
    print("(Press Enter to accept defaults in brackets.)")
    print()
    kwp = prompt("Module power in kWp (e.g. 1.8 for 1800 Wp)", float, "1.8")
    region = prompt("City or region (e.g. Köln, München, Hamburg, or south/central/east/north)", str, "central")
    orientation = prompt("Orientation (S, SE/SW, E/W, NE/NW, N)", str, "S")
    consumption = prompt("Annual consumption in kWh", float, "2000")
    self_cons = prompt("Self-consumption rate (0.30 no battery, 0.65 battery, 0.92 battery+smart meter)", float, "0.65")
    price = prompt("Electricity price per kWh in €", float, "0.34")
    cost = prompt("Hardware cost in €", float, "1000")
    subsidy = prompt("Subsidy in €", float, "0")

    return compute(
        kwp=kwp,
        region=region,
        orientation=orientation,
        consumption_kwh=consumption,
        self_consumption=self_cons,
        price_per_kwh=price,
        hardware_cost=cost,
        subsidy=subsidy,
    )


def main():
    parser = argparse.ArgumentParser(
        description="Balkonkraftwerk ROI calculator for Germany",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Run without arguments for interactive mode.",
    )
    parser.add_argument("--kwp", type=float, help="Module power in kWp (e.g. 1.8 for 1800 Wp)")
    parser.add_argument("--region", type=str, default="central",
                        help="City or region: e.g. köln, münchen, hamburg, or south/central/east/north")
    parser.add_argument("--orientation", type=str, default="S",
                        help="S, SE, SW, E, W, NE, NW, N")
    parser.add_argument("--consumption", type=float, help="Annual household consumption in kWh")
    parser.add_argument("--self-consumption", type=float, default=0.65,
                        help="Fraction of generated power actually used in household (0.30 no battery, 0.65 battery, 0.92 battery+smart meter)")
    parser.add_argument("--price", type=float, default=0.34, help="€ per kWh retail price")
    parser.add_argument("--cost", type=float, help="Hardware cost in €")
    parser.add_argument("--subsidy", type=float, default=0, help="Subsidy in €")
    parser.add_argument("--feed-in-tariff", type=float, default=0.0,
                        help="€ per kWh for excess fed to grid (usually 0 for Balkonkraftwerk)")

    args = parser.parse_args()

    if args.kwp is None or args.consumption is None or args.cost is None:
        # Fall back to interactive
        result = interactive()
    else:
        result = compute(
            kwp=args.kwp,
            region=args.region,
            orientation=args.orientation,
            consumption_kwh=args.consumption,
            self_consumption=args.self_consumption,
            price_per_kwh=args.price,
            hardware_cost=args.cost,
            subsidy=args.subsidy,
            feed_in_tariff=args.feed_in_tariff,
        )

    print(format_result(result))


if __name__ == "__main__":
    main()
