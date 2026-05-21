"use client";

import { Icon } from "./icons";

export interface SummaryProduct {
  id: string;
  tier: string;
  tagline: string;
  image: string;
  price: number;
  annualKwh: number;
  annualSavings: number;
  recommended?: boolean;
}

export interface SummarySubsidy {
  name: string;
  amount: number;
  /** Optional product IDs this subsidy applies to (undefined = all). */
  applicableTo?: string[];
}

export type OrderStatus = "in-cart" | "placed" | "paid";

interface StageDef {
  id: OrderStatus;
  label: string;
}

const STAGES: StageDef[] = [
  { id: "in-cart", label: "In cart" },
  { id: "placed", label: "Order placed" },
  { id: "paid", label: "Payment received" },
];

export function formatShipDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function SummaryWidget({
  product,
  subsidy,
  locationLabel,
  status,
  shipDate,
}: {
  product: SummaryProduct;
  subsidy: SummarySubsidy;
  locationLabel: string;
  status: OrderStatus;
  shipDate: Date;
}) {
  const applies =
    !subsidy.applicableTo || subsidy.applicableTo.includes(product.id);
  const grantNet = Math.max(0, product.price - (applies ? subsidy.amount : 0));
  const paybackYrs =
    product.annualSavings > 0 ? grantNet / product.annualSavings : null;

  const stageIndex = STAGES.findIndex((s) => s.id === status);

  return (
    <aside className="cart-sidebar" aria-label="Your order">
      <div className="cart-head">
        <span className="cart-head-title">Your order</span>
        <span className="cart-head-loc">{locationLabel}</span>
      </div>

      <div className="cart-product">
        <div className="cart-product-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image} alt="" />
          {product.recommended && (
            <span className="cart-product-pick" aria-hidden="true">
              <Icon.Sparkle />
            </span>
          )}
        </div>
        <div className="cart-product-meta">
          <div className="cart-product-tier">{product.tier}</div>
          <div className="cart-product-tag">{product.tagline}</div>
          <div className="cart-product-price">
            €{product.price.toLocaleString()}
            {applies && (
              <span className="cart-product-subsidy">
                − €{subsidy.amount}
              </span>
            )}
          </div>
        </div>
      </div>

      <dl className="cart-stats">
        <div className="cart-stat">
          <dt>Saves / yr</dt>
          <dd>
            <span className="cart-num">€{product.annualSavings}</span>
          </dd>
        </div>
        <div className="cart-stat">
          <dt>From sun</dt>
          <dd>
            <span className="cart-num">
              {product.annualKwh}
              <span className="cart-unit">kWh</span>
            </span>
          </dd>
        </div>
        {paybackYrs !== null && (
          <div className="cart-stat">
            <dt>Payback</dt>
            <dd>
              <span className="cart-num">
                {paybackYrs.toFixed(1)}
                <span className="cart-unit">yrs</span>
              </span>
            </dd>
          </div>
        )}
      </dl>

      {applies && (
        <div className="cart-subsidy">
          <span className="cart-subsidy-tag">Subsidy</span>
          <div className="cart-subsidy-body">
            <div className="cart-subsidy-title">
              {subsidy.name} · €{subsidy.amount}
            </div>
          </div>
        </div>
      )}

      <ol className="cart-timeline">
        {STAGES.map((s, i) => {
          const done = i < stageIndex;
          const active = i === stageIndex;
          return (
            <li
              key={s.id}
              className={`cart-step ${done ? "done" : ""} ${active ? "active" : ""}`}
            >
              <span className="cart-step-dot" aria-hidden="true">
                {done || (active && status === "paid") ? <Icon.Check /> : null}
              </span>
              <span className="cart-step-label">{s.label}</span>
            </li>
          );
        })}
      </ol>

      {status === "paid" && (
        <div className="cart-ship">
          <Icon.Calendar />
          <div>
            <div className="cart-ship-label">Estimated arrival</div>
            <div className="cart-ship-date">{formatShipDate(shipDate)}</div>
          </div>
        </div>
      )}
    </aside>
  );
}
