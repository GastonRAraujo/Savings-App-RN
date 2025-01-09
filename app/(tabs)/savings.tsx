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
import { AndroidSafeAreaStyle } from '@/components/SafeViewAndroid';

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

const formatAmountWithSeparator = (amount?: number, precision: number = 2) => {
  if (!amount) return '0.00';
  // Ensure only two decimals, then format with locale separator
  return new Intl.NumberFormat('es-AR').format(parseFloat(amount.toFixed(precision)));
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
  const [selectedType, setSelectedType] = useState('All'); // Track selected type

  const itemTypes = [
    { key: 'All', label: 'All' },
    { key: 'ACCIONES', label: 'Acciones' },
    { key: 'CEDEARS', label: 'CEDEARS' },
    { key: 'FondoComundeInversion', label: 'FCI' },
    { key: 'TitulosPublicos', label: 'Bonos/Letras' },
    { key: 'Letras', label: 'Bonos/Letras' },
    { key: 'ObligacionesNegociables', label: 'ONs' },
  ];

  // Filter portfolio items based on the selected type
  const filteredPortfolio = selectedType === 'All'
    ? portfolio
    : portfolio.filter((item) => item.type === selectedType);

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

  // Calculate the total value of the selected category
  const selectedCategoryTotal = filteredPortfolio.reduce(
    (sum, item) =>
      sum +
      item.amount *
        (showInARS ? item.lastPriceARS : item.lastPriceUSD),
    0
  );

  // Calculate the percentage of the total portfolio
  const selectedCategoryPercentage =
    currentTotal > 0 ? (selectedCategoryTotal / currentTotal) * 100 : 0;

  // Calculate the previous total value of the selected category
  const selectedCategoryPreviousTotal = filteredPortfolio.reduce(
    (sum, item) =>
      sum +
      item.amount *
        (showInARS ? item.ppcARS : item.ppcUSD),
    0
  );

  // Calculate performance values for the selected category
  const selectedCategoryDifference =
    selectedCategoryTotal - selectedCategoryPreviousTotal;

  const selectedCategoryPerformancePercentage =
    selectedCategoryPreviousTotal > 0
      ? (selectedCategoryDifference / selectedCategoryPreviousTotal) * 100
      : 0;

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
    <SafeAreaView style={AndroidSafeAreaStyle()}>
      <View style={styles.card}>
      {/* Portfolio Total */}
      <View style={styles.cardHeader}>
        <Text style={styles.valueTitle}>Portfolio Total</Text>
        <Text style={styles.valueAmount}>
          {showInARS ? 'ARS ' : 'USD '}
          {formatAmountWithSeparator(
            showInARS ? currentPortfolioValue?.priceARS : currentPortfolioValue?.priceUSD
          )}
        </Text>
      </View>

      {/* Performance */}
      <View style={styles.rowCompact}>
        <Text style={[styles.performance, { color: difference >= 0 ? '#008000' : '#ff0000' }]}>
          {difference >= 0 ? '+' : '-'}
          {formatAmountWithSeparator(Math.abs(difference))} (
          {difference >= 0 ? '+' : '-'}
          {Math.abs(percentage).toFixed(2)}%)
        </Text>
      </View>

      {/* Selected Category Total, Percentage, and Performance */}
      {selectedType !== 'All' && (
        <>
          <View style={styles.rowCompact}>
            <Text style={styles.categoryValue}>
              {`${itemTypes.find((t) => t.key === selectedType)?.label}: ${
                showInARS ? 'AR$' : 'U$D'
              } ${formatAmountWithSeparator(selectedCategoryTotal, 0)}`}
            </Text>
          </View>
          <View style={styles.rowCompact}>
            <Text style={styles.categoryPercentage}>
              {`(${selectedCategoryPercentage.toFixed(2)}% of portfolio)`}
            </Text>
            <Text
              style={[
                styles.categoryPerformance,
                { color: selectedCategoryDifference >= 0 ? '#008000' : '#ff0000' },
              ]}
            >
              {selectedCategoryDifference >= 0 ? '+' : '-'}
              {formatAmountWithSeparator(Math.abs(selectedCategoryDifference))} (
              {selectedCategoryDifference >= 0 ? '+' : '-'}
              {Math.abs(selectedCategoryPerformancePercentage).toFixed(2)}%)
            </Text>
          </View>
        </>
      )}

      {/* Switch and Refresh */}
      <View style={styles.switchRowCompact}>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>USD</Text>
          <Switch value={showInARS} onValueChange={(val) => setShowInARS(val)} />
          <Text style={styles.switchLabel}>ARS</Text>
        </View>
        <Pressable style={styles.refreshButton} onPress={handleRefreshPrices}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </Pressable>
      </View>
    </View>

        {/* Type Selection */}
        <View style={styles.typeSelectorContainer}>
        <FlatList
          data={itemTypes}
          horizontal
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.typeList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedType(item.key)}
              style={[
                styles.typeItem,
                selectedType === item.key && styles.typeItemSelected,
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  selectedType === item.key && styles.typeTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

        {/* Portfolio list */}
        <View style={styles.cardContainer}>
        <FlatList
          data={filteredPortfolio}
          keyExtractor={(item) => item.symbol}
          renderItem={renderPortfolioItem}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text>No items found for this category.</Text>
            </View>
          }
        />
        </View>
    </SafeAreaView>
  );
};



export default SavingsScreen;

// Styles
const styles = StyleSheet.create({
  // General Styles
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'white', // Safe area background color
  },
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2', // App background color
  },

  // Main Card Styles
  card: {
    backgroundColor: '#ffffff', // Card background
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    elevation: 2, // Android shadow
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4, // iOS shadow
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  valueTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  valueAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },

  // Portfolio Performance Styles
  performance: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  categoryPerformance: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Switch and Refresh Row
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  switchRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 12,
    color: '#444',
    fontWeight: '800', // Bolder for better readability
    marginHorizontal: 4,
  },
  refreshButton: {
    backgroundColor: '#007bff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Type Selector Styles
  typeSelectorContainer: {
    height: 40, // Fixed height for type selector
    justifyContent: 'center',
    backgroundColor: '#f8f8f8', // Background color for the type selector
  },
  typeList: {
    paddingHorizontal: 16,
  },
  typeItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  typeItemSelected: {
    backgroundColor: '#007bff', // Selected type background
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
  },
  typeTextSelected: {
    color: '#fff', // Selected type text color
    fontWeight: 'bold',
  },

  // Cards Container
  cardsContainer: {
    flex: 1, // Occupies remaining space
  },

  // Portfolio Item Card Styles
  compactCard: {
    backgroundColor: '#fff',
    borderRadius: 0,
    padding: 12,
    marginVertical: 0,
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

  // Portfolio Item Details
  cardContent: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowText: {
    fontSize: 12,
    color: '#444',
  },
  symbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  varPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Positive and Negative Values
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
});

