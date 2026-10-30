"use client";

import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";

export interface SwipeAction {
  icon: string;
  label: string;
  /** Background color of the action slot. */
  bg: string;
  /** Text/icon color. */
  color: string;
  onAction: () => void;
}

interface SwipeableRowProps {
  children: ReactNode;
  /** Actions revealed when swiping left (right-side actions). Max 3. */
  actions: SwipeAction[];
  /** Action triggered on a full swipe (past 70% of row width). */
  fullSwipeAction?: SwipeAction;
  /** Full-swipe label shown when threshold is passed (e.g. "Release to archive"). */
  fullSwipeLabel?: string;
  /** Called on long-press (450ms). */
  onLongPress?: () => void;
  className?: string;
}

const ACTION_WIDTH = 72;
const SNAP_THRESHOLD = 0.4;
const FULL_SWIPE_THRESHOLD = 0.7;
const LONG_PRESS_MS = 450;

/**
 * J10 swipeable list row.
 * - Swipe left reveals 72px action buttons (Move, Archive, Delete).
 * - Swiping past 70% triggers the outermost action (full-swipe).
 * - Long-press (450ms) fires `onLongPress` for multi-select entry.
 * - Only one row can be open at a time (managed externally by scrolling to close).
 */
export function SwipeableRow({
  children,
  actions,
  fullSwipeAction,
  fullSwipeLabel,
  onLongPress,
  className,
}: SwipeableRowProps) {
  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isPastFull, setIsPastFull] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const totalActionWidth = actions.length * ACTION_WIDTH;

  // Background color shifts to the full-swipe color when past threshold.
  const bgColor = useTransform(x, (val) => {
    if (fullSwipeAction && rowRef.current) {
      const pct = Math.abs(val) / rowRef.current.offsetWidth;
      return pct > FULL_SWIPE_THRESHOLD ? fullSwipeAction.bg : "#e9e8e1";
    }
    return "#e9e8e1";
  });

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const rowWidth = rowRef.current?.offsetWidth ?? 390;
      const pct = Math.abs(info.offset.x) / rowWidth;

      if (fullSwipeAction && pct > FULL_SWIPE_THRESHOLD) {
        fullSwipeAction.onAction();
        setIsPastFull(false);
        return;
      }

      if (pct > SNAP_THRESHOLD) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
      setIsPastFull(false);
    },
    [fullSwipeAction],
  );

  const handleDrag = useCallback(
    (_: unknown, info: PanInfo) => {
      if (!fullSwipeAction || !rowRef.current) return;
      const pct = Math.abs(info.offset.x) / rowRef.current.offsetWidth;
      setIsPastFull(pct > FULL_SWIPE_THRESHOLD);
    },
    [fullSwipeAction],
  );

  const startLongPress = useCallback(() => {
    if (!onLongPress) return;
    longPressTimer.current = setTimeout(() => {
      onLongPress();
    }, LONG_PRESS_MS);
  }, [onLongPress]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div ref={rowRef} className={`relative overflow-hidden ${className ?? ""}`}>
      {/* Action slots behind the row */}
      <motion.div className="absolute inset-0 flex justify-end" style={{ backgroundColor: bgColor }}>
        {isPastFull && fullSwipeAction ? (
          <span className="flex items-center gap-[6px] pr-5 text-[13px] font-semibold" style={{ color: fullSwipeAction.color }}>
            <span className="material-symbols-rounded">{fullSwipeAction.icon}</span>
            {fullSwipeLabel ?? `Release to ${fullSwipeAction.label.toLowerCase()}`}
          </span>
        ) : (
          actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onAction}
              className="flex cursor-pointer flex-col items-center justify-center gap-[2px] border-none text-[11px] font-semibold"
              style={{ width: ACTION_WIDTH, background: action.bg, color: action.color }}
            >
              <span className="material-symbols-rounded text-[20px]">{action.icon}</span>
              {action.label}
            </button>
          ))
        )}
      </motion.div>

      {/* Draggable content row */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -totalActionWidth, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        onDrag={handleDrag}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onDragStart={cancelLongPress}
        animate={{ x: isOpen ? -totalActionWidth : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{ x }}
        className="relative bg-card"
      >
        {children}
      </motion.div>
    </div>
  );
}
