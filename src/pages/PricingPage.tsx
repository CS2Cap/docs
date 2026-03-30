import { PublicLayout } from "@/components/PublicLayout";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "For personal use and exploration.",
    features: [
      "Item search and browse",
      "Watchlist (up to 10 items)",
      "Basic price data",
      "Community support",
    ],
    cta: "Get Started",
    href: "/login",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For power users and small projects.",
    features: [
      "Unlimited watchlist",
      "Price alerts",
      "Historical data access",
      "API access (rate-limited)",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/login",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For teams and high-volume use cases.",
    features: [
      "Everything in Pro",
      "Higher API rate limits",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantees",
    ],
    cta: "Contact Us",
    href: "/login",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <PublicLayout>
      <div className="container py-16 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold lg:text-4xl">Pricing</h1>
          <p className="mt-3 text-muted-foreground">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 lg:p-8 ${
                plan.highlight ? "border-primary/40 bg-card glow-sm" : "border-border bg-card"
              }`}
            >
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <Link
                to={plan.href}
                className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {plan.cta}
              </Link>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check size={14} className="mt-0.5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
