import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { fitText } from "./fit-text";

let canvas: HTMLCanvasElement | null = null;

/** Width of `text` on one line at `size`, in the element's own font and tracking. */
const measureAt = (el: HTMLElement, text: string, size: number): number => {
  canvas ??= document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  const cs = getComputedStyle(el);
  const current = parseFloat(cs.fontSize) || size;
  const tracking = cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing) || 0;
  ctx.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
  ctx.letterSpacing = `${(tracking / current) * size}px`;
  return ctx.measureText(text).width;
};

/**
 * A name (or headline) set as big as its box allows: measured on one line at `max`, shrunk to fit,
 * and below `floor` it wraps to two lines. No ellipsis, no overflow clipping, room for descenders.
 */
export const FitName = ({
  text,
  max,
  floor = 40,
  box,
  lineHeight = 1.08,
  className = "",
  style,
  children,
}: {
  text: string;
  max: number;
  floor?: number;
  /** The width the name may use, in TV px. */
  box: number;
  lineHeight?: number;
  className?: string;
  style?: CSSProperties;
  /** Optional rendering of the text (e.g. RisoType); defaults to the plain text. */
  children?: ReactNode;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState({ size: max, wrap: false });
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      // Canvas metrics run a hair narrow of the laid-out text: fit to 96% of the box.
      if (el) setFit(fitText({ naturalWidth: measureAt(el, text, max), max, floor, box: box * 0.96, words: text.trim().split(/\s+/).length }));
    };
    measure();
    let alive = true;
    void document.fonts?.ready.then(() => alive && measure());
    return () => {
      alive = false;
    };
  }, [text, max, floor, box]);
  return (
    <span
      ref={ref}
      className={`relative ${className}`}
      data-fit={fit.wrap ? "wrap" : String(fit.size)}
      style={{
        display: "inline-block",
        ...style,
        maxWidth: box,
        fontSize: fit.size,
        lineHeight,
        whiteSpace: fit.wrap ? "normal" : "nowrap",
        overflowWrap: "anywhere",
        textWrapStyle: "balance",
      }}
    >
      {children ?? text}
    </span>
  );
};
