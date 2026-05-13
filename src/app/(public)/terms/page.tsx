import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "CS2Cap terms of service. Rules for using our API and website.",
  alternates: { canonical: "/terms" },
};

const lastUpdated = "April 18, 2026";

const sections = [
  {
    title: "1. Who We Are",
    body: [
      "These Terms of Service govern your use of CS2Cap, an independent website and API operated by Dadscap from Quebec, Canada.",
      "References to “CS2Cap,” “we,” “us,” and “our” mean Dadscap operating cs2cap.com and related services.",
      "If you do not agree to these Terms, do not use the Service.",
    ],
  },
  {
    title: "2. Eligibility",
    body: [
      "You may use the Service only if you are at least 13 years old and legally able to enter into a binding agreement under applicable law.",
      "If you use the Service on behalf of a company or other entity, you represent that you have authority to bind that entity to these Terms.",
    ],
  },
  {
    title: "3. The Service",
    body: [
      "The Service may include the CS2Cap website, dashboard, API, documentation, status pages, alerts, notifications, and related features.",
      "We may add, remove, change, suspend, or discontinue any part of the Service at any time.",
    ],
  },
  {
    title: "4. Accounts and Authentication",
    body: [
      "Accounts are created and accessed through supported OAuth providers such as Google, Discord, or Steam.",
      "You are responsible for the security of the external account you use to sign in and for all activity that occurs through your account.",
      "You must provide accurate information where required and keep your account information reasonably up to date.",
    ],
  },
  {
    title: "5. API Keys and Access",
    body: [
      "We may issue API keys or other credentials for access to the Service.",
      "You are responsible for all activity performed using your API keys.",
      "You must not expose keys publicly or use keys in a way that bypasses plan restrictions.",
      "You must not transfer, resell, or distribute keys except where your plan or a separate written agreement expressly allows it.",
      "If a paid plan expressly allows managed child keys, sub-keys, or delegated credentials, use of those features within that plan is allowed and is not prohibited key resale.",
    ],
  },
  {
    title: "6. Plan Restrictions",
    body: [
      "Certain plans may include technical restrictions, including rate limits, quotas, concurrency controls, and feature gating.",
      "You agree not to bypass or attempt to bypass those restrictions.",
    ],
  },
  {
    title: "7. Plans, Billing, and Refunds",
    body: [
      "We offer free and paid subscription plans. Features, limits, pricing, quotas, and access rules may vary by plan and may change over time.",
      "Paid plans may be billed monthly or quarterly and renew automatically unless cancelled before renewal.",
      "Upgrades take effect immediately and are prorated on the current invoice.",
      "Downgrades take effect at the start of the next billing cycle. Until then, you keep access to your current plan.",
      "All fees are non-refundable except where required by applicable law.",
      "We may change pricing, plans, features, or limits at any time.",
      "Payments may be handled by third-party providers such as Stripe and NOWPayments, and your use of those payment methods may also be subject to their terms and policies.",
      "You are responsible for any taxes, duties, levies, or similar governmental charges associated with your use of the Service, except taxes based on our net income.",
      "You must not abuse chargebacks, payment disputes, or reversal mechanisms. We may suspend or terminate accounts and recover losses related to fraudulent or abusive chargebacks.",
    ],
  },
  {
    title: "8. Acceptable Use",
    body: [
      "You may use the Service for lawful internal business or personal use, subject to your plan and these Terms.",
      "Unless we expressly allow it in writing, you may not:",
    ],
    bullets: [
      "use the Service for unlawful purposes or in violation of applicable law or third-party rights;",
      "reverse engineer, decompile, or attempt to extract source code, methods, or non-public system behavior, except where law clearly permits it;",
      "interfere with, disrupt, attack, overload, or degrade the Service or its infrastructure;",
      "bypass or attempt to bypass authentication, rate limits, quotas, IP restrictions, or other technical controls;",
      "scrape, harvest, spider, or systematically download from the Service outside the normal documented use of the Service;",
      "use bots or automation to abuse the free tier;",
      "share credentials in an unauthorized way;",
      "resell, sublicense, redistribute, mirror, republish, or commercially exploit the Service or its outputs except as expressly permitted by your plan or a separate written agreement;",
      "use the Service to build, support, or train a competing product, dataset, model, or market-data service;",
      "benchmark or publicly compare the Service without our prior written permission;",
      "infringe intellectual property rights;",
      "misrepresent affiliation, endorsement, or source;",
      "attempt to access data or systems you are not authorized to access.",
    ],
  },
  {
    title: "9. White-Label and Enterprise Exceptions",
    body: [
      "White-label, enterprise redistribution, delegated access, and similar arrangements are allowed only under a separate written agreement.",
    ],
  },
  {
    title: "10. Third-Party Platforms and No Affiliation",
    body: [
      "CS2Cap is an independent service.",
      "Unless we explicitly say otherwise, CS2Cap is not affiliated with, endorsed by, or sponsored by Valve, Steam, Google, Discord, Stripe, NOWPayments, or any third-party marketplace, platform, or brand that may be referenced or displayed through the Service.",
      "Any marketplace names, logos, or references are used for identification, compatibility, informational, or descriptive purposes only.",
    ],
  },
  {
    title: "11. Data and Service Disclaimers",
    body: [
      "The Service includes data and analytics related to CS2 and third-party marketplaces.",
      "You acknowledge and agree that data may be delayed, incomplete, unavailable, or inaccurate.",
      "Prices, listings, metrics, analytics, and related outputs are provided for informational purposes only.",
      "Nothing in the Service is financial advice, investment advice, trading advice, legal advice, or tax advice.",
      "Third-party marketplaces, providers, and external services may change, block, rate-limit, or break functionality outside our control.",
      "Coverage, providers, endpoints, formats, methodologies, calculations, features, and availability may change at any time.",
      "Unless we expressly agree otherwise in writing, the Service is provided without any service-level agreement or uptime guarantee.",
    ],
  },
  {
    title: "12. Intellectual Property",
    body: [
      "The Service, including its website, API, software, design, branding, documentation, structure, compiled datasets, derived analytics, presentation, and related intellectual property rights, belongs to us or our licensors and is protected by law.",
      "These Terms do not give you ownership of the Service or any of its underlying intellectual property.",
      "Subject to these Terms and your plan, we grant you a limited, non-exclusive, non-transferable, revocable license to use the Service for its intended purpose.",
    ],
  },
  {
    title: "13. Feedback",
    body: [
      "If you send us ideas, suggestions, feedback, or improvement requests, we may use them without restriction and without compensation to you.",
    ],
  },
  {
    title: "14. Your Submissions",
    body: [
      "The Service is not designed as a user-content hosting platform.",
      "To the extent you submit information, messages, support requests, or other materials to us, you keep whatever rights you already have in that material, but you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, store, and process it as needed to operate, support, secure, and improve the Service and enforce these Terms.",
    ],
  },
  {
    title: "15. Suspension and Termination",
    body: [
      "We may suspend, restrict, or terminate your access to the Service at any time, with or without notice, if we believe you violated these Terms, failed to pay fees when due, created security, legal, operational, or reputational risk, or used the Service in an abusive, fraudulent, or harmful way.",
      "You may stop using the Service at any time. Cancellation of a subscription does not entitle you to a refund except where required by law.",
      "Sections that by their nature should survive termination will survive, including sections on payments owed, intellectual property, disclaimers, limitation of liability, indemnity, disputes, and general terms.",
    ],
  },
  {
    title: "16. Indemnity",
    body: [
      "To the maximum extent permitted by law, you agree to defend, indemnify, and hold harmless Dadscap, CS2Cap, and their affiliates, contractors, service providers, and representatives from and against claims, liabilities, damages, judgments, losses, costs, and expenses, including reasonable legal fees, arising out of or related to your use of the Service, your violation of these Terms, your violation of law, or your infringement of any rights of another person or entity.",
    ],
  },
  {
    title: "17. Disclaimers",
    body: [
      "To the maximum extent permitted by applicable law, the Service is provided “as is” and “as available.”",
      "We disclaim all warranties, whether express, implied, statutory, or otherwise, including any implied warranties of merchantability, fitness for a particular purpose, title, non-infringement, and any warranty arising from course of dealing or usage of trade.",
      "We do not warrant that the Service will be uninterrupted, error-free, secure, or that any data or output will be complete, accurate, or reliable.",
    ],
  },
  {
    title: "18. Limitation of Liability",
    body: [
      "To the maximum extent permitted by applicable law, we will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue, data, goodwill, business opportunity, or expected savings, even if we were advised such damages were possible.",
      "Our total liability for all claims arising out of or relating to the Service or these Terms will not exceed the total amount you paid us for the Service in the 12 months immediately before the event giving rise to the claim, or CAD $100 for free users.",
      "Nothing in these Terms excludes or limits liability to the extent such exclusion or limitation is prohibited by applicable law.",
    ],
  },
  {
    title: "19. Changes to the Service or These Terms",
    body: [
      "We may change the Service or these Terms at any time.",
      "When we update these Terms, we will post the revised version and update the “Last updated” date. Material changes may also be communicated through the Service or by email.",
      "Your continued use of the Service after the updated Terms become effective means you accept the updated Terms.",
    ],
  },
  {
    title: "20. Governing Law and Courts",
    body: [
      "These Terms are governed by the laws of the Province of Quebec and the applicable federal laws of Canada, without regard to conflict-of-laws rules.",
      "Any dispute, claim, or proceeding arising out of or relating to the Service or these Terms will be brought exclusively in the courts located in Quebec, Canada, and you consent to those courts.",
    ],
  },
  {
    title: "21. Force Majeure",
    body: [
      "We are not liable for delays, failures, or interruptions caused by events beyond our reasonable control, including failures of third-party providers, internet outages, infrastructure failures, labor disputes, cyberattacks, governmental actions, natural disasters, or similar events.",
    ],
  },
  {
    title: "22. General Terms",
    body: [
      "If any provision of these Terms is unenforceable, the rest remains in effect.",
      "Our failure to enforce any provision is not a waiver.",
      "You may not assign or transfer these Terms without our prior written consent.",
      "We may assign these Terms in connection with a merger, acquisition, reorganization, or sale of assets.",
      "These Terms, together with any plan-specific rules or separate written agreement that applies to you, are the entire agreement between you and us regarding the Service.",
    ],
  },
  {
    title: "23. Contact",
    body: [
      "Questions about these Terms should be sent to contact@cs2cap.com.",
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <section className="py-16 border-b-2 border-border">
        <div className="container max-w-3xl">
          <div className="font-mono text-xs tracking-widest text-primary mb-4">// LEGAL</div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">TERMS OF SERVICE</h1>
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
