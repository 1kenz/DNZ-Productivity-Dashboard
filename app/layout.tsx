import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/contexts/AppContext";
import { PwaRegister } from "@/components/Pwa/PwaRegister";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "DNZ Productivity Dashboard - Stay Organized & Focused",
  description: "A modern productivity dashboard for managing tasks, quick links, and daily activities",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DNZ ProdDash",
  },
};

export const viewport: Viewport = {
  themeColor: "#105aa3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          {children}
        </AppProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
