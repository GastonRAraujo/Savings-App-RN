import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Modal, TextInput, Pressable, ScrollView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Income } from '../types';
import IncomeList from '@/components/IncomeList';

export default function IncomeScreen() {
  const db = useSQLiteContext();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [grossIncome, setGrossIncome] = useState<{ amountUSD: number; amountARS: number } | null>(null);
  const [totalIncomeUSD, setTotalIncomeUSD] = useState(0);
  const [totalIncomeARS, setTotalIncomeARS] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | null>(null);
  const [amountUSD, setAmountUSD] = useState('');
  const [amountARS, setAmountARS] = useState('');

  useEffect(() => {
    loadIncomeData();
    loadGrossIncomeData();
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

  function calculateTotalIncome(incomeData: Income[]) {
    const totalUSD = incomeData.reduce((sum, income) => sum + income.amountUSD, 0);
    const totalARS = incomeData.reduce((sum, income) => sum + income.amountARS, 0);
    setTotalIncomeUSD(totalUSD);
    setTotalIncomeARS(totalARS);
  }

  async function deleteIncome(id: number) {
    await db.runAsync('DELETE FROM Income WHERE id = ?', id);
    loadIncomeData();
  }

  function openModal(type: 'add' | 'edit') {
    setModalType(type);
    setAmountUSD('');
    setAmountARS('');
    setIsModalVisible(true);
  }

  async function handleSave() {
    if (!amountUSD || !amountARS) {
      alert('Please fill in all fields.');
      return;
    }

    const parsedUSD = parseFloat(amountUSD);
    const parsedARS = parseFloat(amountARS);

    if (modalType === 'edit') {
      await db.runAsync(
        'INSERT INTO GrossIncome (amountUSD, amountARS, date) VALUES (?, ?, ?)',
        [parsedUSD, parsedARS, new Date().toISOString()]
      );
    } else if (modalType === 'add' && grossIncome) {
      const newUSD = grossIncome.amountUSD + parsedUSD;
      const newARS = grossIncome.amountARS + parsedARS;
      await db.runAsync('UPDATE GrossIncome SET amountUSD = ?, amountARS = ? WHERE id = (SELECT id FROM GrossIncome ORDER BY date DESC LIMIT 1)', [newUSD, newARS]);
    }
    setIsModalVisible(false);
    loadGrossIncomeData();
  }

  // Function to manually insert Income based on the latest GrossIncome
  async function insertIncome() {
    if (grossIncome) {
      await db.runAsync(
        'INSERT INTO Income (name, amountUSD, amountARS, date) VALUES (?, ?, ?, ?)',
        ['Gross Income Entry', grossIncome.amountUSD, grossIncome.amountARS, new Date().toISOString()]
      );
      loadIncomeData(); // Reload income data after insertion
    } else {
      alert('No Gross Income available to insert.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.dashboard}>
        <Text style={styles.header}>Dashboard</Text>

        {/* Total Income Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total Income (Net)</Text>
          <Text style={styles.cardAmount}>${totalIncomeUSD.toFixed(2)} USD</Text>
          <Text style={styles.cardAmount}>${totalIncomeARS.toFixed(2)} ARS</Text>
        </View>

        {/* Gross Income Card */}
        <View style={[styles.card, styles.grossIncomeCard]}>
          <Text style={styles.cardTitle}>Gross Income (Latest)</Text>
          <Text style={styles.cardAmount}>USD: ${grossIncome?.amountUSD.toFixed(2) ?? '0.00'}</Text>
          <Text style={styles.cardAmount}>ARS: ${grossIncome?.amountARS.toFixed(2) ?? '0.00'}</Text>

          {/* Button Row */}
          <View style={styles.buttonRow}>
            <Pressable style={styles.button} onPress={() => openModal('add')}>
              <Text style={styles.buttonText}>Add Extra</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => openModal('edit')}>
              <Text style={styles.buttonText}>Edit Salary</Text>
            </Pressable>
            {/* Insert Income Button */}
            <Pressable style={[styles.button, styles.thirdButton]} onPress={insertIncome}>
              <Text style={styles.buttonText}>Receive Salary</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Income List */}
      <IncomeList incomes={incomes} deleteIncome={deleteIncome} />

      {/* Modal for Adding or Editing */}
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
              onChangeText={setAmountUSD}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount in ARS"
              keyboardType="numeric"
              value={amountARS}
              onChangeText={setAmountARS}
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
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f9f9f9' },
  dashboard: { marginBottom: 20 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },
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
  grossIncomeCard: { backgroundColor: '#f0f8ff' },
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
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  thirdButton: {
    backgroundColor: '#00A859',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center'},
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
