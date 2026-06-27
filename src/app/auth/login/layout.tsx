import type { Metadata } from "next";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  robots: robotsNoIndex,
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted/30">{children}</div>;
}
