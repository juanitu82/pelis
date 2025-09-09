import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

const categorias = [
  { key: "terror", label: "Terror", color: "#e74c3c" },
  { key: "scifi", label: "Sci-Fi", color: "#3498db" },
  { key: "thriller", label: "Thriller", color: "#9b59b6" },
  { key: "accion", label: "Acción", color: "#f39c12" },
  { key: "drama", label: "Drama", color: "#2ecc71" },
  { key: "todas", label: "Todas", color: "#34495e" },
  { key: "noVistas", label: "NoVistas", color: "#f1c40f" },
];

export default function Index() {
  const [soloNoVistas, setSoloNoVistas] = useState(false);
  const router = useRouter();

  const goToDetalle = (genero: string) => {
    router.push({
      pathname: "/detalle",
      params: { genero, soloNoVistas: String(soloNoVistas) },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Elige un género</Text>

      <View style={styles.grid}>
        {categorias.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.card, { backgroundColor: cat.color }]}
            onPress={() => goToDetalle(cat.key)}
          >
            <Text style={styles.cardText}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleText}>Solo no vistas</Text>
        <Switch value={soloNoVistas} onValueChange={setSoloNoVistas} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: "#1e1e1e",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 30,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "47%",
    paddingVertical: 30,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  cardText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
  toggleText: {
    fontSize: 16,
    color: "#fff",
    marginRight: 10,
  },
});


