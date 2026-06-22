"use client";

import { useRef } from "react";
import { Bold } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatProductDescriptionHtml } from "@/lib/product-description";

interface FormattedDescriptionFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  minHeightClass?: string;
  placeholder?: string;
  showPreview?: boolean;
}

export function FormattedDescriptionField({
  id,
  label,
  value,
  onChange,
  minHeightClass = "min-h-[72px]",
  placeholder,
  showPreview = true,
}: FormattedDescriptionFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function applyBold() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || "texto em negrito";
    const next = `${value.slice(0, start)}**${selected}**${value.slice(end)}`;

    onChange(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursorStart = start + 2;
      const cursorEnd = cursorStart + selected.length;
      textarea.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={applyBold}
          title="Negrito"
        >
          <Bold className="h-3.5 w-3.5" />
          Negrito
        </Button>
      </div>
      <textarea
        id={id}
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono",
          minHeightClass
        )}
      />
      <p className="text-[11px] text-muted-foreground mt-1.5">
        Enter cria nova linha. Selecione um trecho e clique em Negrito, ou use{" "}
        <code className="text-xs">**texto**</code>.
      </p>
      {showPreview && value.trim() && (
        <div className="mt-3 rounded-md border bg-muted/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Prévia
          </p>
          <div
            className="text-sm text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatProductDescriptionHtml(value) }}
          />
        </div>
      )}
    </div>
  );
}
