"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/templates", label: "Shift Templates" },
  { href: "/admin/time-off", label: "Time Off" },
  { href: "/admin/schedule", label: "Schedule" },
];

export default function AdminNavBar() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6 text-sm font-medium">
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
