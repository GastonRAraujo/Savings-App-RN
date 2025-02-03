import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Pressable, ScrollView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import dolarMEP from '@/services/DolarMEP'; // Import your MEP service
import { Income } from '../types';
import IncomeList from '@/components/IncomeList';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AndroidSafeAreaStyle } from '@/components/SafeViewAndroid';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useHideNumbers } from '../HideNumbersContext';

const formatAmountWithSeparator = (amount?: number) => {
  if (!amount) return '0.00';
  return new Intl.NumberFormat('es-AR').format(amount);
};

export default function IncomeScreen() {
  const db = useSQLiteContext();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [grossIncome, setGrossIncome] = useState<{ amountUSD: number; amountARS: number } | null>(null);
  const [totalIncomeUSD, setTotalIncomeUSD] = useState(0);
  const [totalIncomeARS, setTotalIncomeARS] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | null>(null);

  // Input fields
  const [amountUSD, setAmountUSD] = useState('');
  const [amountARS, setAmountARS] = useState('');

  // Store the fetched MEP exchange rate
  const [exchangeRate, setExchangeRate] = useState<{
    buyRate: number;
    sellRate: number;
    updatedAt: string;
  } | null>(null);

  // Shared hideNumbers state from context
  const { hideNumbers, setHideNumbers } = useHideNumbers();

  ///////////////////////////////////////////////////////////////////////////
  // 1. Load Data and MEP Rate
  ///////////////////////////////////////////////////////////////////////////
  useEffect(() => {
    loadIncomeData();
    loadGrossIncomeData();

    // Fetch MEP exchange rate once
    async function fetchRate() {
      try {
        const rate = await dolarMEP.fetchMEPExchangeRate();
        setExchangeRate(rate);
      } catch (error) {
        console.error('Error fetching MEP exchange rate:', error);
      }
    }
    fetchRate();
  }, []);

  async function loadIncomeData() {
    const incomeData = await db.getAllAsync<Income>('SELECT * FROM Income ORDER BY date DESC');
    setIncomes(incomeData);
    calculateTotalIncome(incomeData);
  }

  async function loadGrossIncomeData() {
    const result = await db.getFirstAsync<{ amountUSD: number; amountARS: number }>(
      'SELECT amountUSD, amountARS FROM GrossIncome ORDER BY date DESC'
    );
    if (result) {
      setGrossIncome(result);
    }
  }

  ///////////////////////////////////////////////////////////////////////////
  // 2. Summation logic
  ///////////////////////////////////////////////////////////////////////////
  function calculateTotalIncome(incomeData: Income[]) {
    const totalUSD = incomeData.reduce((sum, income) => sum + income.amountUSD, 0);
    const totalARS = incomeData.reduce((sum, income) => sum + income.amountARS, 0);
    setTotalIncomeUSD(totalUSD);
    setTotalIncomeARS(totalARS);
  }

  ///////////////////////////////////////////////////////////////////////////
  // 3. Deleting an income record
  ///////////////////////////////////////////////////////////////////////////
  async function deleteIncome(id: number) {
    await db.runAsync('DELETE FROM Income WHERE id = ?', id);
    loadIncomeData();
  }

  ///////////////////////////////////////////////////////////////////////////
  // 4. Opening the modal
  ///////////////////////////////////////////////////////////////////////////
  function openModal(type: 'add' | 'edit') {
    setModalType(type);
    // Clear the fields
    setAmountUSD('');
    setAmountARS('');
    setIsModalVisible(true);
  }

  ///////////////////////////////////////////////////////////////////////////
  // 5. Input Handlers: Fill in the missing field using MEP rate
  ///////////////////////////////////////////////////////////////////////////
  function handleChangeUSD(value: string) {
    setAmountUSD(value);
    if (!exchangeRate) return; // If no rate, skip
    const parsedUSD = parseFloat(value);
    if (!isNaN(parsedUSD)) {
      // ARS = USD * sellRate (or buyRate, depending on your usage)
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
      // USD = ARS / buyRate
      const newUSD = parsedARS / exchangeRate.buyRate;
      setAmountUSD(newUSD.toFixed(2));
    } else {
      setAmountUSD('');
    }
  }

  ///////////////////////////////////////////////////////////////////////////
  // 6. handleSave for the modal (Add or Edit)
  ///////////////////////////////////////////////////////////////////////////
  async function handleSave() {
    if (!amountUSD || !amountARS) {
      alert('Please fill in all fields.');
      return;
    }

    const parsedUSD = parseFloat(amountUSD);
    const parsedARS = parseFloat(amountARS);

    if (modalType === 'edit') {
      // Insert a new row in GrossIncome (like replacing salary)
      await db.runAsync(
        'INSERT INTO GrossIncome (amountUSD, amountARS, date) VALUES (?, ?, ?)',
        [parsedUSD, parsedARS, new Date().toISOString()]
      );
    } else if (modalType === 'add' && grossIncome) {
      // Add the extra to the existing top row
      const newUSD = grossIncome.amountUSD + parsedUSD;
      const newARS = grossIncome.amountARS + parsedARS;
      await db.runAsync(
        'UPDATE GrossIncome SET amountUSD = ?, amountARS = ? WHERE id = (SELECT id FROM GrossIncome ORDER BY date DESC LIMIT 1)',
        [newUSD, newARS]
      );
    }
    setIsModalVisible(false);
    loadGrossIncomeData(); // reload the updated gross income
  }

  ///////////////////////////////////////////////////////////////////////////
  // 7. “Receive Salary” => Insert gross into Income
  ///////////////////////////////////////////////////////////////////////////
  async function insertIncome() {
    if (!grossIncome) {
      alert('No Gross Income available to insert.');
      return;
    }
    // Insert the current gross income as a new row in the Income table
    await db.runAsync(
      'INSERT INTO Income (name, amountUSD, amountARS, date) VALUES (?, ?, ?, ?)',
      ['Salary', grossIncome.amountUSD, grossIncome.amountARS, new Date().toISOString()]
    );
    loadIncomeData();
  }

  ///////////////////////////////////////////////////////////////////////////
  // 8. Render
  ///////////////////////////////////////////////////////////////////////////
  return (
    // <SafeAreaView style={AndroidSafeAreaStyle()}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.dashboard}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Total Income (Net)</Text>
              {/* Eye icon to toggle hideNumbers */}
              <Pressable onPress={() => setHideNumbers(!hideNumbers)}>
                <Ionicons name={hideNumbers ? "eye-off" : "eye"} size={24} color="gray" />
              </Pressable>
            </View>
            <Text style={styles.cardAmount}>
              {hideNumbers
                ? '****'
                : `$${formatAmountWithSeparator(totalIncomeUSD)} USD`}
            </Text>
            <Text style={styles.cardAmount}>
              {hideNumbers
                ? '****'
                : `$${formatAmountWithSeparator(totalIncomeARS)} ARS`}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gross Income (Latest)</Text>
            <Text style={styles.cardAmount}>
              USD: {hideNumbers ? '****' : `$${formatAmountWithSeparator(grossIncome?.amountUSD) ?? '0.00'}`}
            </Text>
            <Text style={styles.cardAmount}>
              ARS: {hideNumbers ? '****' : `$${formatAmountWithSeparator(grossIncome?.amountARS) ?? '0.00'}`}
            </Text>

            <View style={styles.buttonRow}>
              <Pressable style={styles.button} onPress={() => openModal('add')}>
                <Text style={styles.buttonText}>Add Extra</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.secondaryButton]}
                onPress={() => openModal('edit')}
              >
                <Text style={styles.buttonText}>Edit Salary</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.thirdButton]} onPress={insertIncome}>
                <Text style={styles.buttonText}>Receive Salary</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <IncomeList incomes={incomes} deleteIncome={deleteIncome} />

        <Modal visible={isModalVisible} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {modalType === 'add' ? 'Add Bonus/Refund' : 'Edit Gross Income'}
              </Text>

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
                <Pressable style={styles.button} onPress={handleSave}>
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
    /* </SafeAreaView> */
  );
}

///////////////////////////////////////////////////////////////////////////
// Styles
///////////////////////////////////////////////////////////////////////////
const styles = StyleSheet.create({
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
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#555' },
  cardAmount: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  button: {
    flex: 1,
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  secondaryButton: { backgroundColor: '#6c757d' },
  thirdButton: { backgroundColor: '#00A859' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
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
});

