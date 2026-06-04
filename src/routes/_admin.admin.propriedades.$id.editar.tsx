import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { CITY_OPTIONS, type PropertyFormValues } from "@/lib/property-form";
import { FormSkeleton } from "@/components/skeletons/FormSkeleton";

export const Route = createFileRoute("/_admin/admin/propriedades/$id/editar")({
  head: () => ({ meta: [{ title: "Editar propriedade — RotainStay" }] }),
  component: EditProperty,
});

async function fetchProperty(id: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  const { data: photos, error: phErr } = await supabase
    .from("property_photos")
    .select("id, storage_path, public_url, is_cover, sort_order")
    .eq("property_id", id)
    .order("sort_order", { ascending: true });
  if (phErr) throw phErr;
  return { property: data, photos: photos ?? [] };
}

function EditProperty() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "property", id],
    queryFn: () => fetchProperty(id),
  });

  if (isLoading) {
    return <FormSkeleton />;
  }
  if (error || !data) {
    return <p style={{ color: "#B43A3A" }}>Erro ao carregar propriedade.</p>;
  }

  const p = data.property;
  const city = (CITY_OPTIONS as readonly string[]).includes(p.city)
    ? (p.city as PropertyFormValues["city"])
    : "Outro";

  const initialValues: Partial<PropertyFormValues> = {
    name: p.name,
    city,
    address_detail: p.address_detail ?? "",
    google_maps_url: p.google_maps_url ?? "",
    description: p.description ?? "",
    status: (p.status as PropertyFormValues["status"]) ?? "active",
    featured: !!p.featured,
    max_guests: p.max_guests,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    parking_spots: p.parking_spots,
    price_weekday: Number(p.price_weekday),
    price_weekend: Number(p.price_weekend),
    price_high_season: p.price_high_season != null ? Number(p.price_high_season) : null,
    cleaning_fee: Number(p.cleaning_fee),
    min_nights_weekday: p.min_nights_weekday,
    min_nights_weekend: p.min_nights_weekend,
    high_season_dates: Array.isArray(p.high_season_dates)
      ? (p.high_season_dates as { start: string; end: string }[])
      : [],
    amenities: Array.isArray(p.amenities) ? (p.amenities as string[]) : [],
    accepts_pets: !!p.accepts_pets,
    checkin_time: p.checkin_time ?? "14:00",
    checkout_time: p.checkout_time ?? "11:00",
    house_rules: p.house_rules ?? "",
  };

  return (
    <div className="space-y-6">
      <h1 style={{ fontWeight: 600, fontSize: 24, color: "#2F2E2A" }}>Editar propriedade</h1>
      <PropertyForm
        mode="edit"
        propertyId={id}
        initialValues={initialValues}
        initialPhotos={data.photos}
      />
    </div>
  );
}