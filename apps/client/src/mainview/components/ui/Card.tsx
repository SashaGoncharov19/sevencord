import React from "react";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
	return (
		<div className={`bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 ${className}`}>
			{children}
		</div>
	);
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
	return <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
	return <h3 className={`text-2xl font-semibold leading-none tracking-tight text-white ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
	return <p className={`text-sm text-gray-400 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
	return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
	return <div className={`flex items-center p-6 pt-0 ${className}`}>{children}</div>;
}
