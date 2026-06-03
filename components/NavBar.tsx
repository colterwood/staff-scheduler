"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/schedule", label: "Schedule" },
  { href: "/availability", label: "Availability" },
  { href: "/days-off", label: "Days Off" },
  { href: "/profile", label: "Profile" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="flex items-center gap-6 text-sm font-medium">
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
      <button
        onClick={handleLogout}
        className="ml-auto text-gray-400 hover:text-gray-700"
      >
        Log out
      </button>
    </nav>
  );
}
