import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AndroidSafeAreaStyle } from '@/components/SafeViewAndroid';
import { Expense } from '../types';
import dolarMEP from '@/services/DolarMEP'; // Correct the import path

const formatAmountWithSeparator = (amount?: number) => {
  if (!amount) return '0.00';
  return new Intl.NumberFormat('es-AR').format(amount);
};

export default function ExpensesScreen() {
  const db = useSQLiteContext();
  const [expenses, setExpenses] = useState<Expense[]>([]); // Use Expense type
  const [totalExpensesUSD, setTotalExpensesUSD] = useState(0);
  const [totalExpensesARS, setTotalExpensesARS] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Input fields
  const [expenseName, setExpenseName] = useState('');
  const [amountUSD, setAmountUSD] = useState('');
  const [amountARS, setAmountARS] = useState('');

  // Store the fetched MEP exchange rate
  const [exchangeRate, setExchangeRate] = useState({
    buyRate: 1, // Default to 1 for ARS:USD
    sellRate: 1,
  });

  ///////////////////////////////////////////////////////////////////////////
  // 1. Load Data
  ///////////////////////////////////////////////////////////////////////////
  useEffect(() => {
    loadExpenses();
    fetchExchangeRate();
  }, []);

  async function loadExpenses() {
    const currentMonth = new Date().toISOString().slice(0, 7); // Format: YYYY-MM
    const results = await db.getAllAsync<Expense>(
      `SELECT * FROM Expenses WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC`,
      [currentMonth]
    );

    setExpenses(results);

    // Calculate totals
    const totalUSD = results.reduce((sum, expense) => sum + expense.amountUSD, 0);
    const totalARS = results.reduce((sum, expense) => sum + expense.amountARS, 0);
    setTotalExpensesUSD(totalUSD);
    setTotalExpensesARS(totalARS);
  }

  async function fetchExchangeRate() {
    try {
      const rate = await dolarMEP.fetchMEPExchangeRate();
      setExchangeRate(rate);
    } catch (error) {
      console.error('Error fetching MEP exchange rate:', error);
    }
  }

  ///////////////////////////////////////////////////////////////////////////
  // 2. Add a new expense
  ///////////////////////////////////////////////////////////////////////////
  async function addExpense() {
    if (!expenseName || !amountUSD || !amountARS) {
      alert('Please fill in all fields.');
      return;
    }

    const parsedUSD = parseFloat(amountUSD);
    const parsedARS = parseFloat(amountARS);

    await db.runAsync(
      'INSERT INTO Expenses (name, amountUSD, amountARS, date) VALUES (?, ?, ?, ?)',
      [expenseName, parsedUSD, parsedARS, new Date().toISOString()]
    );

    setIsModalVisible(false);
    loadExpenses();
  }

  ///////////////////////////////////////////////////////////////////////////
  // 3. Input Handlers: Fill in the missing field using MEP rate
  ///////////////////////////////////////////////////////////////////////////
  function handleChangeUSD(value: string) {
    setAmountUSD(value);
    if (!exchangeRate) return;
    const parsedUSD = parseFloat(value);
    if (!isNaN(parsedUSD)) {
      const newARS = parsedUSD * exchangeRate.sellRate;
      setAmountARS(newARS.toFixed(2));
    } else {
      setAmountARS('');
    }
  }

  function handleChangeARS(value: string) {
    setAmountARS(value);
    if (!exchangeRate) return;
    const parsedARS = parseFloat(value);
    if (!isNaN(parsedARS)) {
      const newUSD = parsedARS / exchangeRate.buyRate;
      setAmountUSD(newUSD.toFixed(2));
    } else {
      setAmountUSD('');
    }
  }

  ///////////////////////////////////////////////////////////////////////////
  // 4. Render
  ///////////////////////////////////////////////////////////////////////////
  return (
    <SafeAreaView style={AndroidSafeAreaStyle()}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.dashboard}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Total Expenses (Net)</Text>
            <Text style={styles.cardAmount}>${formatAmountWithSeparator(totalExpensesUSD)} USD</Text>
            <Text style={styles.cardAmount}>${formatAmountWithSeparator(totalExpensesARS)} ARS</Text>
          </View>
        </View>
      
        {/* Add Expense Button */}
        <View style={styles.buttonRow}>
          <Pressable style={styles.button} onPress={() => setIsModalVisible(true)}>
            <Text style={styles.buttonText}>Add Expense</Text>
          </Pressable>
        </View>

        {/* Expense List */}
        {expenses.map((expense) => (
          <View key={expense.id} style={styles.expenseItem}>
            <Text style={styles.expenseName}>{expense.name}</Text>
            <Text style={styles.expenseAmount}>
              USD: ${formatAmountWithSeparator(expense.amountUSD)} | ARS: $
              {formatAmountWithSeparator(expense.amountARS)}
            </Text>
          </View>
        ))}

        {/* Modal Section */}
        <Modal visible={isModalVisible} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Expense</Text>

              <TextInput
                style={styles.input}
                placeholder="Expense Name"
                value={expenseName}
                onChangeText={setExpenseName}
              />
              <TextInput
                style={styles.input}
                placeholder="Amount in USD"
                keyboardType="numeric"
                value={amountUSD}
                onChangeText={handleChangeUSD}
              />
              <TextInput
                style={styles.input}
                placeholder="Amount in ARS"
                keyboardType="numeric"
                value={amountARS}
                onChangeText={handleChangeARS}
              />

              <View style={styles.buttonRow}>
                <Pressable style={styles.button} onPress={addExpense}>
                  <Text style={styles.buttonText}>Save</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

///////////////////////////////////////////////////////////////////////////
// Styles
///////////////////////////////////////////////////////////////////////////
const styles = StyleSheet.create(
  {  
  container: { padding: 20, backgroundColor: '#f9f9f9' },
  dashboard: { marginBottom: 20 },
  card: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#555' },
  cardAmount: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 15 },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  expenseItem: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  expenseName: { fontSize: 16, fontWeight: '600', color: '#333' },
  expenseAmount: { fontSize: 14, color: '#777', marginTop: 5 },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 5,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
});
