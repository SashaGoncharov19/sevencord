import { Button, ButtonProps } from "./Button";

interface IconButtonProps extends ButtonProps {
    rounded?: string; // allow overrides, default "rounded-full"
}

export function IconButton({
    className = "",
    rounded = "rounded-full",
    ...props
}: IconButtonProps) {
    const hasSize = className.includes("w-") || className.includes("h-");
    const sizeClasses = hasSize ? "" : "w-12 h-12";
    return (
        <Button
            className={`flex items-center justify-center ${rounded} !p-0 ${sizeClasses} ${className}`}
            {...props}
        />
    );
}
