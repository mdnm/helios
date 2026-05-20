# Balkonkraftwerk Equipment Guide (2026)

## Solar modules

Standard balcony-suitable modules in 2026:

| Type | Dimensions | Power | Notes |
|---|---|---|---|
| Full-size mono | ~175 × 113 cm | 430–450 Wp | Best Wp/€, takes more railing |
| Glas-Glas premium | ~175 × 113 cm | 440–460 Wp | 30-year warranty, slightly heavier |
| Compact balcony | ~150 × 75 cm | 350–400 Wp | For narrow balconies |
| Vertical mount narrow | ~170 × 70 cm | 380–410 Wp | For tall narrow railings |
| Bifacial | varies | 380–460 Wp + rear gain | Up to 30% bonus from reflected light if rear is unshaded |

**Mounting orientation:** Most balcony modules are mounted vertically on the outside of the railing. This loses about 15–20% yield vs. the optimal ~35° tilt, but it's the only realistic mount for most apartment balconies. Tiltable brackets (Aufständerung) can recover much of the loss if the balcony floor has room.

## Microinverters (800 W cap)

| Model | Strengths | Typical price |
|---|---|---|
| Hoymiles HMS-800W-2T | Cheap, two MPPT trackers, widely supported | ~130–180 € |
| Hoymiles MS A2 | Newer, supports Nulleinspeisung with Shelly | ~150–200 € |
| Growatt NEO 800M-X | High efficiency 97.3%, IP67, two MPPTs | ~160–210 € |
| Deye SUN-M80G4-EU-Q0 | TÜV-certified, modbus support | ~150–200 € |
| APsystems EZ1-M | Compact, two MPPTs, app-based | ~130–170 € |

All limit AC output to 800 W as required by law. Differences are in efficiency curve, app, monitoring, and which storage systems they natively integrate with.

## Battery storage (Speicher)

The big four in 2026:

| Model | Capacity | Key feature | Price |
|---|---|---|---|
| **Solakon ONE** | 2.11 kWh, expandable to 12.7 kWh | Modular, cheapest entry, integrated PowerTracker IR option | from ~649 € |
| **Anker SOLIX Solarbank 3 E2700 Pro** | 2.7 kWh, expandable | Only 2026 system with passing Stiftung Warentest grade (3.3) | ~998 € |
| **Growatt NOAH 2000** | 2.05 kWh, expandable to 8.19 kWh | IP66, LiFePO4, paired with NEO inverter | ~500–700 € |
| **EcoFlow Stream AC Pro** | varies | Notstrom (backup power) capable, premium | ~998 € |
| **Zendure SolarFlow / Hyper 2000** | 1.92 kWh, expandable | Tibber/aWATTar dynamic tariff integration | varies |
| **Marstek Venus** | 2.56–5.12 kWh | Strong app, modbus | varies |

Cycle life: LiFePO4 chemistries last 6,000–10,000 cycles, comfortably 15–25 years of daily cycling. The cells outlast the legal life of the inverter electronics, which warranty for 10–15 years.

## Smart meters for Nulleinspeisung

| Device | Install | Price | Notes |
|---|---|---|---|
| **Solakon PowerTracker IR** | Magnet to digital meter, plug-and-play | ~50 € | Only works with Solakon storage; no electrician needed |
| **Shelly Pro 3EM** | DIN rail in fusebox | ~130–160 € + electrician | Most compatible — works with Anker, EcoFlow, Zendure, Marstek, SunLit |
| **Anker Smart Meter A17X7311** | CT clamps in fusebox | ~100–130 € + electrician | Only with Anker Solarbank; cleanest app integration |
| **DIN rail 3-phase WLAN meter (generic)** | DIN rail in fusebox | ~80–120 € + electrician | Various Asian brands, mixed quality |

**Critical decision for apartments:** Fusebox-mounted meters (Shelly, Anker) require access to the Sicherungskasten, which is often in the building basement and shared. This means WEG/landlord approval and possibly an electrician visit booked through the Hausverwaltung. The Solakon PowerTracker IR sidesteps all of this — it sticks to your in-apartment digital meter and just needs WiFi.

## Mounting hardware

| Railing type | Bracket type |
|---|---|
| Round bars (25–60 mm) | Standard universal clamps (most kits) |
| Square/flat bars | Specialized brackets — order separately |
| Glass railing | Bottom-mount frame on balcony floor |
| Concrete parapet | Wall anchors or freestanding tilt frame |
| Wood | Wood-rated screw mounts, check load rating |

Wind load rating (DIN EN 1991-1-4) matters above floor 3. Cheap baumarkt brackets often don't have rated certification — important if WEG asks for documentation.

## German retailers (reputable)

| Retailer | Strength | Trustpilot |
|---|---|---|
| **Solakon** (solakon.de) | Best-value modular system, German support | ~4.5 |
| **Anker SOLIX** (ankersolix.de) | Best test results, premium quality | ~4.0 |
| **Kleines Kraftwerk** (kleines-kraftwerk.de) | Bifacial TopCon focus, frequent bundles | varies |
| **Yuma** (yuma.de) | Mid-range, strong subsidy guidance | varies |
| **ROVA Solar** (rova-solar.de) | Premium Glas-Glas, long warranties | varies |
| **priwatt** (priwatt.de) | Cheap, mixed reviews on delivery | 3.0–4.3 |
| **MyVoltaics** (myvoltaics.de) | Wide selection, Shelly bundles | varies |
| **balkonstrom.com** | Strong content, fair prices | varies |
| **ACTEC Solar** | Often best price on Growatt bundles | varies |

**Hornbach, OBI, Bauhaus, Mediamarkt, Saturn** also stock complete sets, sometimes with same-day pickup. Selection thinner but useful for urgent purchases.

## What to avoid

- Modules without CE marking
- Inverters without VDE certification or that don't comply with VDE-AR-N 4105
- Aliexpress no-name brands — they may work but won't pass insurance scrutiny
- "Schnäppchen" sets where the storage doesn't match the inverter (compatibility matters)
- Sets requiring a Wieland plug that don't include one (you'll need an electrician anyway)

## Typical complete set prices (2026)

| Configuration | Price range |
|---|---|
| 400 W single set (1 module, inverter, mount) | 200–300 € |
| 800 W set (2 modules, inverter, mount) | 250–500 € |
| 800 W set + battery (~2 kWh) | 600–1,200 € |
| 1,800–2,000 W maxi set + battery + 4 modules | 900–1,500 € |
| Add smart meter (Shelly + electrician) | +150–250 € |
| Add Solakon PowerTracker IR | +50 € |
