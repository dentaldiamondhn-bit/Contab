'use client';

import { TenantHeader } from "@/components/dashboard/TenantHeader";

interface HeaderProps {
  tenants: any[];
}

export default function Header({ tenants }: HeaderProps) {
  return <TenantHeader tenants={tenants} />;
}
