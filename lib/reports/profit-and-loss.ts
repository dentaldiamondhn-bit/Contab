enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY', 
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

interface AccountReport {
  name: string;
  type: AccountType;
  total: number;
}

export async function getPnLData(startDate: Date, endDate: Date) {
  try {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const response = await fetch(
      `/api/reports/pnl?startDate=${startDateStr}&endDate=${endDateStr}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch P&L data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching P&L data:', error);
    throw error;
  }
}