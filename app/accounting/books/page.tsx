import AccountingBooks from "@/components/accounting/AccountingBooks";
import AccountingBooksTest from "@/components/accounting/AccountingBooksTest";

export default function BooksPage() {
  return (
    <div className="container mx-auto py-6">
      <AccountingBooks />
      {/* 
        Comenta la línea de arriba y descomenta la de abajo 
        para usar el componente de prueba para diagnóstico
      */}
      {/* <AccountingBooksTest /> */}
    </div>
  );
}
