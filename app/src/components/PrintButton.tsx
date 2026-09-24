"use client";
import { Icon } from "./icons";

export function PrintButton({ label = "Export PDF" }: { label?: string }) {
  return (
    <button type="button" className="btn quiet no-print" onClick={() => window.print()}>
      <Icon name="download" />{label}
    </button>
  );
}
