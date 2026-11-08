import * as SQLite from "expo-sqlite";

// Mantiene la conexión con nuestra base de datos.
let db: SQLite.SQLiteDatabase | null = null;

// Abre la base de datos local.
export async function getDatabase() {
  if (db === null) {
    db = await SQLite.openDatabaseAsync("control-estudiantes.db");
  }

  return db;
}

// Crear una copia de seguridad de la base de datos.
export async function crearRespaldoBaseDatos() {
  const database = await getDatabase();

  const respaldo = await SQLite.openDatabaseAsync(
    "control-estudiantes-respaldo.db",
  );

  await SQLite.backupDatabaseAsync({
    sourceDatabase: database,
    sourceDatabaseName: "main",
    destDatabase: respaldo,
    destDatabaseName: "main",
  });
}

// Actualizar las tablas para eliminar el límite fijo de 80 lecciones.
async function migrarTablasLecciones(database: SQLite.SQLiteDatabase) {
  const esquemaEstudiantes = await database.getFirstAsync<{
    sql: string;
  }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'estudiantes'",
  );

  const esquemaAsistencias = await database.getFirstAsync<{
    sql: string;
  }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'asistencias'",
  );

  const necesitaMigracion =
    /BETWEEN\s+1\s+AND\s+80/i.test(esquemaEstudiantes?.sql ?? "") ||
    /BETWEEN\s+1\s+AND\s+80/i.test(esquemaAsistencias?.sql ?? "");

  if (!necesitaMigracion) {
    return;
  }

  await database.execAsync("PRAGMA foreign_keys = OFF;");

  try {
    await database.execAsync("BEGIN TRANSACTION;");

    try {
      await database.execAsync(`
        CREATE TABLE estudiantes_nueva (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          catedra_id INTEGER NOT NULL,
          nombre TEXT NOT NULL,
          segundo_nombre TEXT,
          apellido TEXT NOT NULL,
          segundo_apellido TEXT,
          leccion_actual INTEGER NOT NULL DEFAULT 1
            CHECK (leccion_actual >= 1),
          FOREIGN KEY (catedra_id)
            REFERENCES catedras(id)
            ON DELETE RESTRICT
        );
      `);

      await database.execAsync(`
        INSERT INTO estudiantes_nueva (
          id,
          catedra_id,
          nombre,
          segundo_nombre,
          apellido,
          segundo_apellido,
          leccion_actual
        )
        SELECT
          id,
          catedra_id,
          nombre,
          segundo_nombre,
          apellido,
          segundo_apellido,
          leccion_actual
        FROM estudiantes;
      `);

      await database.execAsync(`
        CREATE TABLE asistencias_nueva (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          estudiante_id INTEGER NOT NULL,
          fecha TEXT NOT NULL,
          estado TEXT NOT NULL
            CHECK (estado IN ('P', 'A')),
          leccion INTEGER NOT NULL
            CHECK (leccion >= 1),
          FOREIGN KEY (estudiante_id)
            REFERENCES estudiantes_nueva(id)
            ON DELETE RESTRICT,
          UNIQUE (estudiante_id, fecha)
        );
      `);

      await database.execAsync(`
        INSERT INTO asistencias_nueva (
          id,
          estudiante_id,
          fecha,
          estado,
          leccion
        )
        SELECT
          id,
          estudiante_id,
          fecha,
          estado,
          leccion
        FROM asistencias;
      `);

      await database.execAsync(`
        DROP TABLE asistencias;
        DROP TABLE estudiantes;
      `);

      await database.execAsync(`
        ALTER TABLE estudiantes_nueva RENAME TO estudiantes;
        ALTER TABLE asistencias_nueva RENAME TO asistencias;
      `);

      await database.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_estudiantes_catedra
          ON estudiantes(catedra_id);

        CREATE INDEX IF NOT EXISTS idx_asistencias_estudiante_fecha
          ON asistencias(estudiante_id, fecha);
      `);

      const erroresRelaciones = await database.getAllAsync(
        "PRAGMA foreign_key_check",
      );

      if (erroresRelaciones.length > 0) {
        throw new Error(
          "La migración encontró problemas en las relaciones de la base de datos.",
        );
      }

      await database.execAsync("COMMIT;");
    } catch (error) {
      await database.execAsync("ROLLBACK;");
      throw error;
    }
  } finally {
    await database.execAsync("PRAGMA foreign_keys = ON;");
  }
}

// Crea las tablas necesarias para la aplicación.
export async function initDatabase() {
  const database = await getDatabase();

  await database.execAsync(`
    PRAGMA foreign_keys = ON;

    -- Tabla de cátedras.
    CREATE TABLE IF NOT EXISTS catedras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Días de clase de cada cátedra.
    CREATE TABLE IF NOT EXISTS catedra_dias (
      catedra_id INTEGER NOT NULL,
      dia_semana TEXT NOT NULL
        CHECK (dia_semana IN (
          'Lunes', 'Martes', 'Miercoles', 'Jueves',
          'Viernes', 'Sabado', 'Domingo'
        )),
      PRIMARY KEY (catedra_id, dia_semana),
      FOREIGN KEY (catedra_id)
        REFERENCES catedras(id)
        ON DELETE CASCADE
    );

    -- Estudiantes inscritos en cada cátedra.
    CREATE TABLE IF NOT EXISTS estudiantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      catedra_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      segundo_nombre TEXT,
      apellido TEXT NOT NULL,
      segundo_apellido TEXT,
      leccion_actual INTEGER NOT NULL DEFAULT 1
        CHECK (leccion_actual >= 1),
      FOREIGN KEY (catedra_id)
        REFERENCES catedras(id)
        ON DELETE RESTRICT
    );

    -- Asistencias individuales de los estudiantes.
    CREATE TABLE IF NOT EXISTS asistencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estudiante_id INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      estado TEXT NOT NULL
        CHECK (estado IN ('P', 'A')),
      leccion INTEGER NOT NULL
        CHECK (leccion >= 1),
      FOREIGN KEY (estudiante_id)
        REFERENCES estudiantes(id)
        ON DELETE RESTRICT,
      UNIQUE (estudiante_id, fecha)
    );

    -- Índices para facilitar las consultas.
    CREATE INDEX IF NOT EXISTS idx_estudiantes_catedra
      ON estudiantes(catedra_id);

    CREATE INDEX IF NOT EXISTS idx_asistencias_estudiante_fecha
      ON asistencias(estudiante_id, fecha);
  `);

  // Actualizar las tablas antiguas si es necesario.
  await migrarTablasLecciones(database);

  // Comprobar las columnas actuales de la tabla catedras.
  const columnasCatedras = await database.getAllAsync<{
    name: string;
  }>("PRAGMA table_info(catedras)");

  // Agregar el control de lecciones si todavía no existe.
  if (
    !columnasCatedras.some((columna) => columna.name === "control_lecciones")
  ) {
    await database.execAsync(`
      ALTER TABLE catedras
      ADD COLUMN control_lecciones INTEGER NOT NULL DEFAULT 0
      CHECK (control_lecciones IN (0, 1));
    `);
  }

  // Agregar la lección inicial si todavía no existe.
  if (!columnasCatedras.some((columna) => columna.name === "leccion_inicial")) {
    await database.execAsync(`
      ALTER TABLE catedras
      ADD COLUMN leccion_inicial INTEGER NOT NULL DEFAULT 1;
    `);
  }

  // Agregar la lección final si todavía no existe.
  if (!columnasCatedras.some((columna) => columna.name === "leccion_final")) {
    await database.execAsync(`
      ALTER TABLE catedras
      ADD COLUMN leccion_final INTEGER NOT NULL DEFAULT 80;
    `);
  }
}

// Crear una nueva cátedra.
export async function crearCatedra(nombre: string) {
  const database = await getDatabase();

  const nombreLimpio = nombre.trim();

  if (!nombreLimpio) {
    throw new Error("El nombre de la cátedra es obligatorio.");
  }

  await database.runAsync(
    "INSERT INTO catedras (nombre) VALUES (?)",
    nombreLimpio,
  );
}

// Obtener todas las cátedras guardadas.
export async function obtenerCatedras() {
  const database = await getDatabase();

  const catedras = await database.getAllAsync<{
    id: number;
    nombre: string;
    fecha_creacion: string;
  }>("SELECT id, nombre, fecha_creacion FROM catedras ORDER BY id DESC");

  return catedras;
}

// Obtener una cátedra específica mediante su ID.
export async function obtenerCatedraPorId(id: number) {
  const database = await getDatabase();

  const catedra = await database.getFirstAsync<{
    id: number;
    nombre: string;
    fecha_creacion: string;
    control_lecciones: number;
    leccion_inicial: number;
    leccion_final: number;
  }>(
    `SELECT
      id,
      nombre,
      fecha_creacion,
      control_lecciones,
      leccion_inicial,
      leccion_final
    FROM catedras
    WHERE id = ?`,
    id,
  );

  return catedra;
}

// Crear un estudiante dentro de una cátedra.
export async function crearEstudiante(
  catedraId: number,
  nombre: string,
  segundoNombre: string,
  apellido: string,
  segundoApellido: string,
) {
  const database = await getDatabase();

  const nombreLimpio = nombre.trim();
  const apellidoLimpio = apellido.trim();

  if (!nombreLimpio || !apellidoLimpio) {
    throw new Error("El nombre y el apellido son obligatorios.");
  }

  const resultado = await database.runAsync(
    `INSERT INTO estudiantes (
      catedra_id,
      nombre,
      segundo_nombre,
      apellido,
      segundo_apellido
    ) VALUES (?, ?, ?, ?, ?)`,
    catedraId,
    nombreLimpio,
    segundoNombre.trim(),
    apellidoLimpio,
    segundoApellido.trim(),
  );

  return resultado.lastInsertRowId;
}

// Obtener los estudiantes de una cátedra específica.
export async function obtenerEstudiantesPorCatedra(catedraId: number) {
  const database = await getDatabase();

  const estudiantes = await database.getAllAsync<{
    id: number;
    catedra_id: number;
    nombre: string;
    segundo_nombre: string | null;
    apellido: string;
    segundo_apellido: string | null;
    leccion_actual: number;
  }>(
    `SELECT
      id,
      catedra_id,
      nombre,
      segundo_nombre,
      apellido,
      segundo_apellido,
      leccion_actual
    FROM estudiantes
    WHERE catedra_id = ?
    ORDER BY id ASC`,
    catedraId,
  );

  return estudiantes;
}

// Actualizar los datos de un estudiante.
export async function actualizarEstudiante(
  id: number,
  nombre: string,
  segundoNombre: string,
  apellido: string,
  segundoApellido: string,
) {
  const database = await getDatabase();

  const nombreLimpio = nombre.trim();
  const apellidoLimpio = apellido.trim();

  if (!nombreLimpio || !apellidoLimpio) {
    throw new Error("El nombre y el apellido son obligatorios.");
  }

  const resultado = await database.runAsync(
    `UPDATE estudiantes
     SET
       nombre = ?,
       segundo_nombre = ?,
       apellido = ?,
       segundo_apellido = ?
     WHERE id = ?`,
    nombreLimpio,
    segundoNombre.trim(),
    apellidoLimpio,
    segundoApellido.trim(),
    id,
  );

  return resultado.changes;
}

// Eliminar un estudiante y todo su historial de asistencias.
export async function eliminarEstudiante(id: number) {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      "DELETE FROM asistencias WHERE estudiante_id = ?",
      id,
    );

    const resultado = await database.runAsync(
      "DELETE FROM estudiantes WHERE id = ?",
      id,
    );

    if (resultado.changes === 0) {
      throw new Error("No se encontró el estudiante que deseas eliminar.");
    }
  });
}

// Datos de una asistencia individual.
export type RegistroAsistencia = {
  estudianteId: number;
  estado: "P" | "A";
  leccion: number;
};

// Guardar las asistencias de una cátedra.
export async function guardarAsistencias(
  catedraId: number,
  fecha: string,
  registros: RegistroAsistencia[],
) {
  const database = await getDatabase();

  if (registros.length === 0) {
    throw new Error("No hay estudiantes para registrar.");
  }

  await database.withTransactionAsync(async () => {
    // Obtener la configuración de lecciones de la cátedra.
    const catedra = await database.getFirstAsync<{
      control_lecciones: number;
      leccion_inicial: number;
      leccion_final: number;
    }>(
      `SELECT
        control_lecciones,
        leccion_inicial,
        leccion_final
      FROM catedras
      WHERE id = ?`,
      catedraId,
    );

    if (!catedra) {
      throw new Error("No se encontró la cátedra.");
    }

    // Comprobar si ya existe asistencia en esa fecha.
    const existente = await database.getFirstAsync<{
      total: number;
    }>(
      `SELECT COUNT(*) AS total
       FROM asistencias a
       INNER JOIN estudiantes e ON e.id = a.estudiante_id
       WHERE e.catedra_id = ? AND a.fecha = ?`,
      catedraId,
      fecha,
    );

    if (existente && existente.total > 0) {
      throw new Error("Ya existe un registro de asistencia para esta fecha.");
    }

    // Guardar la asistencia de cada estudiante.
    for (const registro of registros) {
      const estudiante = await database.getFirstAsync<{
        leccion_actual: number;
      }>(
        `SELECT leccion_actual
         FROM estudiantes
         WHERE id = ? AND catedra_id = ?`,
        registro.estudianteId,
        catedraId,
      );

      if (!estudiante) {
        throw new Error("No se encontró uno de los estudiantes.");
      }

      let leccion = estudiante.leccion_actual;

      // Aplicar el control de lecciones solamente si está activado.
      if (catedra.control_lecciones === 1) {
        leccion = registro.leccion;

        if (
          leccion < catedra.leccion_inicial ||
          leccion > catedra.leccion_final
        ) {
          throw new Error(
            `La lección debe estar entre ${catedra.leccion_inicial} y ${catedra.leccion_final}.`,
          );
        }

        // Actualizar la lección actual del estudiante.
        await database.runAsync(
          "UPDATE estudiantes SET leccion_actual = ? WHERE id = ?",
          leccion,
          registro.estudianteId,
        );
      }

      // Insertar el registro de asistencia.
      await database.runAsync(
        `INSERT INTO asistencias (
          estudiante_id,
          fecha,
          estado,
          leccion
        ) VALUES (?, ?, ?, ?)`,
        registro.estudianteId,
        fecha,
        registro.estado,
        leccion,
      );
    }
  });
}

// Obtener el historial de asistencia de una cátedra.
export async function obtenerHistorialAsistenciasPorCatedra(catedraId: number) {
  const database = await getDatabase();

  const historial = await database.getAllAsync<{
    id: number;
    estudiante_id: number;
    nombre: string;
    segundo_nombre: string | null;
    apellido: string;
    segundo_apellido: string | null;
    fecha: string;
    estado: "P" | "A";
    leccion: number;
  }>(
    `SELECT
      a.id,
      a.estudiante_id,
      e.nombre,
      e.segundo_nombre,
      e.apellido,
      e.segundo_apellido,
      a.fecha,
      a.estado,
      a.leccion
    FROM asistencias a
    INNER JOIN estudiantes e
      ON e.id = a.estudiante_id
    WHERE e.catedra_id = ?
    ORDER BY a.fecha DESC, e.id ASC`,
    catedraId,
  );

  return historial;
}

// Obtener el informe mensual de una cátedra.
export async function obtenerInformeMensualPorCatedra(
  catedraId: number,
  anio: number,
  mes: number,
) {
  const database = await getDatabase();

  // Comprobar que el año y el mes sean válidos.
  if (
    !Number.isInteger(anio) ||
    anio < 1 ||
    !Number.isInteger(mes) ||
    mes < 1 ||
    mes > 12
  ) {
    throw new Error("El año o el mes no son válidos.");
  }

  // Calcular el primer día del mes.
  const fechaInicial =
    `${String(anio).padStart(4, "0")}-` + `${String(mes).padStart(2, "0")}-01`;

  // Calcular el primer día del mes siguiente.
  const siguienteAnio = mes === 12 ? anio + 1 : anio;
  const siguienteMes = mes === 12 ? 1 : mes + 1;

  const fechaFinal =
    `${String(siguienteAnio).padStart(4, "0")}-` +
    `${String(siguienteMes).padStart(2, "0")}-01`;

  // Consultar todos los estudiantes y sus asistencias.
  const informe = await database.getAllAsync<{
    id: number;
    nombre: string;
    segundo_nombre: string | null;
    apellido: string;
    segundo_apellido: string | null;
    total_clases: number;
    presentes: number;
    ausentes: number;
    porcentaje_asistencia: number;
  }>(
    `SELECT
      e.id,
      e.nombre,
      e.segundo_nombre,
      e.apellido,
      e.segundo_apellido,

      COUNT(a.id) AS total_clases,

      COALESCE(
        SUM(CASE WHEN a.estado = 'P' THEN 1 ELSE 0 END),
        0
      ) AS presentes,

      COALESCE(
        SUM(CASE WHEN a.estado = 'A' THEN 1 ELSE 0 END),
        0
      ) AS ausentes,

      CASE
        WHEN COUNT(a.id) = 0 THEN 0
        ELSE ROUND(
          SUM(CASE WHEN a.estado = 'P' THEN 1 ELSE 0 END)
          * 100.0 / COUNT(a.id),
          1
        )
      END AS porcentaje_asistencia

    FROM estudiantes e

    LEFT JOIN asistencias a
      ON a.estudiante_id = e.id
      AND a.fecha >= ?
      AND a.fecha < ?

    WHERE e.catedra_id = ?

    GROUP BY e.id

    ORDER BY e.id ASC`,
    fechaInicial,
    fechaFinal,
    catedraId,
  );

  return informe;
}

// Días de la semana permitidos.
export type DiaSemana =
  | "Lunes"
  | "Martes"
  | "Miércoles"
  | "Jueves"
  | "Viernes"
  | "Sábado"
  | "Domingo";

// Obtener los días de clase de una cátedra.
export async function obtenerDiasClaseCatedra(
  catedraId: number,
): Promise<DiaSemana[]> {
  const database = await getDatabase();

  const resultado = await database.getAllAsync<{
    dia_semana: string;
  }>(
    `SELECT dia_semana
     FROM catedra_dias
     WHERE catedra_id = ?
     ORDER BY CASE dia_semana
       WHEN 'Lunes' THEN 1
       WHEN 'Martes' THEN 2
       WHEN 'Miercoles' THEN 3
       WHEN 'Jueves' THEN 4
       WHEN 'Viernes' THEN 5
       WHEN 'Sabado' THEN 6
       WHEN 'Domingo' THEN 7
     END`,
    catedraId,
  );

  // Convertir los nombres de SQLite a los nombres con tilde.
  return resultado.map((fila) => {
    if (fila.dia_semana === "Miercoles") {
      return "Miércoles";
    }

    if (fila.dia_semana === "Sabado") {
      return "Sábado";
    }

    return fila.dia_semana as DiaSemana;
  });
}

// Guardar los días de clase de una cátedra.
export async function guardarDiasClaseCatedra(
  catedraId: number,
  dias: DiaSemana[],
) {
  const database = await getDatabase();

  const diasPermitidos: DiaSemana[] = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];

  if (dias.length === 0) {
    throw new Error("Debes seleccionar al menos un día de clase.");
  }

  if (
    dias.some((dia) => !diasPermitidos.includes(dia)) ||
    new Set(dias).size !== dias.length
  ) {
    throw new Error("La selección de días no es válida.");
  }

  await database.withTransactionAsync(async () => {
    const catedra = await database.getFirstAsync<{
      id: number;
    }>("SELECT id FROM catedras WHERE id = ?", catedraId);

    if (!catedra) {
      throw new Error("No se encontró la cátedra.");
    }

    await database.runAsync(
      "DELETE FROM catedra_dias WHERE catedra_id = ?",
      catedraId,
    );

    for (const dia of dias) {
      // SQLite guarda estos dos nombres sin tilde.
      const diaBD =
        dia === "Miércoles" ? "Miercoles" : dia === "Sábado" ? "Sabado" : dia;

      await database.runAsync(
        `INSERT INTO catedra_dias (
          catedra_id,
          dia_semana
        ) VALUES (?, ?)`,
        catedraId,
        diaBD,
      );
    }
  });
}
