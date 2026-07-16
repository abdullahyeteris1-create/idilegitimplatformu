import type { SVGProps } from "react";

export type IconName =
  | "activity" | "arrow" | "badge" | "bell" | "book" | "bookOpen" | "brain"
  | "chart" | "checkbox" | "circle" | "clock" | "eye" | "flame" | "gauge"
  | "grid" | "help" | "home" | "house" | "medal" | "menu" | "moon"
  | "puzzle" | "rocket" | "settings" | "sparkles" | "target" | "type" | "user";

const paths: Record<IconName, React.ReactNode> = {
  activity: <path d="M3 12h4l2-7 4 14 2-7h6" />,
  arrow: <path d="m9 18 6-6-6-6" />,
  badge: <><path d="M12 3 5 6v5c0 5 3.5 8 7 10 3.5-2 7-5 7-10V6l-7-3Z"/><path d="m9.5 12 1.7 1.7 3.6-4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  book: <><path d="M4 5a3 3 0 0 1 3-2h4v16H7a3 3 0 0 0-3 2Z"/><path d="M20 5a3 3 0 0 0-3-2h-4v16h4a3 3 0 0 1 3 2Z"/></>,
  bookOpen: <><path d="M2 4h6a4 4 0 0 1 4 4v13a4 4 0 0 0-4-4H2Z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a4 4 0 0 1 4-4h6Z"/></>,
  brain: <><path d="M9.5 4A3 3 0 0 0 4 6v2a3 3 0 0 0 0 6v1a4 4 0 0 0 6 3.5"/><path d="M14.5 4A3 3 0 0 1 20 6v2a3 3 0 0 1 0 6v1a4 4 0 0 1-6 3.5M12 3v18"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  checkbox: <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 3 3 5-6"/></>,
  circle: <circle cx="12" cy="12" r="8" />,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  flame: <path d="M12 22c4 0 7-3 7-7 0-3-2-6-5-9 0 3-2 4-3 5 0-3-1-6-3-8 0 5-3 7-3 12 0 4 3 7 7 7Z" />,
  gauge: <><path d="M4 18a9 9 0 1 1 16 0"/><path d="m12 15 4-5"/><path d="M7 18h10"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.2 2.4c-.7.3-.7.8-.7 1.6M12 17h.01"/></>,
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  house: <><path d="m4 10 8-7 8 7v10H4Z"/><path d="M9 20v-6h6v6"/></>,
  medal: <><circle cx="12" cy="14" r="5"/><path d="m8 3 4 6 4-6M9 14l2 2 4-4"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  moon: <path d="M20 15a8 8 0 0 1-11-11 9 9 0 1 0 11 11Z" />,
  puzzle: <path d="M8 3h4v4a2 2 0 1 0 4 0V3h5v6h-3a2 2 0 1 0 0 4h3v8h-8v-3a2 2 0 1 0-4 0v3H3v-6h3a2 2 0 1 0 0-4H3V3Z" />,
  rocket: <><path d="M14 5c3-3 6-2 6-2s1 3-2 6l-5 5-4-4Z"/><path d="m9 10-4 1-2 3 6 1M14 15l-1 4-3 2-1-6M15 8h.01"/><path d="M5 19c1-3 3-3 4-4-1 3-1 5-4 4Z"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.8-1.8.9-1.9-2.2-2.2-1.9.9-1.8-.8-.7-2h-3l-.7 2-1.8.8-1.9-.9L1 6.1 2 8l-.8 1.8-2 .7v3l2 .7L2 16l-.9 1.9 2.2 2.2 1.9-.9 1.8.8.7 2h3l.7-2 1.8-.8 1.9.9 2.2-2.2-.9-1.9.8-1.8Z"/></>,
  sparkles: <><path d="m12 2 1.3 4.7L18 8l-4.7 1.3L12 14l-1.3-4.7L6 8l4.7-1.3ZM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7Z"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  type: <><path d="M5 5h14M12 5v14M8 19h8"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
