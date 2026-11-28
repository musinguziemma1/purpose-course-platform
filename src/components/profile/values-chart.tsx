"use client";

import * as React from "react";
import { Target, TrendingUp, Heart, Lightbulb, Shield, Users } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Value {
  id: string;
  name: string;
  score: number;
  description: string;
  color: string;
}

interface ValuesChartProps {
  values: Value[];
  variant?: "pie" | "bar" | "radar";
  className?: string;
}

export function ValuesChart({ values, variant = "pie", className }: ValuesChartProps) {
  const sortedValues = [...values].sort((a, b) => b.score - a.score);
  const total = values.reduce((sum, v) => sum + v.score, 0);
  
  if (variant === "pie") {
    return <PieChart values={sortedValues} total={total} className={className} />;
  }
  
  if (variant === "bar") {
    return <BarChart values={sortedValues} className={className} />;
  }
  
  return <RadarChart values={sortedValues} className={className} />;
}

function PieChart({ values, total, className }: { values: Value[]; total: number; className?: string }) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  
  // Each slice starts where the previous ones end; computed up front so render never mutates a variable.
  const percentages = values.map((value) => (value.score / total) * 100);
  const offsets = percentages.map((_, index) => percentages.slice(0, index).reduce((sum, part) => sum + part, 0));

  return (
    <div className={cn("relative", className)}>
      <div className="mx-auto aspect-square max-w-sm">
        <svg viewBox="0 0 200 200" className="rotate-[-90deg]">
          {values.map((value, index) => {
            const percentage = percentages[index];
            const startAngle = (offsets[index] / 100) * 360;
            const endAngle = ((offsets[index] + percentage) / 100) * 360;

            const largeArcFlag = percentage > 50 ? 1 : 0;
            const startX = 100 + 90 * Math.cos((Math.PI * startAngle) / 180);
            const startY = 100 + 90 * Math.sin((Math.PI * startAngle) / 180);
            const endX = 100 + 90 * Math.cos((Math.PI * endAngle) / 180);
            const endY = 100 + 90 * Math.sin((Math.PI * endAngle) / 180);
            
            const pathData = [
              `M 100 100`,
              `L ${startX} ${startY}`,
              `A 90 90 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              `Z`,
            ].join(' ');
            
            const isHovered = hoveredIndex === index;
            const scale = isHovered ? 1.05 : 1;
            
            return (
              <g key={value.id}>
                <motion.path
                  d={pathData}
                  fill={value.color}
                  stroke="white"
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer transition-opacity"
                  style={{ opacity: isHovered ? 1 : 0.9 }}
                  animate={{ scale }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
              </g>
            );
          })}
        </svg>
        
        {/* Center Label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="font-serif text-3xl font-semibold text-navy">
              {values.length}
            </p>
            <p className="text-sm text-stone-500">Core Values</p>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {values.map((value, index) => (
          <motion.button
            key={value.id}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={cn(
              "flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all",
              hoveredIndex === index
                ? "border-current shadow-lg"
                : "border-stone-200 hover:border-stone-300"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: value.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-navy">{value.name}</p>
              <p className="text-xs text-stone-500">
                {((value.score / total) * 100).toFixed(0)}%
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function BarChart({ values, className }: { values: Value[]; className?: string }) {
  const maxScore = Math.max(...values.map(v => v.score));
  
  return (
    <div className={cn("space-y-4", className)}>
      {values.map((value, index) => {
        const percentage = (value.score / maxScore) * 100;
        
        return (
          <motion.div
            key={value.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-navy">{value.name}</span>
              <span className="text-sm text-stone-500">{value.score}/10</span>
            </div>
            <div className="relative h-8 overflow-hidden rounded-full bg-stone-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, delay: index * 0.1 }}
                className="h-full rounded-full"
                style={{ backgroundColor: value.color }}
              />
            </div>
            <p className="text-xs leading-relaxed text-stone-600">
              {value.description}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

function RadarChart({ values, className }: { values: Value[]; className?: string }) {
  const size = 300;
  const center = size / 2;
  const radius = size / 2 - 40;
  const angleStep = (2 * Math.PI) / values.length;
  
  // Calculate points for the data polygon
  const dataPoints = values.map((value, index) => {
    const angle = angleStep * index - Math.PI / 2;
    const distance = (value.score / 10) * radius;
    return {
      x: center + distance * Math.cos(angle),
      y: center + distance * Math.sin(angle),
    };
  });
  
  // Calculate points for axis labels
  const labelPoints = values.map((_, index) => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: center + (radius + 30) * Math.cos(angle),
      y: center + (radius + 30) * Math.sin(angle),
    };
  });
  
  return (
    <div className={cn("relative", className)}>
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto max-w-md">
        {/* Background circles */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius * scale}
            fill="none"
            stroke="#e7e5e4"
            strokeWidth="1"
          />
        ))}
        
        {/* Axis lines */}
        {labelPoints.map((point, index) => (
          <line
            key={index}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke="#e7e5e4"
            strokeWidth="1"
          />
        ))}
        
        {/* Data polygon */}
        <motion.polygon
          points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="#071F46"
          fillOpacity="0.3"
          stroke="#071F46"
          strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1, type: "spring" }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />
        
        {/* Data points */}
        {dataPoints.map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={values[index].color}
            stroke="white"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            whileHover={{ scale: 1.5 }}
          />
        ))}
        
        {/* Labels */}
        {values.map((value, index) => {
          const point = labelPoints[index];
          return (
            <g key={value.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r="20"
                fill="white"
                stroke={value.color}
                strokeWidth="2"
              />
              <text
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-semibold"
                fill="#071F46"
              >
                {value.score}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {values.map((value) => (
          <div key={value.id} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: value.color }}
            />
            <span className="text-sm font-medium text-stone-700">
              {value.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Predefined icons for common values
const valueIcons: Record<string, React.ElementType> = {
  integrity: Shield,
  growth: TrendingUp,
  compassion: Heart,
  excellence: Target,
  innovation: Lightbulb,
  community: Users,
};

export function getValueIcon(valueName: string): React.ElementType {
  const key = valueName.toLowerCase();
  return valueIcons[key] || Target;
}
