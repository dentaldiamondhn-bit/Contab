"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Eye, Loader2 } from "lucide-react";
import { useTenant } from "@/lib/contexts/TenantContext";

interface CompanyAccounting {
  id: string;
  name: string;
  rtn: string;
  industry: string;
  accountingSetupComplete: boolean;
  accountsCount: number;
  transactionsCount: number;
  lastActivity: string;
  status: "active" | "inactive" | "setup";
}

export default function MultiTenantAccountingManager() {
  const { currentTenant } = useTenant();
  const [companies, setCompanies] = useState<CompanyAccounting[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/tenants");
      if (res.ok) {
        const data = await res.json();
        setCompanies(
          (data || []).map((t: any) => ({
            id: t.id,
            name: t.businessName || t.name || t.id,
            rtn: t.rtn || "",
            industry: t.industry || "General",
            accountingSetupComplete: true,
            accountsCount: 0,
            transactionsCount: 0,
            lastActivity: t.updatedAt || t.createdAt || "",
            status: "active" as const,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading tenants:", error);
    }
    setIsLoading(false);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-red-100 text-red-800",
      setup: "bg-yellow-100 text-yellow-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      active: "Activo",
      inactive: "Inactivo",
      setup: "Configuración Requerida",
    };
    return texts[status] || "Desconocido";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Gestión Multi-Tenant</h2>
        <p className="text-gray-600">Administra las cuentas contables de las empresas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Empresas</span>
          </CardTitle>
          <CardDescription>Selecciona una empresa para gestionar su contabilidad</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-500">Cargando empresas...</span>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay empresas configuradas
            </div>
          ) : (
            <div className="space-y-4">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedCompany === company.id
                      ? "border-blue-500 bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedCompany(company.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">{company.name}</h3>
                        <p className="text-sm text-gray-500">RTN: {company.rtn}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(company.status)}>
                        {getStatusText(company.status)}
                      </Badge>
                      {selectedCompany === company.id && (
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Seleccionar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
