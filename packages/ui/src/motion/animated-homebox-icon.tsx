"use client";

import type { CSSProperties } from "react";

const ROOM_ANIM = "hb-room 4s ease-in-out infinite";
const DOOR_ANIM = "hb-door 5s ease-in-out infinite";
const LEAF_ANIM = "hb-leaf 3s ease-in-out infinite";

interface AnimatedHomeboxIconProps {
  size?: number;
  /** Kept for API compatibility — the Groundplan icon doesn't track eyes. */
  attentive?: boolean;
  className?: string;
}

export function AnimatedHomeboxIcon({ size = 96, className }: AnimatedHomeboxIconProps) {
  const bw = Math.max(1.5, size * 0.025);

  const abs = (extra: CSSProperties): CSSProperties => ({ position: "absolute", ...extra });

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes hb-room{0%,100%{opacity:.18}15%,35%{opacity:1}50%{opacity:.18}}
@keyframes hb-door{0%,35%{transform:scaleY(1)}50%,80%{transform:scaleY(.18)}95%,100%{transform:scaleY(1)}}
@keyframes hb-leaf{0%,100%{transform:scale(1) translateX(0)}50%{transform:scale(1.1) translateX(4%)}}`,
        }}
      />
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.22,
          background: "#dfe8d6",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: "4px 6px 14px -6px rgba(31,38,34,.4)",
        }}
      >
        {/* Tree */}
        <div
          style={abs({
            left: "58%",
            top: "8%",
            width: "30%",
            height: "30%",
            borderRadius: "50%",
            background: "#7fa572",
            animation: LEAF_ANIM,
          })}
        />
        {/* Garden bed */}
        <div
          style={abs({
            left: "12%",
            top: "12%",
            width: "16%",
            height: "16%",
            borderRadius: 3,
            background: "#c9d9bd",
            border: "1px solid #9fb894",
          })}
        />
        {/* House shell */}
        <div
          style={abs({
            left: "10%",
            top: "40%",
            width: "52%",
            height: "48%",
            background: "#fbfaf6",
            border: `${bw}px solid #1f2622`,
            borderRadius: "4%",
            boxSizing: "border-box",
          })}
        />
        {/* Room 1 */}
        <div style={abs({ left: "14%", top: "44%", width: "20%", height: "18%", background: "#f2c66d", animation: `${ROOM_ANIM}`, animationDelay: "0s" })} />
        {/* Room 2 */}
        <div style={abs({ left: "37%", top: "44%", width: "21%", height: "18%", background: "#f2c66d", animation: `${ROOM_ANIM}`, animationDelay: "1s" })} />
        {/* Room 3 */}
        <div style={abs({ left: "14%", top: "65%", width: "44%", height: "19%", background: "#f2c66d", animation: `${ROOM_ANIM}`, animationDelay: "2s" })} />
        {/* Internal wall */}
        <div style={abs({ left: "35.5%", top: "42%", width: "1.5%", height: "44%", background: "#1f2622", opacity: 0.5 })} />
        {/* Garage */}
        <div
          style={abs({
            left: "66%",
            top: "48%",
            width: "26%",
            height: "40%",
            background: "#ecdccd",
            border: `${bw}px solid #7a3f22`,
            borderRadius: "4%",
            boxSizing: "border-box",
          })}
        />
        {/* Garage door */}
        <div
          style={abs({
            left: "70%",
            top: "74%",
            width: "18%",
            height: "14%",
            background: "#b0643f",
            transformOrigin: "top",
            animation: DOOR_ANIM,
          })}
        />
      </div>
    </>
  );
}
