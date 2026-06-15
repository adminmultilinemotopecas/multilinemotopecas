import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-auto",
  md: "h-10 w-auto lg:h-11",
  lg: "h-14 w-auto md:h-16",
};

export function Logo({ className, size = "md" }: LogoProps) {
  return (
    <Link href="/" className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        src="/logo-multiline.png"
        alt="Multiline Motopeças - Peças e Acessórios para Motocicletas"
        width={320}
        height={80}
        className={cn("object-contain", sizeClasses[size])}
        priority={size === "md"}
      />
    </Link>
  );
}
