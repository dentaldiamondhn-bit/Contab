import { db } from "@/lib/db";

interface AccountWithBalance {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId?: string;
  level: number;
  debitMovement: number;
  creditMovement: number;
  finalBalance: number;
  hasChildren: boolean;
  isParent: boolean;
}

export async function getTrialBalance(startDate: Date, endDate: Date): Promise<AccountWithBalance[]> {
  // 1. Fetch all accounts and their entries within the period
  const accounts = await db.account.findMany({
    include: {
      entries: {
        where: {
          transaction: {
            date: { gte: startDate, lte: endDate }
          }
        }
      },
      children: true,
      parent: true
    },
    orderBy: { code: 'asc' }
  });

  // 2. Calculate balances for leaf accounts (accounts with entries)
  const accountBalances = new Map<string, AccountWithBalance>();
  
  accounts.forEach((account: { id: string; code: string; name: string; type: string; parentId?: string; entries: { amount: string }[]; children: any[] }) => {
    let debits = 0;
    let credits = 0;

    account.entries.forEach((entry: { amount: string }) => {
      const val = Number(entry.amount);
      if (val > 0) debits += val;
      else credits += Math.abs(val);
    });

    accountBalances.set(account.id, {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      parentId: account.parentId,
      level: getAccountLevel(account.code),
      debitMovement: debits,
      creditMovement: credits,
      finalBalance: debits - credits,
      hasChildren: account.children.length > 0,
      isParent: account.children.length > 0
    });
  });

  // 3. Calculate hierarchical sub-totals
  const hierarchy = buildAccountHierarchy(accounts);
  calculateSubTotals(hierarchy, accountBalances);

  // 4. Convert to flat array sorted by code
  return Array.from(accountBalances.values()).sort((a, b) => a.code.localeCompare(b.code));
}

function getAccountLevel(code: string): number {
  // Count dots to determine hierarchy level
  // "1" -> level 1, "1.1" -> level 2, "1.1.01" -> level 3
  return code.split('.').length;
}

function buildAccountHierarchy(accounts: any[]): Map<string, string[]> {
  const hierarchy = new Map<string, string[]>();
  
  // Build parent -> children mapping
  accounts.forEach(account => {
    if (account.parentId) {
      if (!hierarchy.has(account.parentId)) {
        hierarchy.set(account.parentId, []);
      }
      hierarchy.get(account.parentId)!.push(account.id);
    }
  });
  
  return hierarchy;
}

function calculateSubTotals(
  hierarchy: Map<string, string[]>, 
  accountBalances: Map<string, AccountWithBalance>
): void {
  // Get all parent accounts (accounts that have children)
  const parentAccounts = Array.from(hierarchy.keys());
  
  // Calculate sub-totals from bottom up
  const processed = new Set<string>();
  
  function calculateParentTotal(parentId: string): { debits: number; credits: number } {
    if (processed.has(parentId)) {
      const parent = accountBalances.get(parentId);
      return parent ? { debits: parent.debitMovement, credits: parent.creditMovement } : { debits: 0, credits: 0 };
    }
    
    let totalDebits = 0;
    let totalCredits = 0;
    
    const children = hierarchy.get(parentId) || [];
    
    children.forEach(childId => {
      // If child is also a parent, calculate its total first
      if (hierarchy.has(childId)) {
        const childTotals = calculateParentTotal(childId);
        totalDebits += childTotals.debits;
        totalCredits += childTotals.credits;
      } else {
        // Child is a leaf account, use its direct balance
        const child = accountBalances.get(childId);
        if (child) {
          totalDebits += child.debitMovement;
          totalCredits += child.creditMovement;
        }
      }
    });
    
    // Update parent account balance
    const parent = accountBalances.get(parentId);
    if (parent) {
      parent.debitMovement = totalDebits;
      parent.creditMovement = totalCredits;
      parent.finalBalance = totalDebits - totalCredits;
    }
    
    processed.add(parentId);
    return { debits: totalDebits, credits: totalCredits };
  }
  
  // Process all parent accounts
  parentAccounts.forEach(parentId => {
    calculateParentTotal(parentId);
  });
}