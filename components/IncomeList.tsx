import { Text, TouchableOpacity, View } from "react-native";
import { Income } from "@/app/types";  // Adjust this import path as per your project

export default function IncomeList({
  incomes,
  deleteIncome,
}: {
  incomes: Income[];
  deleteIncome: (id: number) => void;
}) {
  return (
    <View style={{ gap: 15 }}>
      {incomes.map((income) => (
        <TouchableOpacity
          key={income.id}
          activeOpacity={0.7}
          onLongPress={() => deleteIncome(income.id)}  // Use long press to delete
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 10,
              backgroundColor: "#f9f9f9",
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            <Text style={{ flex: 1, fontWeight: "bold" }}>{income.name}</Text>
            <Text style={{ flex: 1, textAlign: "center" }}>${income.amount}</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>{income.date}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
