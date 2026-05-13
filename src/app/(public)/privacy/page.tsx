import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "CS2Cap privacy policy. How we collect, use, and protect your data.",
  alternates: { canonical: "/privacy" },
};

const lastUpdated = "April 18, 2026";

const sections = [
  {
    title: "1. Who We Are",
    body: [
      "CS2Cap is an independent website and API operated by Dadscap from Quebec, Canada.",
      "References in this Privacy Policy to “CS2Cap,” “we,” “us,” and “our” mean Dadscap operating CS2Cap at cs2cap.com and related services.",
      "If you have questions about this Privacy Policy or how we handle personal information, you can contact us at contact@cs2cap.com.",
    ],
  },
  {
    title: "2. Scope",
    body: [
      "This Privacy Policy applies to information we collect through cs2cap.com and related subdomains, the CS2Cap dashboard, the CS2Cap API, authentication flows, account features, alerts, notifications, and other related services.",
      "By using the Service, you acknowledge this Privacy Policy.",
    ],
  },
  {
    title: "3. Information We Collect",
    body: [
      "Depending on how you use the Service, we may collect the following categories of information:",
    ],
    bullets: [
      "Account and profile information, such as your name, username, profile picture, avatar, provider account ID, and email address where available or required.",
      "Authentication information received from supported OAuth providers such as Google, Discord, or Steam.",
      "API and account information, such as your subscription status, plan, API key metadata, account settings, and plan-based access restrictions.",
      "Payment-related metadata from payment providers such as Stripe and NOWPayments, including payment status, subscription status, transaction identifiers, and limited billing metadata. We do not store full card details or private wallet credentials.",
      "Technical and usage information, such as IP address, browser type, device and operating system information, user agent, pages visited, API requests, timestamps, request logs, quota usage, rate-limit usage, error logs, and security events.",
      "Communication information, such as your email address, support messages, and alert or notification preferences when you enable those features.",
    ],
  },
  {
    title: "4. Cookies and Analytics",
    body: [
      "We currently use cookies and similar technologies primarily for authentication, session management, and security.",
      "We also use Google Analytics on the website to understand how the site is used.",
      "We may change our use of cookies and similar technologies over time as the Service evolves.",
    ],
  },
  {
    title: "5. How We Collect Information",
    body: [
      "We collect information directly from you, from OAuth providers when you sign in, automatically when you use the Service, from payment providers in connection with subscriptions and billing, and from analytics and security tools used to operate the Service.",
    ],
  },
  {
    title: "6. How We Use Information",
    body: [
      "We use information to provide, operate, maintain, secure, and improve the Service. This includes creating and managing accounts, authenticating users, issuing and managing API access, enforcing plan restrictions, processing subscriptions and billing, sending service-related communications, monitoring performance and abuse, troubleshooting issues, enforcing our Terms, and complying with legal obligations.",
    ],
  },
  {
    title: "7. How We Share Information",
    body: [
      "We do not sell personal information.",
      "We may share information with service providers that help us operate the Service, including providers for hosting, infrastructure, authentication, analytics, email, logging, monitoring, security, and payment processing.",
      "We may also share information where reasonably necessary to comply with law, enforce our agreements, prevent fraud or abuse, respond to security issues, protect rights or safety, or complete a merger, acquisition, financing, reorganization, or sale of assets.",
    ],
  },
  {
    title: "8. Data Retention",
    body: [
      "We retain information only for as long as reasonably necessary for the purposes described in this Privacy Policy.",
      "As a general rule, we aim not to retain personal information for more than 14 months after account closure or the end of the relevant relationship.",
      "We may retain information longer where reasonably necessary for billing, accounting, fraud prevention, abuse detection, security investigations, dispute resolution, enforcement of our agreements, or legal and regulatory compliance.",
      "We may also retain aggregated or de-identified information that does not reasonably identify you.",
    ],
  },
  {
    title: "9. Account Deletion",
    body: [
      "You can delete your account through the dashboard.",
      "Deleting your account does not necessarily mean every related record is immediately erased. We may retain limited information where reasonably necessary for billing, fraud prevention, security, legal compliance, dispute handling, or enforcement of our rights.",
    ],
  },
  {
    title: "10. Your Choices",
    body: [
      "Subject to applicable law, you may request access to personal information we hold about you, correction of inaccurate information, or deletion of personal information.",
      "You may also manage certain account information through the Service and control some cookie settings through your browser, although blocking essential cookies may affect functionality.",
      "To make a privacy-related request, contact us at contact@cs2cap.com.",
    ],
  },
  {
    title: "11. International Processing",
    body: [
      "We are based in Quebec, Canada, but some service providers we use may process information in other jurisdictions.",
      "By using the Service, you understand that your information may be processed outside your province, state, or country, subject to applicable legal requirements.",
    ],
  },
  {
    title: "12. Security",
    body: [
      "We use reasonable administrative, technical, and organizational measures designed to protect information handled through the Service.",
      "No system is completely secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    title: "13. Children",
    body: [
      "The Service is not intended for children under 13.",
      "If we learn that we collected personal information from a child in violation of applicable law, we may delete it.",
    ],
  },
  {
    title: "14. Third-Party Services",
    body: [
      "The Service may reference or connect with third-party services, including OAuth providers, payment processors, analytics tools, and external websites.",
      "We are not responsible for the privacy practices of third parties. Their own terms and privacy policies apply to their services.",
    ],
  },
  {
    title: "15. Changes to This Privacy Policy",
    body: [
      "We may update this Privacy Policy from time to time.",
      "If we make material changes, we may post the updated version on the Service and may also provide notice by email or through the Service where appropriate.",
      "Your continued use of the Service after the updated Privacy Policy takes effect means you acknowledge the updated policy.",
    ],
  },
  {
    title: "16. Contact",
    body: [
      "If you have privacy questions or requests, contact us at contact@cs2cap.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <section className="py-16 border-b-2 border-border">
        <div className="container max-w-3xl">
          <div className="font-mono text-xs tracking-widest text-primary mb-4">// LEGAL</div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">PRIVACY POLICY</h1>
          <p className="font-mono text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>
      </section>

      <section className="py-12">
        <div className="container max-w-3xl space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="font-mono text-sm font-bold text-foreground mb-2">{section.title}</h2>

              <div className="space-y-3">
                {section.body.map((paragraph, index) => (
                  <p
                    key={`${section.title}-p-${index}`}
                    className="font-mono text-xs text-muted-foreground leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}

                {section.bullets ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {section.bullets.map((bullet, index) => (
                      <li
                        key={`${section.title}-b-${index}`}
                        className="font-mono text-xs text-muted-foreground leading-relaxed"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <FooterSection />
    </>
  );
}
