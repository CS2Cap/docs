import { PublicLayout } from "@/components/PublicLayout";

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <div className="container max-w-2xl py-12">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: March 30, 2026</p>
        <div className="mt-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Information We Collect</h2>
            <p className="mt-2">We collect information you provide when creating an account (email, display name) and usage data related to how you interact with the service and API.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">How We Use Your Information</h2>
            <p className="mt-2">We use your information to provide the service, manage your account, enforce rate limits, and improve the product. We do not sell your personal information.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Data Retention</h2>
            <p className="mt-2">Account data is retained as long as your account is active. You can request deletion of your account and associated data at any time.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Cookies</h2>
            <p className="mt-2">We use essential cookies for session management. We do not use third-party tracking cookies.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p className="mt-2">For questions about this privacy policy, contact us at privacy@cs2cap.com.</p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
