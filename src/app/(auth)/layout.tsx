import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "../../components/layouts/AuthLayout";
import { serverApi } from "@/lib/api/server";
import { PostHogIdentify } from "@/components/PostHogIdentify";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutContent>{children}</AuthLayoutContent>;
}

async function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const session = await serverApi.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <AuthLayout>
      <PostHogIdentify />
      {children}
    </AuthLayout>
  );
}
