"use client";

import { House, Layers, List, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const path = usePathname();
  const links = [
    { href: "/", label: "Inicio", Icon: House },
    { href: null, label: "Servicios", Icon: Layers },
    { href: "/movimientos", label: "Movimientos", Icon: List },
    { href: "/mas", label: "Más", Icon: LayoutGrid },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {links.map(({ href, label, Icon }) => href ? (
        <Link className="nav-item" href={href} key={label} aria-current={path === href ? "page" : undefined}>
          <Icon aria-hidden size={25} /><span>{label}</span>
        </Link>
      ) : (
        <span className="nav-item unavailable" aria-disabled="true" key={label}>
          <Icon aria-hidden size={25} /><span>{label}</span>
        </span>
      ))}
    </nav>
  );
}
