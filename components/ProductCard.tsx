import type { Product } from "@/lib/products";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="flex gap-3 rounded-xl2 border border-border bg-surface/70 p-3 transition-shadow hover:shadow-soft">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.image}
        alt={`${product.name} product photo`}
        className="h-20 w-20 shrink-0 rounded-xl object-cover"
        loading="lazy"
      />
      <div className="min-w-0">
        <p className="font-medium text-foreground">{product.name}</p>
        <p className="mt-0.5 text-[13px] text-muted line-clamp-2">{product.description}</p>
        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {product.features.slice(0, 3).map((f) => (
            <li key={f} className="text-[11px] text-muted before:mr-1 before:content-['•']">
              {f}
            </li>
          ))}
        </ul>
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-block text-[13px] font-medium text-accent hover:underline"
        >
          View product →
        </a>
      </div>
    </div>
  );
}
