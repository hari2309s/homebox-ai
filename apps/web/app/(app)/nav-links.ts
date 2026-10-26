export interface NavLink {
  href: string;
  label: string;
  icon: string;
}

export const HOME_LINK: NavLink = { href: "/", label: "Plan", icon: "map" };
export const ITEMS_LINK: NavLink = { href: "/items", label: "Things", icon: "inventory_2" };
export const CHAT_LINK: NavLink = { href: "/chat", label: "Ask", icon: "forum" };
export const SEASONS_LINK: NavLink = { href: "/calendar", label: "Seasons", icon: "yard" };

export const PRIMARY_LINKS = [HOME_LINK, ITEMS_LINK, CHAT_LINK, SEASONS_LINK];

export const TOOL_LINKS: NavLink[] = [
  { href: "/locations", label: "Places", icon: "location_on" },
  { href: "/labels", label: "Labels", icon: "sell" },
  { href: "/capture", label: "Capture", icon: "photo_camera" },
  { href: "/receipts", label: "Receipts", icon: "receipt_long" },
  { href: "/scan", label: "Scan", icon: "barcode_scanner" },
  { href: "/maintenance", label: "Maintain", icon: "build" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
