"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, BookOpen, Users, Calendar, MessageSquare, User, LogOut, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface MobileNavProps {
  user?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close the menu when the route changes. Adjusting state during render (not in an
  // effect) avoids a second, cascading render; same pattern as WorkspaceShell.
  const [previousPathname, setPreviousPathname] = React.useState(pathname);
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setOpen(false);
  }

  // Prevent body scroll when menu is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navItems: NavItem[] = user
    ? [
        { label: "Home", href: "/", icon: Home },
        { label: "Learn", href: "/learn", icon: BookOpen },
        { label: "Community", href: "/community", icon: Users },
        { label: "Events", href: "/events", icon: Calendar },
        { label: "Blog", href: "/blog", icon: MessageSquare },
      ]
    : [
        { label: "Home", href: "/", icon: Home },
        { label: "About", href: "/about", icon: Users },
        { label: "Events", href: "/events", icon: Calendar },
        { label: "Blog", href: "/blog", icon: MessageSquare },
      ];

  return (
    <>
      {/* Menu Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden relative z-50 rounded-lg p-2 text-navy transition-colors hover:bg-stone-100"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Menu className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-navy/80 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Slide-out Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-y-0 left-0 z-40 w-full max-w-sm bg-white shadow-2xl lg:hidden"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="border-b border-stone-200 p-6">
                {user ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-lg font-semibold text-white">
                      {user.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-navy">{user.name}</p>
                      <p className="truncate text-sm text-stone-500">{user.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link
                      href="/sign-in"
                      className="block rounded-xl bg-navy px-6 py-3 text-center font-semibold text-white transition-all hover:bg-navy/90"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="block rounded-xl border-2 border-navy px-6 py-3 text-center font-semibold text-navy transition-all hover:bg-navy/5"
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 overflow-y-auto px-4 py-6">
                <ul className="space-y-2">
                  {navItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                    return (
                      <motion.li
                        key={item.href}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          href={item.href}
                          className={cn(
                            "group flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition-all",
                            isActive
                              ? "bg-navy text-white"
                              : "text-stone-700 hover:bg-stone-100"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="flex-1">{item.label}</span>
                          {item.badge !== undefined && (
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-xs font-bold",
                                isActive
                                  ? "bg-white text-navy"
                                  : "bg-gold text-white"
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>

                {/* Divider */}
                {user && (
                  <>
                    <div className="my-6 h-px bg-stone-200" />

                    {/* User Menu Items */}
                    <ul className="space-y-2">
                      <li>
                        <Link
                          href="/account"
                          className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-stone-700 transition-all hover:bg-stone-100"
                        >
                          <User className="h-5 w-5" />
                          <span>Account</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/account/settings"
                          className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-stone-700 transition-all hover:bg-stone-100"
                        >
                          <Settings className="h-5 w-5" />
                          <span>Settings</span>
                        </Link>
                      </li>
                      <li>
                        <form action="/api/auth/logout" method="POST">
                          <button
                            type="submit"
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-semibold text-red-600 transition-all hover:bg-red-50"
                          >
                            <LogOut className="h-5 w-5" />
                            <span>Sign Out</span>
                          </button>
                        </form>
                      </li>
                    </ul>
                  </>
                )}
              </nav>

              {/* Footer */}
              <div className="border-t border-stone-200 p-6">
                <p className="text-center text-xs text-stone-500">
                  © {new Date().getFullYear()} Purpose Course
                  <br />
                  All rights reserved
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
