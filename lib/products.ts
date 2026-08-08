/**
 * Small hardcoded fallback product catalog for Waggle's known product line,
 * used to render product cards when the assistant mentions a device by name.
 * Descriptions are intentionally generic/short where crawl data was sparse —
 * no invented specs.
 */
export type Product = {
  id: string;
  name: string;
  matchTerms: string[];
  description: string;
  features: string[];
  url: string;
  image: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "pet-monitor",
    name: "Waggle Pet Monitor",
    matchTerms: ["pet monitor", "waggle pet monitor", "lite+", "pro+ air", "rv hub one"],
    description: "A cellular RV temperature & humidity monitor that alerts you the moment conditions turn unsafe for your pet.",
    features: [
      "Built-in 4G cellular — no Wi-Fi required",
      "Temperature, humidity & power-loss alerts",
      "Multi-carrier support (AT&T, Verizon, T-Mobile)",
      "RVSentry geofence alerts (Pro+ Air)",
    ],
    url: "https://mywaggle.com/products/pet-monitor",
    image: "https://images.unsplash.com/photo-1558929996-da64ba858215?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "wagglecam-pro",
    name: "WaggleCam Pro",
    matchTerms: ["wagglecam pro", "waggle cam pro", "treat tosser"],
    description: "An indoor smart pet camera with two-way audio, AI detection, and a built-in treat tosser.",
    features: [
      "1080p-class video with night vision",
      "AI motion, pet & noise detection",
      "Two-way audio and treat dispensing",
      "Pan/tilt remote control via app",
    ],
    url: "https://mywaggle.com/products/waggle-pet-camera",
    image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "rv-wifi-mini-cam",
    name: "RV WiFi Mini Cam",
    matchTerms: ["rv wifi mini cam", "mini cam", "rv cam ai mini"],
    description: "A compact indoor WiFi camera for keeping an eye on pets while you're away from the RV.",
    features: [
      "Dual-band WiFi (2.4GHz & 5GHz)",
      "Night vision up to 10 meters",
      "Motion & sound detection alerts",
      "Supports up to 5 cameras per account",
    ],
    url: "https://mywaggle.com/products/waggle-pet-camera",
    image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "rv-4g-camera",
    name: "RV 4G Camera",
    matchTerms: ["rv 4g camera", "4g camera"],
    description: "A weatherproof, solar-compatible 4G LTE camera built for indoor or outdoor RV security — no WiFi needed.",
    features: [
      "IP65 weatherproof, indoor/outdoor",
      "Built-in 4G LTE, pre-installed SIM",
      "2K clarity with 350° rotation",
      "Solar charging compatible",
    ],
    url: "https://mywaggle.com/products/waggle-4g-camera",
    image: "https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "rv-4g-mini-camera",
    name: "RV 4G Mini Camera",
    matchTerms: ["rv 4g mini camera", "4g mini cam"],
    description: "A compact magnetic-mount 4G LTE camera with event-based recording for up to two months on a charge.",
    features: [
      "Magnetic, tool-free mounting",
      "IP65 weatherproof design",
      "Event-based (motion) recording",
      "Built-in 4G LTE — no WiFi required",
    ],
    url: "https://mywaggle.com/pages/accessories",
    image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "smart-sensor",
    name: "Smart Sensor (Door / Water Leak)",
    matchTerms: ["smart sensor", "door sensor", "water leak sensor", "leak sensor"],
    description: "Peel-and-stick RV door and water-leak sensors that send instant alerts through the Waggle app.",
    features: [
      "Tool-free peel-and-stick install",
      "Instant door open/close alerts",
      "Water leak detection",
      "No subscription required",
    ],
    url: "https://mywaggle.com/pages/build-your-bundle",
    image: "https://images.unsplash.com/photo-1544568100-847a948585b9?q=80&w=800&auto=format&fit=crop",
  },
];

export function findMentionedProducts(text: string): Product[] {
  const t = text.toLowerCase();
  return PRODUCTS.filter((p) => p.matchTerms.some((term) => t.includes(term)));
}
