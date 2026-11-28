"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Users, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();

  const navItems: BottomNavItem[] = [
    { label: "Home", href: "/", icon: Home },
    { label: "Learn", href: "/learn", icon: BookOpen },
    { label: "Community", href: "/community", icon: Users },
    { label: "Events", href: "/events", icon: Calendar },
    { label: "Account", href: "/account", icon: User },
  ];

  // Hide bottom nav on certain pages
  const hideOnPages = ["/login", "/sign-in", "/sign-up", "/signup"];
  if (hideOnPages.some((page) => pathname.startsWith(page))) {
    return null;
  }

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur-lg lg:hidden",
        "safe-area-inset-bottom",
        className
      )}
    >
      <ul className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-3 transition-colors",
                  isActive ? "text-navy" : "text-stone-500"
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 transition-all",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    isActive && "font-semibold"
                  )}
                >
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-t-full bg-gold" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
