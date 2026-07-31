/**
 * Fee and payout calculations for resale platforms.
 *
 * Sources:
 * - Depop US/UK: 0% commission + ~3.3% + $0.45 payment processing (2025/2026).
 * - Grailed: 6% commission under $120, 9% at/above $120 + 3.49% + $0.49 Stripe.
 * - Poshmark: $2.95 flat under $15, 20% at/above $15.
 *
 * These formulas are approximations. Always verify current fee schedules
 * before relying on the numbers for real pricing decisions.
 */

export const FEE_CONFIG = {
  depop: {
    id: "depop",
    name: "Depop",
    color: "#ff2300",
    calc: (price) => {
      if (price <= 0) return { commission: 0, payment: 0, total: 0, net: 0, effective: 0 };
      const payment = round(price * 0.033 + 0.45);
      const total = payment;
      const net = round(price - total);
      return {
        commission: 0,
        payment,
        total,
        net,
        effective: round((total / price) * 100),
      };
    },
  },
  grailed: {
    id: "grailed",
    name: "Grailed",
    color: "#000000",
    calc: (price) => {
      if (price <= 0) return { commission: 0, payment: 0, total: 0, net: 0, effective: 0 };
      const commissionRate = price < 120 ? 0.06 : 0.09;
      const commission = round(price * commissionRate);
      const payment = round(price * 0.0349 + 0.49);
      const total = round(commission + payment);
      const net = round(price - total);
      return { commission, payment, total, net, effective: round((total / price) * 100) };
    },
  },
  poshmark: {
    id: "poshmark",
    name: "Poshmark",
    color: "#c41e3a",
    calc: (price) => {
      if (price <= 0) return { commission: 0, payment: 0, total: 0, net: 0, effective: 0 };
      if (price < 15) {
        const total = 2.95;
        const net = round(price - total);
        return { commission: 0, payment: total, total, net, effective: round((total / price) * 100) };
      }
      const total = round(price * 0.2);
      const net = round(price - total);
      return { commission: total, payment: 0, total, net, effective: 20 };
    },
  },
};

function round(n) {
  return Math.round(n * 100) / 100;
}

function parseMoney(input) {
  if (input === null || input === undefined || String(input).trim() === "") return null;
  const cleaned = String(input).replace(/[^0-9.]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function calculatePayouts(priceInput) {
  const price = parseMoney(priceInput);
  if (price === null || Number.isNaN(price)) {
    return null;
  }
  const result = { price };
  for (const key of Object.keys(FEE_CONFIG)) {
    result[key] = FEE_CONFIG[key].calc(price);
  }
  return result;
}

/**
 * Find the list price that yields approximately the target net payout on a
 * given platform. Uses a simple iterative search because some fee schedules
 * (Poshmark flat fee, Grailed tier) are not cleanly invertible.
 */
export function suggestListPrice(targetNetInput, platformId) {
  const targetNet = parseMoney(targetNetInput);
  if (targetNet === null || targetNet < 0 || !FEE_CONFIG[platformId]) return null;

  const calc = FEE_CONFIG[platformId].calc;
  let low = targetNet;
  let high = Math.max(targetNet * 2, 1000);

  // Expand high until the net at high exceeds target.
  let guard = 0;
  while (calc(high).net < targetNet && guard < 50) {
    high *= 2;
    guard++;
  }

  for (let i = 0; i < 60; i++) {
    const mid = round((low + high) / 2);
    if (mid === low || mid === high) break;
    const net = calc(mid).net;
    if (net < targetNet) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const best = calc(high).net >= targetNet ? high : low;
  return {
    targetNet,
    listPrice: best,
    payout: calc(best),
  };
}

// CommonJS fallback for the root test runner.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FEE_CONFIG, calculatePayouts, suggestListPrice };
}
