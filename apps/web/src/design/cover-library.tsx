/** Eight original cover plates. A site always maps to the same plate. */

import type { ReactNode } from 'react';

function Plate({ children }: { children: ReactNode }) {
  return (
    <svg className="plate" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {children}
    </svg>
  );
}

const PLATES = [
  function Aurora() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#1B1464" />
        <circle cx="156" cy="44" r="86" fill="#22D3EE" />
        <circle cx="48" cy="168" r="96" fill="#34D399" opacity="0.9" />
        <circle cx="118" cy="108" r="48" fill="#F472B6" />
      </Plate>
    );
  },
  function Tide() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#042F2E" />
        <circle cx="170" cy="30" r="80" fill="#2DD4BF" />
        <circle cx="24" cy="176" r="100" fill="#2563EB" />
        <circle cx="108" cy="116" r="36" fill="#FDE047" />
      </Plate>
    );
  },
  function Orchid() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#4A044E" />
        <circle cx="40" cy="40" r="78" fill="#FB7185" />
        <circle cx="168" cy="150" r="92" fill="#A78BFA" />
        <circle cx="100" cy="110" r="34" fill="#FDE68A" />
      </Plate>
    );
  },
  function Citrus() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#7C2D12" />
        <circle cx="150" cy="36" r="90" fill="#FB923C" />
        <circle cx="36" cy="160" r="88" fill="#F43F5E" />
        <circle cx="112" cy="120" r="42" fill="#FACC15" />
      </Plate>
    );
  },
  function Lagoon() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#082F49" />
        <circle cx="30" cy="50" r="70" fill="#38BDF8" />
        <circle cx="160" cy="170" r="100" fill="#14B8A6" />
        <circle cx="120" cy="70" r="36" fill="#E879F9" />
      </Plate>
    );
  },
  function Ember() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#450A0A" />
        <circle cx="160" cy="160" r="110" fill="#F97316" />
        <circle cx="40" cy="40" r="72" fill="#FBBF24" />
        <circle cx="90" cy="130" r="28" fill="#FEF3C7" />
      </Plate>
    );
  },
  function Neon() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#0B1020" />
        <circle cx="46" cy="150" r="80" fill="#22D3EE" />
        <circle cx="160" cy="48" r="76" fill="#E879F9" />
        <circle cx="110" cy="120" r="30" fill="#F9A8D4" />
      </Plate>
    );
  },
  function Meadow() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#14532D" />
        <circle cx="160" cy="40" r="84" fill="#A3E635" />
        <circle cx="30" cy="170" r="90" fill="#059669" />
        <circle cx="100" cy="100" r="38" fill="#FDE047" />
      </Plate>
    );
  },
];

export function coverIndex(name: string) {
  let n = 0;
  for (const c of name || 'LL') n = (n * 33 + c.charCodeAt(0)) >>> 0;
  return n % PLATES.length;
}

export function CoverPlate({ name }: { name: string }) {
  const PlateArt = PLATES[coverIndex(name)];
  return <PlateArt />;
}
