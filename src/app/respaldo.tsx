import { useState } from "react";

import { router } from "expo-router";

import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";

import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
    crearRespaldoBaseDatos,
    restaurarBaseDatos,
} from "@/database/database";

export default function RespaldoScreen() {
  const [cargando, setCargando] = useState(false);

  // Crear y compartir una copia de seguridad.
  async function crearYCompartirRespaldo() {
    setCargando(true);

    try {
      const ruta = await crearRespaldoBaseDatos();

      const disponible = await Sharing.isAvailableAsync();

      if (!disponible) {
        Alert.alert(
          "Aviso",
          "La opción para compartir archivos no está disponible.",
        );
        return;
      }

      await Sharing.shareAsync(ruta, {
        mimeType: "application/octet-stream",
        dialogTitle: "Guardar copia de seguridad",
      });
    } catch (error) {
      console.error("Error al crear el respaldo:", error);

      Alert.alert(
        "Error",
        "No se pudo crear o compartir la copia de seguridad.",
      );
    } finally {
      setCargando(false);
    }
  }

  // Seleccionar un archivo de respaldo del teléfono.
  async function seleccionarRespaldo() {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: false,
      });

      if (resultado.canceled) {
        return;
      }

      const archivo = resultado.assets[0];

      // Comprobar que el archivo tenga extensión .db.
      if (!archivo.name.toLowerCase().endsWith(".db")) {
        Alert.alert(
          "Archivo no válido",
          "Debes seleccionar una copia de seguridad con extensión .db.",
        );
        return;
      }

      // Pedir confirmación antes de reemplazar los datos.
      Alert.alert(
        "Confirmar restauración",
        "ATENCIÓN: Esta operación reemplazará todas las cátedras, estudiantes y asistencias actuales por los datos de la copia seleccionada. ¿Deseas continuar?",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Restaurar",
            style: "destructive",
            onPress: () => {
              void ejecutarRestauracion(archivo.uri);
            },
          },
        ],
      );
    } catch (error) {
      console.error("Error al seleccionar el respaldo:", error);

      Alert.alert("Error", "No se pudo seleccionar el archivo de respaldo.");
    }
  }

  // Ejecutar la restauración después de confirmar.
  async function ejecutarRestauracion(ruta: string) {
    setCargando(true);

    try {
      await restaurarBaseDatos(ruta);

      Alert.alert(
        "Restauración completada",
        "La copia de seguridad se restauró correctamente. La aplicación volverá a la pantalla principal.",
        [
          {
            text: "Aceptar",
            onPress: () => router.replace("/"),
          },
        ],
      );
    } catch (error) {
      console.error("Error al restaurar el respaldo:", error);

      Alert.alert(
        "Error de restauración",
        error instanceof Error
          ? error.message
          : "No se pudo restaurar la copia de seguridad.",
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Copias de seguridad</Text>

        <Text style={styles.description}>
          Crea copias de seguridad o restaura una copia anterior para proteger
          la información de tu aplicación.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>¿Qué contiene la copia?</Text>

          <Text style={styles.infoText}>• Todas las cátedras.</Text>
          <Text style={styles.infoText}>• Todos los estudiantes.</Text>
          <Text style={styles.infoText}>• El historial de asistencias.</Text>
          <Text style={styles.infoText}>• Los días de clase configurados.</Text>
          <Text style={styles.infoText}>
            • Las configuraciones de cada cátedra.
          </Text>
        </View>

        <Pressable
          style={[styles.backupButton, cargando && styles.disabledButton]}
          onPress={crearYCompartirRespaldo}
          disabled={cargando}
        >
          <Text style={styles.buttonText}>
            {cargando ? "Procesando..." : "Crear y guardar copia de seguridad"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.restoreButton, cargando && styles.disabledButton]}
          onPress={seleccionarRespaldo}
          disabled={cargando}
        >
          <Text style={styles.buttonText}>Restaurar copia de seguridad</Text>
        </Pressable>

        <Text style={styles.note}>
          Puedes guardar tus copias en Google Drive o en el almacenamiento de tu
          teléfono. Para restaurar, selecciona un archivo .db previamente creado
          por esta aplicación.
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={cargando}
        >
          <Text style={styles.buttonText}>Volver</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: "#64748B",
    lineHeight: 23,
    marginBottom: 25,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 18,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: "#475569",
    marginBottom: 9,
  },
  backupButton: {
    backgroundColor: "#2563EB",
    padding: 17,
    borderRadius: 10,
    alignItems: "center",
  },
  restoreButton: {
    backgroundColor: "#D97706",
    padding: 17,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  note: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 21,
    marginTop: 18,
  },
  backButton: {
    backgroundColor: "#475569",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: "auto",
  },
});
