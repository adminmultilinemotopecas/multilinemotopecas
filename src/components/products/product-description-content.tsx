import { formatProductDescriptionHtml } from "@/lib/product-description";
import { cn } from "@/lib/utils";

interface ProductDescriptionContentProps {
  content: string;
  className?: string;
}

export function ProductDescriptionContent({
  content,
  className,
}: ProductDescriptionContentProps) {
  return (
    <div
      className={cn(
        "text-muted-foreground leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground",
        className
      )}
      dangerouslySetInnerHTML={{ __html: formatProductDescriptionHtml(content) }}
    />
  );
}
