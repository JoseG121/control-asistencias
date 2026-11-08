import { useState } from "react";

import { router, useLocalSearchParams } from "expo-router";

import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { obtenerInformeMensualPorCatedra } from "@/database/database";

type ResultadoInforme = {
  id: number;
  nombre: string;
  segundo_nombre: string | null;
  apellido: string;
  segundo_apellido: string | null;
  total_clases: number;
  presentes: number;
  ausentes: number;
  porcentaje_asistencia: number;
};

export default function InformeMensualScreen() {
  const { catedraId } = useLocalSearchParams<{
    catedraId: string;
  }>();

  const fechaActual = new Date();

  const [mes, setMes] = useState(String(fechaActual.getMonth() + 1));

  const [anio, setAnio] = useState(String(fechaActual.getFullYear()));

  const [informe, setInforme] = useState<ResultadoInforme[]>([]);
  const [consultado, setConsultado] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function consultarInforme() {
    const mesNumero = Number(mes);
    const anioNumero = Number(anio);

    if (!Number.isInteger(mesNumero) || mesNumero < 1 || mesNumero > 12) {
      Alert.alert("Mes incorrecto", "Introduce un mes entre 1 y 12.");
      return;
    }

    if (!Number.isInteger(anioNumero) || anioNumero < 1) {
      Alert.alert("Año incorrecto", "Introduce un año válido.");
      return;
    }

    if (!catedraId) {
      Alert.alert("Error", "No se encontró la cátedra.");
      return;
    }

    try {
      setCargando(true);

      const resultado = await obtenerInformeMensualPorCatedra(
        Number(catedraId),
        anioNumero,
        mesNumero,
      );

      setInforme(resultado);
      setConsultado(true);
    } catch (error) {
      console.error("Error al consultar el informe:", error);
      Alert.alert("Error", "No se pudo generar el informe mensual.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Informe mensual</Text>

        <Text style={styles.description}>
          Selecciona el mes y el año para consultar las asistencias de los
          estudiantes de esta cátedra.
        </Text>

        <Text style={styles.label}>Mes (1 al 12)</Text>

        <TextInput
          style={styles.input}
          value={mes}
          onChangeText={setMes}
          keyboardType="number-pad"
          placeholder="Ejemplo: 11"
          maxLength={2}
        />

        <Text style={styles.label}>Año</Text>

        <TextInput
          style={styles.input}
          value={anio}
          onChangeText={setAnio}
          keyboardType="number-pad"
          placeholder="Ejemplo: 2026"
          maxLength={4}
        />

        <Pressable
          style={[styles.searchButton, cargando && styles.disabledButton]}
          onPress={consultarInforme}
          disabled={cargando}
        >
          <Text style={styles.buttonText}>
            {cargando ? "Consultando..." : "Consultar informe"}
          </Text>
        </Pressable>

        {consultado && (
          <>
            <Text style={styles.resultsTitle}>Resultados del informe</Text>

            {informe.length === 0 ? (
              <Text style={styles.emptyText}>
                No hay estudiantes inscritos en esta cátedra.
              </Text>
            ) : (
              informe.map((estudiante) => {
                const nombreCompleto = [
                  estudiante.nombre,
                  estudiante.segundo_nombre,
                  estudiante.apellido,
                  estudiante.segundo_apellido,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <View key={estudiante.id} style={styles.studentCard}>
                    <Text style={styles.studentName}>{nombreCompleto}</Text>

                    <Text style={styles.studentId}>ID: {estudiante.id}</Text>

                    <Text style={styles.resultText}>
                      Total de registros: {estudiante.total_clases}
                    </Text>

                    <Text style={styles.presentText}>
                      Presentes: {estudiante.presentes}
                    </Text>

                    <Text style={styles.absentText}>
                      Ausentes: {estudiante.ausentes}
                    </Text>

                    <Text style={styles.percentageText}>
                      Asistencia: {estudiante.porcentaje_asistencia}%
                    </Text>
                  </View>
                );
              })
            )}
          </>
        )}

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Volver</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 25,
    lineHeight: 22,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 13,
    fontSize: 16,
    marginBottom: 18,
  },
  searchButton: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 25,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  resultsTitle: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 15,
  },
  studentCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  studentName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 5,
  },
  studentId: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  resultText: {
    fontSize: 15,
    color: "#374151",
    marginBottom: 7,
  },
  presentText: {
    fontSize: 15,
    color: "#15803D",
    marginBottom: 7,
  },
  absentText: {
    fontSize: 15,
    color: "#DC2626",
    marginBottom: 7,
  },
  percentageText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#2563EB",
    marginTop: 5,
  },
  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#6B7280",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },
});
