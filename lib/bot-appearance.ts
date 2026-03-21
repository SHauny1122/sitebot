export type BotButtonStyle = "circle" | "pill" | "rounded";
export type BotWidgetPosition = "bottom-right" | "bottom-left";

export type BotAppearance = {
  buttonText: string;
  buttonColor: string;
  buttonStyle: BotButtonStyle;
  headerColor: string;
  widgetTitle: string;
  welcomeMessage: string;
  position: BotWidgetPosition;
};

export const BOT_APPEARANCE_DEFAULTS: BotAppearance = {
  buttonText: "Chat",
  buttonColor: "#0d9488",
  buttonStyle: "circle",
  headerColor: "#0d9488",
  widgetTitle: "SiteChat",
  welcomeMessage: "Hi! How can I help you today?",
  position: "bottom-right"
};

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const BUTTON_STYLES: BotButtonStyle[] = ["circle", "pill", "rounded"];
const POSITIONS: BotWidgetPosition[] = ["bottom-right", "bottom-left"];

export function normalizeBotAppearance(input: unknown): BotAppearance {
  const data = (input && typeof input === "object" ? input : {}) as Partial<BotAppearance>;

  const buttonStyle = BUTTON_STYLES.includes(data.buttonStyle as BotButtonStyle)
    ? (data.buttonStyle as BotButtonStyle)
    : BOT_APPEARANCE_DEFAULTS.buttonStyle;

  const position = POSITIONS.includes(data.position as BotWidgetPosition)
    ? (data.position as BotWidgetPosition)
    : BOT_APPEARANCE_DEFAULTS.position;

  const buttonColor =
    typeof data.buttonColor === "string" && HEX_COLOR_REGEX.test(data.buttonColor)
      ? data.buttonColor
      : BOT_APPEARANCE_DEFAULTS.buttonColor;

  const headerColor =
    typeof data.headerColor === "string" && HEX_COLOR_REGEX.test(data.headerColor)
      ? data.headerColor
      : BOT_APPEARANCE_DEFAULTS.headerColor;

  return {
    buttonText:
      typeof data.buttonText === "string" && data.buttonText.trim().length > 0
        ? data.buttonText.trim()
        : BOT_APPEARANCE_DEFAULTS.buttonText,
    buttonColor,
    buttonStyle,
    headerColor,
    widgetTitle:
      typeof data.widgetTitle === "string" && data.widgetTitle.trim().length > 0
        ? data.widgetTitle.trim()
        : BOT_APPEARANCE_DEFAULTS.widgetTitle,
    welcomeMessage:
      typeof data.welcomeMessage === "string" && data.welcomeMessage.trim().length > 0
        ? data.welcomeMessage.trim()
        : BOT_APPEARANCE_DEFAULTS.welcomeMessage,
    position
  };
}
