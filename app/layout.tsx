import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Waggle Assistant",
  description: "Ask Waggle Assistant anything about your Waggle devices, or general pet care.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='40' r='16' fill='%23f2762e'/%3E%3Ccircle cx='14' cy='20' r='7' fill='%23f2762e'/%3E%3Ccircle cx='50' cy='20' r='7' fill='%23f2762e'/%3E%3Ccircle cx='6' cy='38' r='6' fill='%23f2762e'/%3E%3Ccircle cx='58' cy='38' r='6' fill='%23f2762e'/%3E%3C/svg%3E",
  },
};

// Runs before hydration to avoid a light/dark flash on load.
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('waggle-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
