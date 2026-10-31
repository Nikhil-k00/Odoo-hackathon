/** Generated artwork for the dark promo tile: lime orbit rings around a billing "pulse". */
export function PromoArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 220" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e4f77e" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#e4f77e" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#e4f77e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="110" cy="110" r="105" fill="url(#glow)" />
      <g fill="none" stroke="#e4f77e" strokeOpacity="0.35">
        <circle cx="110" cy="110" r="78" strokeDasharray="3 6" />
        <circle cx="110" cy="110" r="56" />
        <circle cx="110" cy="110" r="34" strokeOpacity="0.6" />
      </g>
      <g stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1">
        <path d="M110 32v12M110 176v12M32 110h12M176 110h12" />
      </g>
      <circle cx="110" cy="110" r="14" fill="#e4f77e" />
      <path d="M103 110h5l3-6 4 12 3-6h5" fill="none" stroke="#141414" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <g fill="#e4f77e">
        <circle cx="166" cy="110" r="4" />
        <circle cx="110" cy="54" r="3" />
        <circle cx="70" cy="149" r="3" />
      </g>
      <g fill="#ffffff" fillOpacity="0.8">
        <circle cx="48" cy="72" r="1.5" />
        <circle cx="178" cy="60" r="1.5" />
        <circle cx="160" cy="170" r="1.5" />
        <circle cx="60" cy="178" r="1.5" />
      </g>
    </svg>
  );
}
