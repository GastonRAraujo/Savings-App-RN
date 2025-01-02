import { PortfolioItem, PortfolioValue } from '@/app/types';  

/**
 * Gets the most recent portfolio value from `PortfolioValue`.
 * If none exists, compute from the current portfolio, store it, and return it.
 */
export async function getLatestPortfolioValue(db: any): Promise<PortfolioValue | null> {
  try {
    // 1) Attempt to get the most recent snapshot
    const query = `
      SELECT priceARS, priceUSD, date
      FROM PortfolioValue
      ORDER BY date DESC
      LIMIT 1
    `;
    const row = await db.getFirstAsync(query); // getFirstAsync returns the first row or null
    if (row) {
      console.debug('Found existing PortfolioValue:', row);
      return {
        priceARS: row.priceARS,
        priceUSD: row.priceUSD,
        date: row.date,
      };
    }

    // 2) If no existing row in `PortfolioValue`, compute from the portfolio
    const items = await getAllPortfolioItems(db);
    if (!items || items.length === 0) {
      // If we also have no items in the portfolio, we can’t calculate a real value.
      // Return null or handle differently as needed.
      console.debug('No items found in Portfolio, cannot compute value.');
      return null;
    }

    // Example summation logic:
    let totalValueARS = 0;
    let totalValueUSD = 0;

    // Sum up each item’s "amount * lastPrice" (or another relevant metric)
    for (const item of items) {
      const itemValueARS = item.amount * item.lastPriceARS;
      const itemValueUSD = item.amount * item.lastPriceUSD;
      totalValueARS += itemValueARS;
      totalValueUSD += itemValueUSD;
    }

    console.log('Computed PortfolioValue:', { totalValueARS, totalValueUSD });
    // Insert the newly computed snapshot into `PortfolioValue`
    const date = new Date().toISOString();
    const insertQuery = `
      INSERT INTO PortfolioValue (priceARS, priceUSD, date)
      VALUES (?, ?, ?)
    `;
    await db.runAsync(insertQuery, [totalValueARS, totalValueUSD, date]);
    console.debug('Inserted new PortfolioValue:', { totalValueARS, totalValueUSD, date });
    // Return the newly inserted snapshot
    return {
      priceARS: totalValueARS,
      priceUSD: totalValueUSD,
      date,
    };
  } catch (error) {
    console.error('Error getting latest portfolio value:', error);
    return null;
  }
}

/**
 * Get the previous PortfolioValue snapshot
 */
export async function getPreviousPortfolioValue(db: any): Promise<PortfolioValue | null> {
  try {
    const query = `
      SELECT priceARS, priceUSD, date
      FROM PortfolioValue
      ORDER BY date DESC
      LIMIT 2
    `;
    const rows = await db.getAllAsync(query);

    // If we have at least 2 snapshots, return the second-latest
    if (rows.length === 2) {
      return {
        priceARS: rows[1].priceARS,
        priceUSD: rows[1].priceUSD,
        date: rows[1].date,
      };
    }
    // If there's less than 2 snapshots, we can't get a "previous" one
    return null;
  } catch (error) {
    console.error('Error getting previous portfolio value:', error);
    return null;
  }
}

/**
 * Get all items from the `Portfolio` table
 */
export async function getAllPortfolioItems(db: any): Promise<PortfolioItem[]> {
  try {
    const query = `
      SELECT symbol, amount, ppcARS, ppcUSD, lastPriceARS, lastPriceUSD, date, description
      FROM Portfolio
      ORDER BY symbol ASC
    `;
    const rows = await db.getAllAsync(query);
    return rows.map((row: any) => ({
      symbol: row.symbol,
      amount: row.amount,
      ppcARS: row.ppcARS,
      ppcUSD: row.ppcUSD,
      lastPriceARS: row.lastPriceARS,
      lastPriceUSD: row.lastPriceUSD,
      date: row.date,
      description: row.description,
    }));
  } catch (error) {
    console.error('Error getting portfolio items:', error);
    return [];
  }
}
