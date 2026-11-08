import { useEffect, useState } from "react";

import { router, useLocalSearchParams } from "expo-router";

import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
    actualizarEstudiante,
    eliminarEstudiante,
    obtenerEstudiantesPorCatedra,
} from "@/database/database";

export default function EditarEstudianteScreen() {
  const { id, catedraId } = useLocalSearchParams<{
    id: string;
    catedraId: string;
  }>();

  const [nombre, setNombre] = useState("");
  const [segundoNombre, setSegundoNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [segundoApellido, setSegundoApellido] = useState("");

  useEffect(() => {
    async function cargarEstudiante() {
      try {
        const estudiantes = await obtenerEstudiantesPorCatedra(
          Number(catedraId),
        );

        const estudiante = estudiantes.find((item) => item.id === Number(id));

        if (!estudiante) {
          Alert.alert("Error", "No se encontró el estudiante.");
          return;
        }

        setNombre(estudiante.nombre);
        setSegundoNombre(estudiante.segundo_nombre ?? "");
        setApellido(estudiante.apellido);
        setSegundoApellido(estudiante.segundo_apellido ?? "");
      } catch (error) {
        Alert.alert("Error", "No se pudieron cargar los datos.");
        console.error(error);
      }
    }

    if (id && catedraId) {
      cargarEstudiante();
    }
  }, [id, catedraId]);

  async function guardarCambios() {
    try {
      await actualizarEstudiante(
        Number(id),
        nombre,
        segundoNombre,
        apellido,
        segundoApellido,
      );

      Alert.alert(
        "Correcto",
        "Los datos del estudiante se actualizaron correctamente.",
        [
          {
            text: "Aceptar",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudieron actualizar los datos.",
      );

      console.error(error);
    }
  }

  function confirmarEliminacion() {
    Alert.alert(
      "Eliminar estudiante",
      "¿Estás seguro de que deseas eliminar este estudiante? También se eliminarán todas sus asistencias y su historial. Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: eliminarEstudianteConfirmado,
        },
      ],
    );
  }

  async function eliminarEstudianteConfirmado() {
    try {
      await eliminarEstudiante(Number(id));

      Alert.alert(
        "Correcto",
        "El estudiante y todo su historial fueron eliminados.",
        [
          {
            text: "Aceptar",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el estudiante.",
      );

      console.error(error);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Editar estudiante</Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Nombre"
        />

        <Text style={styles.label}>Segundo nombre</Text>
        <TextInput
          style={styles.input}
          value={segundoNombre}
          onChangeText={setSegundoNombre}
          placeholder="Segundo nombre"
        />

        <Text style={styles.label}>Apellido</Text>
        <TextInput
          style={styles.input}
          value={apellido}
          onChangeText={setApellido}
          placeholder="Apellido"
        />

        <Text style={styles.label}>Segundo apellido</Text>
        <TextInput
          style={styles.input}
          value={segundoApellido}
          onChangeText={setSegundoApellido}
          placeholder="Segundo apellido"
        />

        <Pressable style={styles.button} onPress={guardarCambios}>
          <Text style={styles.buttonText}>Guardar cambios</Text>
        </Pressable>

        <Pressable style={styles.deleteButton} onPress={confirmarEliminacion}>
          <Text style={styles.buttonText}>Eliminar estudiante</Text>
        </Pressable>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Cancelar</Text>
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
    padding: 24,
    gap: 12,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#172554",
    textAlign: "center",
    marginBottom: 20,
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },

  button: {
    backgroundColor: "#2563EB",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },

  deleteButton: {
    backgroundColor: "#DC2626",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
  },

  backButton: {
    backgroundColor: "#64748B",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
