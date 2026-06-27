/**
 * Backend para Administrador de Prompts SPA
 * 
 * Instrucciones:
 * 1. Crea un Google Sheet.
 * 2. En el menú superior, ve a "Extensiones" -> "Apps Script".
 * 3. Borra el código existente y pega este contenido.
 * 4. Haz clic en "Implementar" (Deploy) -> "Nueva implementación" (New deployment).
 * 5. Selecciona el tipo "Aplicación web" (Web app).
 * 6. Configura:
 *    - Descripción: Backend de Prompts
 *    - Ejecutar como: Tu cuenta de Google ("Me")
 *    - Quién tiene acceso: "Cualquiera" ("Anyone")
 * 7. Copia la URL de la aplicación web generada (Web App URL) y pégala en la sección de configuración de la SPA.
 */

// Nombre de la hoja de cálculo que servirá de base de datos
var SHEET_NAME = "Prompts";

/**
 * Obtiene la hoja de cálculo de Prompts. La crea si no existe.
 */
function getOrCreateSheet() {
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    // Ocurre si el script no está vinculado a una hoja
  }

  if (!ss) {
    // Si no está vinculado, intentamos buscar una propiedad SPREADSHEET_ID
    var properties = PropertiesService.getScriptProperties();
    var sheetId = properties.getProperty("SPREADSHEET_ID");
    if (sheetId) {
      ss = SpreadsheetApp.openById(sheetId);
    }
  }

  if (!ss) {
    throw new Error(
      "No se encontró una hoja de cálculo vinculada. " +
      "Por favor, abre este script desde un Google Sheet (Extensiones -> Apps Script) " +
      "o configura el ID de la hoja en las propiedades del script."
    );
  }

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

/**
 * Configura la hoja de cálculo con las columnas necesarias en la fila 1.
 */
function setupSheet() {
  try {
    var sheet = getOrCreateSheet();
    var headers = ["Categoría", "Nombre prompt", "Prompt", "Ejemplos", "Fecha"];

    // Verificamos si la hoja está vacía o si ya tiene cabeceras
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();

    if (lastRow === 0 || lastColumn === 0) {
      // Si está completamente vacía, agregamos cabeceras
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      // Aplicamos un formato simple a las cabeceras (Negrita, fondo gris, alineación centrada)
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#E0E0E0");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1); // Congela la primera fila
      return { status: "success", message: "Hoja de cálculo inicializada y columnas creadas con éxito." };
    }

    // Si ya tiene datos, verificamos que la primera fila coincida con los encabezados
    var currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var match = true;
    for (var i = 0; i < headers.length; i++) {
      if (currentHeaders[i] !== headers[i]) {
        match = false;
        break;
      }
    }

    if (!match) {
      // Si no coinciden, podemos corregir la fila 1 sin borrar los datos siguientes
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      return { status: "success", message: "Cabeceras corregidas para coincidir con la estructura requerida." };
    }

    return { status: "success", message: "La hoja ya estaba configurada correctamente." };
  } catch (error) {
    return { status: "error", message: error.toString() };
  }
}

/**
 * Helper para responder con JSON y CORS habilitados de forma segura.
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Manejador de peticiones GET: Lee y retorna los prompts registrados.
 */
