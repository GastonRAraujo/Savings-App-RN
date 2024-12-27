import { PortfolioItem, PortfolioValue } from '@/app/types';  
  /**
   * Get the most recent PortfolioValue snapshot (the "current" total).
   */
  export async function getLatestPortfolioValue(db: any): Promise<PortfolioValue | null> {
    try {
      const query = `
        SELECT priceARS, priceUSD, date
        FROM PortfolioValue
        ORDER BY date DESC
        LIMIT 1
      `;
      const rows = await db.getFirstAsync(query);
      if (rows.length > 0) {
        return {
          priceARS: rows[0].priceARS,
          priceUSD: rows[0].priceUSD,
          date: rows[0].date,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting latest portfolio value:', error);
      return null;
    }
  }
  
  /**
   * Get the second-most recent PortfolioValue snapshot (the "previous" total).
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
      if (rows.length === 2) {
        // The second row is the previous snapshot
        return {
          priceARS: rows[1].priceARS,
          priceUSD: rows[1].priceUSD,
          date: rows[1].date,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting previous portfolio value:', error);
      return null;
    }
  }
  
  /**
   * Get all portfolio items from the Portfolio table.
   */
  export async function getAllPortfolioItems(db: any): Promise<PortfolioItem[]> {
    try {
      const query = `
        SELECT symbol, amount, ppcARS, ppcUSD, lastPriceARS, lastPriceUSD, date
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
      }));
    } catch (error) {
      console.error('Error getting portfolio items:', error);
      return [];
    }
  }
  