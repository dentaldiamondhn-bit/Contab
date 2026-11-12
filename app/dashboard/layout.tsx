"use client";

import { AppShell } from "@/components/dashboard/AppShell";

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
