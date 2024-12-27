import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, FlatList, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';  // or however you access your DB

// Import the service & types
import {
  getLatestPortfolioValue,
  getPreviousPortfolioValue,
  getAllPortfolioItems,
} from '@/services/PortfolioQueries';


import {PortfolioValue, PortfolioItem} from '@/app/types';

const SavingsScreen = () => {
  // 1) Access the DB context
  const db = useSQLiteContext();

  // 2) Local state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPortfolioValue, setCurrentPortfolioValue] = useState<PortfolioValue | null>(null);
  const [previousPortfolioValue, setPreviousPortfolioValue] = useState<PortfolioValue | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [showInARS, setShowInARS] = useState(true);

  // 3) Fetch data from DB on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Query the DB for:
        // 1. The latest portfolio value (current)
        // 2. The second-latest portfolio value (previous)
        // 3. The list of portfolio items
        const [latestVal, prevVal, items] = await Promise.all([
          getLatestPortfolioValue(db),
          getPreviousPortfolioValue(db),
          getAllPortfolioItems(db),
        ]);

        setCurrentPortfolioValue(latestVal);
        setPreviousPortfolioValue(prevVal);
        setPortfolio(items);
      } catch (err: any) {
        console.error('Error loading data in SavingsScreen:', err);
        setError(err?.message || 'Error loading data');
      } finally {
        setLoading(false);
      }
    }

    if (db) {
      loadData();
    }
  }, [db]);

  // 4) If loading or error, show feedback
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading portfolio data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  // 5) Calculate performance using current and previous snapshots
  let currentTotal = 0;
  let previousTotal = 0;
  let difference = 0;
  let percentage = 0;

  if (currentPortfolioValue) {
    currentTotal = showInARS
      ? currentPortfolioValue.priceARS
      : currentPortfolioValue.priceUSD;
  }
  if (previousPortfolioValue) {
    previousTotal = showInARS
      ? previousPortfolioValue.priceARS
      : previousPortfolioValue.priceUSD;
  }
  difference = currentTotal - previousTotal;
  percentage = previousTotal !== 0 ? (difference / previousTotal) * 100 : 0;

  // 6) Render each portfolio item in the list
  const renderPortfolioItem = ({ item }: { item: PortfolioItem }) => {
    const currencyLabel = showInARS ? 'ARS' : 'USD';
    const ppc = showInARS ? item.ppcARS : item.ppcUSD;
    const latest = showInARS ? item.lastPriceARS : item.lastPriceUSD;

    return (
      <View style={styles.itemCard}>
        <Text style={styles.symbol}>{item.symbol}</Text>
        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
        <Text>Amount: {item.amount}</Text>
        <Text>PPC ({currencyLabel}): {ppc.toFixed(2)}</Text>
        <Text>Latest ({currencyLabel}): {latest.toFixed(2)}</Text>
      </View>
    );
  };

  // 7) UI Render
  return (
    <View style={styles.container}>
      {/* Card for total value & performance */}
      <View style={styles.card}>
        <Text style={styles.valueTitle}>
          {showInARS ? 'Total (ARS)' : 'Total (USD)'}
        </Text>
        <Text style={styles.valueAmount}>
          {currentTotal.toFixed(2)}
        </Text>
        
        {/* Performance difference & percent */}
        <Text style={[
          styles.performance,
          { color: difference >= 0 ? '#008000' : '#ff0000' }
        ]}>
          {difference >= 0 ? '+' : '-'}
          {Math.abs(difference).toFixed(2)} (
          {difference >= 0 ? '+' : '-'}
          {Math.abs(percentage).toFixed(2)}%)
        </Text>

        {/* Switch between ARS and USD */}
        <View style={styles.switchRow}>
          <Text>Show in ARS</Text>
          <Switch
            value={showInARS}
            onValueChange={(val) => setShowInARS(val)}
          />
        </View>
      </View>

      {/* Portfolio list */}
      <FlatList
        data={portfolio}
        keyExtractor={(item) => item.symbol}
        renderItem={renderPortfolioItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
};

export default SavingsScreen;

const styles = StyleSheet.create({
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 3,
  },
  valueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  valueAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  performance: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    elevation: 2,
  },
  symbol: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    color: '#444',
    marginBottom: 4,
  },
});
