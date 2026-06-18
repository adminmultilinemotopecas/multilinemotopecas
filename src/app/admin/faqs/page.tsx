"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { adminFetch } from "@/lib/admin/client";
import type { FAQ } from "@/types/database";

export default function AdminFaqsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFaqs();
  }, []);

  async function loadFaqs() {
    try {
      const data = await adminFetch<FAQ[]>("/api/admin/faqs");
      setFaqs(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(faq: FAQ) {
    if (!confirm(`Excluir FAQ "${faq.question.slice(0, 50)}..."?`)) return;
    await adminFetch(`/api/admin/faqs/${faq.id}`, { method: "DELETE" });
    loadFaqs();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">FAQs</h1>
        <Button asChild>
          <Link href="/admin/faqs/novo">
            <Plus className="h-4 w-4" />
            Nova FAQ
          </Link>
        </Button>
      </div>
      <DataTable
        data={faqs}
        columns={[
          { key: "question", label: "Pergunta", render: (f) => f.question.slice(0, 80) },
          {
            key: "is_active",
            label: "Status",
            render: (f) => (
              <Badge variant={f.is_active ? "success" : "secondary"}>
                {f.is_active ? "Ativa" : "Inativa"}
              </Badge>
            ),
          },
          { key: "sort_order", label: "Ordem" },
        ]}
        onEdit={(f) => {
          window.location.href = `/admin/faqs/${f.id}`;
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
