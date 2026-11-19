import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kurinji Creations | Everyday Elegance",
  description: "Discover thoughtfully selected jewellery and accessories from Kurinji Creations.",
  applicationName: "Kurinji Creations",
  verification: {
    google: "xW5wWg01CH9ZW2vRRp03KUCm4L78W4vtl7uutqOwjOU",
  },
  icons: {
    icon: "/brand/kurinji-infinity-emblem.svg",
    apple: "/brand/kurinji-infinity-emblem.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f4ef",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
