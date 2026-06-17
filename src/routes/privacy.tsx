import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CRE8IVE" },
      { name: "description", content: "How CRE8IVE collects, uses, and protects your personal information." },
      { property: "og:title", content: "Privacy Policy — CRE8IVE" },
      { property: "og:description", content: "How CRE8IVE handles your data." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="font-display text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: June 17, 2026</p>

        <div className="prose prose-invert mt-10 max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. What we collect</h2>
            <p>Account info (email, display name, username, avatar), profile content (bio, portfolio, skills, location), messages and applications, and basic usage data (logs, device info) needed to operate the Service.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">2. How we use it</h2>
            <p>To run the marketplace — authenticating you, displaying your public profile, delivering messages and notifications, preventing abuse, and improving the product. We do not sell personal data.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Public profile</h2>
            <p>Information you choose to put on your creator profile (display name, username, bio, portfolio, location) is public and indexable by search engines. Email and private messages are not public.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Third parties</h2>
            <p>We rely on infrastructure providers to host the app, store files, send transactional email, and provide Google Sign-In. These providers process data on our behalf under their own privacy terms.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Cookies</h2>
            <p>We use cookies and local storage to keep you signed in and remember preferences. We do not use third-party advertising cookies.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Data retention</h2>
            <p>We keep your data for as long as your account is active. When you delete your account, we remove personal data within 30 days, except where retention is required by law.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Your rights</h2>
            <p>You can access, update, or export your data from the dashboard, and request deletion of your account. EU/UK and California residents have additional rights under GDPR and CCPA — contact us to exercise them.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Security</h2>
            <p>We use industry-standard encryption in transit and at rest. No system is perfect — please use a strong, unique password.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Children</h2>
            <p>CRE8IVE is not intended for users under 16. We do not knowingly collect data from children.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Changes & contact</h2>
            <p>We will notify users of material changes to this policy. For questions, contact us via your dashboard support channel.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
