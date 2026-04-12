export function suggestMatches(bankRows: any[], ledgerEntries: any[]) {
  return bankRows.map(bankRow => {
    // Find internal entries with the same amount and a date within +/- 3 days
    const potentialMatches = ledgerEntries.filter(ledger => {
      const sameAmount = Math.abs(ledger.amount) === Math.abs(bankRow.amount);
      const closeDate = Math.abs(ledger.date.getTime() - bankRow.date.getTime()) < (3 * 24 * 60 * 60 * 1000);
      return sameAmount && closeDate && !ledger.cleared;
    });

    return {
      bankRow,
      suggestedId: potentialMatches[0]?.id || null,
      confidence: (potentialMatches.length === 1 ? 'HIGH' : 'LOW') as 'HIGH' | 'LOW'
    };
  });
}