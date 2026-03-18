import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteChat",
  description: "Add an AI Chatbot To Your Website In 60 Seconds"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
