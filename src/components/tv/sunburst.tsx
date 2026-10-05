/** A slow halftone sunburst: a print ornament, never the focal point. */
export const Sunburst = ({
  size,
  x,
  y,
  rays = 28,
  fill = "url(#tv-dots-yellow)",
  spin = true,
}: {
  size: number;
  x: number;
  y: number;
  rays?: number;
  fill?: string;
  spin?: boolean;
}) => {
  // Drawn in poster pixels so the halftone pattern keeps its real dot pitch.
  const c = size / 2;
  const reach = size * 0.75;
  const wedges = Array.from({ length: rays }, (_, i) => {
    const a0 = (i / rays) * Math.PI * 2;
    const a1 = ((i + 0.5) / rays) * Math.PI * 2;
    const p = (a: number) => `${(c + Math.cos(a) * reach).toFixed(1)},${(c + Math.sin(a) * reach).toFixed(1)}`;
    return `M${c},${c} L${p(a0)} L${p(a1)} Z`;
  });
  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        mixBlendMode: "multiply",
        maskImage: "radial-gradient(circle at center, black 22%, transparent 62%)",
        WebkitMaskImage: "radial-gradient(circle at center, black 22%, transparent 62%)",
      }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className={spin ? "tv-spin" : ""}>
        <path d={wedges.join(" ")} fill={fill} />
      </svg>
    </div>
  );
};
