import { Link } from "react-router-dom";

const similarItems = [
  { name: "AK-47 | Asiimov", wear: "Field-Tested", price: "$32.40", change: "+1.8%" },
  { name: "AK-47 | Neon Rider", wear: "Minimal Wear", price: "$28.90", change: "-0.5%" },
  { name: "AK-47 | The Empress", wear: "Factory New", price: "$45.20", change: "+3.2%" },
  { name: "AK-47 | Wasteland Rebel", wear: "Field-Tested", price: "$18.60", change: "+0.9%" },
  { name: "AK-47 | Neon Revolution", wear: "Minimal Wear", price: "$22.30", change: "-1.1%" },
  { name: "AK-47 | Black Laminate", wear: "Factory New", price: "$15.80", change: "+0.4%" },
];

export function SimilarItems() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold mb-1">Similar Items</h2>
      <p className="text-xs text-muted-foreground mb-4">Check out similar skins below</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {similarItems.map((item) => (
          <Link
            key={item.name}
            to={`/item/${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            className="group rounded-lg border border-border bg-secondary/30 p-3 hover:border-primary/30 transition-colors"
          >
            <div className="h-20 rounded bg-secondary/50 mb-2 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground">Preview</span>
            </div>
            <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{item.name}</p>
            <p className="text-[10px] text-muted-foreground">{item.wear}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs font-semibold text-primary">{item.price}</span>
              <span className={`text-[10px] font-medium ${item.change.startsWith("+") ? "text-green-400" : "text-red-400"}`}>
                {item.change}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
