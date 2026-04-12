import { NextResponse } from 'next/server';
import { ISVCalculator } from '@/lib/tax/isv-config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, categoryId, description, autoCategorize = false } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    let category;
    if (autoCategorize && description) {
      category = ISVCalculator.autoCategorizeItem(description);
    } else if (categoryId) {
      category = ISVCalculator.getCategoryById(categoryId);
      if (!category) {
        return NextResponse.json({ error: 'Invalid ISV category' }, { status: 400 });
      }
    } else {
      category = ISVCalculator.getStandardCategory();
    }

    const calculation = await ISVCalculator.calculateISV(amount, category, true);

    return NextResponse.json({
      success: true,
      calculation: {
        ...calculation,
        formattedAmounts: {
          subtotal: `L. ${calculation.subtotal.toFixed(2)}`,
          isvAmount: `L. ${calculation.isvAmount.toFixed(2)}`,
          total: `L. ${calculation.total.toFixed(2)}`
        }
      }
    });

  } catch (error) {
    console.error('Error calculating ISV:', error);
    return NextResponse.json({ error: 'Failed to calculate ISV' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const description = searchParams.get('description');

    const categories = [
      {
        id: 'standard',
        name: 'ISV Estándar (15%)',
        rate: 'standard',
        description: 'Aplicable a la mayoría de bienes y servicios'
      },
      {
        id: 'special',
        name: 'ISV Especial (18%)',
        rate: 'special',
        description: 'Aplicable a alcohol y tabaco'
      }
    ];

    let suggestedCategory = categories[0]; // Default to standard
    if (description) {
      suggestedCategory = ISVCalculator.autoCategorizeItem(description);
    }

    return NextResponse.json({
      categories,
      suggestedCategory: suggestedCategory.id
    });

  } catch (error) {
    console.error('Error getting ISV categories:', error);
    return NextResponse.json({ error: 'Failed to get ISV categories' }, { status: 500 });
  }
}
