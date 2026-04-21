import { createTransactionBatch } from "@/app/app/actions/import-actions";
import { db } from "@/lib/db";

export async function processImportInBatches(
  allTransactions: any[], 
  onProgress: (percent: number) => void
) {
  const BATCH_SIZE = 50;
  const total = allTransactions.length;
  let processed = 0;
  let duplicatesFound = 0;

  // Fetch entire Account table once at the start
  console.log('Fetching all accounts for lookup...');
  const accounts = await db.account.findMany({
    select: {
      id: true,
      code: true,
      name: true,
    }
  });

  // Create Map for fast lookups (Code -> ID)
  const codeToIdMap = new Map();
  accounts.forEach((account: { id: string; code: string; name: string }) => {
    codeToIdMap.set(account.code, account.id);
  });

  console.log(`Loaded ${accounts.length} accounts into memory map`);

  // Check for existing transactions to prevent duplicates
  console.log('Checking for existing transactions...');
  const existingTransactions = await (db as any).transaction.findMany({
    select: {
      date: true,
      description: true,
      amount: true, // We'll check entries amounts
    },
    include: {
      entries: {
        select: {
          amount: true,
        }
      }
    }
  });

  // Create a Set of existing transaction signatures for fast lookup
  const existingSignatures = new Set();
  existingTransactions.forEach((tx: { 
    date: Date; 
    description: string; 
    entries: { amount: bigint }[] 
  }) => {
    const totalAmount = tx.entries.reduce((sum: number, entry: { amount: bigint }) => sum + Number(entry.amount), 0);
    const signature = `${tx.date.toISOString().split('T')[0]}|${tx.description}|${totalAmount}`;
    existingSignatures.add(signature);
  });

  console.log(`Found ${existingTransactions.length} existing transactions in database`);

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = allTransactions.slice(i, i + BATCH_SIZE);
    
    // Check for duplicates in this batch
    const validTransactions = batch.filter((tx: any) => {
      const totalAmount = tx.entries.reduce((sum: number, entry: { amount: bigint }) => sum + Number(entry.amount), 0);
      const signature = `${new Date(tx.date).toISOString().split('T')[0]}|${tx.description}|${totalAmount}`;
      
      if (existingSignatures.has(signature)) {
        duplicatesFound++;
        return false; // Skip this duplicate
      }
      
      return true;
    });

    if (validTransactions.length === 0) {
      console.log(`Skipping batch ${Math.floor(i / BATCH_SIZE) + 1} - all transactions are duplicates`);
      processed += batch.length;
      onProgress(Math.round((processed / total) * 100));
      continue;
    }

    // Validate all account codes in this batch before processing
    const invalidCodes = validTransactions
      .map(tx => tx.accountId)
      .filter(accountId => !codeToIdMap.has(accountId));

    if (invalidCodes.length > 0) {
      throw new Error(`Invalid account codes found: ${invalidCodes.join(', ')}`);
    }
    
    // Map account codes to database IDs for this batch
    const validatedBatch = validTransactions.map(tx => ({
      ...tx,
      accountId: codeToIdMap.get(tx.accountId)
    }));
    
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(total / BATCH_SIZE)} (${validatedBatch.length} transactions, ${batch.length - validatedBatch.length} duplicates skipped)`);
    
    // Send 50 transactions to server at once
    const result = await createTransactionBatch(validatedBatch);
    
    if (!result.success) {
      // Generate downloadable error log
      const errorLog = [
        `Import Error - Batch ${Math.floor(i / BATCH_SIZE) + 1}`,
        `Timestamp: ${new Date().toISOString()}`,
        `Error: ${result.error}`,
        `Failed Transactions:`,
        ...validatedBatch.map((tx: any, index: number) => (
          `  ${index + 1}. Date: ${tx.date}, Description: ${tx.description}, Account: ${tx.accountId}, Amount: ${tx.amount}`
        ))
      ];
      
      const errorLogContent = errorLog.join('\n');
      const errorBlob = new Blob([errorLogContent], { type: 'text/plain' });
      const errorUrl = URL.createObjectURL(errorBlob);
      
      // Create download link
      const errorLink = document.createElement('a');
      errorLink.href = errorUrl;
      errorLink.download = `import-error-${new Date().toISOString().split('T')[0]}-batch-${Math.floor(i / BATCH_SIZE) + 1}.txt`;
      document.body.appendChild(errorLink);
      errorLink.click();
      document.body.removeChild(errorLink);
      URL.revokeObjectURL(errorUrl);
      
      throw new Error(`Failed at batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.error}`);
    }

    processed += batch.length;
    onProgress(Math.round((processed / total) * 100));
  }

  console.log(`Import completed! Processed ${total - duplicatesFound} unique transactions, skipped ${duplicatesFound} duplicates`);
  
  return {
    totalProcessed: total - duplicatesFound,
    duplicatesSkipped: duplicatesFound
  };
}