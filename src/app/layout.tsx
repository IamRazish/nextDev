import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { themeScript } from "@/components/shell/ThemeToggle";
import { ToastProvider } from "@/components/ui/Toast";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "nextDev Toolsuite — CSS & UI generators for developers",
    template: "%s — nextDev Toolsuite",
  },
  description:
    "A unified suite of CSS generators and UI utilities: stripes, gradients, flexbox, grid, clip-path, neumorphic shadows and more. Export as CSS, Tailwind or React.",
  keywords: [
    "css generator",
    "tailwind generator",
    "gradient editor",
    "flexbox generator",
    "css grid",
    "clip-path",
    "developer tools",
  ],
  openGraph: {
    title: "nextDev Toolsuite",
    description: "CSS generators and UI utilities in one place. Export as CSS, Tailwind or React.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
