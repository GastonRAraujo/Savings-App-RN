import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
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

// Import Ionicons and FontAwesome for icons
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FontAwesome } from '@expo/vector-icons';
import { useHideNumbers } from '../HideNumbersContext';

// Import authentication service and portfolio initializer
import iolService from '@/services/IolService';
import { initializePortfolio } from '@/app/database'; // adjust path as needed

const formatAmountWithSeparator = (amount?: number, precision: number = 2) => {
  if (amount == null) return '0.00';
  return new Intl.NumberFormat('es-AR').format(parseFloat(amount.toFixed(precision)));
};

export default function SavingsScreen() {
  // Database and shared state
  const db = useSQLiteContext();
  const { hideNumbers, setHideNumbers } = useHideNumbers();

  // Portfolio data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPortfolioValue, setCurrentPortfolioValue] = useState<PortfolioValue | null>(null);
  const [previousPortfolioValue, setPreviousPortfolioValue] = useState<PortfolioValue | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [showInARS, setShowInARS] = useState(true);
  const [selectedType, setSelectedType] = useState('All');

  const itemTypes = [
    { key: 'All', label: 'All' },
    { key: 'ACCIONES', label: 'Acciones' },
    { key: 'CEDEARS', label: 'CEDEARS' },
    { key: 'FondoComundeInversion', label: 'FCI' },
    { key: 'TitulosPublicos', label: 'Bonos/Letras' },
    { key: 'Letras', label: 'Bonos/Letras' },
    { key: 'ObligacionesNegociables', label: 'ONs' },
  ];

  // Filter portfolio items based on selected type
  const filteredPortfolio =
    selectedType === 'All'
      ? portfolio
      : portfolio.filter((item) => item.type === selectedType);

  // --- Sign-In Modal States and Handlers ---
  const [isSignInVisible, setIsSignInVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function openSignInModal() {
    setUsername('');
    setPassword('');
    setIsSignInVisible(true);
  }

  async function handleSignIn() {
    if (!username || !password) {
      alert('Please enter both username and password.');
      return;
    }
    try {
      console.log('username:', username);
      console.log('password:', password);
      await iolService.authenticate(username, password);
      alert('Signed in successfully!');
      setIsSignInVisible(false);
      await initializePortfolio(db);
    } catch (error) {
      console.error('Sign In error:', error);
      alert('Error signing in: ' + error);
    }
  }
  // --- End Sign-In Modal ---

  // --- Load Portfolio Data ---
  useEffect(() => {
    if (db) {
      loadData();
    }
  }, [db]);

  async function loadData() {
    try {
      setLoading(true);
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
  // --- End Load Portfolio Data ---

  // --- Refresh Prices Handler ---
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
  // --- End Refresh Prices Handler ---

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

  // --- Calculate Portfolio Performance ---
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

  const selectedCategoryTotal = filteredPortfolio.reduce(
    (sum, item) =>
      sum +
      item.amount * (showInARS ? item.lastPriceARS : item.lastPriceUSD),
    0
  );
  const selectedCategoryPercentage =
    currentTotal > 0 ? (selectedCategoryTotal / currentTotal) * 100 : 0;
  const selectedCategoryPreviousTotal = filteredPortfolio.reduce(
    (sum, item) =>
      sum +
      item.amount * (showInARS ? item.ppcARS : item.ppcUSD),
    0
  );
  const selectedCategoryDifference =
    selectedCategoryTotal - selectedCategoryPreviousTotal;
  const selectedCategoryPerformancePercentage =
    selectedCategoryPreviousTotal > 0
      ? (selectedCategoryDifference / selectedCategoryPreviousTotal) * 100
      : 0;
  // --- End Portfolio Calculations ---

  // --- Render Each Portfolio Item ---
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
            {hideNumbers ? '****' : Math.abs(itemPercentage).toFixed(2)}%
          </Text>
        </View>

        {/* Description */}
        {item.description && <Text style={styles.description}>{item.description}</Text>}

        {/* Main Content */}
        <View style={styles.cardContent}>
          <View style={styles.row}>
            <Text style={styles.rowText}>
              Total: {currencyLabel}{' '}
              {hideNumbers ? '****' : formatAmountWithSeparator(totalItemValue)} (
              <Text style={itemDifference >= 0 ? styles.positive : styles.negative}>
                {itemDifference >= 0 ? '+' : ''}
                {hideNumbers ? '****' : formatAmountWithSeparator(itemDifference)}
              </Text>
              )
            </Text>
            <Text style={styles.rowText}>
              Amount: {hideNumbers ? '****' : item.amount}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowText}>
              Latest: {currencyLabel}{' '}
              {hideNumbers ? '****' : formatAmountWithSeparator(latest)}
            </Text>
            <Text style={styles.rowText}>
              PPC: {currencyLabel}{' '}
              {hideNumbers ? '****' : formatAmountWithSeparator(ppc)}
            </Text>
          </View>
        </View>
      </View>
    );
  };
  // --- End Render Portfolio Item ---

  // --- Main UI Render ---
  return (
    <SafeAreaView style={AndroidSafeAreaStyle()}>
      {/* Sign-In Modal (for IOL authentication) */}
      <Modal
        visible={isSignInVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSignInVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Sign In</Text>
            <TextInput
              placeholder="Username"
              style={styles.input}
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              placeholder="Password"
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <View style={styles.buttonRow}>
              <Pressable style={styles.modalButton} onPress={handleSignIn}>
                <Text style={styles.modalButtonText}>Sign In</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsSignInVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.card}>
        {/* Portfolio Total with Toggle and Settings */}
        <View style={styles.cardHeader}>
          <Text style={styles.valueTitle}>Portfolio Total</Text>
          <View style={{ flexDirection: 'row' }}>
            <Pressable onPress={() => setHideNumbers(!hideNumbers)} style={{ marginRight: 10 }}>
              <Ionicons name={hideNumbers ? 'eye-off' : 'eye'} size={24} color="gray" />
            </Pressable>
            <Pressable onPress={() => setIsSignInVisible(true)}>
              <FontAwesome name="cog" size={24} color="gray" />
            </Pressable>
          </View>
        </View>
        <Text style={styles.valueAmount}>
          {showInARS ? 'ARS ' : 'USD '}
          {hideNumbers
            ? '****'
            : formatAmountWithSeparator(
                showInARS ? currentPortfolioValue?.priceARS : currentPortfolioValue?.priceUSD
              )}
        </Text>

        <View style={styles.rowCompact}>
          <Text style={[styles.performance, { color: difference >= 0 ? '#008000' : '#ff0000' }]}>
            {difference >= 0 ? '+' : '-'}
            {hideNumbers
              ? '****'
              : formatAmountWithSeparator(Math.abs(difference))} (
            {difference >= 0 ? '+' : '-'}
            {hideNumbers ? '****' : Math.abs(percentage).toFixed(2)}%)
          </Text>
        </View>

        {selectedType !== 'All' && (
          <>
            <View style={styles.rowCompact}>
              <Text style={styles.categoryValue}>
                {`${itemTypes.find((t) => t.key === selectedType)?.label}: ${
                  showInARS ? 'AR$' : 'U$D'
                } `}
                {hideNumbers ? '****' : formatAmountWithSeparator(selectedCategoryTotal, 0)}
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
                {hideNumbers
                  ? '****'
                  : formatAmountWithSeparator(Math.abs(selectedCategoryDifference))} (
                {selectedCategoryDifference >= 0 ? '+' : '-'}
                {hideNumbers
                  ? '****'
                  : Math.abs(selectedCategoryPerformancePercentage).toFixed(2)}
                %)
              </Text>
            </View>
          </>
        )}

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
}

// -------------------------
// Styles
// -------------------------
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
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },

  // Main Card Styles
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
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
    fontWeight: '800',
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
    height: 40,
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
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
    backgroundColor: '#007bff',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
  },
  typeTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // Cards Container
  cardsContainer: {
    flex: 1,
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

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    borderRadius: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
