import { NextResponse } from 'next/server';
import { TransactionService } from '@/lib/services/transaction-service-enhanced';
import { ExchangeRateService } from '@/lib/services/exchange-rate-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create':
        const transaction = await TransactionService.createTransaction(data);
        return NextResponse.json({
          success: true,
          transaction,
          message: 'Transaction created successfully'
        });

      case 'getWithHistory':
        const transactionId = data.transactionId;
        const transactionWithHistory = await TransactionService.getTransactionWithHistory(transactionId);
        return NextResponse.json({
          success: true,
          transaction: transactionWithHistory
        });

      case 'getFiltered':
        const transactions = await TransactionService.getTransactionsWithCurrencyFilter(data);
        return NextResponse.json({
          success: true,
          transactions
        });

      case 'currencyReport':
        const report = await TransactionService.getCurrencyConversionReport(data);
        return NextResponse.json({
          success: true,
          report
        });

      case 'revalueate':
        const { startDate, endDate, targetCurrency } = data;
        const revaluation = await TransactionService.revalueateTransactions(new Date(startDate), new Date(endDate), targetCurrency || 'HNL');
        return NextResponse.json({
          success: true,
          revaluation
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in enhanced transaction service:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'initializeRates':
        await ExchangeRateService.initializeDefaultRates();
        return NextResponse.json({
          success: true,
          message: 'Default exchange rates initialized'
        });

      case 'currentRates':
        const fromCurrency = searchParams.get('from') || 'USD';
        const toCurrency = searchParams.get('to') || 'HNL';
        const rate = await ExchangeRateService.getCurrentRate(fromCurrency, toCurrency);
        return NextResponse.json({
          success: true,
          fromCurrency,
          toCurrency,
          rate
        });

      case 'historicalRates':
        const histFromCurrency = searchParams.get('from') || 'USD';
        const histToCurrency = searchParams.get('to') || 'HNL';
        const startDate = new Date(searchParams.get('startDate') || Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = new Date(searchParams.get('endDate') || Date.now());
        
        const rates = await ExchangeRateService.getHistoricalRates(histFromCurrency, histToCurrency, startDate, endDate);
        return NextResponse.json({
          success: true,
          rates
        });

      default:
        // Return current rates for all currency pairs
        const rateData = [
          { from: 'USD', to: 'HNL', rate: await ExchangeRateService.getCurrentRate('USD', 'HNL') },
          { from: 'EUR', to: 'HNL', rate: await ExchangeRateService.getCurrentRate('EUR', 'HNL') },
          { from: 'GBP', to: 'HNL', rate: await ExchangeRateService.getCurrentRate('GBP', 'HNL') }
        ];
        
        return NextResponse.json({
          success: true,
          rates: rateData
        });
    }
  } catch (error) {
    console.error('Error in enhanced transaction service GET:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
