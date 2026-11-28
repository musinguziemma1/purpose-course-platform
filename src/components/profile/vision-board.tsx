"use client";

import * as React from "react";
import { Plus, X, Edit2, Trash2, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";

interface VisionItem {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category: "career" | "personal" | "impact" | "lifestyle" | "relationships";
  priority?: "high" | "medium" | "low";
  targetDate?: Date;
}

interface VisionBoardProps {
  items: VisionItem[];
  onAdd?: (item: Omit<VisionItem, "id">) => Promise<void>;
  onUpdate?: (id: string, item: Partial<VisionItem>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  editable?: boolean;
  className?: string;
}

const categoryColors = {
  career: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-700" },
  personal: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-700" },
  impact: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-700" },
  lifestyle: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-700" },
  relationships: { bg: "bg-pink-500/10", border: "border-pink-500/30", text: "text-pink-700" },
};

export function VisionBoard({
  items,
  onAdd,
  onUpdate,
  onDelete,
  editable = true,
  className,
}: VisionBoardProps) {
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<VisionItem | null>(null);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-2xl font-semibold text-navy">
            Vision Board
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            Visualize your goals and aspirations
          </p>
        </div>
        
        {editable && (
          <button
            onClick={() => setShowAddDialog(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-navy/90"
          >
            <Plus className="h-4 w-4" />
            Add Vision
          </button>
        )}
      </div>

      {/* Vision Items Grid */}
      {items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <VisionCard
                key={item.id}
                item={item}
                index={index}
                editable={editable}
                onEdit={() => setEditingItem(item)}
                onDelete={() => onDelete?.(item.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState onAdd={() => setShowAddDialog(true)} editable={editable} />
      )}

      {/* Add/Edit Dialog */}
      <VisionDialog
        open={showAddDialog || editingItem !== null}
        onClose={() => {
          setShowAddDialog(false);
          setEditingItem(null);
        }}
        item={editingItem}
        onSave={async (data) => {
          if (editingItem) {
            await onUpdate?.(editingItem.id, data);
          } else {
            await onAdd?.(data as Omit<VisionItem, "id">);
          }
          setShowAddDialog(false);
          setEditingItem(null);
        }}
      />
    </div>
  );
}

function VisionCard({
  item,
  index,
  editable,
  onEdit,
  onDelete,
}: {
  item: VisionItem;
  index: number;
  editable: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colors = categoryColors[item.category];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "group relative overflow-hidden rounded-xl border-2 bg-white transition-all hover:shadow-lg",
        colors.border
      )}
    >
      {/* Image or Placeholder */}
      {item.imageUrl ? (
        <div className="relative aspect-video overflow-hidden bg-stone-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      ) : (
        <div className={cn("relative flex aspect-video items-center justify-center", colors.bg)}>
          <ImageIcon className={cn("h-12 w-12", colors.text)} />
        </div>
      )}

      {/* Priority Badge (only when the item has a priority) */}
      {item.priority ? (
        <div className="absolute left-3 top-3">
          <span
            className={cn(
              "inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase",
              item.priority === "high" && "bg-red-500 text-white",
              item.priority === "medium" && "bg-amber-500 text-white",
              item.priority === "low" && "bg-green-500 text-white"
            )}
          >
            {item.priority}
          </span>
        </div>
      ) : null}

      {/* Edit/Delete Actions */}
      {editable && (
        <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded-full bg-white p-2 shadow-lg transition-transform hover:scale-110"
            aria-label="Edit vision"
          >
            <Edit2 className="h-4 w-4 text-navy" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-full bg-white p-2 shadow-lg transition-transform hover:scale-110"
            aria-label="Delete vision"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className={cn("text-xs font-semibold uppercase", colors.text)}>
            {item.category}
          </span>
          {item.targetDate && (
            <>
              <span className="text-stone-300">·</span>
              <span className="text-xs text-stone-500">
                {new Date(item.targetDate).getFullYear()}
              </span>
            </>
          )}
        </div>
        
        <h4 className="font-serif text-lg font-semibold text-navy">
          {item.title}
        </h4>
        
        {item.description && (
          <p className="mt-2 line-clamp-2 text-sm text-stone-600">
            {item.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ onAdd, editable }: { onAdd: () => void; editable: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl border-2 border-dashed border-stone-300 p-12 text-center"
    >
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-stone-100">
        <ImageIcon className="h-10 w-10 text-stone-400" />
      </div>
      <h4 className="mt-4 font-serif text-xl font-semibold text-stone-600">
        Your Vision Board is Empty
      </h4>
      <p className="mt-2 text-sm text-stone-500">
        Start adding your goals, dreams, and aspirations to visualize your future.
      </p>
      {editable && (
        <button
          onClick={onAdd}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-semibold text-white transition-all hover:bg-navy/90"
        >
          <Plus className="h-5 w-5" />
          Add Your First Vision
        </button>
      )}
    </motion.div>
  );
}

function VisionDialog({
  open,
  onClose,
  item,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  item: VisionItem | null;
  onSave: (data: Partial<VisionItem>) => Promise<void>;
}) {
  const emptyForm: Partial<VisionItem> = { title: "", description: "", category: "personal", priority: "medium" };
  const [formData, setFormData] = React.useState<Partial<VisionItem>>(item ?? emptyForm);

  // Reload the form whenever the dialog opens or switches item. Adjusting state during
  // render (not in an effect) avoids a second, cascading render.
  const [loadedFor, setLoadedFor] = React.useState({ item, open });
  if (loadedFor.item !== item || loadedFor.open !== open) {
    setLoadedFor({ item, open });
    setFormData(item ?? emptyForm);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit Vision" : "Add New Vision"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-navy">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-stone-300 px-4 py-2.5 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                placeholder="e.g., Launch my own business"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-stone-300 px-4 py-2.5 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                placeholder="Describe your vision..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-navy">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as VisionItem["category"] })}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 px-4 py-2.5 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                >
                  <option value="career">Career</option>
                  <option value="personal">Personal</option>
                  <option value="impact">Impact</option>
                  <option value="lifestyle">Lifestyle</option>
                  <option value="relationships">Relationships</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy">
                  Priority *
                </label>
                <select
                  required
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as VisionItem["priority"] })}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 px-4 py-2.5 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy">
                Target Year
              </label>
              <input
                type="number"
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 20}
                value={formData.targetDate ? new Date(formData.targetDate).getFullYear() : ""}
                onChange={(e) => {
                  const year = parseInt(e.target.value);
                  if (year) {
                    setFormData({ ...formData, targetDate: new Date(year, 0, 1) });
                  }
                }}
                className="mt-1.5 w-full rounded-lg border border-stone-300 px-4 py-2.5 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                placeholder={new Date().getFullYear().toString()}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border-2 border-stone-300 px-6 py-2.5 font-semibold text-stone-700 transition-all hover:border-stone-400 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-navy px-6 py-2.5 font-semibold text-white transition-all hover:bg-navy/90"
            >
              {item ? "Save Changes" : "Add Vision"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
