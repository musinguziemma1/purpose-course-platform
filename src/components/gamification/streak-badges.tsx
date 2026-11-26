"use client";

import * as React from "react";
import { Flame, Trophy, Target, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
  totalActiveDays: number;
}

interface StreakCounterProps {
  streak: StreakData;
  className?: string;
}

export function StreakCounter({ streak, className }: StreakCounterProps) {
  const isActive = streak.lastActivityDate
    ? isToday(streak.lastActivityDate) || isYesterday(streak.lastActivityDate)
    : false;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-lg", className)}>
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Content */}
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-100">
              <Flame className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                Learning Streak
              </span>
            </div>
            
            <div className="mt-4 flex items-baseline gap-2">
              <motion.span
                key={streak.currentStreak}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-serif text-5xl font-bold"
              >
                {streak.currentStreak}
              </motion.span>
              <span className="text-xl font-medium text-amber-100">
                {streak.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>

            <p className="mt-2 text-sm text-amber-100">
              {isActive
                ? streak.currentStreak > 0
                  ? "Keep it going! 🔥"
                  : "Start your streak today!"
                : "Complete a lesson to continue"}
            </p>
          </div>

          {/* Animated Flame Icon */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{
                  scale: 1,
                  rotate: 0,
                  y: [-2, 2, -2],
                }}
                transition={{
                  scale: { duration: 0.5 },
                  y: {
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                  },
                }}
                className="rounded-full bg-white/20 p-4"
              >
                <Flame className="h-8 w-8 fill-current" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
          <div>
            <div className="flex items-center gap-2 text-amber-100">
              <Trophy className="h-4 w-4" />
              <span className="text-xs font-medium">Longest</span>
            </div>
            <p className="mt-1 font-serif text-2xl font-semibold">
              {streak.longestStreak}
            </p>
          </div>
          
          <div>
            <div className="flex items-center gap-2 text-amber-100">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium">Total Days</span>
            </div>
            <p className="mt-1 font-serif text-2xl font-semibold">
              {streak.totalActiveDays}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date | null;
  progress?: number;
  total?: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface BadgeShowcaseProps {
  badges: BadgeData[];
  className?: string;
}

const rarityColors = {
  common: "from-stone-400 to-stone-500",
  rare: "from-blue-400 to-blue-600",
  epic: "from-purple-400 to-purple-600",
  legendary: "from-amber-400 to-amber-600",
};

export function BadgeShowcase({ badges, className }: BadgeShowcaseProps) {
  const [selectedBadge, setSelectedBadge] = React.useState<BadgeData | null>(null);
  const earnedCount = badges.filter((b) => b.earnedAt).length;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-2xl font-semibold text-navy">
            Achievement Badges
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            {earnedCount} of {badges.length} earned
          </p>
        </div>
        
        <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2">
          <Trophy className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-green-700">{earnedCount}</span>
        </div>
      </div>

      {/* Badge Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {badges.map((badge, index) => {
          const isEarned = badge.earnedAt !== null;
          const progress = badge.progress && badge.total
            ? (badge.progress / badge.total) * 100
            : 100;

          return (
            <motion.button
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedBadge(badge)}
              className={cn(
                "group relative overflow-hidden rounded-xl border-2 p-6 text-center transition-all hover:scale-105",
                isEarned
                  ? "border-gold bg-gradient-to-br from-gold/5 to-transparent hover:shadow-xl"
                  : "border-stone-200 bg-stone-50 opacity-60 hover:opacity-100"
              )}
            >
              {/* Badge Icon */}
              <div
                className={cn(
                  "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br text-4xl shadow-lg transition-transform group-hover:scale-110",
                  isEarned ? rarityColors[badge.rarity] : "from-stone-300 to-stone-400"
                )}
              >
                {isEarned ? (
                  badge.icon
                ) : (
                  <span className="text-white">?</span>
                )}
              </div>

              {/* Badge Name */}
              <h4 className={cn("font-semibold", isEarned ? "text-navy" : "text-stone-500")}>
                {isEarned ? badge.name : "???"}
              </h4>

              {/* Progress Bar (for unearned badges) */}
              {!isEarned && badge.progress !== undefined && badge.total !== undefined && (
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold to-gold-dark transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {badge.progress}/{badge.total}
                  </p>
                </div>
              )}

              {/* Earned Indicator */}
              {isEarned && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-2 top-2 rounded-full bg-green-500 p-1"
                >
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </motion.div>
              )}

              {/* Rarity Indicator */}
              {isEarned && (
                <div className="mt-2">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase text-white",
                      `bg-gradient-to-r ${rarityColors[badge.rarity]}`
                    )}
                  >
                    {badge.rarity}
                  </span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>
  );
}

function BadgeDetailModal({
  badge,
  onClose,
}: {
  badge: BadgeData;
  onClose: () => void;
}) {
  const isEarned = badge.earnedAt !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-gold bg-white p-8 text-center shadow-2xl"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-navy"
        >
          ✕
        </button>

        {/* Badge Icon */}
        <div
          className={cn(
            "mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br text-6xl shadow-lg",
            isEarned ? rarityColors[badge.rarity] : "from-stone-300 to-stone-400"
          )}
        >
          {isEarned ? badge.icon : "?"}
        </div>

        {/* Badge Info */}
        <h3 className="font-serif text-2xl font-semibold text-navy">
          {isEarned ? badge.name : "Mystery Badge"}
        </h3>
        
        <div className="mt-2">
          <span
            className={cn(
              "inline-block rounded-full px-3 py-1 text-xs font-bold uppercase text-white",
              `bg-gradient-to-r ${rarityColors[badge.rarity]}`
            )}
          >
            {badge.rarity}
          </span>
        </div>

        <p className="mt-4 leading-relaxed text-stone-600">
          {isEarned ? badge.description : "Complete the requirements to unlock this badge!"}
        </p>

        {isEarned && badge.earnedAt && (
          <div className="mt-6 rounded-lg bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-700">
              Earned on {new Date(badge.earnedAt).toLocaleDateString()}
            </p>
          </div>
        )}

        {!isEarned && badge.progress !== undefined && badge.total !== undefined && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-stone-600">
              <span>Progress</span>
              <span>{badge.progress}/{badge.total}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold to-gold-dark transition-all duration-500"
                style={{ width: `${(badge.progress / badge.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}
