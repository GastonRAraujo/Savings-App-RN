import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useSQLiteContext } from 'expo-sqlite';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useHideNumbers } from '../HideNumbersContext';

// Define types for the data
type PortfolioValueRow = {
  priceUSD: number;
  priceARS: number;
};

type MonthlyValueRow = {
  month: string;
  priceUSD: number;
};

type PortfolioTypeSummary = {
  type: string;
  valueUSD: number;
};

const HomeScreen = () => {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PortfolioValueRow>({ priceUSD: 0, priceARS: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyValueRow[]>([]);
  const [typeSummary, setTypeSummary] = useState<PortfolioTypeSummary[]>([]);
  const { hideNumbers, setHideNumbers } = useHideNumbers();

  useEffect(() => {
    if (db) {
      fetchData();
    }
  }, [db]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch latest portfolio value
      const latestResult: PortfolioValueRow[] = await db.getAllAsync(
        `SELECT priceUSD, priceARS FROM PortfolioValue ORDER BY date DESC LIMIT 1;`
      );
      if (latestResult.length > 0) {
        const latest: PortfolioValueRow = latestResult[0];
        setSummary(latest);
      } else {
        setSummary({ priceUSD: 0, priceARS: 0 }); // Fallback value
      }

      // Fetch monthly data
      const monthlyResult = await db.getAllAsync(
        `SELECT strftime('%Y-%m', date) AS month, MAX(priceUSD) AS priceUSD
         FROM PortfolioValue
         GROUP BY month
         ORDER BY date ASC;`
      );
      if (monthlyResult.length > 0) {
        const monthlyValues = monthlyResult.map((row: any): MonthlyValueRow => ({
          month: row.month,
          priceUSD: row.priceUSD ?? 0, // Ensure default value for missing data
        }));
        setMonthlyData(monthlyValues);
      } else {
        setMonthlyData([]); // Empty chart data fallback
      }

      // Fetch type summary
      const typeResult = await db.getAllAsync(
        `SELECT type, SUM(amount * lastPriceUSD) AS valueUSD 
         FROM Portfolio 
         GROUP BY type;`
      );
      if (typeResult.length > 0) {
        const typeValues = typeResult.map((row: any): PortfolioTypeSummary => ({
          type: row.type,
          valueUSD: row.valueUSD ?? 0, // Ensure default value
        }));
        setTypeSummary(typeValues);
      } else {
        setTypeSummary([]); // Empty chart data fallback
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading data...</Text>
      </View>
    );
  }

  // Prepare chart data for the line chart
  const chartLabels = monthlyData.map((row) => row.month || 'N/A');
  let chartData: number[] = [];
  let yAxisLabel = "$";

  if (hideNumbers) {
    // If numbers are hidden, convert monthly values to % change relative to the first month.
    if (monthlyData.length > 0) {
      const base = monthlyData[0].priceUSD;
      chartData = monthlyData.map((row) =>
        base !== 0 ? ((row.priceUSD - base) / base) * 100 : 0
      );
    }
    yAxisLabel = "%";
  } else {
    chartData = monthlyData.map((row) => row.priceUSD || 0);
  }

  // Predefined color palette for the pie chart
  const colorPalette = ['#4CAF50', '#FFC107', '#2196F3', '#FF5722', '#9C27B0', '#00BCD4'];
  const pieChartData = typeSummary.map((type, index) => ({
    name: type.type,
    value: type.valueUSD,
    color: colorPalette[index % colorPalette.length],
    legendFontColor: '#333',
    legendFontSize: 12,
  }));

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Total Savings (USD)</Text>
          <Pressable onPress={() => setHideNumbers(!hideNumbers)}>
            <Ionicons name={hideNumbers ? "eye-off" : "eye"} size={24} color="gray" />
          </Pressable>
        </View>
        <Text style={styles.cardValue}>
          ${hideNumbers ? '****' : summary.priceUSD.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={styles.cardTitle}>Total Savings (ARS)</Text>
        <Text style={styles.cardValue}>
          AR$ {hideNumbers ? '****' : summary.priceARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </Text>
      </View>

      {pieChartData.length > 0 ? (
        <>
          <Text style={styles.chartTitle}>Portfolio Distribution by Type</Text>
          <PieChart
            data={pieChartData}
            width={350}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        </>
      ) : (
        <Text style={styles.noDataText}>No type distribution data available.</Text>
      )}

      {chartData.length > 0 ? (
        <>
          <Text style={styles.chartTitle}>
            {hideNumbers ? "Monthly Portfolio % Change" : "Monthly Portfolio Values (USD)"}
          </Text>
          <LineChart
            data={{
              labels: chartLabels,
              datasets: [{ data: chartData }],
            }}
            width={350} // Chart width
            height={220} // Chart height
            yAxisLabel={yAxisLabel}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#f2f2f2',
              backgroundGradientTo: '#ffffff',
              color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              strokeWidth: 2,
            }}
            style={styles.chart}
          />
        </>
      ) : (
        <Text style={styles.noDataText}>No monthly data available.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  scrollContainer: {
    paddingBottom: 20,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 20,
    paddingTop: 50,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 10,
    marginVertical: 8,
    alignSelf: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginVertical: 10,
  },
});

export default HomeScreen;
