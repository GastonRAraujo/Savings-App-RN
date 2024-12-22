import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Budget Overview</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Savings</Text>
        <Text style={styles.cardValue}>$1,200</Text>
        <Text style={styles.cardSubtitle}>YTD Variation: +2%</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Monthly Income</Text>
        <Text style={styles.cardValue}>$5,000</Text>
        <Text style={styles.cardSubtitle}>Updated: Jan 2024</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Monthly Expenses</Text>
        <Text style={styles.cardValue}>$3,500</Text>
        <Text style={styles.cardSubtitle}>Budget Remaining: $1,500</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
  },
});

export default HomeScreen;
