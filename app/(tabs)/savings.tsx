import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native';
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
import Toast from 'react-native-toast-message';

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
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Prices refreshed successfully!',
      });
    } catch (err: unknown) {
      console.error('Error refreshing prices:', err);
      const message =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as any).message)
          : 'Something went wrong while refreshing prices.';
    
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: message,
      });
    } finally {
      setLoading(false);
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
        <View style={styles.cardHeader}>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <Text
            style={[
              styles.varPercentage,
              itemPercentage >= 0 ? styles.positive : styles.negative,
            ]}
          >
            {itemPercentage >= 0 ? '+' : ''}
            {Math.abs(itemPercentage).toFixed(2)}%
          </Text>
        </View>
  
        {/* Description */}
        {item.description && <Text style={styles.description}>{item.description}</Text>}
  
        {/* Main Content */}
        <View style={styles.cardContent}>
          {/* Row 1: Total & Amount */}
          <View style={styles.row}>
            <Text style={styles.rowText}>
              Total: {currencyLabel}
              {formatAmountWithSeparator(totalItemValue)} (
              <Text
                style={itemDifference >= 0 ? styles.positive : styles.negative}
              >
                {itemDifference >= 0 ? '+' : ''}
                {formatAmountWithSeparator(itemDifference)}
              </Text>
              )
            </Text>
            <Text style={styles.rowText}>Amount: {item.amount}</Text>
          </View>
  
          {/* Row 2: Latest & PPC */}
          <View style={styles.row}>
            <Text style={styles.rowText}>
              Latest: {currencyLabel}
              {formatAmountWithSeparator(latest)}
            </Text>
            <Text style={styles.rowText}>
              PPC: {currencyLabel}
              {formatAmountWithSeparator(ppc)}
            </Text>
          </View>
        </View>
      </View>
    );
  };
  

  // 8) Main UI Render
  return (
    <SafeAreaView style={styles.safeArea}>
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
            {formatAmountWithSeparator(Math.abs(difference))} (
            {difference >= 0 ? '+' : '-'}
            {formatAmountWithSeparator(Math.abs(percentage))}%)
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
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      </View>
    </SafeAreaView>
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
  safeArea: {
    flex: 2,
    backgroundColor: '#f2f2f2', // Matches your app's background color
  },
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    paddingTop: 16, // Adds some spacing below the notch
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
  // Portfolio card styles
  compactCard: {
    backgroundColor: '#fff',
    borderRadius: 0,
    padding: 12,
    marginVertical: 0,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  symbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  varPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  cardContent: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowText: {
    fontSize: 12,
    color: '#444',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
});
