import AccountingBooks from "@/components/accounting/AccountingBooks";
import AccountingBooksTest from "@/components/accounting/AccountingBooksTest";

export const dynamic = 'force-dynamic';

import { Suspense } from "react";

export default function BooksPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<div className="p-8 text-center">Cargando libros...</div>}>
        <AccountingBooks />
      </Suspense>
      {/* 
        Comenta la línea de arriba y descomenta la de abajo 
        para usar el componente de prueba para diagnóstico
      */}
      {/* <AccountingBooksTest /> */}
    </div>
  );
}
