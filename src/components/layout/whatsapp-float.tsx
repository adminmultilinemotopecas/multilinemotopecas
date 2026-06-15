"use client";

import { MessageCircle } from "lucide-react";
import { getWhatsAppLink } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { SITE_CONFIG } from "@/lib/constants";

export function WhatsAppFloat() {
  const message = `Olá! Vim pelo site ${SITE_CONFIG.name} e gostaria de ajuda para encontrar uma peça.`;

  return (
    <a
      href={getWhatsAppLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent({ type: "whatsapp_click", context: "floating_button" })}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/30 hover:bg-[#20BD5A] hover:scale-110 transition-all ring-2 ring-background"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
