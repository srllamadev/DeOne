"use client";

import { House, Layers, List, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useState } from "react";

export function BottomNav() {
  const path = usePathname();

  const [toast, setToast] = useState("");

  function handleUnavailable(label: string) {
    setToast(`${label}: Próximamente disponible`);
    setTimeout(() => setToast(""), 3000);
  }


  const links = [
    { href: "/", label: "Inicio", Icon: House },
    { href: "/servicios", label: "Servicios", Icon: Layers },
    { href: "/movimientos", label: "Movimientos", Icon: List },
    { href: "/mas", label: "Más", Icon: LayoutGrid },
  ];

  return (
    <>
      {toast && (
        <div className="nav-toast active-toast" role="status">
          {toast}
        </div>
      )}
      <nav className="bottom-nav" aria-label="Navegación principal">
        {links.map(({ href, label, Icon }) => href ? (
          <Link className="nav-item" href={href} key={label} aria-current={path === href ? "page" : undefined}>
            <Icon aria-hidden size={25} /><span>{label}</span>
          </Link>
        ) : (
          <button
            type="button"
            className="nav-item unavailable"
            aria-disabled="true"
            key={label}
            onClick={() => handleUnavailable(label)}
          >
            <Icon aria-hidden size={25} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  );

}
