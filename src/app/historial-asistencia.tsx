import { useEffect, useState } from "react";

import { router, useLocalSearchParams } from "expo-router";

import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { obtenerHistorialAsistenciasPorCatedra } from "@/database/database";

type RegistroHistorial = {
  id: number;
  estudiante_id: number;
  nombre: string;
  segundo_nombre: string | null;
  apellido: string;
  segundo_apellido: string | null;
  fecha: string;
  estado: "P" | "A";
  leccion: number;
};

export default function HistorialAsistenciaScreen() {
  const { catedraId } = useLocalSearchParams<{
    catedraId: string;
  }>();

  const [historial, setHistorial] = useState<RegistroHistorial[]>([]);

  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");

  const [filtro, setFiltro] = useState<"Todos" | "P" | "A">("Todos");

  useEffect(() => {
    async function cargarHistorial() {
      try {
        setCargando(true);

        const resultado = await obtenerHistorialAsistenciasPorCatedra(
          Number(catedraId),
        );

        setHistorial(resultado);
      } catch (error) {
        console.error(error);

        Alert.alert("Error", "No se pudo cargar el historial de asistencia.");
      } finally {
        setCargando(false);
      }
    }

    if (catedraId) {
      cargarHistorial();
    }
  }, [catedraId]);

  const historialFiltrado = historial.filter((registro) => {
    const nombreCompleto = [
      registro.nombre,
      registro.segundo_nombre,
      registro.apellido,
      registro.segundo_apellido,
    ]
      .filter(Boolean)
      .join(" ");

    const coincideNombre = nombreCompleto
      .toLowerCase()
      .includes(busqueda.toLowerCase().trim());

    const coincideEstado = filtro === "Todos" || registro.estado === filtro;

    return coincideNombre && coincideEstado;
  });

  const totalPresentes = historial.filter(
    (registro) => registro.estado === "P",
  ).length;

  const totalAusentes = historial.filter(
    (registro) => registro.estado === "A",
  ).length;

  if (cargando) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Historial de asistencia</Text>

        <Text style={styles.subtitle}>Registros de esta cátedra</Text>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>Total: {historial.length}</Text>

          <Text style={styles.presentSummary}>Presentes: {totalPresentes}</Text>

          <Text style={styles.absentSummary}>Ausentes: {totalAusentes}</Text>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Buscar estudiante..."
          value={busqueda}
          onChangeText={setBusqueda}
        />

        <Text style={styles.filterTitle}>Filtrar por estado:</Text>

        <View style={styles.filterContainer}>
          <Pressable
            style={[
              styles.filterButton,
              filtro === "Todos" && styles.selectedFilter,
            ]}
            onPress={() => setFiltro("Todos")}
          >
            <Text style={styles.filterText}>Todos</Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              filtro === "P" && styles.selectedPresentFilter,
            ]}
            onPress={() => setFiltro("P")}
          >
            <Text style={styles.filterText}>Presentes</Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              filtro === "A" && styles.selectedAbsentFilter,
            ]}
            onPress={() => setFiltro("A")}
          >
            <Text style={styles.filterText}>Ausentes</Text>
          </Pressable>
        </View>

        {historialFiltrado.length === 0 ? (
          <Text style={styles.emptyText}>
            No se encontraron registros de asistencia.
          </Text>
        ) : (
          historialFiltrado.map((registro) => {
            const nombreCompleto = [
              registro.nombre,
              registro.segundo_nombre,
              registro.apellido,
              registro.segundo_apellido,
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <View key={registro.id} style={styles.recordCard}>
                <Text style={styles.studentName}>{nombreCompleto}</Text>

                <Text style={styles.detail}>
                  ID del estudiante: {registro.estudiante_id}
                </Text>

                <Text style={styles.detail}>Fecha: {registro.fecha}</Text>

                <View style={styles.recordFooter}>
                  <Text
                    style={[
                      styles.status,
                      registro.estado === "P"
                        ? styles.presentStatus
                        : styles.absentStatus,
                    ]}
                  >
                    {registro.estado === "P" ? "PRESENTE" : "AUSENTE"}
                  </Text>

                  <Text style={styles.lesson}>Lección: {registro.leccion}</Text>
                </View>
              </View>
            );
          })
        )}

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FA",
  },

  content: {
    flexGrow: 1,
    padding: 24,
    gap: 14,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#172554",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
  },

  summary: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 10,
    gap: 8,
  },

  summaryText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#172554",
  },

  presentSummary: {
    color: "#16A34A",
    fontWeight: "bold",
  },

  absentSummary: {
    color: "#DC2626",
    fontWeight: "bold",
  },

  searchInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },

  filterTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#334155",
  },

  filterContainer: {
    flexDirection: "row",
    gap: 8,
  },

  filterButton: {
    flex: 1,
    backgroundColor: "#94A3B8",
    padding: 11,
    borderRadius: 8,
    alignItems: "center",
  },

  selectedFilter: {
    backgroundColor: "#2563EB",
  },

  selectedPresentFilter: {
    backgroundColor: "#16A34A",
  },

  selectedAbsentFilter: {
    backgroundColor: "#DC2626",
  },

  filterText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },

  recordCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    gap: 8,
  },

  studentName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#172554",
  },

  detail: {
    fontSize: 14,
    color: "#64748B",
  },

  recordFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },

  status: {
    fontSize: 13,
    fontWeight: "bold",
  },

  presentStatus: {
    color: "#16A34A",
  },

  absentStatus: {
    color: "#DC2626",
  },

  lesson: {
    fontSize: 13,
    color: "#64748B",
  },

  emptyText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 16,
    marginTop: 25,
  },

  loadingText: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 12,
  },

  backButton: {
    backgroundColor: "#64748B",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
