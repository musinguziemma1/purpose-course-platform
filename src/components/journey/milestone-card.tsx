"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle2, Clock, Flag, Target, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

export interface Milestone {
  id: string;
  title: string;
  description: string;
  type: "assessment" | "course" | "reflection" | "certificate" | "goal" | "profile";
  completedAt: Date | null;
  dueDate?: Date;
  progress?: number;
  relatedContent?: string;
  /** Where to act on an open milestone; shown as a "Start" link until it is completed. */
  href?: string;
}

interface MilestoneCardProps {
  milestone: Milestone;
  index: number;
  variant?: "compact" | "expanded";
}

const typeConfig = {
  assessment: {
    icon: Target,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
  },
  course: {
    icon: CheckCircle2,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
  },
  reflection: {
    icon: Clock,
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
  certificate: {
    icon: CheckCircle2,
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
  },
  goal: {
    icon: Flag,
    color: "from-rose-500 to-rose-600",
    bgColor: "bg-rose-50",
    textColor: "text-rose-700",
    borderColor: "border-rose-200",
  },
  profile: {
    icon: UserRound,
    color: "from-teal-500 to-teal-600",
    bgColor: "bg-teal-50",
    textColor: "text-teal-700",
    borderColor: "border-teal-200",
  },
};

export function MilestoneCard({ milestone, index, variant = "expanded" }: MilestoneCardProps) {
  const config = typeConfig[milestone.type];
  const Icon = config.icon;
  const isCompleted = milestone.completedAt !== null;

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className={cn(
          "flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-md",
          isCompleted ? "bg-white border-green-200" : "bg-stone-50 border-stone-200"
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            isCompleted ? "bg-green-100" : config.bgColor
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Icon className={cn("h-5 w-5", config.textColor)} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className={cn("truncate font-semibold text-sm", isCompleted && "line-through text-stone-500")}>
            {milestone.title}
          </h4>
          {milestone.completedAt && (
            <p className="text-xs text-green-600">
              Completed {formatDate(milestone.completedAt, "short")}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "group relative overflow-hidden rounded-xl border-2 bg-white p-6 shadow-lg transition-all hover:shadow-xl",
        isCompleted ? "border-green-200" : config.borderColor
      )}
    >
      {/* Background Decoration */}
      <div className="absolute right-0 top-0 h-32 w-32 opacity-5">
        <div
          className={cn("h-full w-full rounded-full bg-gradient-to-br", config.color)}
          style={{ transform: "translate(25%, -25%)" }}
        />
      </div>

      {/* Header */}
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
              isCompleted ? "bg-green-100" : config.bgColor
            )}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <Icon className={cn("h-6 w-6", config.textColor)} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "font-serif text-lg font-semibold text-navy",
                isCompleted && "line-through text-stone-500"
              )}
            >
              {milestone.title}
            </h3>
            <p className="mt-1 text-sm capitalize text-stone-500">{milestone.type}</p>
          </div>
        </div>

        {isCompleted && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="shrink-0"
          >
            <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Complete
            </div>
          </motion.div>
        )}
      </div>

      {/* Description */}
      <p className="relative mt-4 text-sm leading-relaxed text-stone-600">
        {milestone.description}
      </p>

      {/* Progress Bar (if applicable) */}
      {!isCompleted && milestone.progress !== undefined && (
        <div className="relative mt-4">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Progress</span>
            <span className="font-semibold">{milestone.progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${milestone.progress}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className={cn("h-full rounded-full bg-gradient-to-r", config.color)}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="relative mt-4 flex items-center gap-4 border-t border-stone-100 pt-4 text-xs text-stone-500">
        {milestone.completedAt ? (
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>Completed {formatDate(milestone.completedAt, "short")}</span>
          </div>
        ) : milestone.dueDate ? (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Due {formatDate(milestone.dueDate, "short")}</span>
          </div>
        ) : null}

        {milestone.relatedContent && (
          <span className="ml-auto text-gold-dark">{milestone.relatedContent}</span>
        )}
        {!isCompleted && milestone.href ? (
          <Link
            href={milestone.href}
            className={cn("inline-flex min-h-10 items-center gap-1 font-semibold text-navy hover:text-gold-dark", !milestone.relatedContent && "ml-auto")}
          >
            Start <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
    </motion.div>
  );
}

interface MilestoneListProps {
  milestones: Milestone[];
  variant?: "compact" | "expanded";
  className?: string;
}

export function MilestoneList({ milestones, variant = "expanded", className }: MilestoneListProps) {
  return (
    <div
      className={cn(
        "space-y-4",
        variant === "compact" && "space-y-2",
        className
      )}
    >
      {milestones.map((milestone, index) => (
        <MilestoneCard
          key={milestone.id}
          milestone={milestone}
          index={index}
          variant={variant}
        />
      ))}
    </div>
  );
}
