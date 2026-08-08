import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import PWAInstaller from "@/components/PWAInstaller";
import BackendPing from "@/components/BackendPing";

const geist = Geist({ subsets: ["latin"] });

export const metadata = {
  title: "SLOT SYSTEM",
  description: "Sistema POS SaaS",
  manifest: "/manifest.json",
  themeColor: "#F59E0B",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SLOT SYSTEM",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F59E0B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SLOT SYSTEM" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={geist.className}>
        <AuthProvider>
          <PWAInstaller />
          <BackendPing />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}