import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  if (process.env.APP_ENV === "production") {
    return {
      rules: {
        allow: "/",
        userAgent: "*",
      },
    };
  }

  return {
    rules: {
      disallow: "/",
      userAgent: "*",
    },
  };
}
