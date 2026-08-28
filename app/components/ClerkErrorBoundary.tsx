"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

class ClerkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Clerk Error Boundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
    setTimeout(() => window.location.reload(), 100);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Error de conexion
              </h2>
              <p className="text-gray-600 mb-2">
                No se pudo conectar con el servidor de autenticacion.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Esto puede deberse a una conexion a internet inestable o al servicio de autenticacion temporalmente no disponible.
              </p>
              {this.state.retryCount < 5 && (
                <Button onClick={this.handleRetry} className="flex items-center gap-2 mx-auto">
                  <RefreshCw className="w-4 h-4" />
                  Reintentar ({this.state.retryCount}/5)
                </Button>
              )}
              {this.state.retryCount >= 5 && (
                <div>
                  <p className="text-sm text-red-600 mb-4">
                    Se agotaron los reintentos. Verifique su conexion a internet.
                  </p>
                  <Button onClick={() => window.location.href = "/auth/login"} variant="outline">
                    Ir a Inicio de Sesion
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ClerkErrorBoundary;
