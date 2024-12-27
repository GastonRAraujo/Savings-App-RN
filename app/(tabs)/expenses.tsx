import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Modal, TextInput, Pressable, ScrollView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Expense } from '../types';  // Define Expense type similarly to Income type
import ExpenseList from '@/components/ExpenseList';

export default function ExpensesScreen() {
  const db = useSQLiteContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [grossExpenses, setGrossExpenses] = useState<{ amountUSD: number; amountARS: number } | null>(null);
  const [totalExpensesUSD, setTotalExpensesUSD] = useState(0);
  const [totalExpensesARS, setTotalExpensesARS] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | null>(null);
  const [amountUSD, setAmountUSD] = useState('');
  const [amountARS, setAmountARS] = useState('');

  useEffect(() => {
    loadExpenseData();
    loadGrossExpensesData();
  }, []);

  async function loadExpenseData() {
    const expenseData = await db.getAllAsync<Expense>('SELECT * FROM Expenses ORDER BY date DESC');
    setExpenses(expenseData);
    calculateTotalExpenses(expenseData);
  }

  async function loadGrossExpensesData() {
    const result = await db.getFirstAsync<{ amountUSD: number; amountARS: number }>(
      'SELECT amountUSD, amountARS FROM Expenses ORDER BY date DESC'
    );
    if (result) {
      setGrossExpenses(result);
    }
  }

  function calculateTotalExpenses(expenseData: Expense[]) {
    const totalUSD = expenseData.reduce((sum, expense) => sum + expense.amountUSD, 0);
    const totalARS = expenseData.reduce((sum, expense) => sum + expense.amountARS, 0);
    setTotalExpensesUSD(totalUSD);
    setTotalExpensesARS(totalARS);
  }

  async function deleteExpense(id: number) {
    await db.runAsync('DELETE FROM Expenses WHERE id = ?', id);
    loadExpenseData();
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
        'INSERT INTO GrossExpenses (amountUSD, amountARS, date) VALUES (?, ?, ?)',
        [parsedUSD, parsedARS, new Date().toISOString()]
      );
    } else if (modalType === 'add' && grossExpenses) {
      const newUSD = grossExpenses.amountUSD + parsedUSD;
      const newARS = grossExpenses.amountARS + parsedARS;
      await db.runAsync('UPDATE GrossExpenses SET amountUSD = ?, amountARS = ? WHERE id = (SELECT id FROM GrossExpenses ORDER BY date DESC LIMIT 1)', [newUSD, newARS]);
    }
    setIsModalVisible(false);
    loadGrossExpensesData();
  }

  async function insertExpense() {
    if (grossExpenses) {
      await db.runAsync(
        'INSERT INTO Expenses (name, amountUSD, amountARS, date) VALUES (?, ?, ?, ?)',
        ['Expense', grossExpenses.amountUSD, grossExpenses.amountARS, new Date().toISOString()]
      );
      loadExpenseData();
    } else {
      alert('No Gross Expenses available to insert.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.dashboard}>
        <Text></Text>
        {/* Total Expenses Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total Expenses</Text>
          <Text style={styles.cardAmount}>${totalExpensesUSD.toFixed(2)} USD</Text>
          <Text style={styles.cardAmount}>${totalExpensesARS.toFixed(2)} ARS</Text>
        </View>

        {/* Gross Expenses Card */}
        <View style={[styles.card, styles.grossIncomeCard]}>
          <Text style={styles.cardTitle}>Gross Expenses (Latest)</Text>
          <Text style={styles.cardAmount}>USD: ${grossExpenses?.amountUSD.toFixed(2) ?? '0.00'}</Text>
          <Text style={styles.cardAmount}>ARS: ${grossExpenses?.amountARS.toFixed(2) ?? '0.00'}</Text>

          {/* Button Row */}
          <View style={styles.buttonRow}>
            <Pressable style={styles.button} onPress={() => openModal('add')}>
              <Text style={styles.buttonText}>Add Extra Expense</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => openModal('edit')}>
              <Text style={styles.buttonText}>Edit Expenses</Text>
            </Pressable>
            {/* Insert Expense Button */}
            <Pressable style={[styles.button, styles.thirdButton]} onPress={insertExpense}>
              <Text style={styles.buttonText}>Record Expense</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Expense List */}
      <ExpenseList expenses={expenses} deleteExpense={deleteExpense} />

      {/* Modal for Adding or Editing Expenses */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'add' ? 'Add Extra Expense' : 'Edit Gross Expenses'}
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
  grossIncomeCard: { backgroundColor: '#e3f2fd' },
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
