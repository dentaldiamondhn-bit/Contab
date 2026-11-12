import AccountingBooks from "@/components/accounting/AccountingBooks";

export default function CompanyBookPage() {
  console.log("🔍 Debug - CompanyBookPage rendered");
  
  return (
    <div className="container mx-auto py-6">
      <AccountingBooks />
    </div>
  );
}
