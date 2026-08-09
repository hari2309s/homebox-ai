"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

interface CursorFollowIconProps {
  children: ReactNode;
  /** Extra lean applied on top of cursor tracking — e.g. while a form is focused (mouse doesn't move while typing, so this covers that case separately). */
  attentive?: boolean;
  maxRotate?: number;
  maxShift?: number;
}

/**
 * Tilts/shifts its children toward the cursor's position on screen, like the
 * children are "watching" it. Since our icon is a raster PNG (no separate
 * eye elements to move independently), this animates the whole icon instead
 * of just the pupils — the achievable version of "the icon follows the
 * cursor" without redrawing the artwork as SVG.
 */
export function CursorFollowIcon({ children, attentive = false, maxRotate = 12, maxShift = 6 }: CursorFollowIconProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rawRotate = useMotionValue(0);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springConfig = { stiffness: 150, damping: 15, mass: 0.5 };
  const rotate = useSpring(rawRotate, springConfig);
  const x = useSpring(rawX, springConfig);
  const y = useSpring(rawY, springConfig);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const deltaX = event.clientX - (rect.left + rect.width / 2);
      const deltaY = event.clientY - (rect.top + rect.height / 2);

      rawRotate.set(Math.max(-maxRotate, Math.min(maxRotate, deltaX / 20)));
      rawX.set(Math.max(-maxShift, Math.min(maxShift, deltaX / 40)));
      rawY.set(Math.max(-maxShift, Math.min(maxShift, deltaY / 40)));
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [maxRotate, maxShift, rawRotate, rawX, rawY]);

  return (
    <motion.div animate={{ rotate: attentive ? 8 : 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
      <motion.div ref={ref} style={{ rotate, x, y }}>
        {children}
      </motion.div>
    </motion.div>
  );
}
