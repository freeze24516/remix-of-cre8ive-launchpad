import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — CRE8IVE" },
      { name: "description", content: "The terms and conditions for using the CRE8IVE creative marketplace." },
      { property: "og:title", content: "Terms of Service — CRE8IVE" },
      { property: "og:description", content: "The terms and conditions for using CRE8IVE." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="font-display text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: June 17, 2026</p>

        <div className="prose prose-invert mt-10 max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of terms</h2>
            <p>By creating an account or using CRE8IVE ("the Service"), you agree to be bound by these Terms. If you do not agree, do not use the Service.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Eligibility</h2>
            <p>You must be at least 16 years old and able to form a binding contract in your jurisdiction. Accounts may not be shared or transferred.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Accounts and conduct</h2>
            <p>You are responsible for activity under your account, for the accuracy of your profile information, and for keeping your password secure. Harassment, spam, fraudulent listings, and infringement of intellectual property are prohibited and may result in account termination.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Creator and client relationships</h2>
            <p>CRE8IVE is a marketplace that connects clients with creators. We are not a party to agreements made between users. Both parties are responsible for negotiating, performing, and paying for work, and for complying with applicable laws and tax obligations.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Content and intellectual property</h2>
            <p>You retain ownership of content you upload. You grant CRE8IVE a worldwide, royalty-free license to host, display, and distribute that content to operate the Service. Do not upload content you do not have the right to share.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Fees</h2>
            <p>Use of the marketplace is currently free during early access. We may introduce service fees in the future with prior notice.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Termination</h2>
            <p>We may suspend or terminate accounts that violate these Terms or harm other users. You may close your account at any time from the dashboard.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Disclaimer</h2>
            <p>The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, CRE8IVE is not liable for indirect or consequential damages arising from use of the Service.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Changes</h2>
            <p>We may update these Terms from time to time. Material changes will be announced in-app or by email.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
            <p>Questions about these Terms? Contact us through your dashboard support channel.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
