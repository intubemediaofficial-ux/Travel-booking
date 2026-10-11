"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

const iso = (d: Date) => new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

export function StayPicker(p: { cin: string; cout: string; rooms: number; guests: number }) {
  const [cin, setCin] = useState(p.cin);
  const [cout, setCout] = useState(p.cout);
  const [rooms, setRooms] = useState(p.rooms);
  const [guests, setGuests] = useState(p.guests);
  const router = useRouter();
  const path = usePathname();
  return (
    <div className="card space-y-3 p-5">
      <h3 className="font-extrabold">Your stay</h3>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Check-in</label><input type="date" className="input" min={iso(new Date())} value={cin} onChange={(e) => { setCin(e.target.value); if (cout <= e.target.value) { const d = new Date(e.target.value); d.setDate(d.getDate() + 1); setCout(d.toISOString().slice(0, 10)); } }} /></div>
        <div><label className="label">Check-out</label><input type="date" className="input" min={cin} value={cout} onChange={(e) => setCout(e.target.value)} /></div>
        <div><label className="label">Rooms</label><input type="number" min={1} max={5} className="input" value={rooms} onChange={(e) => setRooms(Number(e.target.value))} /></div>
        <div><label className="label">Guests</label><input type="number" min={1} max={20} className="input" value={guests} onChange={(e) => setGuests(Number(e.target.value))} /></div>
      </div>
      <button type="button" className="btn-primary w-full" onClick={() => router.push(`${path}?${new URLSearchParams({ in: cin, out: cout, rooms: String(rooms), guests: String(guests) })}#rooms`)}>Update prices</button>
    </div>
  );
}
