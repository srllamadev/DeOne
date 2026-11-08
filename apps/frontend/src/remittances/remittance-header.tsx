import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import styles from "./remittance.module.css";

export function RemittanceHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerBar}>
        <Link href="/" className="text-link"><ArrowLeft size={18} aria-hidden /> Inicio</Link>
        <span className="demo-badge">Modo demo</span>
      </div>
      <h1>{title}</h1>
      <p className="muted">{subtitle}</p>
    </header>
  );
}
