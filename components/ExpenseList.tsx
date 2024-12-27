import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Expense } from '@/app/types';

const formatDate = (date: string) => {
  const dateObj = new Date(date);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

const formatAmountWithSeparator = (amount: number) => {
  return new Intl.NumberFormat('es-AR').format(amount);
};

export default function ExpenseList({
  expenses,
  deleteExpense,
}: {
  expenses: Expense[];
  deleteExpense: (id: number) => void;
}) {
  return (
    <View style={styles.listContainer}>
      {expenses.map((expense, index) => (
        <TouchableOpacity
          key={expense.id}
          activeOpacity={0.8}
          onLongPress={() => deleteExpense(expense.id)}  // Use long press to delete
        >
          <View
            style={[
              styles.expenseRow,
              { backgroundColor: index % 2 === 0 ? '#f0f8ff' : '#f8f8ff' }, // Alternate row colors
            ]}
          >
            <View style={styles.rowContent}>
              <Text style={styles.expenseName}>{expense.name}</Text>
              <Text style={styles.expenseDate}>{formatDate(expense.date)}</Text>
            </View>
            <View style={styles.amountContainer}>
              <Text style={styles.amountText}>
                US${formatAmountWithSeparator(expense.amountUSD)}
              </Text>
              <Text style={styles.amountText}>
                AR${formatAmountWithSeparator(expense.amountARS)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 0,
  },
  expenseRow: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 1,
  },
  rowContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  expenseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  expenseDate: {
    fontSize: 12,
    color: '#777',
    textAlign: 'right',
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});
