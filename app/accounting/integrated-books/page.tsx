import IntegratedBooksViewer from '@/components/accounting/IntegratedBooksViewer';

export default function IntegratedBooksPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Libros Contables Integrados</h1>
        <p className="text-muted-foreground">
          Visualización integrada de libros de ingresos, egresos, diario, mayor y balance de comprobación
        </p>
      </div>
      
      <IntegratedBooksViewer />
    </div>
  );
}
