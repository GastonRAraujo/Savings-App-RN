import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite'; // or however you access your DB
import { Alert } from 'react-native';

// Import the queries and the refresh function
import {
  getLatestPortfolioValue,
  getPreviousPortfolioValue,
  getAllPortfolioItems,
} from '@/services/PortfolioQueries';
import {
  refreshPortfolioPrices,
  savePortfolioValueSnapshot,
} from '@/services/PortfolioService';

import { PortfolioValue, PortfolioItem } from '@/app/types';

const formatAmountWithSeparator = (amount?: number) => {
  if (!amount) return '0.00';
  // Ensure only two decimals, then format with locale separator
  return new Intl.NumberFormat('es-AR').format(parseFloat(amount.toFixed(2)));
};

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

  // 3) Initial data load
  useEffect(() => {
    if (db) {
      loadData();
    }
  }, [db]);

  // Helper: fetch everything from DB
  async function loadData() {
    try {
      setLoading(true);

      // Get the current snapshot, previous snapshot, and portfolio items
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

  // 4) Refresh prices from IOL, recalc portfolio value, then reload data
  async function handleRefreshPrices() {
    if (!db) return;
    try {
      setLoading(true);
      await refreshPortfolioPrices(db);
      await savePortfolioValueSnapshot(db);
      await loadData();
      setLoading(false);
    } catch (err: any) {
      console.error('Error refreshing prices:', err);
      Alert.alert(
        'Refresh Error',
        err?.message || 'Something went wrong while refreshing prices.'
      );
    }
  }

  // 5) If loading or error, show feedback
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

  // 6) Calculate performance using current and previous snapshots
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

  // 7) Render each portfolio item in the list
  const renderPortfolioItem = ({ item }: { item: PortfolioItem }) => {
    const currencyLabel = showInARS ? 'AR$' : 'U$D';
    const ppc = showInARS ? item.ppcARS : item.ppcUSD;
    const latest = showInARS ? item.lastPriceARS : item.lastPriceUSD;
  
    const totalItemValue = item.amount * latest;
    const itemDifference = latest - ppc;
    const itemPercentage = ppc !== 0 ? (itemDifference / ppc) * 100 : 0;
  
    return (
      <View style={styles.compactCard}>
        {/* Header */}
        <View style={styles.compactHeader}>
          <Text style={styles.symbol}>{item.symbol}</Text>
          {item.description && <Text style={styles.description}>{item.description}</Text>}
        </View>
        
        {/* Content Row */}
        <View style={styles.compactContentRow}>
          <Text style={styles.compactText}>Amt: <Text style={styles.value}>{item.amount}</Text></Text>
          <Text style={styles.compactText}>PPC: <Text style={styles.value}>{formatAmountWithSeparator(ppc)} {currencyLabel}</Text></Text>
        </View>
  
        {/* Content Row 2 */}
        <View style={styles.compactContentRow}>
          <Text style={styles.compactText}>Latest: <Text style={styles.value}>{formatAmountWithSeparator(latest)} {currencyLabel}</Text></Text>
          <Text style={styles.compactText}>Total: <Text style={styles.value}>{formatAmountWithSeparator(totalItemValue)} {currencyLabel}</Text></Text>
        </View>
  
        {/* Footer */}
        <View style={styles.compactFooter}>
          <Text
            style={[
              styles.difference,
              itemDifference >= 0 ? styles.positive : styles.negative,
            ]}
          >
            {itemDifference >= 0 ? '+' : '-'}
            {Math.abs(itemDifference).toFixed(2)} (
            {itemDifference >= 0 ? '+' : '-'}
            {Math.abs(itemPercentage).toFixed(2)}%)
          </Text>
        </View>
      </View>
    );
  };

  // 8) Main UI Render
  return (
    <View style={styles.container}>
      {/* Card for total value & performance */}
      <View style={styles.card}>
        <Text style={styles.valueTitle}>
          {showInARS ? 'Total (ARS)' : 'Total (USD)'}
        </Text>
        <Text style={styles.valueAmount}>
          {formatAmountWithSeparator(currentTotal)}
        </Text>

        {/* Performance difference & percent */}
        <Text
          style={[
            styles.performance,
            { color: difference >= 0 ? '#008000' : '#ff0000' },
          ]}
        >
          {difference >= 0 ? '+' : '-'}
          {Math.abs(difference).toFixed(2)} (
          {difference >= 0 ? '+' : '-'}
          {Math.abs(percentage).toFixed(2)}%)
        </Text>

        {/* Switch between ARS and USD */}
        <View style={styles.switchRow}>
          <Text>Show in ARS</Text>
          <Switch value={showInARS} onValueChange={(val) => setShowInARS(val)} />
        </View>

        {/* Refresh Prices Button */}
        <Pressable style={styles.refreshButton} onPress={handleRefreshPrices}>
          <Text style={styles.refreshButtonText}>Refresh Prices</Text>
        </Pressable>
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

// Styles
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    paddingTop: 40,
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
    marginBottom: 12,
  },
  refreshButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    elevation: 2,
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },

  compactCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  symbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    fontSize: 12,
    color: '#777',
  },
  compactContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  compactText: {
    fontSize: 12,
    color: '#444',
  },
  value: {
    fontWeight: '600',
    color: '#000',
  },
  compactFooter: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 4,
  },
  difference: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
});
