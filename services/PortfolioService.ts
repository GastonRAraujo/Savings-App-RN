// File: services/PortfolioService.ts

import dolarMEP from './DolarMEP';
import iolService from './IolService';

// ====== 1) Store an operation in the Operations table ====== //
export async function storeOperation(db: any, operation: any) {
  try {
    // 1. Determine the currency by calling getSymbolInfo
    const titulo = await iolService.getSymbolInfo(operation.simbolo); 
    // e.g., { moneda: 'peso_Argentino' | 'dolares_EstadosUnidos' }

    const mepRateData = await dolarMEP.fetchMEPExchangeRate();
    const mepRate = mepRateData ? mepRateData.sellRate : 1;

    let priceARS = 0;
    let priceUSD = 0;

    // 2. precioOperado => can be ARS or USD
    const precioOperado = operation.precioOperado ?? 0; 
    // Make sure your operation object has 'precioOperado'.
    // If not, adapt this to the correct field name.

    if (titulo.moneda === 'peso_Argentino') {
      priceARS = precioOperado;
      priceUSD = priceARS / mepRate;
    } else {
      // Assume 'dolares_EstadosUnidos'
      priceUSD = precioOperado;
      priceARS = priceUSD * mepRate;
    }

    // 3. cantidadOperada
    const cantidad = operation.cantidadOperada ?? 0;

    // 4. Insert into Operations
    await db.executeAsync(
      `INSERT INTO Operations 
       (numero, fecha, tipo, simbolo, cantidad, priceARS, priceUSD)
       VALUES (?,?,?,?,?,?,?)`,
      [
        operation.numero,
        operation.fechaOperada, 
        operation.tipo,
        operation.simbolo,
        cantidad,
        priceARS,
        priceUSD
      ]
    );

    console.log('Operation stored:', operation.numero);
  } catch (err) {
    console.error('Error storing operation:', err);
  }
}

// ====== 2) Update the Portfolio table after a buy or sell operation ====== //
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
  const existing = await db.runAsync(
    `SELECT * FROM Portfolio WHERE symbol = ?`,
    [operation.simbolo]
  );

  // 2. If symbol not found and this is a buy => insert new row
  if (existing.length === 0 && isBuy) {
    await db.executeAsync(
      `INSERT INTO Portfolio 
        (symbol, amount, ppcARS, ppcUSD, lastPriceARS, lastPriceUSD, date) 
       VALUES (?,?,?,?,?,?,?)`,
      [
        operation.simbolo,
        cantidadOperada,     // new amount
        priceARS,            // avg cost in ARS
        priceUSD,            // avg cost in USD
        priceARS,            // lastPriceARS initially same as cost
        priceUSD,            // lastPriceUSD
        new Date().toISOString()
      ]
    );
  } 
  // 3. If symbol found => update row
  else if (existing.length > 0) {
    const row = existing[0];
    let newAmount = row.amount;

    if (isBuy) {
      // new total shares
      newAmount = row.amount + cantidadOperada;

      // Weighted average for ppcARS / ppcUSD
      const oldCostARS = row.amount * row.ppcARS;
      const newCostARS = cantidadOperada * priceARS;
      const totalARS = oldCostARS + newCostARS;

      const oldCostUSD = row.amount * row.ppcUSD;
      const newCostUSD = cantidadOperada * priceUSD;
      const totalUSD = oldCostUSD + newCostUSD;

      const newPpcARS = newAmount !== 0 ? totalARS / newAmount : 0;
      const newPpcUSD = newAmount !== 0 ? totalUSD / newAmount : 0;

      await db.executeAsync(
        `UPDATE Portfolio
         SET amount = ?, ppcARS = ?, ppcUSD = ?, lastPriceARS = ?, lastPriceUSD = ?, date = ?
         WHERE id = ?`,
        [
          newAmount, 
          newPpcARS,
          newPpcUSD,
          priceARS,     // update lastPriceARS with this operation's price
          priceUSD,     // update lastPriceUSD
          new Date().toISOString(),
          row.id
        ]
      );
    } 
    else if (isSell) {
      // subtract shares
      newAmount = row.amount - cantidadOperada;
      if (newAmount < 0) newAmount = 0; // or handle oversell differently

      await db.executeAsync(
        `UPDATE Portfolio
         SET amount = ?, lastPriceARS = ?, lastPriceUSD = ?, date = ?
         WHERE id = ?`,
        [
          newAmount,
          row.lastPriceARS,   // or you might update the lastPrice to operation's price?
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
  // 1. Query local portfolio data
  const rows = await db.getAllAsync(
    "SELECT symbol, amount, ppcARS, ppcUSD, lastPriceARS, lastPriceUSD FROM Portfolio"
  );

  // 2. Fetch fresh portfolio data from IOL (if you want real-time prices)
  const iolData = await iolService.getPortfolio(); 
  // iolData: an array of { symbol, ppcARS, ppcUSD, amount, etc. } from the broker's perspective

  let totalARS = 0;
  let totalUSD = 0;

  for (const row of rows) {
    const symbol = row.symbol;
    const amount = row.amount;

    // Check fresh data for current price
    const freshInfo = iolData.find((a: any) => a.symbol === symbol);
    if (freshInfo) {
      // If found in fresh data, use fresh prices
      const currentPriceARS = freshInfo.ppcARS;
      const currentPriceUSD = freshInfo.ppcUSD;

      // Update the local row's lastPrice if you want to keep track
      await db.executeAsync(
        `UPDATE Portfolio
         SET lastPriceARS = ?, lastPriceUSD = ?
         WHERE symbol = ?`,
        [currentPriceARS, currentPriceUSD, symbol]
      );

      // Multiply by local "amount" to get total value
      totalARS += amount * currentPriceARS;
      totalUSD += amount * currentPriceUSD;
    } else {
      // If not found in fresh data, fallback to lastPrice stored in DB
      totalARS += amount * row.lastPriceARS;
      totalUSD += amount * row.lastPriceUSD;
    }
  }

  // 4. Insert a new row into PortfolioValue
  await db.executeAsync(
    `INSERT INTO PortfolioValue (priceUSD, priceARS, date) VALUES (?,?,?)`,
    [
      totalUSD,
      totalARS,
      new Date().toISOString()
    ]
  );

  console.log(`Saved portfolio value snapshot: ${totalARS.toFixed(2)} ARS / ${totalUSD.toFixed(2)} USD`);
}

