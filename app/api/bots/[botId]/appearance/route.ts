import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/api-user";
import { BOT_APPEARANCE_DEFAULTS, normalizeBotAppearance } from "@/lib/bot-appearance";
import { supabaseAdmin } from "@/lib/supabase/admin";

const paramsSchema = z.object({
  botId: z.string().uuid()
});

const appearanceSchema = z.object({
  buttonText: z.string().trim().min(1).max(30),
  buttonColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  buttonStyle: z.enum(["circle", "pill", "rounded"]),
  headerColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  widgetTitle: z.string().trim().min(1).max(60),
  welcomeMessage: z.string().trim().min(1).max(500),
  position: z.enum(["bottom-right", "bottom-left"])
});

const appearanceSelect =
  "button_text,button_color,button_style,header_color,widget_title,welcome_message,position";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

type AppearanceRow = {
  button_text: string;
  button_color: string;
  button_style: string;
  header_color: string;
  widget_title: string;
  welcome_message: string;
  position: string;
};

function mapAppearance(row: AppearanceRow | null | undefined) {
  if (!row) {
    return BOT_APPEARANCE_DEFAULTS;
  }

  return normalizeBotAppearance({
    buttonText: row.button_text,
    buttonColor: row.button_color,
    buttonStyle: row.button_style,
    headerColor: row.header_color,
    widgetTitle: row.widget_title,
    welcomeMessage: row.welcome_message,
    position: row.position
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(_: Request, { params }: { params: Promise<{ botId: string }> }) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid bot id" }, { status: 400, headers: corsHeaders });
  }

  const { data, error } = await supabaseAdmin
    .from("bots")
    .select(appearanceSelect)
    .eq("id", parsedParams.data.botId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ appearance: mapAppearance(data as AppearanceRow | null) }, { headers: corsHeaders });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ botId: string }> }) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid bot id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsedBody = appearanceSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid appearance settings" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("bots")
    .update({
      button_text: parsedBody.data.buttonText,
      button_color: parsedBody.data.buttonColor,
      button_style: parsedBody.data.buttonStyle,
      header_color: parsedBody.data.headerColor,
      widget_title: parsedBody.data.widgetTitle,
      welcome_message: parsedBody.data.welcomeMessage,
      position: parsedBody.data.position
    })
    .eq("id", parsedParams.data.botId)
    .eq("user_id", user.id)
    .select(appearanceSelect)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  return NextResponse.json({ appearance: mapAppearance(data as AppearanceRow | null) });
}
