import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "El Corazón de Alma · Simulador educativo de cardiología";
const description =
  "Compara un corazón sano con diez escenarios cardiovasculares mediante anatomía 3D, fisiología y ECG sincronizados.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    (host.includes("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "es_ES",
      siteName: "El Corazón de Alma",
      url: metadataBase,
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: "El Corazón de Alma: corazón tridimensional y ECG educativo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
