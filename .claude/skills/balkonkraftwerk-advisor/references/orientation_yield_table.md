# Orientation & Yield Reference Table (Germany)

Annual yield in kWh per kWp installed module power, for **vertical wall/railing mount** (the typical Balkonkraftwerk position).

Yields assume modest shading typical of urban balconies. Optimal roof-mount values would be ~30% higher.

## South-facing (Süd) — best case

| Region | kWh/kWp/year |
|---|---|
| Southern Germany (München, Stuttgart, Freiburg) | 870–950 |
| Central / west (Frankfurt, Köln, Düsseldorf) | 800–870 |
| Eastern Germany (Berlin, Leipzig, Dresden) | 780–860 |
| Northern Germany (Hamburg, Bremen, Kiel) | 720–800 |

## Southeast / Southwest (Südost / Südwest)

About **90–95%** of the south-facing yield.

| Region | kWh/kWp/year |
|---|---|
| Southern Germany | 800–880 |
| Central / west | 740–810 |
| Eastern | 720–795 |
| Northern | 660–740 |

## East / West (Ost / West)

About **75–80%** of the south-facing yield. Surprisingly close — and the production curve spreads over the day, which means more self-consumption matching for typical households.

| Region | kWh/kWp/year |
|---|---|
| Southern Germany | 670–740 |
| Central / west | 620–680 |
| Eastern | 600–670 |
| Northern | 560–630 |

## Northeast / Northwest (Nordost / Nordwest)

About **50–60%** of south-facing.

| Region | kWh/kWp/year |
|---|---|
| Southern Germany | 450–550 |
| Central / west | 420–510 |
| Eastern | 410–510 |
| Northern | 380–470 |

## North (Nord) — usually not worth it

About **30–40%** of south-facing. Combined with the cost of equipment, payback often exceeds 8–10 years. Recommend against unless the person has strong non-financial motivations.

| Region | kWh/kWp/year |
|---|---|
| Southern Germany | 280–360 |
| Central / west | 260–340 |
| Eastern | 250–330 |
| Northern | 230–300 |

## Adjustments for real-world conditions

**Tilt:** Each 10° away from vertical toward optimal 35° tilt gains ~3–5%. A fully tiltable Aufständerung can recover 15–20%.

**Shading:** Significant shading by trees, neighbor balconies, or buildings can cost 20–40%. Microinverters with two MPPT trackers (Hoymiles, Growatt) reduce the penalty by isolating shaded modules.

**Bifacial bonus:** If the rear of the module sees diffuse light (light-colored balcony floor, no obstruction behind), bifacial modules gain 5–25%.

**Snow:** Negligible in Germany at vertical mount — snow doesn't stick to vertical surfaces.

**Soiling:** Typically 3–5% loss between cleanings. One annual rinse is usually enough.

**Temperature:** Module output drops ~0.4% per degree above 25°C. Vertical wall-mount runs hotter in summer than tilted free-mounted modules. Already factored into the numbers above.

## Quick estimation formula

For rough mental math:

```
Annual generation (kWh) ≈ Module power (kWp) × Region factor × Orientation factor

Region factor (kWh/kWp at south vertical):
  South Germany: 900
  Central/West:  830
  East:          820
  North:         760

Orientation factor:
  S:  1.00
  SE/SW: 0.92
  E/W:   0.78
  NE/NW: 0.55
  N:     0.35
```

**Example:** 1.8 kWp in Köln (central/west), south-facing:
`1.8 × 830 × 1.00 = 1,494 kWh/year`

Same setup facing east:
`1.8 × 830 × 0.78 = 1,165 kWh/year`

## What this means for sizing

For a typical 2,000 kWh/year household, a south-facing 1.8 kWp setup generates ~75% of total consumption. Even after self-consumption losses (without smart meter ~30–60%, with smart meter and battery ~85–95%), this is more than enough to make the legal max configuration economically optimal.

For an east or west balcony with the same household, the same 1.8 kWp generates ~58% of consumption. Still highly worthwhile, but the payback period stretches from ~2.5 years to ~3.5 years.

For a north balcony, even 1.8 kWp only generates ~26% of consumption. Payback often exceeds 7 years. Suggest the person reconsider, install a smaller starter setup, or look at a balcony different from the main one (corner apartments often have two orientations).
