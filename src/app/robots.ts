import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://kurinji-creations.vercel.app";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/checkout", "/order-success"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
