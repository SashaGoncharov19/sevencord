import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ label, error, className = "", id, ...props }, ref) => {
		const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

		return (
			<div className="w-full">
				{label && (
					<label
						htmlFor={inputId}
						className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wide"
					>
						{label}
					</label>
				)}
				<input
					id={inputId}
					ref={ref}
					className={`w-full bg-gray-900 border ${
						error ? "border-red-500 focus:ring-red-500" : "border-gray-700 focus:ring-indigo-500"
					} rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${className}`}
					{...props}
				/>
				{error && <p className="mt-1 text-sm text-red-500">{error}</p>}
			</div>
		);
	}
);

Input.displayName = "Input";
