type Props = { className?: string }

const base = 'h-4 w-4 shrink-0'

function Svg({ children, className }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? base}
    >
      {children}
    </svg>
  )
}

export const Icon = {
  home: (p: Props) => (
    <Svg {...p}>
      <path d="M2 6.8 8 2l6 4.8V14H2z" />
      <path d="M6.2 14V9.4h3.6V14" />
    </Svg>
  ),
  calendar: (p: Props) => (
    <Svg {...p}>
      <rect x="2" y="3.2" width="12" height="10.8" rx="1.2" />
      <path d="M2 6.4h12M5.4 2v2.4M10.6 2v2.4" />
    </Svg>
  ),
  pen: (p: Props) => (
    <Svg {...p}>
      <path d="M10.6 2.6 13.4 5.4 5.8 13H3v-2.8z" />
      <path d="M9.2 4l2.8 2.8" />
    </Svg>
  ),
  check: (p: Props) => (
    <Svg {...p}>
      <path d="M2.4 8.6 6 12.2l7.6-8" />
    </Svg>
  ),
  users: (p: Props) => (
    <Svg {...p}>
      <circle cx="6" cy="5.4" r="2.4" />
      <path d="M1.6 13.4c0-2.3 2-3.8 4.4-3.8s4.4 1.5 4.4 3.8" />
      <path d="M11 3.4a2.3 2.3 0 0 1 0 4.4M12.2 9.9c1.4.5 2.2 1.7 2.2 3.5" />
    </Svg>
  ),
  file: (p: Props) => (
    <Svg {...p}>
      <path d="M9 1.8H4.2a1 1 0 0 0-1 1v10.4a1 1 0 0 0 1 1h7.6a1 1 0 0 0 1-1V5.6z" />
      <path d="M9 1.8v3.8h3.8M5.6 8.6h4.8M5.6 11h3.2" />
    </Svg>
  ),
  clipboard: (p: Props) => (
    <Svg {...p}>
      <path d="M5.6 3H4.2a1 1 0 0 0-1 1v9.2a1 1 0 0 0 1 1h7.6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-1.4" />
      <rect x="5.6" y="1.8" width="4.8" height="2.4" rx=".7" />
      <path d="M5.8 8h4.4M5.8 10.6h3" />
    </Svg>
  ),
  talk: (p: Props) => (
    <Svg {...p}>
      <path d="M13.6 9.4a1.4 1.4 0 0 1-1.4 1.4H5.4L2.4 13.6V3.6a1.4 1.4 0 0 1 1.4-1.4h8.4a1.4 1.4 0 0 1 1.4 1.4z" />
      <path d="M5.4 5.8h5.2M5.4 8h3.4" />
    </Svg>
  ),
  clock: (p: Props) => (
    <Svg {...p}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.6V8l2.4 1.6" />
    </Svg>
  ),
  chart: (p: Props) => (
    <Svg {...p}>
      <path d="M2.2 13.4h11.6" />
      <path d="M4.4 13.4V8M8 13.4V3.6M11.6 13.4V6.4" />
    </Svg>
  ),
  yen: (p: Props) => (
    <Svg {...p}>
      <path d="M4.4 2.4 8 7.6l3.6-5.2" />
      <path d="M8 7.6v6M5 8.6h6M5 11h6" />
    </Svg>
  ),
  gear: (p: Props) => (
    <Svg {...p}>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.6l.9 1.7 1.9-.3.5 1.8 1.7.9-.9 1.7.9 1.7-1.7.9-.5 1.8-1.9-.3L8 14.4l-.9-1.7-1.9.3-.5-1.8-1.7-.9.9-1.7-.9-1.7 1.7-.9.5-1.8 1.9.3z" />
    </Svg>
  ),
  mic: (p: Props) => (
    <Svg {...p}>
      <rect x="6" y="1.6" width="4" height="7.6" rx="2" />
      <path d="M3.6 7.6a4.4 4.4 0 0 0 8.8 0M8 12v2.4" />
    </Svg>
  ),
  plus: (p: Props) => (
    <Svg {...p}>
      <path d="M8 3.2v9.6M3.2 8h9.6" />
    </Svg>
  ),
  left: (p: Props) => (
    <Svg {...p}>
      <path d="M10 3 5 8l5 5" />
    </Svg>
  ),
  right: (p: Props) => (
    <Svg {...p}>
      <path d="M6 3l5 5-5 5" />
    </Svg>
  ),
  print: (p: Props) => (
    <Svg {...p}>
      <path d="M4.4 6V2.4h7.2V6" />
      <rect x="2" y="6" width="12" height="5" rx="1" />
      <path d="M4.4 9.6h7.2v4H4.4z" />
    </Svg>
  ),
  out: (p: Props) => (
    <Svg {...p}>
      <path d="M6.2 14H3.4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h2.8" />
      <path d="M10.4 11 13.6 8l-3.2-3M13.6 8H6.4" />
    </Svg>
  ),
  search: (p: Props) => (
    <Svg {...p}>
      <circle cx="7" cy="7" r="4.4" />
      <path d="M10.2 10.2 14 14" />
    </Svg>
  ),
  badge: (p: Props) => (
    <Svg {...p}>
      <rect x="2" y="3.6" width="12" height="9.4" rx="1.2" />
      <circle cx="6" cy="7.4" r="1.5" />
      <path d="M3.6 11.4c0-1.2 1.1-2 2.4-2s2.4.8 2.4 2M10.4 6.6h2.2M10.4 9h2.2" />
    </Svg>
  ),
  warn: (p: Props) => (
    <Svg {...p}>
      <path d="M8 2.4 14.4 13.6H1.6z" />
      <path d="M8 6.4v3.2M8 11.6v.1" />
    </Svg>
  ),
}
