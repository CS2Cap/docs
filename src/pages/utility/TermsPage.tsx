import { PublicLayout } from "@/components/PublicLayout";

export default function TermsPage() {
  return (
    <PublicLayout>
      <div className="container max-w-2xl py-12">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: March 30, 2026</p>
        <div className="mt-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="mt-2">By accessing or using CS2Cap, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Use of Service</h2>
            <p className="mt-2">CS2Cap provides market data and analytics for CS2 items. You may use the service for personal or commercial purposes in accordance with your plan. Automated access is permitted only through the official API with valid credentials.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">3. API Usage</h2>
            <p className="mt-2">API access is subject to rate limits and usage quotas as defined by your subscription plan. Abuse or circumvention of rate limits may result in suspension.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Data Accuracy</h2>
            <p className="mt-2">CS2Cap aggregates data from third-party providers and makes no guarantees about the accuracy, completeness, or timeliness of the data presented. Use at your own discretion.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Limitation of Liability</h2>
            <p className="mt-2">CS2Cap is provided "as is" without warranty of any kind. We are not liable for any damages arising from the use of the service.</p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
