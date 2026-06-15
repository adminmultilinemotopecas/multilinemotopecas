"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { COOKIE_CONSENT_KEY } from "@/lib/legal";
import { SITE_CONFIG } from "@/lib/constants";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) setVisible(true);
  }, []);

  function saveConsent(value: "accepted" | "rejected") {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
    window.dispatchEvent(new CustomEvent("cookie-consent-change", { detail: value }));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed bottom-0 inset-x-0 z-50 p-4 md:p-6"
    >
      <div className="container mx-auto max-w-4xl rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <div className="flex-1 text-sm text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-1">
              {SITE_CONFIG.name} utiliza cookies
            </p>
            <p>
              Usamos cookies essenciais para o funcionamento do site e, com seu consentimento,
              cookies de análise e marketing para melhorar sua experiência. Saiba mais em nossa{" "}
              <Link
                href="/politica-privacidade"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Política de Privacidade
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="border-border/80"
              onClick={() => saveConsent("rejected")}
            >
              Apenas essenciais
            </Button>
            <Button size="sm" onClick={() => saveConsent("accepted")}>
              Aceitar todos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
