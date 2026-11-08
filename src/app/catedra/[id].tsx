import { useEffect, useState } from "react";

import { router, useLocalSearchParams } from "expo-router";

import { Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { obtenerCatedraPorId } from "@/database/database";

type Catedra = {
  id: number;
  nombre: string;
  fecha_creacion: string;
};

export default function CatedraScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [catedra, setCatedra] = useState<Catedra | null>(null);

  useEffect(() => {
    async function cargarCatedra() {
      try {
        const resultado = await obtenerCatedraPorId(Number(id));

        if (resultado) {
          setCatedra(resultado);
        } else {
          Alert.alert("Atención", "No se encontró esta cátedra.");
        }
      } catch (error) {
        Alert.alert("Error", "No se pudo cargar la cátedra.");
        console.error(error);
      }
    }

    cargarCatedra();
  }, [id]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Panel de la cátedra</Text>

        <Text style={styles.subtitle}>
          {catedra ? catedra.nombre : "Cargando cátedra..."}
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => router.push(`/inscribir?catedraId=${id}`)}
        >
          <Text style={styles.buttonText}>Inscribir estudiantes</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => router.push(`/estudiantes?catedraId=${id}`)}
        >
          <Text style={styles.buttonText}>Ver estudiantes inscritos</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => router.push(`/asistencias?catedraId=${id}`)}
        >
          <Text style={styles.buttonText}>Asistencia</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => router.push(`/historial-asistencia?catedraId=${id}`)}
        >
          <Text style={styles.buttonText}>Historial de asistencia</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => router.push(`/informe-mensual?catedraId=${id}`)}
        >
          <Text style={styles.buttonText}>Informes mensuales</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => router.push(`/informe-rango?catedraId=${id}`)}
        >
          <Text style={styles.buttonText}>Informe por rango de fechas</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => router.push(`/configurar-dias?catedraId=${id}`)}
        >
          <Text style={styles.buttonText}>Configurar días de clase</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => router.push("/respaldo")}
        >
          <Text style={styles.buttonText}>Copias de seguridad</Text>
        </Pressable>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Volver a las cátedras</Text>
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
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },

  title: {
    fontSize: 27,
    fontWeight: "bold",
    textAlign: "center",
    color: "#172554",
  },

  subtitle: {
    fontSize: 17,
    textAlign: "center",
    color: "#64748B",
    marginBottom: 20,
  },

  button: {
    backgroundColor: "#2563EB",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },

  backButton: {
    backgroundColor: "#64748B",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
