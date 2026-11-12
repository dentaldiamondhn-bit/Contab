import AccountingBooks from "@/components/accounting/AccountingBooks";

export default function CompanyBooksPage() {
  console.log("🔍 Debug - CompanyBooksPage rendered");
  
  return (
    <div className="container mx-auto py-6">
      <AccountingBooks />
    </div>
  );
}
