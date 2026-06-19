// Approximation de Abramowitz & Stegun — précision ±1.5e-7
export function cumulativeNormal(z: number): number {
  const sign = z >= 0 ? 1 : -1;
  const x = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * x);
  const poly =
    t * (0.31938153
    + t * (-0.356563782
    + t * (1.781477937
    + t * (-1.821255978
    + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return sign === 1 ? cdf : 1 - cdf;
}
