# Legal Framework for Balkonkraftwerke in Germany (2026)

## Power limits

**Inverter (Wechselrichter) output: max 800 W AC**
This is the hard cap regardless of module power. The inverter throttles output to 800 W even if modules produce more. This limit exists for grid stability and household circuit safety.

**Module power (Modulleistung):**
- Up to **960 Wp** if connected via standard Schuko household socket (since DIN VDE V 0126-95, December 2025)
- Up to **2,000 Wp** if connected via Energiesteckvorrichtung (Wieland plug), which requires electrician installation

Module power above inverter capacity is called "Überdimensionierung" — it's legal and economically smart, because modules rarely produce their nameplate output in real conditions. A 1,800 Wp / 800 W combo squeezes maximum self-consumption out of the legal cap.

## One per household

Only one Steckersolargerät per residential unit (Wohneinheit) is allowed under the simplified regime. If you want more, you cross into full PV-Anlage territory with all the additional bureaucracy.

## Registration (Marktstammdatenregister / MaStR)

Since April 2024 the registration is dramatically simplified:
- Online at `marktstammdatenregister.de`
- New menu item "Steckerfertige Solaranlage"
- Only 5 technical data points required: module power, inverter power, location, commissioning date, electricity meter number
- **No registration with the local Netzbetreiber required** — they get notified automatically by the Bundesnetzagentur
- Must be done within one month of commissioning

## Anmeldung beim Netzbetreiber: not required

Since Solarpaket I (May 2024), Steckersolargeräte are exempt from Netzbetreiber registration. The Netzbetreiber learns of the installation via the MaStR. They may swap your old Ferraris (rotating disk) meter for a digital one if needed.

## Tenant and owner rights

Since 2024, plug-in solar is a "privilegierte Maßnahme":
- **Tenants:** § 554 BGB — landlords cannot refuse without legitimate reason (denkmalschutz, structural concerns are valid; aesthetic preference is not)
- **Eigentümergemeinschaft:** § 20 WEG — same principle, the WEG cannot refuse arbitrarily

The notification is still required, even if approval is essentially guaranteed. See `weg_landlord_letter.md` for template language.

## VAT (Mehrwertsteuer)

The 0% VAT rate under § 12 Abs. 3 UStG applies to all Balkonkraftwerk components in 2026, including:
- Solar modules
- Microinverters
- Battery storage
- Mounting hardware
- Complete sets

Prices shown by reputable German retailers are usually already net (no VAT added at checkout) for installation at residential addresses.

## Connection safety norms

The key norm is **DIN VDE V 0126-95** (effective December 2025), which defines:
- Schuko-Stecker (standard household plug) is permitted under 960 Wp
- Energiesteckvorrichtung (Wieland) required above 960 Wp
- Inverter must have rapid shutdown (Abschaltzeit) when plug is pulled
- FI/RCD (residual current device) on the circuit is recommended

## Insurance (Versicherung)

Most Hausratversicherung policies now cover Balkonkraftwerke automatically up to 800 W, but check with the insurer. Some require notification, none currently charge extra premium.

## What still doesn't work in 2026

- **Einspeisevergütung** for Balkonkraftwerke exists in principle (EEG ~8 ct/kWh) but most network operators don't offer contracts for systems this small. Treat fed-in electricity as lost revenue (the practical reason to add a battery and smart meter).
- **Funding via KfW** for Balkonkraftwerke specifically — KfW page still shows "currently not available." Municipal programs are the relevant funding source.
- **Net metering** in the US sense — Germany doesn't have it. You either consume it directly, store it, or feed it in for negligible compensation.
