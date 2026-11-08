import { router } from "expo-router";
import { useEffect, useState } from "react";

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

import { crearCatedra, obtenerCatedras } from "@/database/database";

type Catedra = {
  id: number;
  nombre: string;
  fecha_creacion: string;
};

export default function HomeScreen() {
  const [catedras, setCatedras] = useState<Catedra[]>([]);
  const [nombre, setNombre] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  async function cargarCatedras() {
    try {
      const resultado = await obtenerCatedras();
      setCatedras(resultado);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar las cátedras.");
      console.error(error);
    }
  }

  useEffect(() => {
    cargarCatedras();
  }, []);

  async function guardarCatedra() {
    if (!nombre.trim()) {
      Alert.alert("Atención", "Escribe el nombre de la cátedra.");
      return;
    }

    try {
      await crearCatedra(nombre);
      setNombre("");
      setMostrarFormulario(false);
      await cargarCatedras();

      Alert.alert("Correcto", "La cátedra se guardó correctamente.");
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar la cátedra.");
      console.error(error);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Cátedras</Text>

        <Text style={styles.subtitle}>
          Selecciona una cátedra para continuar.
        </Text>

        {catedras.length === 0 ? (
          <Text style={styles.emptyText}>
            Todavía no tienes cátedras creadas.
          </Text>
        ) : (
          catedras.map((catedra) => (
            <Pressable
              key={catedra.id}
              style={styles.card}
              onPress={() => router.push(`/catedra/${catedra.id}`)}
            >
              <Text style={styles.cardTitle}>{catedra.nombre}</Text>
            </Pressable>
          ))
        )}

        <Pressable
          style={styles.button}
          onPress={() => setMostrarFormulario(!mostrarFormulario)}
        >
          <Text style={styles.buttonText}>
            {mostrarFormulario ? "Cancelar" : "+ Agregar cátedra"}
          </Text>
        </Pressable>

        {mostrarFormulario && (
          <View style={styles.form}>
            <Text style={styles.label}>Nombre de la cátedra</Text>

            <TextInput
              style={styles.input}
              placeholder="Ejemplo: Matemáticas"
              value={nombre}
              onChangeText={setNombre}
            />

            <Pressable style={styles.saveButton} onPress={guardarCatedra}>
              <Text style={styles.buttonText}>Guardar cátedra</Text>
            </Pressable>
          </View>
        )}
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
    gap: 16,
  },

  title: {
    fontSize: 28,
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

  emptyText: {
    textAlign: "center",
    color: "#64748B",
    padding: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#172554",
  },

  button: {
    backgroundColor: "#2563EB",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  form: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 12,
    gap: 12,
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
  },

  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },

  saveButton: {
    backgroundColor: "#16A34A",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
});