function doGet(e) {
  try {
    var sheet = getOrCreateSheet();

    // Si la hoja está totalmente vacía o no tiene columnas, la inicializamos
    if (sheet.getLastRow() === 0) {
      setupSheet();
    }

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      // Solo tiene cabeceras o está vacía
      return jsonResponse({ status: "success", data: [] });
    }

    // Obtenemos los valores (empezando en la fila 2), leemos 5 columnas para incluir la Fecha
    var range = sheet.getRange(2, 1, lastRow - 1, 5);
    var values = range.getValues();

    var data = [];
    for (var i = 0; i < values.length; i++) {
      var rowNum = i + 2; // Número de fila real en la hoja de cálculo
      var row = values[i];
      var fechaVal = "";
      if (row[4]) {
        if (row[4] instanceof Date) {
          fechaVal = Utilities.formatDate(row[4], Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        } else {
          fechaVal = row[4].toString();
        }
      }
      data.push({
        row: rowNum,
        categoria: row[0] || "",
        nombre: row[1] || "",
        prompt: row[2] || "",
        ejemplos: row[3] || "",
        fecha: fechaVal
      });
    }

    return jsonResponse({ status: "success", data: data });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

/**
 * Manejador de peticiones POST: Crear, Editar o Eliminar.
 * Recibe JSON en el cuerpo del request (enviado como text/plain para evitar preflights CORS).
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "Petición vacía o sin datos válidos." });
    }

    // Parseamos los datos recibidos
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var sheet = getOrCreateSheet();

    if (action === "setup") {
      var setupResult = setupSheet();
      return jsonResponse(setupResult);
    }

    if (action === "seed") {
      var seedResult = insertExampleData();
      return jsonResponse(seedResult);
    }

    if (action === "create") {
      var categoria = payload.categoria || "";
      var fontName = payload.nombre || ""; // Wait, the original code had: var nombre = payload.nombre || ""; let's use that.
      var nombre = payload.nombre || "";
      var prompt = payload.prompt || "";
      var ejemplos = payload.ejemplos || "";

      if (!nombre || !prompt) {
        return jsonResponse({ status: "error", message: "El nombre del prompt y el prompt son obligatorios." });
      }

      var fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      sheet.appendRow([categoria, nombre, prompt, ejemplos, fecha]);
      var newRowIndex = sheet.getLastRow();

      return jsonResponse({
        status: "success",
        message: "Prompt guardado correctamente.",
        data: {
          row: newRowIndex,
          categoria: categoria,
          nombre: nombre,
          prompt: prompt,
          ejemplos: ejemplos,
          fecha: fecha
        }
      });
    }

    if (action === "update") {
      var rowNum = parseInt(payload.row, 10);
      var categoria = payload.categoria || "";
      var nombre = payload.nombre || "";
      var prompt = payload.prompt || "";
      var ejemplos = payload.ejemplos || "";

      if (isNaN(rowNum) || rowNum <= 1 || rowNum > sheet.getLastRow()) {
        return jsonResponse({ status: "error", message: "Fila inválida para actualizar." });
      }

      if (!nombre || !prompt) {
        return jsonResponse({ status: "error", message: "El nombre del prompt y el prompt son obligatorios." });
      }

      // Actualizamos las celdas en la fila correspondiente
      sheet.getRange(rowNum, 1, 1, 4).setValues([[categoria, nombre, prompt, ejemplos]]);

      return jsonResponse({
        status: "success",
        message: "Prompt actualizado correctamente.",
        data: {
          row: rowNum,
          categoria: categoria,
          nombre: nombre,
          prompt: prompt,
          ejemplos: ejemplos
        }
      });
    }

    if (action === "delete") {
      var rowNum = parseInt(payload.row, 10);

      if (isNaN(rowNum) || rowNum <= 1 || rowNum > sheet.getLastRow()) {
        return jsonResponse({ status: "error", message: "Fila inválida para eliminar." });
      }

      sheet.deleteRow(rowNum);

      return jsonResponse({
        status: "success",
        message: "Prompt eliminado correctamente de la hoja de cálculo."
      });
    }

    return jsonResponse({ status: "error", message: "Acción no reconocida." });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

/**
 * Agrega datos de ejemplo a tu hoja de cálculo.
 * Puedes ejecutar esta función manualmente desde el menú superior de Google Apps Script 
 * (seleccionando "insertExampleData" y presionando "Ejecutar").
 */
function insertExampleData() {
  try {
    var sheet = getOrCreateSheet();
    setupSheet(); // Asegura que las columnas iniciales existan

    // Conjunto de prompts de ejemplo
    var examples = [
      [
        "Redacción",
        "Mejorar Redacción de Correos",
        "Eres un experto en comunicación corporativa. Reescribe el siguiente correo electrónico para que suene más profesional, claro y empático. Mantén el mensaje original pero elimina cualquier tono pasivo-agresivo o confuso:\n\n[Inserta tu correo aquí]",
        "Entrada: \"Hola, te envié el archivo ayer y no respondiste. Lo necesito ya para la reunión.\"\n\nSalida: \"Hola [Nombre], espero que estés bien. Te escribo para consultar si tuviste oportunidad de revisar el archivo enviado ayer. Agradecería tu retroalimentación antes de la reunión de hoy.\""
      ],
      [
        "Desarrollo",
        "Generador de Consultas SQL",
        "Actúa como un analista de datos experto en PostgreSQL. Escribe una consulta SQL eficiente basada en la siguiente descripción del problema. Asume una tabla llamada \"ventas\" con campos \"id\", \"fecha\", \"monto\", \"cliente_id\" y \"categoria\":\n\nDescripción: [Inserta tu descripción aquí]",
        "Entrada: \"Obtener las ventas totales de la categoría 'Electrónica' agrupadas por mes del último año.\"\n\nSalida: \"SELECT DATE_TRUNC('month', fecha) AS mes, SUM(monto) AS ventas_totales FROM ventas WHERE categoria = 'Electrónica' AND fecha >= NOW() - INTERVAL '1 year' GROUP BY mes ORDER BY mes;\""
      ],
      [
        "Marketing",
        "Creador de Copys para Instagram",
        "Eres un redactor creativo de marketing digital especializado en redes sociales. Genera 3 opciones de copys atractivos y persuasivos para un post de Instagram sobre el siguiente tema. Incluye llamadas a la acción (CTA) claras y hashtags relevantes:\n\nTema: [Inserta el tema aquí]",
        "Entrada: \"Lanzamiento de un nuevo curso online de diseño web con descuento del 50%.\"\n\nSalida: \"Opción 1: ¿Listo para diseñar tu futuro? 🚀...\""
      ],
      [
        "Productividad",
        "Resumidor de Textos Largos",
        "Lee el siguiente texto y proporciona un resumen conciso estructurado de la siguiente forma:\n1. Un párrafo corto con la idea principal.\n2. Una lista de viñetas con los 3-5 puntos clave más relevantes.\n3. Una conclusión o llamado a la acción clave.\n\nTexto:\n[Inserta tu texto aquí]",
        "Entrada: [Artículo sobre el impacto de la Inteligencia Artificial en el empleo]\n\nSalida: \"[Resumen estructurado en viñetas...]\""
      ]
    ];

    // Agrega las filas correspondientes
    for (var i = 0; i < examples.length; i++) {
      sheet.appendRow(examples[i]);
    }

    Logger.log("Datos de ejemplo agregados con éxito. Filas insertadas: " + examples.length);
    return {
      status: "success",
      message: "Datos de ejemplo insertados correctamente en el Google Sheet."
    };
  } catch (error) {
    Logger.log("Error al insertar ejemplos: " + error.toString());
    return {
      status: "error",
      message: "Error al insertar datos: " + error.toString()
    };
  }
}
