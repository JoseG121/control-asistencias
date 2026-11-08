import { crearEstudiante } from "@/database/database";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

export default function InscribirScreen() {
  const { catedraId } = useLocalSearchParams<{ catedraId: string }>();

  const [nombre, setNombre] = useState("");
  const [segundoNombre, setSegundoNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [segundoApellido, setSegundoApellido] = useState("");

  async function guardarEstudiante() {
    if (!nombre.trim() || !apellido.trim()) {
      Alert.alert(
        "Campos obligatorios",
        "Debes escribir el nombre y el apellido.",
      );
      return;
    }

    if (!catedraId) {
      Alert.alert("Error", "No se encontró la cátedra.");
      return;
    }

    try {
      await crearEstudiante(
        Number(catedraId),
        nombre,
        segundoNombre,
        apellido,
        segundoApellido,
      );

      Alert.alert("Correcto", "El estudiante se guardó correctamente.", [
        {
          text: "Aceptar",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el estudiante.");
      console.error(error);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Inscribir estudiantes</Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          placeholder="Escribe el nombre"
          value={nombre}
          onChangeText={setNombre}
        />

        <Text style={styles.label}>Segundo nombre</Text>
        <TextInput
          style={styles.input}
          placeholder="Escribe el segundo nombre"
          value={segundoNombre}
          onChangeText={setSegundoNombre}
        />

        <Text style={styles.label}>Apellido</Text>
        <TextInput
          style={styles.input}
          placeholder="Escribe el apellido"
          value={apellido}
          onChangeText={setApellido}
        />

        <Text style={styles.label}>Segundo apellido</Text>
        <TextInput
          style={styles.input}
          placeholder="Escribe el segundo apellido"
          value={segundoApellido}
          onChangeText={setSegundoApellido}
        />

        <Pressable style={styles.button} onPress={guardarEstudiante}>
          <Text style={styles.buttonText}>Guardar estudiante</Text>
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

  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
  },
});
