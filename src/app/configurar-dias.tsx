import { useEffect, useState } from "react";

import { router, useLocalSearchParams } from "expo-router";

import { Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
    DiaSemana,
    guardarDiasClaseCatedra,
    obtenerDiasClaseCatedra,
} from "@/database/database";

const diasSemana: DiaSemana[] = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export default function ConfigurarDiasScreen() {
  const { catedraId } = useLocalSearchParams<{
    catedraId: string;
  }>();

  const [diasSeleccionados, setDiasSeleccionados] = useState<DiaSemana[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function cargarDias() {
      try {
        if (!catedraId) {
          throw new Error("No se encontró la cátedra.");
        }

        const resultado = await obtenerDiasClaseCatedra(Number(catedraId));

        setDiasSeleccionados(resultado);
      } catch (error) {
        console.error("Error al cargar los días:", error);
        Alert.alert("Error", "No se pudieron cargar los días de clase.");
      } finally {
        setCargando(false);
      }
    }

    cargarDias();
  }, [catedraId]);

  function cambiarDia(dia: DiaSemana) {
    setDiasSeleccionados((actuales) => {
      if (actuales.includes(dia)) {
        return actuales.filter((elemento) => elemento !== dia);
      }

      return [...actuales, dia];
    });
  }

  async function guardarConfiguracion() {
    if (diasSeleccionados.length === 0) {
      Alert.alert(
        "Selecciona días",
        "Debes seleccionar al menos un día de clase.",
      );
      return;
    }

    try {
      setGuardando(true);

      await guardarDiasClaseCatedra(Number(catedraId), diasSeleccionados);

      Alert.alert(
        "Configuración guardada",
        "Los días de clase se guardaron correctamente.",
        [
          {
            text: "Aceptar",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      console.error("Error al guardar los días:", error);
      Alert.alert("Error", "No se pudieron guardar los días de clase.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Configurar días de clase</Text>

        <Text style={styles.description}>
          Selecciona los días en los que se imparten clases en esta cátedra.
          Puedes seleccionar uno o varios días.
        </Text>

        {cargando ? (
          <Text style={styles.message}>Cargando configuración...</Text>
        ) : (
          <>
            {diasSemana.map((dia) => {
              const seleccionado = diasSeleccionados.includes(dia);

              return (
                <Pressable
                  key={dia}
                  style={[
                    styles.dayCard,
                    seleccionado && styles.dayCardSelected,
                  ]}
                  onPress={() => cambiarDia(dia)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      seleccionado && styles.dayTextSelected,
                    ]}
                  >
                    {seleccionado ? "☑" : "☐"} {dia}
                  </Text>
                </Pressable>
              );
            })}

            <Text style={styles.counter}>
              Días seleccionados: {diasSeleccionados.length}
            </Text>

            <Pressable
              style={[styles.saveButton, guardando && styles.disabledButton]}
              onPress={guardarConfiguracion}
              disabled={guardando}
            >
              <Text style={styles.buttonText}>
                {guardando ? "Guardando..." : "Guardar configuración"}
              </Text>
            </Pressable>
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
    fontSize: 25,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 25,
  },
  dayCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 17,
    marginBottom: 12,
  },
  dayCardSelected: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  dayText: {
    fontSize: 17,
    color: "#374151",
  },
  dayTextSelected: {
    color: "#1D4ED8",
    fontWeight: "bold",
  },
  counter: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
    marginTop: 12,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  backButton: {
    backgroundColor: "#6B7280",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  message: {
    fontSize: 15,
    color: "#6B7280",
    marginVertical: 20,
  },
});
