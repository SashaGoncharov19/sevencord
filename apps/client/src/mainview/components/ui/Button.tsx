import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	loading?: boolean;
}

export function Button({
	children,
	variant = "primary",
	size = "md",
	loading = false,
	className = "",
	disabled,
	...props
}: ButtonProps) {
	const baseStyles =
		"inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed";

	const variants: Record<ButtonVariant, string> = {
		primary: "bg-indigo-500 hover:bg-indigo-600 text-white focus:ring-indigo-500 shadow-md",
		secondary: "bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500",
		danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 shadow-md",
		ghost: "bg-transparent hover:bg-gray-800 text-gray-300 hover:text-white focus:ring-gray-500",
	};

	const sizes: Record<ButtonSize, string> = {
		sm: "py-1.5 px-3 text-sm",
		md: "py-2.5 px-4 text-base",
		lg: "py-3 px-6 text-lg",
	};

	return (
		<button
			className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
			disabled={disabled || loading}
			{...props}
		>
			{loading ? (
				<svg
					className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle
						className="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						strokeWidth="4"
					></circle>
					<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			) : null}
			{children}
		</button>
	);
}
