import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FAQ } from "@/types/database";

interface FAQSectionProps {
  faqs: FAQ[];
}

export function FAQSection({ faqs }: FAQSectionProps) {
  if (faqs.length === 0) return null;

  return (
    <section className="py-14 border-t border-border/40">
      <div className="text-center mb-10">
        <h2 className="section-title">
          Perguntas <span className="section-title-accent">Frequentes</span>
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Tire suas dúvidas sobre compras e compatibilidade
        </p>
      </div>
      <div className="max-w-2xl mx-auto rounded-2xl border border-border/60 bg-card p-2">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.id} value={`faq-${index}`} className="border-border/40 px-4">
              <AccordionTrigger className="text-left font-semibold hover:text-primary">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
