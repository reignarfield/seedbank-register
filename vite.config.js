import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The browser tab title, the meta description and the install manifest all
// have to agree with src/lib/business.js - but none of them are JavaScript, so
// they can't import it. Rather than leave three more places to remember to
// rename, they're generated from the same environment variables at build time.
// Renaming the business stays a one-file job.
function businessBranding(env) {
  const name = env.VITE_BUSINESS_NAME || "Tydie Cleaning";
  const description =
    env.VITE_BUSINESS_DESCRIPTION ||
    "Window cleaning, pressure cleaning, and more. Request a free quote online.";
  const themeColor = env.VITE_THEME_COLOR || "#0068ab";

  return {
    name: "business-branding",

    transformIndexHtml(html) {
      return html
        .replace(/<title>.*?<\/title>/, `<title>${name}</title>`)
        .replace(
          /(<meta name="description" content=")[^"]*(")/,
          `$1${description}$2`
        )
        .replace(/(<meta name="theme-color" content=")[^"]*(")/, `$1${themeColor}$2`);
    },

    // A manifest is what turns the staff app into a home-screen icon instead
    // of a browser bookmark. For a tool used from the front seat of a van,
    // that's the difference between opening it and not bothering.
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.webmanifest",
        source: JSON.stringify(
          {
            name,
            short_name: env.VITE_BUSINESS_SHORT_NAME || name.split(" ")[0],
            description,
            // Opens straight to the job manager: someone installing this to
            // their home screen is staff, not a customer looking to book.
            start_url: "/team",
            scope: "/",
            display: "standalone",
            orientation: "portrait",
            background_color: "#f8fafc",
            theme_color: themeColor,
            icons: [
              { src: "/tydie-icon-192.png", sizes: "192x192", type: "image/png" },
              { src: "/tydie-icon-512.png", sizes: "512x512", type: "image/png" },
              {
                src: "/tydie-icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
              },
            ],
          },
          null,
          2
        ),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss(), businessBranding(env)],
  };
});
