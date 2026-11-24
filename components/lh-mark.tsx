/**
 * LhMark — the Magistro app mark (clean monochrome placeholder SVG), inlined
 * as JSX so it rides along with the components (no network fetch, recolorable,
 * crisp at any size). 806×806 viewBox, no padding: sizing/padding is the
 * consumer's job.
 */
export function LhMark({ className = "" }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 806 806"
			className={className}
			style={{ fillRule: "evenodd", clipRule: "evenodd", strokeLinejoin: "round", strokeMiterlimit: 2 }}
			aria-hidden="true"
		>
			<path
				d="M96 688V176h104l203 296 203-296h104v512H606V364L425 620h-44L200 364v324H96Z"
				style={{ fill: "var(--lh-line-strong)" }}
			/>
			<polygon
				points="403,96 451,144 403,192 355,144"
				style={{ fill: "rgb(148,148,148)" }}
			/>
		</svg>
	);
}
