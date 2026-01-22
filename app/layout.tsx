import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Remainders - Life Calendar & Year Calendar Wallpaper Generator | Memento Mori",
    template: "%s | Remainders"
  },
  description: "Generate custom life calendar and year calendar wallpapers for your phone. Visualize your life as 4,160 weeks. Free tool for iOS, Android, and desktop. Memento mori - live intentionally with mortality awareness.",
  keywords: ["life calendar", "year calendar", "memento mori", "life in weeks", "mortality awareness", "time visualization", "wallpaper generator", "stoic philosophy", "productivity tool", "intentional living", "4160 weeks", "life wallpaper", "year wallpaper", "lock screen wallpaper"],
  authors: [{ name: "Remainders" }],
  creator: "Remainders",
  publisher: "Remainders",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico?v=2',
    apple: '/apple-touch-icon.png?v=2',
    shortcut: '/android-chrome-192x192.png?v=2',
  },
  manifest: '/site.webmanifest',
  metadataBase: new URL('https://remainders.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://remainders.vercel.app',
    siteName: 'Remainders',
    title: 'Remainders - Life Calendar & Year Calendar Wallpaper Generator',
    description: 'Generate custom life calendar and year calendar wallpapers. Visualize your life as 4,160 weeks. Free memento mori tool for mindful living.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Remainders - Life Calendar Wallpaper Generator',
    description: 'Visualize your life as 4,160 weeks. Generate custom life calendar and year calendar wallpapers for mindful living.',
    creator: '@remainders',
  },
  alternates: {
    canonical: 'https://remainders.vercel.app',
  },
  category: 'Productivity',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Remainders',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web Browser, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '847',
    },
    description: 'Generate life calendar and year calendar wallpapers. Visualize your life as 4,160 weeks with memento mori philosophy. Free tool for creating custom time-aware wallpapers for your phone lock screen.',
    url: 'https://remainders.vercel.app',
    screenshot: 'https://remainders.vercel.app/Year.webp',
    featureList: [
      'Life View - Visualize 80 years as 4,160 weeks',
      'Year View - Track daily progress with dot grid',
      'Plugin System - Custom quotes, habits, moon phases',
      'Device Support - Optimized for various screen sizes',
      'Privacy First - No data storage, generated on-the-fly',
    ],
    author: {
      '@type': 'Organization',
      name: 'Remainders',
      url: 'https://remainders.vercel.app',
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
