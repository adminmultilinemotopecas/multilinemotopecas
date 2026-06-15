import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { MousePointerClick, Eye, Search, Share2 } from "lucide-react";

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  const [{ data: events }, { data: searches }, { data: topProducts }] = await Promise.all([
    supabase.from("analytics_events").select("event_type").order("created_at", { ascending: false }).limit(1000),
    supabase.from("search_logs").select("query, results_count").order("created_at", { ascending: false }).limit(500),
    supabase.from("products").select("name, view_count, purchase_click_count").order("view_count", { ascending: false }).limit(10),
  ]);

  const eventCounts: Record<string, number> = {};
  events?.forEach((e) => { eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1; });

  const searchTermCounts = new Map<string, number>();
  searches?.forEach((s) => { searchTermCounts.set(s.query, (searchTermCounts.get(s.query) || 0) + 1); });
  const topSearchTerms = Array.from(searchTermCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);

  const statCards = [
    { title: "Cliques Mercado Livre", value: eventCounts.purchase_click || 0, icon: MousePointerClick },
    { title: "Visualizações", value: eventCounts.product_view || 0, icon: Eye },
    { title: "Buscas", value: eventCounts.search || 0, icon: Search },
    { title: "Compartilhamentos", value: eventCounts.share || 0, icon: Share2 },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><p className="text-3xl font-bold">{stat.value}</p></CardContent>
            </Card>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Produtos mais acessados</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {topProducts?.map((p, i) => (
                <li key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span className="truncate mr-4">{p.name}</span>
                  <span className="text-muted-foreground shrink-0">{p.view_count} views</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Termos mais pesquisados</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {topSearchTerms.map(([term, count]) => (
                <li key={term} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span>{term}</span>
                  <span className="text-muted-foreground">{count}x</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
