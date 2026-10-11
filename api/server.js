const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 3000;

// ======================================================
// CONFIGURACIÓN
// ======================================================

app.use(cors());

app.use(
  express.json({
    limit: "15mb",
  })
);

// ======================================================
// MYSQL
// ======================================================

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ======================================================
// PROBAR MYSQL
// ======================================================

async function probarConexion() {
  try {
    const conexion = await db.getConnection();

    console.log("====================================");
    console.log("✅ MYSQL CONECTADO CORRECTAMENTE");
    console.log("====================================");

    conexion.release();
  } catch (error) {
    console.error("❌ ERROR MYSQL:");
    console.error(error.message);
  }
}

probarConexion();

// ======================================================
// RUTA PRINCIPAL
// ======================================================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    mensaje: "API de Lizma Style funcionando correctamente",
  });
});

// ======================================================
// OBTENER TODAS LAS IMÁGENES
// ======================================================

app.get("/imagenes", async (req, res) => {
  try {
    console.log("📷 Solicitando todas las imágenes...");

    const [filas] = await db.execute(`
      SELECT
        id,
        producto_id,
        imagen_base64,
        fecha_registro
      FROM imagenes_productos
      ORDER BY fecha_registro DESC
    `);

    console.log(
      `📷 Imágenes encontradas: ${filas.length}`
    );

    const imagenes = filas.map((fila) => ({
      id: fila.id,
      producto_id: fila.producto_id,
      imagen_base64: fila.imagen_base64,
      fecha_registro: fila.fecha_registro,
    }));

    res.json({
      ok: true,
      total: imagenes.length,
      imagenes,
    });
  } catch (error) {
    console.error(
      "❌ Error obteniendo todas las imágenes:",
      error.message
    );

    res.status(500).json({
      ok: false,
      error: "No se pudieron obtener las imágenes",
    });
  }
});

// ======================================================
// GUARDAR / ACTUALIZAR IMAGEN
// ======================================================

app.post("/imagenes", async (req, res) => {
  try {
    const {
      producto_id,
      imagen_base64,
    } = req.body;

    if (!producto_id || !imagen_base64) {
      return res.status(400).json({
        ok: false,
        error:
          "producto_id e imagen_base64 son obligatorios",
      });
    }

    console.log("====================================");
    console.log("📷 GUARDANDO IMAGEN");
    console.log("Producto:", producto_id);
    console.log(
      "Tamaño:",
      imagen_base64.length
    );
    console.log("====================================");

    // Eliminar imagen anterior
    await db.execute(
      `
      DELETE FROM imagenes_productos
      WHERE producto_id = ?
      `,
      [producto_id]
    );

    // Insertar nueva imagen
    const [resultado] = await db.execute(
      `
      INSERT INTO imagenes_productos
      (
        producto_id,
        imagen_base64
      )
      VALUES (?, ?)
      `,
      [
        producto_id,
        imagen_base64,
      ]
    );

    console.log(
      `✅ Imagen guardada correctamente: ${producto_id}`
    );

    res.status(201).json({
      ok: true,
      mensaje:
        "Imagen guardada correctamente",
      id: resultado.insertId,
      producto_id,
    });
  } catch (error) {
    console.error(
      "❌ Error guardando imagen:",
      error.message
    );

    res.status(500).json({
      ok: false,
      error:
        "No se pudo guardar la imagen",
      detalle: error.message,
    });
  }
});

// ======================================================
// OBTENER UNA IMAGEN
// ======================================================

app.get(
  "/imagenes/:productoId",
  async (req, res) => {
    try {
      const {
        productoId,
      } = req.params;

      console.log(
        `📷 Buscando imagen: ${productoId}`
      );

      const [filas] = await db.execute(
        `
        SELECT
          id,
          producto_id,
          imagen_base64,
          fecha_registro
        FROM imagenes_productos
        WHERE producto_id = ?
        ORDER BY fecha_registro DESC
        LIMIT 1
        `,
        [productoId]
      );

      if (filas.length === 0) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "No se encontró una imagen",
        });
      }

      res.json({
        ok: true,
        id: filas[0].id,
        producto_id:
          filas[0].producto_id,
        imagen_base64:
          filas[0].imagen_base64,
        fecha_registro:
          filas[0].fecha_registro,
      });
    } catch (error) {
      console.error(
        "❌ Error obteniendo imagen:",
        error.message
      );

      res.status(500).json({
        ok: false,
        error:
          "No se pudo obtener la imagen",
      });
    }
  }
);

// ======================================================
// ELIMINAR IMAGEN
// ======================================================

app.delete(
  "/imagenes/:productoId",
  async (req, res) => {
    try {
      const {
        productoId,
      } = req.params;

      await db.execute(
        `
        DELETE FROM imagenes_productos
        WHERE producto_id = ?
        `,
        [productoId]
      );

      console.log(
        `🗑️ Imagen eliminada: ${productoId}`
      );

      res.json({
        ok: true,
        mensaje:
          "Imagen eliminada correctamente",
      });
    } catch (error) {
      console.error(
        "❌ Error eliminando imagen:",
        error.message
      );

      res.status(500).json({
        ok: false,
        error:
          "No se pudo eliminar la imagen",
      });
    }
  }
);

// ======================================================
// INICIAR SERVIDOR
// ======================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log("");
    console.log("====================================");
    console.log("🚀 API LIZMA STYLE");
    console.log("====================================");
    console.log(
      `🌐 Puerto: ${PORT}`
    );
    console.log(
      `📱 Red local: http://10.174.47.148:${PORT}`
    );
    console.log(
      `📷 Imágenes: http://10.174.47.148:${PORT}/imagenes`
    );
    console.log("====================================");
    console.log("");
  }
);