"use client";

import * as React from "react";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CircularProgress } from "@/components/ui/progress";

interface JourneyStage {
  id: string;
  name: string;
  question: string;
  color: string;
  icon: React.ReactNode;
  progress: number;
  status: "completed" | "current" | "locked";
  completedModules: number;
  totalModules: number;
  description: string;
}

interface JourneyTimelineProps {
  stages: JourneyStage[];
  currentStageId: string;
  onStageClick?: (stageId: string) => void;
}

export function JourneyTimeline({ stages, currentStageId, onStageClick }: JourneyTimelineProps) {
  return (
    <div className="relative">
      {/* Desktop: Horizontal Timeline */}
      <div className="hidden lg:block">
        <HorizontalTimeline stages={stages} currentStageId={currentStageId} onStageClick={onStageClick} />
      </div>

      {/* Mobile: Vertical Timeline */}
      <div className="lg:hidden">
        <VerticalTimeline stages={stages} currentStageId={currentStageId} onStageClick={onStageClick} />
      </div>
    </div>
  );
}

function HorizontalTimeline({ stages, currentStageId, onStageClick }: JourneyTimelineProps) {
  return (
    <div className="relative py-12">
      {/* Connection Line */}
      <div className="absolute left-0 right-0 top-20 h-0.5 bg-gradient-to-r from-stone-200 via-gold/30 to-stone-200" />
      
      <div className="grid grid-cols-5 gap-4">
        {stages.map((stage, index) => (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            <StageCard
              stage={stage}
              isActive={stage.id === currentStageId}
              onClick={() => onStageClick?.(stage.id)}
              orientation="vertical"
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function VerticalTimeline({ stages, currentStageId, onStageClick }: JourneyTimelineProps) {
  return (
    <div className="relative space-y-6 py-8">
      {/* Vertical Connection Line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-stone-200 via-gold/30 to-stone-200" />
      
      {stages.map((stage, index) => (
        <motion.div
          key={stage.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative"
        >
          <StageCard
            stage={stage}
            isActive={stage.id === currentStageId}
            onClick={() => onStageClick?.(stage.id)}
            orientation="horizontal"
          />
        </motion.div>
      ))}
    </div>
  );
}

interface StageCardProps {
  stage: JourneyStage;
  isActive: boolean;
  onClick: () => void;
  orientation: "vertical" | "horizontal";
}

function StageCard({ stage, isActive, onClick, orientation }: StageCardProps) {
  const isCompleted = stage.status === "completed";
  const isLocked = stage.status === "locked";

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={cn(
        "group relative w-full text-left transition-all duration-300",
        isLocked && "cursor-not-allowed opacity-60",
        !isLocked && "hover:scale-[1.02] active:scale-[0.98]"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 bg-white p-6 shadow-lg transition-all",
          isActive
            ? "border-gold shadow-[0_20px_60px_-20px_rgba(201,163,74,0.4)]"
            : "border-stone-200 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.1)]",
          !isLocked && "hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.2)]"
        )}
      >
        {/* Background Gradient */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            background: `radial-gradient(circle at top right, ${stage.color}, transparent 70%)`,
          }}
        />

        {/* Status Icon */}
        <div className="relative mb-4 flex items-start justify-between">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl transition-all",
              isActive ? "bg-gold/10 ring-2 ring-gold ring-offset-2" : "bg-stone-100"
            )}
            style={{
              backgroundColor: isActive ? `${stage.color}15` : undefined,
            }}
          >
            {isLocked ? (
              <Lock className="h-6 w-6 text-stone-400" />
            ) : isCompleted ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <Circle
                className={cn("h-6 w-6", isActive ? "text-gold" : "text-stone-400")}
                style={{ color: isActive ? stage.color : undefined }}
              />
            )}
          </div>

          {/* Progress Indicator */}
          {!isLocked && (
            <div className="flex flex-col items-end">
              <CircularProgress
                value={stage.progress}
                size={48}
                strokeWidth={4}
                variant={isCompleted ? "success" : "default"}
                showLabel={false}
              />
              <span className="mt-1 text-xs font-semibold text-stone-500">
                {stage.progress}%
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="relative space-y-2">
          <h3 className="font-serif text-xl font-semibold text-navy">
            {stage.name}
          </h3>
          <p className="text-sm font-medium text-gold-dark">
            {stage.question}
          </p>
          <p className="text-sm leading-relaxed text-stone-600">
            {stage.description}
          </p>

          {/* Module Progress */}
          <div className="flex items-center gap-2 pt-2 text-xs text-stone-500">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-navy">{stage.completedModules}</span>
              <span>/</span>
              <span>{stage.totalModules}</span>
            </div>
            <span>modules</span>
          </div>
        </div>

        {/* Active Indicator */}
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute -bottom-1 -left-1 -right-1 h-1 bg-gradient-to-r from-transparent via-gold to-transparent"
            initial={false}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
      </div>
    </button>
  );
}
