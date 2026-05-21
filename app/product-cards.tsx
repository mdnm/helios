"use client";

import { Icon } from "./icons";

interface ProductConfig {
  id: string;
  name: string;
  modules: string;
  totalWp: number;
  inverter: string;
  battery: string | null;
  smartMeter: string | null;
  mounting: string;
  connection: string;
  price: number;
  selfConsumptionRate: number;
  bestFor: string;
}

const TIER_META: Record<
  string,
  { tier: string; tagline: string; image: string; recommended?: boolean }
> = {
  starter: {
    tier: "Starter",
    tagline: "Panels only",
    image: "/products/product-starter.png",
  },
  battery: {
    tier: "Standard",
    tagline: "Panels + battery",
    image: "/products/product-standard.png",
  },
  smart: {
    tier: "Maximum",
    tagline: "Panels + battery + meter",
    image: "/products/product-maximum.png",
    recommended: true,
  },
};

function specLines(p: ProductConfig) {
  return [
    { kind: "panels" as const, label: p.modules, sub: `${p.totalWp} Wp total`, off: false },
    { kind: "inv" as const, label: p.inverter.split(" (")[0], sub: p.inverter.split(" (")[1]?.replace(")", "") ?? null, off: false },
    { kind: "battery" as const, label: p.battery ?? "No battery", sub: p.battery ? "LiFePO4, expandable to 12.7 kWh" : null, off: !p.battery },
    { kind: "meter" as const, label: p.smartMeter ? "PowerTracker IR meter" : "No smart meter", sub: p.smartMeter ? "Magnet-mount, no electrician" : null, off: !p.smartMeter },
  ];
}

const SpecIcons: Record<string, typeof Icon.Panels> = {
  panels: Icon.Panels,
  inv: Icon.Inverter,
  battery: Icon.Battery,
  meter: Icon.Meter,
};

function SelfConsumptionMeter({ value }: { value: number }) {
  return (
    <div className="sc-meter">
      <div className="sc-meter-track">
        <div className="sc-meter-fill" style={{ width: `${value}%` }} />
      </div>
      <div className="sc-meter-foot">
        <span className="sc-meter-label">Self-consumption</span>
        <span className="sc-meter-value">{value}%</span>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  selected,
  onSelect,
}: {
  product: ProductConfig;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const meta = TIER_META[product.id] ?? { tier: product.name, tagline: "" };
  const lines = specLines(product);

  return (
    <div className={`product-card ${meta.recommended ? "recommended" : ""} ${selected ? "selected" : ""}`}>
      {meta.recommended && (
        <div className="product-badge">
          <Icon.Sparkle /> Helios pick
        </div>
      )}

      <div className="product-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={meta.image} alt={`${meta.tier} balcony PV setup`} />
      </div>

      <div className="product-body">
        <div className="product-head">
          <div className="product-tier">{meta.tier}</div>
          <div className="product-tagline">{meta.tagline}</div>
        </div>

        <div className="product-price">
          <span className="product-price-currency">€</span>
          <span className="product-price-num">{product.price.toLocaleString()}</span>
          <span className="product-price-vat">incl. VAT</span>
        </div>

        <SelfConsumptionMeter value={Math.round(product.selfConsumptionRate * 100)} />

        <ul className="product-includes">
          {lines.map((line, i) => {
            const Glyph = line.off ? Icon.Minus : (SpecIcons[line.kind] ?? Icon.Panels);
            return (
              <li key={i} className={line.off ? "off" : ""}>
                <span className="spec-icon"><Glyph /></span>
                <span className="spec-text">
                  <span className="spec-label">{line.label}</span>
                  {line.sub && <span className="spec-sub">{line.sub}</span>}
                </span>
              </li>
            );
          })}
        </ul>

        {product.bestFor && (
          <div className="product-best">{product.bestFor}</div>
        )}

        <button
          className={`product-select ${selected ? "is-selected" : ""}`}
          onClick={() => onSelect(product.id)}
        >
          {selected ? (<><Icon.Check /> Selected</>) : (<>Choose {meta.tier} <Icon.Arrow /></>)}
        </button>
      </div>
    </div>
  );
}

export function ProductCards({
  products,
  selectedId,
  onSelect,
}: {
  products: ProductConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="product-options">
      <div className="product-options-meta">
        <span className="product-options-count">{products.length} options</span>
        <span className="product-options-sep">·</span>
        <span>All include universal railing clamps &amp; Schuko plug</span>
      </div>
      <div className="product-options-grid">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            selected={selectedId === p.id}
            onSelect={onSelect}
          />
        ))}
      </div>
      <div className="product-options-foot">
        <Icon.Bolt />
        Estimates based on your balcony setup. Helios refines these with your live consumption data.
      </div>
    </div>
  );
}
