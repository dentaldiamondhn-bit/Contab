"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Plus, 
  Settings, 
  Users,
  Eye,
  Edit,
  Trash2,
  Copy,
  Download
} from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);

  // Datos de ejemplo - en producción vendrían de la API
  useEffect(() => {
    const mockCompanies: CompanyAccounting[] = [
      {
        id: "1",
        name: "Dental Diamond Center",
        rtn: "08011999012345",
        industry: "Salud",
        accountingSetupComplete: true,
        accountsCount: 45,
        transactionsCount: 127,
        lastActivity: "2024-01-17",
        status: "active"
      },
      {
        id: "2", 
        name: "Clínica Médica San José",
        rtn: "08011999067890",
        industry: "Salud",
        accountingSetupComplete: false,
        accountsCount: 12,
        transactionsCount: 0,
        lastActivity: "Nunca",
        status: "setup"
      },
      {
        id: "3",
        name: "Laboratorio Dental Pro",
        rtn: "08011999054321",
        industry: "Salud",
        accountingSetupComplete: true,
        accountsCount: 38,
        transactionsCount: 89,
        lastActivity: "2024-01-15",
        status: "active"
      }
    ];
    setCompanies(mockCompanies);
  }, []);

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-red-100 text-red-800", 
      setup: "bg-yellow-100 text-yellow-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusText = (status: string) => {
    const texts = {
      active: "Activo",
      inactive: "Inactivo",
      setup: "Configuración Requerida",
    };
    return texts[status as keyof typeof texts] || "Desconocido";
  };

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompany(companyId);
    // Aquí iría la lógica para cambiar el tenant activo
    console.log("Seleccionando empresa:", companyId);
  };

  const handleSetupAccounting = async (companyId: string) => {
    setIsLoading(true);
    try {
      // Aquí iría la llamada a la API para configurar contabilidad
      console.log("Configurando contabilidad para empresa:", companyId);
      
      // Simulación de setup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Actualizar estado
      setCompanies(prev => prev.map(company => 
        company.id === companyId 
          ? { ...company, accountingSetupComplete: true, status: "active" as const }
          : company
      ));
    } catch (error) {
      console.error("Error configurando contabilidad:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloneAccounting = async (sourceCompanyId: string, targetCompanyId: string) => {
    try {
      // Aquí iría la lógica para clonar configuración contable
      console.log("Clonando configuración de", sourceCompanyId, "a", targetCompanyId);
      
      // Simulación
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert("Configuración contable clonada exitosamente");
    } catch (error) {
      console.error("Error clonando configuración:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestión Multi-Empresa</h1>
        <p className="text-gray-600">
          Administra la contabilidad para todas tus empresas desde un solo lugar
        </p>
      </div>

      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
            <p className="text-xs text-muted-foreground">
              {companies.filter(c => c.status === "active").length} activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configuraciones Completas</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.filter(c => c.accountingSetupComplete).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Listas para operar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cuentas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.reduce((sum, c) => sum + c.accountsCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Todas las empresas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transacciones</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.reduce((sum, c) => sum + c.transactionsCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Empresas */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Empresas</CardTitle>
              <CardDescription>
                Selecciona una empresa para gestionar su contabilidad
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Empresa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {companies.map((company) => (
              <div 
                key={company.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedCompany === company.id 
                    ? 'border-cyan-500 bg-cyan-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSelectCompany(company.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{company.name}</h3>
                      <p className="text-sm text-gray-600">RTN: {company.rtn}</p>
                      <p className="text-sm text-gray-600">Industria: {company.industry}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge className={getStatusColor(company.status)}>
                          {getStatusText(company.status)}
                        </Badge>
                        <Badge variant="outline">
                          {company.accountsCount} cuentas
                        </Badge>
                        <Badge variant="outline">
                          {company.transactionsCount} transacciones
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {company.accountingSetupComplete ? (
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetupAccounting(company.id);
                        }}
                        disabled={isLoading}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        {isLoading ? "Configurando..." : "Configurar"}
                      </Button>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Lógica para editar
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    {company.accountingSetupComplete && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Lógica para clonar configuración a otras empresas
                          handleCloneAccounting(company.id, companies.find(c => c.id !== company.id && !c.accountingSetupComplete)?.id || "");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Lógica para eliminar
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {company.accountingSetupComplete && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Última actividad:</span>
                      <span>{company.lastActivity}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Acciones Globales */}
      {selectedCompany && (
        <Card>
          <CardHeader>
            <CardTitle>Acciones para Empresa Seleccionada</CardTitle>
            <CardDescription>
              Gestiona la contabilidad de la empresa seleccionada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button className="h-20 flex-col space-y-2">
                <Plus className="h-6 w-6" />
                <span>Nueva Póliza</span>
              </Button>
              
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <Settings className="h-6 w-6" />
                <span>Catálogo de Cuentas</span>
              </Button>
              
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <Download className="h-6 w-6" />
                <span>Exportar Datos</span>
              </Button>
              
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <Copy className="h-6 w-6" />
                <span>Clonar Configuración</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
