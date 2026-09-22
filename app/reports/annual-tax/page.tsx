"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { RefreshCcw, FileText, Printer, Calendar, CheckShield, Loader2, Flag, AlertCircle } from "lucide-react";

interface AnnualDeclaration {
  id: string;
  year: string;
  status: "pending" | "generated" | "submitted" | "error";
  type: "vat" | "isb" | "retention" | "global";
  title: string;
  period: string;
  generatedAt: string | null;
  submissionDeadline: string;
  daysUntilDeadline: number;
}

interface DeclarationSection {
  id: string;
  name: string;
  type: "vat" | "isb" | "retention" | "global";
  description: string;
  requiredData: string[];
  generated: boolean;
  pdfUrl: string | null;
}

const CURRENT_YEAR = new Date().getFullYear();
const DECLARATIONS: AnnualDeclaration[] = [
  {
    id: "vat-annual",
    year: CURRENT_YEAR.toString(),
    status: "pending",
    type: "vat",
    title: "Declaración Anual ISV (Impuesto Sobre Ventas)",
    period: `${CURRENT_YEAR}-01`,
    generatedAt: null,
    submissionDeadline: `${CURRENT_YEAR}-04-25`,
    daysUntilDeadline: 0,
  },
  {
    id: "isb-annual",
    year: CURRENT_YEAR.toString(),
    status: "pending",
    type: "isb",
    title: "Declaración Anual ISR (Impuesto sobre la Renta)",
    period: `${CURRENT_YEAR}-01`,
    generatedAt: null,
    submissionDeadline: `${CURRENT_YEAR}-03-15`,
    daysUntilDeadline: 0,
  },
  {
    id: "retention-annual",
    year: CURRENT_YEAR.toString(),
    status: "pending",
    type: "retention",
    title: "Declaración Anual de Retenciones",
    period: `${CURRENT_YEAR}-01`,
    generatedAt: null,
    submissionDeadline: `${CURRENT_YEAR}-02-28`,
    daysUntilDeadline: 0,
  },
];

const DECLARATION_SECTIONS: DeclarationSection[] = [
  {
    id: "vat-summary",
    name: "Resumen IVA",
    type: "vat",
    description: "Resumen anual de ventas, compras y impuesto calculado",
    requiredData: ["total-ventas", "total-compras", "isv-calculado"],
    generated: false,
    pdfUrl: null,
  },
  {
    id: "isb-summary",
    name: "Resumen ISR",
    type: "isb",
    description: "Resumen anual de ingresos, egresos y utilidad neta",
    requiredData: ["ingresos-totales", "egresos-totales", "utilidad-neta"],
    generated: false,
    pdfUrl: null,
  },
  {
    id: "retention-summary",
    name: "Resumen de Retenciones",
    type: "retention",
    description: "Resumen anual de retenciones 1% y 12.5%",
    requiredData: ["retenciones-1porciento", "retenciones-12porciento"],
    generated: false,
    pdfUrl: null,
  },
];

function fmt(n: number) {
  return n.toLocaleString("es-HN", { style: "currency", currency: "HNL" });
}

function getStatusBadge(status: AnnualDeclaration["status"]) {
  return (
    <Badge
      variant={
        status === "pending"
          ? "outline"
          : status === "generated"
          ? "default"
          : status === "submitted"
          ? "secondary"
          : "destructive"
      }
    >
      {status}
    </Badge>
  );
}

