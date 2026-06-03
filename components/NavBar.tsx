"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/schedule", label: "Schedule" },
  { href: "/availability", label: "Availability" },
  { href: "/days-off", label: "Days Off" },
  { href: "/profile", label: "Profile" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6 border-b border-gray-300 pb-4 text-sm font-medium">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            pathname === link.href
              ? "text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
