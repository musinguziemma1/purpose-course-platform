"use client";

import * as React from "react";
import { Calendar, Heart, Lightbulb, MessageCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

export interface Reflection {
  id: string;
  date: Date;
  /** Absent when a reflection has not been linked to a principle. */
  principle?: "identity" | "source" | "purpose" | "potential" | "destiny";
  title: string;
  content: string;
  mood?: "inspired" | "grateful" | "challenged" | "hopeful";
  tags?: string[];
}

interface ReflectionTimelineProps {
  reflections: Reflection[];
  onReflectionClick?: (reflection: Reflection) => void;
}

const principleColors = {
  identity: { bg: "bg-navy/5", border: "border-navy/20", text: "text-navy" },
  source: { bg: "bg-green-500/5", border: "border-green-500/20", text: "text-green-700" },
  purpose: { bg: "bg-gold/5", border: "border-gold/20", text: "text-gold-dark" },
  potential: { bg: "bg-purple-500/5", border: "border-purple-500/20", text: "text-purple-700" },
  destiny: { bg: "bg-blue-500/5", border: "border-blue-500/20", text: "text-blue-700" },
};
const unassignedColors = { bg: "bg-stone-100", border: "border-stone-200", text: "text-stone-600" };

const moodIcons = {
  inspired: { icon: Sparkles, color: "text-amber-500" },
  grateful: { icon: Heart, color: "text-pink-500" },
  challenged: { icon: Lightbulb, color: "text-orange-500" },
  hopeful: { icon: MessageCircle, color: "text-blue-500" },
};

export function ReflectionTimeline({ reflections, onReflectionClick }: ReflectionTimelineProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const groupedByMonth = React.useMemo(() => {
    const grouped: Record<string, Reflection[]> = {};
    
    reflections.forEach((reflection) => {
      const monthKey = reflection.date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(reflection);
    });

    return grouped;
  }, [reflections]);

  return (
    <div className="relative space-y-12">
      {Object.entries(groupedByMonth).map(([month, monthReflections], monthIndex) => (
        <div key={month} className="relative">
          {/* Month Header */}
          <div className="sticky top-20 z-10 mb-6 flex items-center gap-3 bg-white/80 backdrop-blur-sm py-2">
            <Calendar className="h-5 w-5 text-gold" />
            <h3 className="font-serif text-xl font-semibold text-navy">{month}</h3>
            <div className="flex-1 h-px bg-gradient-to-r from-gold/30 to-transparent" />
            <span className="text-sm text-stone-500">{monthReflections.length} reflections</span>
          </div>

          {/* Reflections */}
          <div className="relative space-y-6 pl-8">
            {/* Vertical Timeline Line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-gold via-gold/50 to-transparent" />

            {monthReflections.map((reflection, index) => {
              const colors = reflection.principle ? principleColors[reflection.principle] : unassignedColors;
              const isSelected = selectedId === reflection.id;

              return (
                <motion.div
                  key={reflection.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (monthIndex * 0.1) + (index * 0.05) }}
                  className="relative"
                >
                  {/* Timeline Dot */}
                  <motion.div
                    className={cn(
                      "absolute -left-8 top-6 h-4 w-4 rounded-full border-4 border-white shadow-sm",
                      colors.bg,
                      "ring-2",
                      colors.border
                    )}
                    whileHover={{ scale: 1.3 }}
                  />

                  {/* Reflection Card */}
                  <motion.button
                    onClick={() => {
                      setSelectedId(isSelected ? null : reflection.id);
                      onReflectionClick?.(reflection);
                    }}
                    className={cn(
                      "group w-full text-left rounded-xl border-2 bg-white p-5 transition-all hover:shadow-lg",
                      isSelected
                        ? "border-gold shadow-lg"
                        : colors.border,
                      "hover:scale-[1.01] active:scale-[0.99]"
                    )}
                    whileHover={{ y: -2 }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {reflection.principle ? (
                            <span
                              className={cn(
                                "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                                colors.bg,
                                colors.text
                              )}
                            >
                              {reflection.principle}
                            </span>
                          ) : null}
                          {reflection.mood && (
                            <div className="flex items-center gap-1">
                              {React.createElement(moodIcons[reflection.mood].icon, {
                                className: cn("h-4 w-4", moodIcons[reflection.mood].color),
                              })}
                            </div>
                          )}
                        </div>
                        <h4 className="font-serif text-lg font-semibold text-navy group-hover:text-gold-dark transition-colors">
                          {reflection.title}
                        </h4>
                      </div>
                      <time className="shrink-0 text-xs text-stone-500">
                        {formatDate(reflection.date, "short")}
                      </time>
                    </div>

                    {/* Content Preview */}
                    <p
                      className={cn(
                        "mt-3 text-sm leading-relaxed text-stone-600 transition-all",
                        isSelected ? "" : "line-clamp-2"
                      )}
                    >
                      {reflection.content}
                    </p>

                    {/* Tags */}
                    {reflection.tags && reflection.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {reflection.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Expand Indicator */}
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-gold-dark opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>{isSelected ? "Show less" : "Read more"}</span>
                      <motion.div
                        animate={{ x: isSelected ? 0 : [0, 4, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        →
                      </motion.div>
                    </div>
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}

      {reflections.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-12 text-center">
          <MessageCircle className="mx-auto h-12 w-12 text-stone-400 mb-4" />
          <h3 className="font-serif text-xl font-semibold text-stone-600 mb-2">
            No reflections yet
          </h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto">
            Start your journey by reflecting on your experiences, insights, and growth.
          </p>
        </div>
      )}
    </div>
  );
}
