import { cn } from "@/lib/utils";

interface RemoteImageProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  priority?: boolean;
}

export function RemoteImage({
  src,
  alt,
  className,
  fill = false,
  priority = false,
}: RemoteImageProps) {
  return (
    // URLs externas (Mercado Livre, etc.) vêm do admin — img evita bloqueio do next/image
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn(fill && "absolute inset-0 h-full w-full", className)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
