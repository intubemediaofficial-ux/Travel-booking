"use client";

export function DeleteButton({ label = "Delete" }: { label?: string }) {
  return <button className="btn-danger" onClick={(e) => { if (!window.confirm("Delete permanently? This cannot be undone.")) e.preventDefault(); }}>{label}</button>;
}
