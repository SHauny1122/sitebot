import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PAYSTACK_SECRET_KEY: z.string().optional().default(""),
  OPENAI_API_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  ADMIN_EMAILS: z.string().optional().default("")
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
}

export const env = parsed.success
  ? parsed.data
  : {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      PAYSTACK_SECRET_KEY: "",
      OPENAI_API_KEY: "",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      ADMIN_EMAILS: ""
    };

export const adminEmails = env.ADMIN_EMAILS.split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);
