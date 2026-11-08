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

import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  guardarAsistencias,
  obtenerCatedraPorId,
  obtenerDiasClaseCatedra,
  obtenerEstudiantesPorCatedra,
  type DiaSemana,
  type RegistroAsistencia,
} from "@/database/database";

type Catedra = {
  id: number;
  nombre: string;
  control_lecciones: number;
  leccion_inicial: number;
  leccion_final: number;
};

type Estudiante = {
  id: number;
  catedra_id: number;
  nombre: string;
  segundo_nombre: string | null;
  apellido: string;
  segundo_apellido: string | null;
  leccion_actual: number;
};

type RegistroPantalla = {
  estudianteId: number;
  estado: "P" | "A";
  leccion: string;
};

// Obtener la fecha actual.
function obtenerFechaActual() {
  const fecha = new Date();

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

// Obtener el nombre del día actual.
function obtenerDiaSemanaActual(): DiaSemana {
  const dias: DiaSemana[] = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  return dias[new Date().getDay()];
}

export default function AsistenciaScreen() {
  const { catedraId } = useLocalSearchParams<{
    catedraId: string;
  }>();

  const [catedra, setCatedra] = useState<Catedra | null>(null);

  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);

  const [registros, setRegistros] = useState<RegistroPantalla[]>([]);

  const [diasClase, setDiasClase] = useState<DiaSemana[]>([]);

  const [busqueda, setBusqueda] = useState("");

  const [cargando, setCargando] = useState(true);

  const [guardando, setGuardando] = useState(false);

  const [fecha, setFecha] = useState(obtenerFechaActual());

  const [diaSemana, setDiaSemana] = useState(obtenerDiaSemanaActual());

  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  // Actualizar la fecha y el día de la semana seleccionados.
  function cambiarFecha(nuevaFecha: Date) {
    const anio = nuevaFecha.getFullYear();
    const mes = String(nuevaFecha.getMonth() + 1).padStart(2, "0");
    const dia = String(nuevaFecha.getDate()).padStart(2, "0");

    setFecha(`${anio}-${mes}-${dia}`);

    const dias: DiaSemana[] = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];

    setDiaSemana(dias[nuevaFecha.getDay()]);
  }
  useEffect(() => {
    async function cargarDatos() {
      try {
        setCargando(true);

        const id = Number(catedraId);

        const resultadoCatedra = await obtenerCatedraPorId(id);

        if (!resultadoCatedra) {
          Alert.alert("Atención", "No se encontró esta cátedra.");
          return;
        }

        setCatedra(resultadoCatedra);

        // Obtener los días de clase configurados para esta cátedra.
        const resultadoDias = await obtenerDiasClaseCatedra(id);

        setDiasClase(resultadoDias);

        const resultadoEstudiantes = await obtenerEstudiantesPorCatedra(id);

        setEstudiantes(resultadoEstudiantes);

        // Todos comienzan como ausentes.
        // El usuario puede marcarlos como presentes.
        setRegistros(
          resultadoEstudiantes.map((estudiante) => ({
            estudianteId: estudiante.id,
            estado: "A",
            leccion: String(estudiante.leccion_actual),
          })),
        );
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "No se pudieron cargar los datos.");
      } finally {
        setCargando(false);
      }
    }

    if (catedraId) {
      cargarDatos();
    }
  }, [catedraId]);

  function cambiarEstado(estudianteId: number, estado: "P" | "A") {
    setRegistros((actuales) =>
      actuales.map((registro) =>
        registro.estudianteId === estudianteId
          ? { ...registro, estado }
          : registro,
      ),
    );
  }

  function cambiarLeccion(estudianteId: number, leccion: string) {
    setRegistros((actuales) =>
      actuales.map((registro) =>
        registro.estudianteId === estudianteId
          ? { ...registro, leccion }
          : registro,
      ),
    );
  }

  async function guardarRegistro(continuarAunqueNoSeaDiaClase = false) {
    if (!catedra) {
      return;
    }

    if (estudiantes.length === 0) {
      Alert.alert("Atención", "No hay estudiantes inscritos en esta cátedra.");
      return;
    }

    // Comprobar si hoy es un día de clase configurado.
    if (!diasClase.includes(diaSemana) && !continuarAunqueNoSeaDiaClase) {
      Alert.alert(
        "Día no programado",
        `Hoy es ${diaSemana} y no está configurado como día de clase para esta cátedra.\n\n¿Deseas registrar la asistencia de todas formas?`,
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Continuar de todas formas",
            onPress: () => guardarRegistro(true),
          },
        ],
      );

      return;
    }

    const registrosPreparados: RegistroAsistencia[] = [];

    for (const registro of registros) {
      const leccion = Number(registro.leccion);

      if (
        catedra.control_lecciones === 1 &&
        (!Number.isInteger(leccion) ||
          leccion < catedra.leccion_inicial ||
          leccion > catedra.leccion_final)
      ) {
        Alert.alert(
          "Lección incorrecta",
          `Las lecciones deben estar entre ${catedra.leccion_inicial} y ${catedra.leccion_final}.`,
        );
        return;
      }

      registrosPreparados.push({
        estudianteId: registro.estudianteId,
        estado: registro.estado,
        leccion,
      });
    }

    try {
      setGuardando(true);

      await guardarAsistencias(Number(catedraId), fecha, registrosPreparados);

      Alert.alert(
        "Asistencia guardada",
        "El registro de asistencia se guardó correctamente.",
        [
          {
            text: "Aceptar",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      console.error(error);

      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo guardar la asistencia.",
      );
    } finally {
      setGuardando(false);
    }
  }

  const estudiantesFiltrados = estudiantes.filter((estudiante) => {
    const nombreCompleto = [
      estudiante.nombre,
      estudiante.segundo_nombre,
      estudiante.apellido,
      estudiante.segundo_apellido,
    ]
      .filter(Boolean)
      .join(" ");

    return nombreCompleto.toLowerCase().includes(busqueda.toLowerCase().trim());
  });

  const totalPresentes = registros.filter(
    (registro) => registro.estado === "P",
  ).length;

  const totalAusentes = registros.filter(
    (registro) => registro.estado === "A",
  ).length;

  if (cargando) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando estudiantes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Control de asistencia</Text>

        <Text style={styles.subtitle}>{catedra?.nombre}</Text>

        <Pressable
          style={styles.dateButton}
          onPress={() => setMostrarCalendario(true)}
        >
          <Text style={styles.dateButtonText}>Seleccionar fecha: {fecha}</Text>
        </Pressable>

        <Text style={styles.date}>Día: {diaSemana}</Text>

        {mostrarCalendario && (
          <DateTimePicker
            value={
              new Date(
                Number(fecha.substring(0, 4)),
                Number(fecha.substring(5, 7)) - 1,
                Number(fecha.substring(8, 10)),
              )
            }
            mode="date"
            display="default"
            onChange={(evento, fechaSeleccionada) => {
              setMostrarCalendario(false);

              if (fechaSeleccionada) {
                cambiarFecha(fechaSeleccionada);
              }
            }}
          />
        )}
        <View style={styles.summary}>
          <Text style={styles.summaryText}>Presentes: {totalPresentes}</Text>

          <Text style={styles.summaryText}>Ausentes: {totalAusentes}</Text>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Buscar estudiante..."
          value={busqueda}
          onChangeText={setBusqueda}
        />

        {estudiantes.length === 0 ? (
          <Text style={styles.emptyText}>
            Todavía no hay estudiantes inscritos en esta cátedra.
          </Text>
        ) : estudiantesFiltrados.length === 0 ? (
          <Text style={styles.emptyText}>No se encontraron estudiantes.</Text>
        ) : (
          estudiantesFiltrados.map((estudiante) => {
            const nombreCompleto = [
              estudiante.nombre,
              estudiante.segundo_nombre,
              estudiante.apellido,
              estudiante.segundo_apellido,
            ]
              .filter(Boolean)
              .join(" ");

            const registro = registros.find(
              (item) => item.estudianteId === estudiante.id,
            );

            if (!registro) {
              return null;
            }

            return (
              <View key={estudiante.id} style={styles.studentCard}>
                <Text style={styles.studentName}>{nombreCompleto}</Text>

                <Text style={styles.studentId}>ID: {estudiante.id}</Text>

                <View style={styles.statusContainer}>
                  <Pressable
                    style={[
                      styles.statusButton,
                      registro.estado === "P"
                        ? styles.presentButton
                        : styles.inactiveButton,
                    ]}
                    onPress={() => cambiarEstado(estudiante.id, "P")}
                  >
                    <Text style={styles.buttonText}>Presente</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.statusButton,
                      registro.estado === "A"
                        ? styles.absentButton
                        : styles.inactiveButton,
                    ]}
                    onPress={() => cambiarEstado(estudiante.id, "A")}
                  >
                    <Text style={styles.buttonText}>Ausente</Text>
                  </Pressable>
                </View>

                {catedra?.control_lecciones === 1 && (
                  <View style={styles.lessonContainer}>
                    <Text style={styles.lessonLabel}>Lección:</Text>

                    <TextInput
                      style={styles.lessonInput}
                      value={registro.leccion}
                      onChangeText={(valor) =>
                        cambiarLeccion(estudiante.id, valor)
                      }
                      keyboardType="number-pad"
                      placeholder="Número"
                    />

                    <Text style={styles.lessonRange}>
                      Permitidas: {catedra.leccion_inicial}–
                      {catedra.leccion_final}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        <Pressable
          style={[styles.saveButton, guardando && styles.disabledButton]}
          onPress={() => guardarRegistro()}
          disabled={guardando}
        >
          <Text style={styles.buttonText}>
            {guardando ? "Guardando..." : "Guardar asistencia"}
          </Text>
        </Pressable>

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
    backgroundColor: "#F4F6FA",
    justifyContent: "center",
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
    fontSize: 19,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },

  date: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
  },
  dateButton: {
    backgroundColor: "#DBEAFE",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2563EB",
  },

  dateButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1D4ED8",
  },

  summary: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 10,
  },

  summaryText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#172554",
  },

  searchInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },

  studentCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    gap: 10,
  },

  studentName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#172554",
  },

  studentId: {
    fontSize: 13,
    color: "#64748B",
  },

  statusContainer: {
    flexDirection: "row",
    gap: 10,
  },

  statusButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  presentButton: {
    backgroundColor: "#16A34A",
  },

  absentButton: {
    backgroundColor: "#DC2626",
  },

  inactiveButton: {
    backgroundColor: "#94A3B8",
  },

  lessonContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  lessonLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#334155",
  },

  lessonInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    width: 75,
    padding: 8,
    textAlign: "center",
  },

  lessonRange: {
    fontSize: 12,
    color: "#64748B",
  },

  emptyText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 25,
  },

  loadingText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 12,
  },

  saveButton: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },

  disabledButton: {
    opacity: 0.6,
  },

  backButton: {
    backgroundColor: "#64748B",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});