export default function AnnualTaxDeclarationsPage() {
  const { currentTenant } = useTenant();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [selectedDeclaration, setSelectedDeclaration] = useState<AnnualDeclaration | null>(
    DECLARATIONS[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSections, setShowSections] = useState<boolean>(false);

  const loadDeclaration = useCallback(async (decl: AnnualDeclaration) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/accounting/annual-tax?year=${encodeURIComponent(decl.year)}&type=${encodeURIComponent(decl.type)}`,
        { headers: { "x-tenant-id": currentTenant?.id || "1" } }
      );
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || "Error al cargar");
      setSelectedDeclaration(body.data.declaration);
      setShowSections(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar declaración");
      setShowSections(false);
    }
    setLoading(false);
  }, [currentTenant?.id]);

  useEffect(() => {
    loadDeclaration(DECLARATIONS[0]);
  }, [loadDeclaration]);

  const generateDeclaration = useCallback(async (sectionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/accounting/annual-tax/generate?section=${encodeURIComponent(sectionId)}&year=${year}&tenantId=${currentTenant?.id || "1"}`,
        { method: "POST" }
      );
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || "Error al generar");
      setSelectedDeclaration(body.data.declaration);
      setShowSections(true);
      alert("✅ Declaración generada exitosamente");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al generar declaración");
      alert("❌ Error al generar la declaración");
    }
    setLoading(false);
  }, [year, currentTenant?.id]);

  const submitDeclaration = useCallback(async (sectionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/accounting/annual-tax/submit?section=${encodeURIComponent(sectionId)}&year=${year}&tenantId=${currentTenant?.id || "1"}`,
        { method: "POST" }
      );
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || "Error al enviar");
      setSelectedDeclaration(body.data.declaration);
      alert("✅ Declaración enviada exitosamente a la autoridad fiscal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar declaración");
      alert("❌ Error al enviar la declaración");
    }
    setLoading(false);
  }, [year, currentTenant?.id]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            <Calendar className="w-6 h-6 text-cyan-600" /> Declaraciones Anuales
          </h1>
          <p className="text-sm text-gray-500">
            Declaraciones fiscales para el año {year}
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            min={2000}
            max={CURRENT_YEAR + 5}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="mt-1"
          />
          <Button variant="outline" size="sm" onClick={() => loadDeclaration(DECLARATIONS[0])}>
            <Loader2 className="w-4 h-4 mr-2" /> Cargar
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {selectedDeclaration && (
        <Card>
          <CardHeader className="p-2">
            <CardTitle className="text-sm text-gray-500">
              {selectedDeclaration.title} - {selectedDeclaration.year}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">Estado:</span>
              <span>{getStatusBadge(selectedDeclaration.status)}</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">
                Vence: {selectedDeclaration.submissionDeadline}
              </span>
              {selectedDeclaration.daysUntilDeadline >= 0 && (
                <span className="text-xs text-gray-500">
                  Faltan {selectedDeclaration.daysUntilDeadline} días
                </span>
              )}
            </div>

            {showSections && selectedDeclaration.type === "vat" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {DECLARATION_SECTIONS.map((section) => (
                  <Card key={section.id} className="p-4">
                    <CardHeader>
                      <CardTitle className="text-sm text-gray-500">{section.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-500">{section.description}</p>
                      <p className="text-xs text-gray-500 mb-2">Datos requeridos: {section.requiredData.join(", ")}</p>
                      <Button
                        variant={section.generated ? "default" : "outline"}
                        size="sm"
                        onClick={() => generateDeclaration(section.id)}
                      >
                        {section.generated ? "Generado" : "Generar"}
                      </Button>
                      {section.pdfUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(pdfUrl, "_blank")}
                        >
                          <FileText className="w-3 h-3 mr-1" /> Ver PDF
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : showSections && selectedDeclaration.type === "isb" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {DECLARATION_SECTIONS.map((section) => (
                  <Card key={section.id} className="p-4">
                    <CardHeader>
                      <CardTitle className="text-sm text-gray-500">{section.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-500">{section.description}</p>
                      <p className="text-xs text-gray-500 mb-2">Datos requeridos: {section.requiredData.join(", ")}</p>
                      <Button
                        variant={section.generated ? "default" : "outline"}
                        size="sm"
                        onClick={() => generateDeclaration(section.id)}
                      >
                        {section.generated ? "Generado" : "Generar"}
                      </Button>
                      {section.pdfUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(pdfUrl, "_blank")}
                        >
                          <FileText className="w-3 h-3 mr-1" /> Ver PDF
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : showSections && selectedDeclaration.type === "retention" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {DECLARATION_SECTIONS.map((section) => (
                  <Card key={section.id} className="p-4">
                    <CardHeader>
                      <CardTitle className="text-sm text-gray-500">{section.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-500">{section.description}</p>
                      <p className="text-xs text-gray-500 mb-2">Datos requeridos: {section.requiredData.join(", ")}</p>
                      <Button
                        variant={section.generated ? "default" : "outline"}
                        size="sm"
                        onClick={() => generateDeclaration(section.id)}
                      >
                        {section.generated ? "Generado" : "Generar"}
                      </Button>
                      {section.pdfUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(pdfUrl, "_blank")}
                        >
                          <FileText className="w-3 h-3 mr-1" /> Ver PDF
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {!selectedDeclaration && (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Selecciona un año y tipo de declaración para comenzar</p>
        </div>
      )}
    </div>
  );
}