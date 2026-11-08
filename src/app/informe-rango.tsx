import { useState } from "react";

import { router, useLocalSearchParams } from "expo-router";

import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
    obtenerClasesSinRegistroPorRangoFechas,
    obtenerInformePorRangoFechas,
} from "@/database/database";

type EstudianteInforme = {
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

type CampoFecha = "inicio" | "final" | null;

function formatearFecha(fecha: Date): string {
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = fecha.getFullYear();

  return `${dia}/${mes}/${anio}`;
}

function convertirFechaISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function formatearFechaISO(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export default function InformeRangoScreen() {
  const { catedraId } = useLocalSearchParams<{
    catedraId: string;
  }>();

  const [fechaInicial, setFechaInicial] = useState<Date | null>(null);
  const [fechaFinal, setFechaFinal] = useState<Date | null>(null);

  const [campoFecha, setCampoFecha] = useState<CampoFecha>(null);

  const [informe, setInforme] = useState<EstudianteInforme[]>([]);
  const [fechasSinRegistro, setFechasSinRegistro] = useState<string[]>([]);

  const [consultado, setConsultado] = useState(false);
  const [cargando, setCargando] = useState(false);

  function abrirCalendario(campo: "inicio" | "final") {
    setCampoFecha(campo);
  }

  function cambiarFecha(evento: DateTimePickerEvent, fechaSeleccionada?: Date) {
    if (evento.type === "dismissed") {
      setCampoFecha(null);
      return;
    }

    if (fechaSeleccionada && campoFecha === "inicio") {
      setFechaInicial(fechaSeleccionada);
    }

    if (fechaSeleccionada && campoFecha === "final") {
      setFechaFinal(fechaSeleccionada);
    }

    setCampoFecha(null);
    setConsultado(false);
  }

  async function consultarInforme() {
    if (!fechaInicial || !fechaFinal) {
      Alert.alert(
        "Fechas incompletas",
        "Selecciona la fecha inicial y la fecha final en el calendario.",
      );
      return;
    }

    const inicio = convertirFechaISO(fechaInicial);
    const final = convertirFechaISO(fechaFinal);

    if (inicio > final) {
      Alert.alert(
        "Rango incorrecto",
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
      return;
    }

    if (!catedraId || !Number.isInteger(Number(catedraId))) {
      Alert.alert("Error", "No se pudo identificar la cátedra.");
      return;
    }

    setCargando(true);
    setConsultado(false);

    try {
      const resultado = await obtenerInformePorRangoFechas(
        Number(catedraId),
        inicio,
        final,
      );

      const clasesPendientes = await obtenerClasesSinRegistroPorRangoFechas(
        Number(catedraId),
        inicio,
        final,
      );

      setInforme(resultado);
      setFechasSinRegistro(clasesPendientes);
      setConsultado(true);
    } catch (error) {
      console.error("Error al consultar el informe:", error);

      Alert.alert(
        "Error",
        "No se pudo generar el informe por rango de fechas.",
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Informe por rango de fechas</Text>

        <Text style={styles.description}>
          Selecciona las fechas para consultar las asistencias de los
          estudiantes.
        </Text>

        <Text style={styles.label}>Fecha inicial</Text>

        <Pressable
          style={styles.dateButton}
          onPress={() => abrirCalendario("inicio")}
        >
          <Text style={fechaInicial ? styles.selectedDate : styles.placeholder}>
            {fechaInicial
              ? formatearFecha(fechaInicial)
              : "Seleccionar fecha inicial"}
          </Text>
        </Pressable>

        <Text style={styles.label}>Fecha final</Text>

        <Pressable
          style={styles.dateButton}
          onPress={() => abrirCalendario("final")}
        >
          <Text style={fechaFinal ? styles.selectedDate : styles.placeholder}>
            {fechaFinal
              ? formatearFecha(fechaFinal)
              : "Seleccionar fecha final"}
          </Text>
        </Pressable>

        {campoFecha !== null && (
          <DateTimePicker
            value={
              campoFecha === "inicio"
                ? (fechaInicial ?? new Date())
                : (fechaFinal ?? fechaInicial ?? new Date())
            }
            mode="date"
            display="default"
            onChange={cambiarFecha}
          />
        )}

        <Pressable
          style={styles.searchButton}
          onPress={consultarInforme}
          disabled={cargando}
        >
          <Text style={styles.buttonText}>
            {cargando ? "Consultando..." : "Consultar informe"}
          </Text>
        </Pressable>

        {consultado && (
          <View style={styles.results}>
            <Text style={styles.sectionTitle}>Resultados del informe</Text>

            <Text style={styles.period}>
              Período: {formatearFecha(fechaInicial!)} al{" "}
              {formatearFecha(fechaFinal!)}
            </Text>

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

                    <Text style={styles.detail}>ID: {estudiante.id}</Text>

                    <Text style={styles.detail}>
                      Total de asistencias registradas:{" "}
                      {estudiante.total_clases}
                    </Text>

                    <Text style={styles.present}>
                      Presentes: {estudiante.presentes}
                    </Text>

                    <Text style={styles.absent}>
                      Ausentes: {estudiante.ausentes}
                    </Text>

                    <Text style={styles.percentage}>
                      Asistencia: {estudiante.porcentaje_asistencia}%
                    </Text>
                  </View>
                );
              })
            )}

            <View style={styles.pendingSection}>
              <Text style={styles.sectionTitle}>Clases sin registro</Text>

              <Text style={styles.description}>
                Días programados que ya pasaron y no tienen ningún registro de
                asistencia.
              </Text>

              {fechasSinRegistro.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay clases sin registro en este período.
                </Text>
              ) : (
                fechasSinRegistro.map((fecha) => (
                  <View key={fecha} style={styles.dateCard}>
                    <Text style={styles.dateText}>
                      {formatearFechaISO(fecha)}
                    </Text>
                  </View>
                ))
              )}

              <Text style={styles.note}>
                Importante: las clases sin registro no se cuentan
                automáticamente como ausencias.
              </Text>
            </View>
          </View>
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
    backgroundColor: "#F4F6F8",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 18,
    lineHeight: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 16,
    marginBottom: 18,
  },
  selectedDate: {
    fontSize: 17,
    color: "#1E293B",
    fontWeight: "600",
  },
  placeholder: {
    fontSize: 17,
    color: "#888888",
  },
  searchButton: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 25,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  results: {
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 12,
  },
  period: {
    fontSize: 15,
    color: "#475569",
    marginBottom: 15,
  },
  studentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  studentName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 8,
  },
  detail: {
    fontSize: 15,
    color: "#475569",
    marginBottom: 6,
  },
  present: {
    fontSize: 15,
    color: "#15803D",
    marginBottom: 6,
  },
  absent: {
    fontSize: 15,
    color: "#DC2626",
    marginBottom: 6,
  },
  percentage: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1D4ED8",
    marginTop: 5,
  },
  pendingSection: {
    marginTop: 20,
    marginBottom: 15,
  },
  dateCard: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400E",
  },
  note: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 10,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 15,
  },
  backButton: {
    backgroundColor: "#475569",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
});
