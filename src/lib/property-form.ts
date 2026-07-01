import { z } from "zod";

export function slugify(input: string): string {
  return (input || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export const highSeasonPeriodSchema = z
  .object({
    start: z.string().min(1, "Data início obrigatória"),
    end: z.string().min(1, "Data fim obrigatória"),
  })
  .refine((v) => v.end >= v.start, { message: "Data fim deve ser após início", path: ["end"] });

export const propertyFormSchema = z
  .object({
    name: z.string().trim().min(1, "Obrigatório").max(120),
    city: z.string().trim().min(1, "Selecione uma cidade").max(80),
    address_detail: z.string().max(255).optional().or(z.literal("")),
    google_maps_url: z.string().url("URL inválida").max(500).optional().or(z.literal("")),
    description: z
      .string()
      .trim()
      .min(50, "Mínimo 50 caracteres")
      .max(2000, "Máximo 2000 caracteres"),
    status: z.enum(["active", "inactive", "maintenance"]),
    featured: z.boolean(),

    max_guests: z.number().int().min(1).max(30),
    bedrooms: z.number().int().min(0).max(20),
    bathrooms: z.number().int().min(1).max(20),
    parking_spots: z.number().int().min(0).max(20),

    price_weekday: z.number().min(0),
    price_weekend: z.number().min(0),
    price_high_season: z.number().min(0).nullable(),
    cleaning_fee: z.number().min(0),
    min_nights_weekday: z.number().int().min(1),
    min_nights_weekend: z.number().int().min(1),

    high_season_dates: z.array(highSeasonPeriodSchema).optional(),

    amenities: z.array(z.string()),
    accepts_pets: z.boolean(),

    checkin_time: z.string().min(1).max(10),
    checkout_time: z.string().min(1).max(10),
    house_rules: z.string().max(2000).optional().or(z.literal("")),
    tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  });

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;

export const defaultPropertyValues: PropertyFormValues = {
  name: "",
  city: "",
  address_detail: "",
  google_maps_url: "",
  description: "",
  status: "active",
  featured: false,
  max_guests: 2,
  bedrooms: 1,
  bathrooms: 1,
  parking_spots: 0,
  price_weekday: 0,
  price_weekend: 0,
  price_high_season: null,
  cleaning_fee: 0,
  min_nights_weekday: 1,
  min_nights_weekend: 2,
  high_season_dates: [],
  amenities: [],
  accepts_pets: false,
  checkin_time: "14:00",
  checkout_time: "11:00",
  house_rules: "",
  tier: 3,
};