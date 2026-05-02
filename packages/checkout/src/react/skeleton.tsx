export function Sk({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-(--cocart-border-radius) bg-(--cocart-color-background-hover) ${className}`}
    />
  );
}
