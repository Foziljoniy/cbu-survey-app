import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: "CBU Bank Lending Survey Portal",
    description: "Interactive demonstration of a secure bank lending survey collection and monitoring platform.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "CBU Bank Lending Survey",
      description: "Secure collection. Clear oversight.",
      images: [{ url: new URL("/og.png", metadataBase).toString(), width: 1536, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "CBU Bank Lending Survey",
      description: "Secure collection. Clear oversight.",
      images: [new URL("/og.png", metadataBase).toString()],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
