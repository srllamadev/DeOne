import "@fontsource-variable/roboto-condensed";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { BottomNav } from "../src/wallet/bottom-nav";
import "../src/styles/globals.css";

export const metadata: Metadata = {
  title: "DeOne · Wallet de remesas",
  description: "Demo de remesas entre Bolivia y Colombia.",
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#0D0D0D" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="app-shell">
          <main className="main-content">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
