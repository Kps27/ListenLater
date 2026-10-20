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
        <rect width="200" height="200" fill="#14122A" />
        <circle cx="156" cy="44" r="86" fill="#6A5AE0" />
        <circle cx="48" cy="168" r="96" fill="#2C3A6E" />
        <circle cx="118" cy="108" r="48" fill="#C9B8FF" />
      </Plate>
    );
  },
  function Tide() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#101828" />
        <circle cx="170" cy="30" r="80" fill="#7D8CDB" />
        <circle cx="24" cy="176" r="100" fill="#243056" />
        <circle cx="108" cy="116" r="36" fill="#D5CBF5" />
      </Plate>
    );
  },
  function Orchid() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#1C1430" />
        <circle cx="40" cy="40" r="78" fill="#8E74C8" />
        <circle cx="168" cy="150" r="92" fill="#4E3F86" />
        <circle cx="100" cy="110" r="34" fill="#E6DDF8" />
      </Plate>
    );
  },
  function Citrus() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#1A1230" />
        <circle cx="150" cy="36" r="90" fill="#6B56D0" />
        <circle cx="36" cy="160" r="88" fill="#3A2E6A" />
        <circle cx="112" cy="120" r="42" fill="#EDE7FF" />
      </Plate>
    );
  },
  function Lagoon() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#12182C" />
        <circle cx="30" cy="50" r="70" fill="#5C6AAD" />
        <circle cx="160" cy="170" r="100" fill="#2A3358" />
        <circle cx="120" cy="70" r="36" fill="#B7A6EE" />
      </Plate>
    );
  },
  function Ember() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#1E1634" />
        <circle cx="160" cy="160" r="110" fill="#5A48C0" />
        <circle cx="40" cy="40" r="72" fill="#A898D8" />
        <circle cx="90" cy="130" r="28" fill="#F2EDFF" />
      </Plate>
    );
  },
  function Neon() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#0E1018" />
        <circle cx="46" cy="150" r="80" fill="#4A42B0" />
        <circle cx="160" cy="48" r="76" fill="#7C6BFF" />
        <circle cx="110" cy="120" r="30" fill="#C4B5FF" />
      </Plate>
    );
  },
  function Meadow() {
    return (
      <Plate>
        <rect width="200" height="200" fill="#15182A" />
        <circle cx="160" cy="40" r="84" fill="#8B7ED4" />
        <circle cx="30" cy="170" r="90" fill="#2E3A62" />
        <circle cx="100" cy="100" r="38" fill="#D9D0F5" />
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
