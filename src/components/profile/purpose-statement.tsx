"use client";

import * as React from "react";
import { Edit2, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToastActions } from "@/components/ui/toast";

interface PurposeStatementProps {
  initialStatement?: string;
  onSave?: (statement: string) => Promise<void>;
  editable?: boolean;
  className?: string;
}

export function PurposeStatement({
  initialStatement = "",
  onSave,
  editable = true,
  className,
}: PurposeStatementProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [statement, setStatement] = React.useState(initialStatement);
  const [draftStatement, setDraftStatement] = React.useState(initialStatement);
  const [saving, setSaving] = React.useState(false);
  const { success, error } = useToastActions();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!onSave) return;
    
    setSaving(true);
    try {
      await onSave(draftStatement);
      setStatement(draftStatement);
      setIsEditing(false);
      success("Purpose statement updated");
    } catch (err) {
      error("Failed to save", "Please try again");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftStatement(statement);
    setIsEditing(false);
  };

  const isEmpty = !statement && !isEditing;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-gold/5 via-white to-transparent p-8",
        isEditing ? "border-gold" : "border-gold/20",
        className
      )}
    >
      {/* Decorative Elements */}
      <div className="absolute right-0 top-0 h-32 w-32 opacity-10">
        <div className="h-full w-full rounded-full bg-gradient-to-br from-gold to-gold-dark" style={{ transform: "translate(25%, -25%)" }} />
      </div>
      
      {/* Header */}
      <div className="relative mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-2xl font-semibold text-navy">
            My Purpose Statement
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            Your unique contribution to the world
          </p>
        </div>
        
        {editable && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-lg p-2 text-gold-dark transition-colors hover:bg-gold/10"
            aria-label="Edit purpose statement"
          >
            <Edit2 className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="editing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <textarea
                ref={textareaRef}
                value={draftStatement}
                onChange={(e) => setDraftStatement(e.target.value)}
                placeholder="I exist to..."
                rows={6}
                className="w-full rounded-xl border-2 border-gold/30 bg-white p-4 font-serif text-lg leading-relaxed text-navy outline-none transition-colors focus:border-gold"
              />
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || !draftStatement.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-semibold text-white transition-all hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Statement"}
                </button>
                
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-stone-300 px-6 py-3 font-semibold text-stone-700 transition-all hover:border-stone-400 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : isEmpty ? (
            <motion.button
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(true)}
              className="group w-full rounded-xl border-2 border-dashed border-stone-300 p-12 text-center transition-all hover:border-gold hover:bg-gold/5"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 transition-colors group-hover:bg-gold/20">
                <Edit2 className="h-8 w-8 text-stone-400 transition-colors group-hover:text-gold" />
              </div>
              <p className="mt-4 font-serif text-xl font-semibold text-stone-600 group-hover:text-gold-dark">
                Write Your Purpose Statement
              </p>
              <p className="mt-2 text-sm text-stone-500">
                Define your unique contribution and calling
              </p>
            </motion.button>
          ) : (
            <motion.div
              key="display"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              {/* Quote Marks */}
              <div aria-hidden className="absolute -left-2 -top-2 font-serif text-6xl leading-none text-gold/20">
                &ldquo;
              </div>
              <div aria-hidden className="absolute -bottom-6 -right-2 font-serif text-6xl leading-none text-gold/20">
                &rdquo;
              </div>
              
              {/* Statement */}
              <blockquote className="relative px-8 py-4">
                <p className="font-serif text-xl leading-relaxed text-navy sm:text-2xl">
                  {statement}
                </p>
              </blockquote>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Guidelines (shown when empty or editing) */}
      {(isEmpty || isEditing) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-6 space-y-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-900"
        >
          <p className="font-semibold">Tips for writing your purpose statement:</p>
          <ul className="ml-5 list-disc space-y-1 text-blue-800">
            <li>Start with &ldquo;I exist to...&rdquo; or &ldquo;My purpose is to...&rdquo;</li>
            <li>Focus on impact and contribution, not just skills</li>
            <li>Be specific about who you serve and how</li>
            <li>Keep it concise and memorable (2-3 sentences)</li>
          </ul>
        </motion.div>
      )}
    </div>
  );
}
