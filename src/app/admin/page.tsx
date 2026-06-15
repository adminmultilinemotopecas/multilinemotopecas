import { Package, Eye, MousePointerClick, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: productCount },
    { count: brandCount },
    { count: categoryCount },
    { data: topSearches },
    { data: recentEvents },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("brands").select("*", { count: "exact", head: true }),
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase
      .from("search_logs")
      .select("query")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("analytics_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const searchCounts = new Map<string, number>();
  topSearches?.forEach((s) => {
    searchCounts.set(s.query, (searchCounts.get(s.query) || 0) + 1);
  });
  const topSearchTerms = Array.from(searchCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const purchaseClicks =
    recentEvents?.filter((e) => e.event_type === "purchase_click").length || 0;

  const stats = [
    { title: "Produtos", value: productCount || 0, icon: Package },
    { title: "Marcas", value: brandCount || 0, icon: Tag },
    { title: "Categorias", value: categoryCount || 0, icon: Search },
    { title: "Cliques ML (recentes)", value: purchaseClicks, icon: MousePointerClick },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Termos mais buscados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSearchTerms.length > 0 ? (
              <ul className="space-y-2">
                {topSearchTerms.map(([term, count]) => (
                  <li
                    key={term}
                    className="flex justify-between text-sm py-1 border-b last:border-0"
                  >
                    <span>{term}</span>
                    <span className="text-muted-foreground">{count}x</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma busca registrada</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Eventos recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentEvents && recentEvents.length > 0 ? (
              <ul className="space-y-2">
                {recentEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex justify-between text-sm py-1 border-b last:border-0"
                  >
                    <span className="capitalize">{event.event_type.replace("_", " ")}</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(event.created_at).toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum evento registrado</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Tag(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}
