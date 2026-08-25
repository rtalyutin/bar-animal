import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ЖИВОТНОЕ — кассовый бой",
  description: "Интерактивная игра-калькулятор денежного потока мини-ресторана ЖИВОТНОЕ.",
  metadataBase: new URL("https://zhivotnoe-cashflow-game.eviee11.chatgpt.site"),
  other: {
    "codex-preview": "development",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    title: "ЖИВОТНОЕ — кассовый бой",
    description: "Интерактивная игра-калькулятор денежного потока мини-ресторана ЖИВОТНОЕ.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "ЖИВОТНОЕ — кассовый бой: игра-калькулятор денежного потока",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ЖИВОТНОЕ — кассовый бой",
    description: "Интерактивная игра-калькулятор денежного потока мини-ресторана ЖИВОТНОЕ.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
