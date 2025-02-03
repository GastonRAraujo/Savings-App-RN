import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Income } from '@/app/types';
import { useHideNumbers } from '@/app/HideNumbersContext';

// Utility function to format date
const formatDate = (date: string) => {
  const dateObj = new Date(date);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

// Utility function to format numbers with thousands separator for AR$
const formatAmountWithSeparator = (amount: number) => {
  return new Intl.NumberFormat('es-AR').format(amount);
};

export default function IncomeList({
  incomes,
  deleteIncome,
}: {
  incomes: Income[];
  deleteIncome: (id: number) => void;
}) {
  const { hideNumbers } = useHideNumbers();

  return (
    <View style={styles.listContainer}>
      {incomes.map((income, index) => (
        <TouchableOpacity
          key={income.id}
          activeOpacity={0.8}
          onLongPress={() => deleteIncome(income.id)}  // Use long press to delete
        >
          <View
            style={[
              styles.incomeRow,
              { backgroundColor: index % 2 === 0 ? '#f0f8ff' : '#f8f8ff' }, // Alternate row colors
            ]}
          >
            <View style={styles.rowContent}>
              <Text style={styles.incomeName}>{income.name}</Text>
              <Text style={styles.incomeDate}>{formatDate(income.date)}</Text>
            </View>
            <View style={styles.amountContainer}>
              <Text style={styles.amountText}>
                US${hideNumbers ? '****' : formatAmountWithSeparator(income.amountUSD)}
              </Text>
              <Text style={styles.amountText}>
                AR${hideNumbers ? '****' : formatAmountWithSeparator(income.amountARS)}
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
  incomeRow: {
    paddingVertical: 10, // Vertical padding
    paddingHorizontal: 15, // Horizontal padding
    marginBottom: 1, // Small space between rows
  },
  rowContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6, // Space between title and amounts
  },
  incomeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  incomeDate: {
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
