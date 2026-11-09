import type { Currency } from "@deone/contracts";

export const COUNTRY: Record<Currency, { name: string; flag: string }> = {
  BOB: { name: "Bolivia", flag: "flag-bo" },
  COP: { name: "Colombia", flag: "flag-co" },
};

const bob = new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cop = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

export function Money({ minor, currency, signed = false }: { minor: number; currency: Currency; signed?: boolean }) {
  const sign = minor < 0 ? "− " : signed ? "+ " : "";
  const formatted = (currency === "BOB" ? bob : cop).format(Math.abs(minor) / 100);
  return (
    <span className="money">
      {sign}<span className="money-unit">{currency === "BOB" ? "Bs" : "$"}</span>{" "}
      <span className="money-number">{formatted}</span>
      {currency === "COP" && <> <span className="money-unit">COP</span></>}
    </span>
  );
}
