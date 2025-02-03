import dolarMEP from './DolarMEP';
import iolService from './IolService';

//////////////////////////////////////////////////////////////////////
// Store an operation in the Operations table (no double conversion)
//////////////////////////////////////////////////////////////////////
export async function storeOperation(db: any, operation: any) {
  try {
    // 1. Check symbol's currency from the server
    const titulo = await iolService.getSymbolInfo(operation.simbolo); 
    // e.g., { moneda: 'peso_Argentino' | 'dolares_EstadosUnidos' }

    const mepRateData = await dolarMEP.fetchMEPExchangeRate();
    const mepRate = mepRateData ? mepRateData.sellRate : 1;

    // 2. We'll interpret `operation.precioOperado` as ARS if 'peso', or USD otherwise
    let priceARS = 0;
    let priceUSD = 0;

    const precioOperado = operation.precioOperado ?? 0;

    // If the server says it's pesos, then: ARS = precioOperado, USD = ARS / mepRate
    if (titulo.moneda.toLowerCase().includes('peso')) {
      priceARS = precioOperado;
      priceUSD = precioOperado / mepRate;
    } else {
      // Otherwise treat it as USD
      priceUSD = precioOperado;
      priceARS = precioOperado * mepRate;
    }

    // 3. Insert into Operations
    await db.execAsync(
      `INSERT INTO Operations 
       (numero, fecha, tipo, simbolo, cantidad, priceARS, priceUSD)
       VALUES (?,?,?,?,?,?,?)`,
      [
        operation.numero,
        operation.fechaOperada,
        operation.tipo,
        operation.simbolo,
        operation.cantidadOperada ?? 0,
        priceARS,
        priceUSD,
      ]
    );

    console.log('Operation stored:', operation.numero);
  } catch (err) {
    console.error('Error storing operation:', err);
  }
}

//////////////////////////////////////////////////////////////////////
// Update the Portfolio table after a buy or sell (no double conversion)
//////////////////////////////////////////////////////////////////////
export async function updatePortfolio(db: any, operation: any, priceARS: number, priceUSD: number) {
  const isBuy = (
    operation.tipo === 'Compra' || 
    operation.tipo === 'Suscripción FCI' || 
    operation.tipo === 'Suscripción OTC'
  );
  const isSell = (
    operation.tipo === 'Venta' ||
    operation.tipo === 'Rescate FCI' || 
    operation.tipo === 'Rescate FCI OTC'
  );

  const cantidadOperada = operation.cantidadOperada ?? 0;

  // 1. Check if symbol exists
  const existingRows = await db.runAsync(
    `SELECT * FROM Portfolio WHERE symbol = ?`,
    [operation.simbolo]
  );

  // 2. If symbol not found & it's a buy => create new row
  if (existingRows.length === 0 && isBuy) {
    console.log('Adding new symbol to portfolio:', operation.simbolo);
    await db.execAsync(
      `INSERT INTO Portfolio 
        (symbol, amount, ppcARS, ppcUSD, lastPriceARS, lastPriceUSD, date) 
       VALUES (?,?,?,?,?,?,?)`,
      [
        operation.simbolo,
        cantidadOperada,
        priceARS,
        priceUSD,
        priceARS,
        priceUSD,
        new Date().toISOString()
      ]
    );
    return;
  }

  // 3. Symbol found => update
  if (existingRows.length > 0) {
    console.log('Updating existing symbol in portfolio:', operation.simbolo);
    const row = existingRows[0];
    let newAmount = row.amount;

    if (isBuy) {
      newAmount = row.amount + cantidadOperada;

      // Weighted avg for ppcARS, ppcUSD
      const oldCostARS = row.amount * row.ppcARS;
      const newCostARS = cantidadOperada * priceARS;
      const totalARS = oldCostARS + newCostARS;

      const oldCostUSD = row.amount * row.ppcUSD;
      const newCostUSD = cantidadOperada * priceUSD;
      const totalUSD = oldCostUSD + newCostUSD;

      const newPpcARS = newAmount ? totalARS / newAmount : 0;
      const newPpcUSD = newAmount ? totalUSD / newAmount : 0;

      await db.execAsync(
        `UPDATE Portfolio
         SET amount = ?, ppcARS = ?, ppcUSD = ?, lastPriceARS = ?, lastPriceUSD = ?, date = ?
         WHERE id = ?`,
        [
          newAmount, 
          newPpcARS,
          newPpcUSD,
          priceARS,       // set lastPrice to the operation's price
          priceUSD,
          new Date().toISOString(),
          row.id
        ]
      );
    } else if (isSell) {
      newAmount = row.amount - cantidadOperada;
      if (newAmount < 0) newAmount = 0; // or handle oversell differently

      await db.execAsync(
        `UPDATE Portfolio
         SET amount = ?, lastPriceARS = ?, lastPriceUSD = ?, date = ?
         WHERE id = ?`,
        [
          newAmount,
          row.lastPriceARS, // Keep lastPrice if you prefer
          row.lastPriceUSD,
          new Date().toISOString(),
          row.id
        ]
      );
    }
  }
}


// ====== 3) Save snapshot of total portfolio value (PortfolioValue table) ====== //
export async function savePortfolioValueSnapshot(db: any) {
  await db.runAsync(
    `
    INSERT INTO PortfolioValue (priceUSD, priceARS, date)
    SELECT
      COALESCE(SUM(amount * lastPriceUSD), 0) AS totalUSD,
      COALESCE(SUM(amount * lastPriceARS), 0) AS totalARS,
      ? AS snapshotDate
    FROM Portfolio
    `,
    [new Date().toISOString()]
  );
}


export async function refreshPortfolioPrices(db: any) {
  // 1. Grab all local Portfolio rows
  const localRows = await db.getAllAsync(`
    SELECT symbol, lastPriceARS, lastPriceUSD
    FROM Portfolio
  `);

  // 2. Fetch fresh data from IOL (which has correct ARS & USD fields)
  const iolData = await iolService.getPortfolio();

  console.debug('Refreshing portfolio prices...',iolData);
  // 3. For each local row, match the symbol in the fresh data
  for (const row of localRows) {
    const freshInfo = iolData.find((item: any) => item.symbol === row.symbol);
    if (freshInfo) {
      // Directly store freshInfo.ppcARS / ppcUSD -> lastPriceARS / lastPriceUSD
      await db.runAsync(
        'UPDATE Portfolio SET lastPriceARS = ?, lastPriceUSD = ?, openPosition = ? WHERE symbol = ?',
        [freshInfo.latestPriceARS, freshInfo.latestPriceUSD, true, row.symbol]
      );
    } else {
      // Mark as closed position if not found in fresh data
      await db.runAsync(
        'UPDATE Portfolio SET openPosition = ? WHERE symbol = ?',
        [false, row.symbol]
      );
    }
  }

  // 4. Insert new elements from iolData that are not in localRows
  for (const freshInfo of iolData) {
    const localRow = localRows.find((row: any) => row.symbol === freshInfo.symbol);
    if (!localRow) {
      await db.runAsync(
        `INSERT INTO Portfolio (
            symbol, 
            description, 
            type, 
            amount, 
            ppcARS, 
            ppcUSD, 
            lastPriceARS, 
            lastPriceUSD, 
            date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          freshInfo.symbol,
          freshInfo.description,
          freshInfo.type,
          freshInfo.amount,
          freshInfo.ppcARS,
          freshInfo.ppcUSD,
          freshInfo.latestPriceARS,
          freshInfo.latestPriceUSD,
          new Date().toISOString() // or another appropriate date value
        ]
      );      
    }
  }
}