import React from "react";

const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24" };

export const IconGrid = (p) => (
  <svg {...common} {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);
export const IconUsers = (p) => (
  <svg {...common} {...p}><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" /><circle cx="17.5" cy="8.5" r="2.6" /><path d="M15.8 14.3c2.9.4 5.2 2.5 5.2 5.7" /></svg>
);
export const IconBuilding = (p) => (
  <svg {...common} {...p}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" /><path d="M9 21v-4h6v4" /></svg>
);
export const IconClock = (p) => (
  <svg {...common} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></svg>
);
export const IconCalendarOff = (p) => (
  <svg {...common} {...p}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v3M16 3v3" /><path d="m9 14 6 6M15 14l-6 6" /></svg>
);
export const IconWallet = (p) => (
  <svg {...common} {...p}><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v2" /><rect x="3" y="7.5" width="18" height="12" rx="2" /><circle cx="16.5" cy="13.5" r="1.4" /></svg>
);
export const IconReceipt = (p) => (
  <svg {...common} {...p}><path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
);
export const IconUser = (p) => (
  <svg {...common} {...p}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" /></svg>
);
export const IconSettings = (p) => (
  <svg {...common} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.5-2-3.4-2.3.7a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.4 2.3a7.6 7.6 0 0 0-2.6 1.5l-2.3-.7-2 3.4L4.6 10a7.6 7.6 0 0 0 0 3l-1.9 1.6 2 3.4 2.3-.7c.75.66 1.63 1.17 2.6 1.5L10 22h4l.4-2.3a7.6 7.6 0 0 0 2.6-1.5l2.3.7 2-3.4-1.9-1.6Z" /></svg>
);
export const IconLogout = (p) => (
  <svg {...common} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>
);
export const IconMenu = (p) => (
  <svg {...common} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const IconBell = (p) => (
  <svg {...common} {...p}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
);
export const IconChevronDown = (p) => (
  <svg {...common} {...p}><path d="m6 9 6 6 6-6" /></svg>
);
export const IconSearch = (p) => (
  <svg {...common} {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);
export const IconPlus = (p) => (
  <svg {...common} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconDownload = (p) => (
  <svg {...common} {...p}><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
);
export const IconEdit = (p) => (
  <svg {...common} {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
export const IconTrash = (p) => (
  <svg {...common} {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></svg>
);
export const IconCheck = (p) => (
  <svg {...common} {...p}><path d="M20 6 9 17l-5-5" /></svg>
);
export const IconX = (p) => (
  <svg {...common} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
