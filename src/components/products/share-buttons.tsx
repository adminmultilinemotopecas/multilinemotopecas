"use client";

import { Facebook, MessageCircle, Send, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getShareUrls } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { SITE_CONFIG } from "@/lib/constants";

interface ShareButtonsProps {
  productId: string;
  productName: string;
  slug: string;
  description: string;
}

export function ShareButtons({
  productId,
  productName,
  slug,
  description,
}: ShareButtonsProps) {
  const url = `${SITE_CONFIG.url}/produtos/${slug}`;
  const shareUrls = getShareUrls(url, productName, description);

  const platforms = [
    { name: "whatsapp", label: "WhatsApp", icon: MessageCircle, url: shareUrls.whatsapp, color: "text-[#25D366]" },
    { name: "facebook", label: "Facebook", icon: Facebook, url: shareUrls.facebook, color: "text-[#1877F2]" },
    { name: "twitter", label: "X", icon: Twitter, url: shareUrls.twitter, color: "text-foreground" },
    { name: "telegram", label: "Telegram", icon: Send, url: shareUrls.telegram, color: "text-[#0088cc]" },
  ];

  function handleShare(platform: string, shareUrl: string) {
    trackEvent({ type: "share", productId, platform });
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=400");
  }

  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map(({ name, label, icon: Icon, url: shareUrl, color }) => (
        <Button
          key={name}
          variant="outline"
          size="sm"
          onClick={() => handleShare(name, shareUrl)}
          aria-label={`Compartilhar no ${label}`}
          className="gap-2"
        >
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
}
