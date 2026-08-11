import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { loadPricingConfigClient } from "@/lib/pricing/client";
import { PRICING_QUERY_KEY } from "@/components/admin/pricing/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormSkeleton } from "@/components/skeletons/FormSkeleton";
import { PriceTab } from "@/components/admin/pricing/PriceTab";
import { CalendarTab } from "@/components/admin/pricing/CalendarTab";
import { DiscountsTab } from "@/components/admin/pricing/DiscountsTab";
import { PromotionsTab } from "@/components/admin/pricing/PromotionsTab";
import { FeesTab } from "@/components/admin/pricing/FeesTab";
import { TaxesTab } from "@/components/admin/pricing/TaxesTab";
import { SimulatorCard } from "@/components/admin/pricing/SimulatorCard";

export const Route = createFileRoute("/_admin/admin/propriedades/$id/precificacao")({
  head: () => ({ meta: [{ title: "Precificação — RotainStay" }] }),
  component: PricingPage,
});

function PricingPage() {
  const { id } = Route.useParams();

  const property = useQuery({
    queryKey: ["admin", "property-name", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const config = useQuery({
    queryKey: PRICING_QUERY_KEY(id),
    queryFn: () => loadPricingConfigClient(id),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "#1C1C1A" }}>
            Precificação
          </h1>
          <p className="text-sm text-muted-foreground">
            {property.data?.name ?? "Carregando..."}
          </p>
        </div>
        <Link
          to="/admin/propriedades"
          className="text-sm hover:underline"
          style={{ color: "#6B7052" }}
        >
          ← Voltar
        </Link>
      </div>

      {config.isLoading ? (
        <FormSkeleton />
      ) : config.error || !config.data ? (
        <p style={{ color: "#B43A3A" }}>Erro ao carregar a precificação.</p>
      ) : (
        <>
          <Tabs defaultValue="preco">
            <TabsList className="flex-wrap">
              <TabsTrigger value="preco">Preços</TabsTrigger>
              <TabsTrigger value="calendario">Calendário</TabsTrigger>
              <TabsTrigger value="descontos">Descontos</TabsTrigger>
              <TabsTrigger value="promocoes">Promoções</TabsTrigger>
              <TabsTrigger value="taxas">Taxas extras</TabsTrigger>
              <TabsTrigger value="impostos">Impostos</TabsTrigger>
            </TabsList>
            <TabsContent value="preco" className="mt-4">
              <PriceTab config={config.data} />
            </TabsContent>
            <TabsContent value="calendario" className="mt-4">
              <CalendarTab config={config.data} />
            </TabsContent>
            <TabsContent value="descontos" className="mt-4">
              <DiscountsTab config={config.data} />
            </TabsContent>
            <TabsContent value="promocoes" className="mt-4">
              <PromotionsTab config={config.data} />
            </TabsContent>
            <TabsContent value="taxas" className="mt-4">
              <FeesTab config={config.data} />
            </TabsContent>
            <TabsContent value="impostos" className="mt-4">
              <TaxesTab config={config.data} />
            </TabsContent>
          </Tabs>

          <SimulatorCard config={config.data} />
        </>
      )}
    </div>
  );
}
