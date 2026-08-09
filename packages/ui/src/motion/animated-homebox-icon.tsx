"use client";

import { animate, motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

// Traced from apps/web/public/icons/icon-512.png via potrace (per-color-layer
// bitmap tracing, not hand-drawn) so this matches the real app icon almost
// exactly — verified against the source PNG at <0.4/255 mean pixel diff.
// Coordinates live directly in a 0-512 viewBox (potrace's own transform was
// baked into these numbers), so eye/pupil geometry below is in the same units.
const PATHS = {
  body: "M 225.9,138.8 C 202.1,153.1 69.0,234.7 68.1,235.6 C 66.7,236.9 76.5,335.9 83.5,390.6 C 87.9,425.2 90.3,432.5 100.9,443.0 C 107.2,449.4 114.7,453.3 123.4,454.9 C 131.1,456.3 378.8,456.4 387.3,455.0 C 403.3,452.4 415.9,441.2 422.4,423.8 C 429.5,405.1 441.6,310.5 443.5,259.0 C 443.8,250.5 444.3,241.8 444.5,239.8 L 445.0,236.1 L 435.3,230.4 C 406.7,213.8 354.0,182.0 311.0,155.3 C 284.3,138.8 261.5,124.8 260.3,124.1 C 255.4,121.6 252.7,122.7 225.9,138.8 M 183.4,273.3 C 190.7,276.7 196.1,281.8 200.1,289.2 C 203.4,295.2 203.5,296.0 203.5,306.0 C 203.5,315.2 203.2,317.1 201.1,321.0 C 195.5,331.6 187.8,337.9 177.0,340.6 C 160.9,344.7 143.8,336.5 136.2,321.0 C 132.5,313.4 131.9,301.9 134.9,293.8 C 139.0,282.9 148.2,274.3 158.9,271.3 C 165.7,269.4 176.8,270.3 183.4,273.3 M 358.8,273.6 C 366.0,277.1 372.5,283.6 375.8,290.8 C 378.1,295.7 378.5,297.8 378.5,306.0 C 378.5,314.4 378.2,316.2 375.7,321.2 C 368.2,336.5 351.0,344.7 335.0,340.6 C 323.9,337.7 316.6,331.8 310.9,321.0 C 308.8,317.1 308.5,315.1 308.5,306.0 C 308.5,296.9 308.8,294.8 311.0,290.5 C 315.5,281.4 325.2,273.4 334.7,271.0 C 341.4,269.3 352.5,270.5 358.8,273.6 M 291.8,347.1 C 292.3,352.6 288.5,361.3 283.0,367.3 C 271.3,380.1 253.6,383.3 238.7,375.2 C 232.0,371.6 224.6,363.2 222.1,356.5 C 220.0,351.0 219.4,345.0 220.7,343.7 C 221.1,343.3 237.1,343.1 256.4,343.2 L 291.5,343.5 L 291.8,347.1",
  roof: "M 247.0,56.6 C 233.5,59.2 220.3,66.7 184.8,91.6 C 134.7,126.8 40.7,201.3 35.2,210.2 C 29.5,219.4 30.1,228.3 36.9,235.1 C 43.6,241.8 54.7,242.6 64.5,237.1 C 67.3,235.6 97.9,216.9 132.5,195.5 C 208.2,148.9 247.3,125.2 251.9,123.3 C 254.3,122.3 256.0,122.1 258.1,122.9 C 259.7,123.4 283.8,138.0 311.7,155.3 C 365.8,188.8 393.9,205.8 429.9,226.8 C 448.1,237.5 453.2,240.0 457.4,240.5 C 467.7,241.8 476.3,237.1 479.6,228.4 C 481.1,224.5 481.1,223.1 480.1,218.8 C 479.5,216.0 478.0,212.1 476.8,210.2 C 474.9,207.1 450.6,186.3 424.8,165.6 L 415.1,157.9 L 414.8,129.5 C 414.5,102.7 414.4,101.0 412.4,98.3 C 408.3,92.6 405.4,92.0 384.2,92.0 C 359.0,92.0 355.8,93.3 353.6,104.4 L 352.5,109.8 L 340.1,100.8 C 333.3,95.8 319.6,86.3 309.6,79.5 C 282.2,61.1 273.5,57.1 258.5,56.5 C 253.6,56.3 248.4,56.4 247.0,56.6",
  leftEye: "M 160.7,271.0 C 150.5,273.6 140.0,282.3 135.8,291.7 C 134.1,295.4 133.6,298.6 133.6,305.5 C 133.5,313.4 133.9,315.3 136.4,320.7 C 143.1,335.2 158.5,343.4 174.4,340.9 C 182.3,339.6 188.6,336.2 194.3,330.1 C 200.5,323.4 203.2,317.3 203.8,308.4 C 205.1,288.0 191.0,271.9 170.5,270.5 C 167.2,270.3 162.8,270.5 160.7,271.0",
  rightEye: "M 335.0,271.3 C 323.9,274.5 315.6,281.4 311.1,291.0 C 308.9,295.7 308.5,297.9 308.5,306.0 C 308.5,314.3 308.8,316.2 311.3,321.1 C 324.5,348.0 363.1,347.8 375.6,320.8 C 378.2,315.3 378.5,313.4 378.4,305.5 C 378.3,294.5 376.3,289.3 369.0,281.6 C 360.3,272.4 346.1,268.1 335.0,271.3",
  leftPupil: "M 161.5,292.0 C 156.2,294.7 153.8,298.3 153.2,304.1 C 152.6,310.1 154.2,314.1 158.6,318.0 C 165.0,323.6 173.7,323.0 180.0,316.5 C 182.9,313.5 183.4,312.2 183.8,307.1 C 184.3,299.8 181.8,295.0 175.9,292.0 C 171.0,289.5 166.5,289.5 161.5,292.0",
  rightPupil: "M 335.8,292.0 C 330.1,295.0 327.7,299.9 328.2,307.1 C 328.6,312.2 329.1,313.5 332.0,316.5 C 338.3,323.0 347.0,323.6 353.4,318.0 C 357.8,314.1 359.4,310.1 358.8,304.1 C 358.2,298.2 355.8,294.7 350.4,292.0 C 345.4,289.5 340.6,289.5 335.8,292.0",
  mouth: "M 221.8,344.1 C 219.5,345.4 219.6,346.3 222.0,354.4 C 224.6,362.8 232.4,371.6 240.8,375.7 C 245.8,378.1 247.6,378.4 256.0,378.4 C 263.5,378.4 266.5,377.9 270.0,376.3 C 280.5,371.4 287.7,363.1 290.6,352.4 C 293.2,342.5 295.0,343.0 256.1,343.0 C 235.8,343.0 222.8,343.4 221.8,344.1",
};

const EYES = {
  left: { cx: 168, cy: 305.5 },
  right: { cx: 343, cy: 305.5 },
};
const MOUTH_CENTER = { cx: 256, cy: 361 };
const MAX_PUPIL_OFFSET = 18; // eye radius 35.2 minus pupil radius 15.2, minus a small safety margin

function isTypingElement(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

// Lazily created so this module never touches `document` during SSR.
let caretCanvas: HTMLCanvasElement | null = null;

// Inputs don't expose caret pixel coordinates directly, so this measures the
// text up to the caret with a canvas using the input's own font metrics.
function getCaretClientPos(el: HTMLInputElement | HTMLTextAreaElement) {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  caretCanvas ??= document.createElement("canvas");
  const ctx = caretCanvas.getContext("2d")!;
  ctx.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

  const caretIndex = el.selectionEnd ?? el.value.length;
  const textBeforeCaret =
    el instanceof HTMLInputElement && el.type === "password"
      ? "•".repeat(caretIndex)
      : el.value.slice(0, caretIndex);
  const textWidth = ctx.measureText(textBeforeCaret).width;

  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const borderLeft = parseFloat(style.borderLeftWidth) || 0;
  const x = rect.left + borderLeft + paddingLeft + textWidth - el.scrollLeft;

  return {
    x: Math.min(Math.max(x, rect.left), rect.right),
    y: rect.top + rect.height / 2,
  };
}

interface AnimatedHomeboxIconProps {
  size?: number;
  /** Triggers an attentive wide-eye + smile pulse — e.g. while a form field has focus. */
  attentive?: boolean;
}

export function AnimatedHomeboxIcon({ size = 96, attentive = false }: AnimatedHomeboxIconProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const leftPupilX = useMotionValue(0);
  const leftPupilY = useMotionValue(0);
  const rightPupilX = useMotionValue(0);
  const rightPupilY = useMotionValue(0);
  const pupilSpring = { stiffness: 300, damping: 22, mass: 0.3 };
  const lpx = useSpring(leftPupilX, pupilSpring);
  const lpy = useSpring(leftPupilY, pupilSpring);
  const rpx = useSpring(rightPupilX, pupilSpring);
  const rpy = useSpring(rightPupilY, pupilSpring);

  const leftEyeScaleY = useMotionValue(1);
  const rightEyeScaleY = useMotionValue(1);
  const mouthScale = useMotionValue(1);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function toLocal(clientX: number, clientY: number) {
      const rect = svg!.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * 512,
        y: ((clientY - rect.top) / rect.height) * 512,
      };
    }

    function lookAt(localX: number, localY: number) {
      for (const [eye, setX, setY] of [
        [EYES.left, leftPupilX, leftPupilY],
        [EYES.right, rightPupilX, rightPupilY],
      ] as const) {
        const dx = localX - eye.cx;
        const dy = localY - eye.cy;
        const dist = Math.hypot(dx, dy) || 1;
        const clamped = Math.min(dist, MAX_PUPIL_OFFSET);
        setX.set((dx / dist) * clamped);
        setY.set((dy / dist) * clamped);
      }
    }

    function updateFromCaret(el: HTMLInputElement | HTMLTextAreaElement) {
      const pos = getCaretClientPos(el);
      const local = toLocal(pos.x, pos.y);
      lookAt(local.x, local.y);
    }

    // While a text field is focused, the caret — not the mouse — drives the pupils.
    function handlePointerMove(event: PointerEvent) {
      if (isTypingElement(document.activeElement)) return;
      const local = toLocal(event.clientX, event.clientY);
      lookAt(local.x, local.y);
    }

    function handleCaretActivity(event: Event) {
      if (isTypingElement(event.target)) updateFromCaret(event.target);
    }

    window.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("focusin", handleCaretActivity);
    document.addEventListener("input", handleCaretActivity, true);
    document.addEventListener("keyup", handleCaretActivity, true);
    document.addEventListener("click", handleCaretActivity, true);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("focusin", handleCaretActivity);
      document.removeEventListener("input", handleCaretActivity, true);
      document.removeEventListener("keyup", handleCaretActivity, true);
      document.removeEventListener("click", handleCaretActivity, true);
    };
  }, [leftPupilX, leftPupilY, rightPupilX, rightPupilY]);

  // Ambient blinking on a randomized interval, so it reads as alive rather than mechanical.
  useEffect(() => {
    let cancelled = false;
    async function blinkLoop() {
      while (!cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 2800 + Math.random() * 2400));
        if (cancelled) return;
        await Promise.all([
          animate(leftEyeScaleY, 0.08, { duration: 0.09, ease: "easeIn" }),
          animate(rightEyeScaleY, 0.08, { duration: 0.09, ease: "easeIn" }),
        ]);
        if (cancelled) return;
        await Promise.all([
          animate(leftEyeScaleY, 1, { duration: 0.14, ease: "easeOut" }),
          animate(rightEyeScaleY, 1, { duration: 0.14, ease: "easeOut" }),
        ]);
      }
    }
    blinkLoop();
    return () => {
      cancelled = true;
    };
  }, [leftEyeScaleY, rightEyeScaleY]);

  // Independent one-shot reaction layered on top of the ambient blink loop —
  // eyes widen and the mouth stretches into a slightly bigger smile.
  useEffect(() => {
    if (!attentive) return;
    animate(leftEyeScaleY, [1, 1.25, 1], { duration: 0.35, ease: "easeOut" });
    animate(rightEyeScaleY, [1, 1.25, 1], { duration: 0.35, ease: "easeOut" });
    animate(mouthScale, [1, 1.15, 1], { duration: 0.35, ease: "easeOut" });
  }, [attentive, leftEyeScaleY, rightEyeScaleY, mouthScale]);

  return (
    <svg ref={svgRef} viewBox="0 0 512 512" width={size} height={size}>
      <path d={PATHS.body} fill="#F7DEAE" />
      <path d={PATHS.roof} fill="#FB7369" />

      <motion.g style={{ scaleY: leftEyeScaleY, transformOrigin: `${EYES.left.cx}px ${EYES.left.cy}px` }}>
        <path d={PATHS.leftEye} fill="#FFFFFF" />
        <motion.path d={PATHS.leftPupil} fill="#4A254B" style={{ x: lpx, y: lpy }} />
      </motion.g>

      <motion.g style={{ scaleY: rightEyeScaleY, transformOrigin: `${EYES.right.cx}px ${EYES.right.cy}px` }}>
        <path d={PATHS.rightEye} fill="#FFFFFF" />
        <motion.path d={PATHS.rightPupil} fill="#4A254B" style={{ x: rpx, y: rpy }} />
      </motion.g>

      <motion.path
        d={PATHS.mouth}
        fill="#4A254B"
        style={{ scale: mouthScale, transformOrigin: `${MOUTH_CENTER.cx}px ${MOUTH_CENTER.cy}px` }}
      />
    </svg>
  );
}
