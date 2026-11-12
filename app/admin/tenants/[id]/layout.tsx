"use client";

import { ReactNode } from 'react';

// This layout overrides the tenant-admin layout for admin tenant pages
export default function AdminTenantLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
