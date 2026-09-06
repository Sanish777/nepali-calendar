import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { LanguageProvider } from "@/components/LanguageProvider";


export const metadata: Metadata = {
  title: "Miti API & Developer Platform",
  description:
    "High-performance REST API for Bikram Sambat (BS) to AD conversion, accurate tithi, panchanga, festivals, and embeddable Nepali calendar widgets.",
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.jpg',
  },
  openGraph: {
    title: "Miti API & Developer Platform",
    description: "High-performance REST API for Bikram Sambat (BS) to AD conversion.",
    url: 'https://miti-api.com',
    siteName: 'Miti API',
    images: [
      {
        url: '/logo.jpg',
        width: 800,
        height: 800,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#122A5A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ne" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-neutral text-primary pattern-bg selection:bg-secondary selection:text-primary">
        <LanguageProvider>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-accent/20 bg-neutral py-8 text-center text-sm text-primary/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary">Miti API</span>
              <span>—</span>
              <span>Bikram Sambat (वि.सं.) Developer Platform</span>
            </div>
          </div>
        </footer>
              </LanguageProvider>
      </body>
    </html>
  );
}
