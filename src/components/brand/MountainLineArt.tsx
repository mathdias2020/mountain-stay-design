type Props = {
  className?: string;
  color?: string;
  height?: number;
};

export function MountainLineArt({
  className,
  color = "#6B7052",
  height = 36,
}: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 48"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      height={height}
      width={height * (80 / 48)}
      className={className}
      aria-hidden="true"
    >
      {/* Back mountain */}
      <path d="M30 42 L48 14 L66 42" />
      {/* Front mountain */}
      <path d="M8 42 L28 10 L44 30 L52 22 L60 42" />
      {/* Snow lines on front peak */}
      <path d="M22 20 L28 14 L32 18" />
      <path d="M40 26 L44 22 L48 25" />
    </svg>
  );
}

export default MountainLineArt;