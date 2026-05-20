# High-Consumption Devices: Load Shifting Guide

The single biggest hidden lever in Balkonkraftwerk economics is **when** electricity is used, not how much. Solar power is essentially free between roughly 10:00 and 16:00 (longer in summer, shorter in winter). Without a battery, every kWh used outside that window must come from the grid.

This guide helps the advisor identify devices in the user's household whose timing can be shifted into solar hours.

## Big easy wins (>1 kWh per use)

**Dishwasher (Spülmaschine)**
- Typical cycle: 0.8–1.5 kWh
- Easy to shift: start button + delay timer present on every modern model
- Recommendation: run after lunch, around 13:00–14:00 in summer, 12:00 in winter
- Don't ask: just suggest "running it around midday instead of in the evening"

**Washing machine (Waschmaschine)**
- Typical cycle: 0.5–1.5 kWh (high temp programs more)
- Easy to shift: start delay or just start manually before leaving for work
- Recommendation: combine multiple loads into one daytime slot

**Tumble dryer (Trockner)**
- Typical cycle: 1.5–4 kWh — one of the biggest single uses in any household
- Heat pump dryers (Wärmepumpentrockner): ~1.5 kWh per cycle
- Old condensation/exhaust dryers: 3–4 kWh per cycle
- Highly worth shifting if the household uses one
- Bonus: replacing an old dryer with a Wärmepumpentrockner saves more than the Balkonkraftwerk does

**Electric vehicle (Elektroauto)**
- If charged at home, this dominates everything else: 10–60 kWh per charge session
- A Balkonkraftwerk can only cover a small fraction (~5 kWh/day in summer), but combined with cheap night tariffs and a wallbox with PV-Überschussladung, the savings stack
- If the user has an EV, ask about their charging pattern — daytime home charging is a perfect match

**Heat pump (Wärmepumpe)**
- For heating: 2,000–6,000 kWh/year
- For hot water only: 1,500–2,500 kWh/year
- Daytime operation strongly matches solar output, especially in shoulder seasons (spring/autumn)
- If the user has one with smart control, suggest setting the hot water boost to noon

**Pool pump (Poolpumpe)**
- If applicable: 1–3 kWh/day in summer
- Move to daytime — also reduces noise complaints

## Medium wins (0.3–1 kWh per use)

**Electric kettle (Wasserkocher)**
- 0.1 kWh per liter — small per use but high total if you drink lots of tea/coffee
- Daytime tea drinkers in home office capture this naturally

**Espresso machine / coffee maker**
- 0.1–0.3 kWh per use
- Daily usage adds up; morning coffee is usually pre-solar (5–7 ct lost per day, small)

**Oven (Backofen)**
- 1–2 kWh per use
- Sunday roast at midday vs. weekday dinner at 19:00 — big difference
- Reframe meal prep timing in summer especially

**Iron (Bügeleisen)**
- 1–1.5 kWh/hour
- Weekend ironing session in the afternoon is solar; weekday evening is grid

## Always-on baseload

The household has a baseload — refrigerator, freezer, WiFi router, standby devices, ventilation — typically 80–200 W continuously, or 700–1,800 kWh/year. This is the easiest to cover with solar because it's always there during daylight hours.

A 900 W Balkonkraftwerk without battery covers the baseload during the day and not much else. Adding battery and smart meter lets the same system cover the baseload all 24 hours.

Specific baseload culprits to mention:
- Old refrigerators/freezers (A-rated and worse) — replacement may save more than the Balkonkraftwerk
- Aquariums with heaters — can use 100–500 W continuously
- Server / NAS / home lab equipment — common in tech households
- Underfloor heating thermostats in standby
- Smart home hubs and security systems

## Devices NOT worth shifting

**Hair dryer, vacuum cleaner, microwave, toaster** — usage so short and infrequent that timing has negligible impact on yearly economics.

**Refrigerator** — runs all the time anyway, can't be shifted.

**Lighting** — modern LED households use ~100–300 kWh/year on lighting, mostly in evenings when there's no solar. Not relevant for shifting.

## How to surface this in conversation

Don't read this list out loud. Instead, weave a few targeted questions in:

> "Do you have a dishwasher or washing machine? Those are easy ways to shift load into solar hours — most modern models have a start delay."

> "Anything that runs hot for a long time — dryer, electric heating, an oven you use often?"

> "Any unusual loads? I'm thinking heat pump, e-car, server room, aquarium — things that draw constant power."

Then in the recommendation, fold the answers into the self-consumption rate estimate: a household that can shift dishwasher + washing machine + dryer into solar hours pushes self-consumption (without battery) from ~30% up to ~55–60%, which significantly changes ROI.

## How load shifting interacts with battery decision

If the user can shift most loads into solar hours, a battery becomes less essential.
If they can't (full-time office worker, family with evening cooking, etc.), the battery is essential to make the investment pay back well.

The decision tree:
- High daytime presence + many shiftable loads → modules-only setup is fine
- Low daytime presence OR few shiftable loads → battery strongly recommended
- High consumption (>2,500 kWh) + low daytime presence → battery + smart meter is the sweet spot
