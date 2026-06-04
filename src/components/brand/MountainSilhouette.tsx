type Props = {
  className?: string;
  /** Color for the back (further) mountain layer */
  backColor?: string;
  /** Color for the front (closer) mountain layer */
  frontColor?: string;
  /** Whether to flip vertically (for footer) */
  flipped?: boolean;
  height?: number;
};

export function MountainSilhouette({
  className,
  backColor = "#4E5438",
  frontColor = "#5A6045",
  flipped = false,
  height = 80,
}: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className={className}
      style={flipped ? { transform: "scaleY(-1)" } : undefined}
      aria-hidden="true"
    >
      {/* Back layer (darker, further away) */}
      <path
        fill={backColor}
        d="M0,80 L0,46 L80,30 L170,52 L260,18 L360,44 L470,12 L580,38 L690,20 L810,46 L920,22 L1040,48 L1160,18 L1280,42 L1380,28 L1440,40 L1440,80 Z"
      />
      {/* Front layer (slightly lighter, closer) */}
      <path
        fill={frontColor}
        d="M0,80 L0,60 L60,52 L150,68 L240,42 L340,62 L450,38 L560,58 L660,46 L780,64 L880,48 L1000,66 L1120,44 L1240,60 L1340,52 L1440,58 L1440,80 Z"
      />
    </svg>
  );
}

export default MountainSilhouette;