import { useCallback, useState } from "react";

import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { obtenerEstudiantesPorCatedra } from "@/database/database";

type Estudiante = {
  id: number;
  catedra_id: number;
  nombre: string;
  segundo_nombre: string | null;
  apellido: string;
  segundo_apellido: string | null;
  leccion_actual: number;
};

export default function EstudiantesScreen() {
  const { catedraId } = useLocalSearchParams<{
    catedraId: string;
  }>();

  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function cargarEstudiantes() {
        try {
          const resultado = await obtenerEstudiantesPorCatedra(
            Number(catedraId),
          );

          setEstudiantes(resultado);
        } catch (error) {
          Alert.alert("Error", "No se pudieron cargar los estudiantes.");
          console.error(error);
        }
      }

      if (catedraId) {
        cargarEstudiantes();
      }
    }, [catedraId]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Estudiantes inscritos</Text>

        {estudiantes.length === 0 ? (
          <Text style={styles.emptyText}>
            Todavía no hay estudiantes inscritos en esta cátedra.
          </Text>
        ) : (
          estudiantes.map((estudiante) => {
            const nombreCompleto = [
              estudiante.nombre,
              estudiante.segundo_nombre,
              estudiante.apellido,
              estudiante.segundo_apellido,
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <ViewEstudiante
                key={estudiante.id}
                id={estudiante.id}
                nombre={nombreCompleto}
                catedraId={catedraId}
              />
            );
          })
        )}

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Volver</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ViewEstudiante({
  id,
  nombre,
  catedraId,
}: {
  id: number;
  nombre: string;
  catedraId: string;
}) {
  return (
    <Pressable
      style={styles.studentCard}
      onPress={() =>
        router.push(`/editar-estudiante?id=${id}&catedraId=${catedraId}`)
      }
    >
      <Text style={styles.studentName}>{nombre}</Text>
      <Text style={styles.studentId}>ID: {id}</Text>
      <Text style={styles.studentId}>Pulsa para editar</Text>
    </Pressable>
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
    marginBottom: 15,
  },

  emptyText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 30,
  },

  studentCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  studentName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#172554",
  },

  studentId: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 5,
  },

  backButton: {
    backgroundColor: "#64748B",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
