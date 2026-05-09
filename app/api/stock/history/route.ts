import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1mo';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  // Handle common crypto symbols
  let searchSymbol = symbol;
  const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'BNB', 'DOGE'];
  if (cryptoSymbols.includes(symbol.toUpperCase())) {
    searchSymbol = `${symbol}-USD`;
  }

  // Map range to Yahoo API parameters
  let interval = '1d';
  let yahooRange = '1mo';

  switch (range) {
    case '1w':
      yahooRange = '5d';
      interval = '1d';
      break;
    case '1mo':
      yahooRange = '1mo';
      interval = '1d';
      break;
    case '3mo':
      yahooRange = '3mo';
      interval = '1d';
      break;
    case '1y':
      yahooRange = '1y';
      interval = '1wk';
      break;
    case '1d':
      yahooRange = '1d';
      interval = '1m';
      break;
    default:
      yahooRange = '1mo';
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${searchSymbol}?range=${yahooRange}&interval=${interval}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.chart?.result?.[0]) {
      throw new Error('Invalid response from Yahoo Finance');
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0].close || [];
    const adjClose = result.indicators.adjclose?.[0]?.adjclose || [];

    // Formatted data for charts
    const formattedData = timestamps.map((ts: number, index: number) => ({
      date: new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: adjClose[index] || quotes[index],
    })).filter((item: any) => item.price !== null && item.price !== undefined);

    // If we have a regularMarketPrice in meta, that's often the most reliable current price
    let currentPrice = meta.regularMarketPrice;

    // If it's 1d and we have a list of prices, take the last one as fallback
    if (!currentPrice && formattedData.length > 0) {
      currentPrice = formattedData[formattedData.length - 1].price;
    }

    if (range === '1d' && currentPrice) {
      return NextResponse.json([{
        date: new Date(meta.regularMarketTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: currentPrice
      }]);
    }

    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error('Yahoo API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch stock data', 
      details: error.message 
    }, { status: 500 });
  }
}
