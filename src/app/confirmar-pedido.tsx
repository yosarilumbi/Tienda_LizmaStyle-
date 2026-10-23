
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useCart } from '../context/CartContext';
import { auth, db } from '../database/firebaseConfig';

type MetodoCompra = 'efectivo' | 'contado' | 'credito';

type ProductoFactura = {
  nombre: string;
  codigo: string;
  cantidad: number;
  precioVenta: number;
  subtotal: number;
};

type DatosFactura = {
  numeroFactura: string;
  fecha: Date;
  clienteNombre: string;
  clienteTelefono: string;
  correoCliente: string;
  metodoPago: string;
  estado: string;
  productos: ProductoFactura[];
  total: number;
  saldoPendiente: number;
};

const COLORES = {
  rosa: '#C94F82',
  rosaOscuro: '#8E3158',
  rosaClaro: '#FFF0F6',
  rosaSuave: '#FCE4EC',
  fondo: '#FFFAFC',
  blanco: '#FFFFFF',
  texto: '#442C37',
  secundario: '#997080',
  borde: '#F1DFE8',
  verde: '#398568',
};

const dinero = (valor: number) =>
  `C$ ${Number(valor || 0).toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function crearHtmlFactura(datos: DatosFactura): string {
  const escapar = (valor: string) =>
    valor.replace(/[&<>"']/g, (caracter) => {
      const entidades: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };

      return entidades[caracter];
    });

  const filas = datos.productos
    .map(
      (producto) => `
        <tr>
          <td>
            ${escapar(producto.nombre)}
            ${
              producto.codigo
                ? `<br><small>Código: ${escapar(producto.codigo)}</small>`
                : ''
            }
          </td>
          <td class="center">${producto.cantidad}</td>
          <td class="right">${dinero(producto.precioVenta)}</td>
          <td class="right">${dinero(producto.subtotal)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Factura ${escapar(datos.numeroFactura)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #442C37;
            padding: 24px;
            font-size: 12px;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #C94F82;
            padding-bottom: 18px;
            margin-bottom: 22px;
          }
          h1 {
            color: #C94F82;
            margin-bottom: 5px;
            font-size: 28px;
          }
          h2 {
            font-size: 17px;
            margin-top: 24px;
          }
          .numero {
            font-size: 14px;
            font-weight: bold;
          }
          .datos {
            line-height: 1.9;
            margin-bottom: 20px;
            overflow-wrap: anywhere;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th {
            background: #FFF0F6;
            color: #8E3158;
            text-align: left;
          }
          th, td {
            padding: 9px 6px;
            border-bottom: 1px solid #F1DFE8;
            overflow-wrap: anywhere;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .total {
            text-align: right;
            font-size: 17px;
            font-weight: bold;
            color: #C94F82;
            margin-top: 20px;
          }
          .saldo {
            text-align: right;
            font-size: 12px;
            margin-top: 8px;
          }
          .pie {
            text-align: center;
            margin-top: 40px;
            color: #997080;
            border-top: 1px solid #F1DFE8;
            padding-top: 15px;
          }
          small { color: #997080; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Lizma Style</h1>
          <p>Factura de compra</p>
          <p class="numero">${escapar(datos.numeroFactura)}</p>
        </div>

        <div class="datos">
          <strong>Fecha:</strong>
          ${escapar(datos.fecha.toLocaleString('es-NI'))}<br>
          <strong>Cliente:</strong>
          ${escapar(datos.clienteNombre)}<br>
          <strong>Teléfono:</strong>
          ${escapar(datos.clienteTelefono || 'No registrado')}<br>
          <strong>Correo:</strong>
          ${escapar(datos.correoCliente || 'No registrado')}<br>
          <strong>Método de compra:</strong>
          ${escapar(datos.metodoPago)}<br>
          <strong>Estado de la compra:</strong>
          ${escapar(datos.estado)}
        </div>

        <h2>Detalle de productos</h2>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th class="center">Cant.</th>
              <th class="right">Precio</th>
              <th class="right">Subtotal</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>

        <div class="total">Total: ${dinero(datos.total)}</div>

        ${
          datos.saldoPendiente > 0
            ? `<div class="saldo">Saldo pendiente: ${dinero(datos.saldoPendiente)}</div>`
            : ''
        }

        <div class="pie">
          <strong>Gracias por comprar en Lizma Style.</strong>
          <p>Conserva esta factura como comprobante de tu compra.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Recupera el ID real del producto.
 * El carrito puede tener un ID compuesto por producto, talla y color.
 */
function resolverProductoId(
  id: string,
  productoId?: string
): string {
  if (productoId) return productoId;

  try {
    const idParseado = JSON.parse(id);

    if (
      Array.isArray(idParseado) &&
      typeof idParseado[0] === 'string'
    ) {
      return idParseado[0];
    }
  } catch {
    // El ID no es un identificador compuesto.
  }

  return id;
}

function normalizarValor(valor: unknown): string {
  return String(valor ?? '').trim().toLocaleLowerCase();
}

export default function ConfirmarPedidoScreen() {
  const router = useRouter();

  const {
    carrito,
    cantidadProductos,
    totalCarrito,
    vaciarCarrito,
  } = useCart();

  const [metodoCompra, setMetodoCompra] =
    useState<MetodoCompra>('efectivo');

  const [guardando, setGuardando] = useState(false);

  const confirmarCompra = async () => {
    if (guardando) return;

    const usuarioActual = auth.currentUser;

    if (!usuarioActual) {
      Alert.alert(
        'Sesión no encontrada',
        'Debes iniciar sesión para realizar una compra.'
      );
      return;
    }

    if (carrito.length === 0) {
      Alert.alert(
        'Carrito vacío',
        'No hay productos para realizar la compra.'
      );
      return;
    }

    try {
      setGuardando(true);

      const usuarioRef = doc(db, 'usuarios', usuarioActual.uid);
      const usuarioSnapshot = await getDoc(usuarioRef);

      const datosUsuario = usuarioSnapshot.exists()
        ? usuarioSnapshot.data()
        : {};

      const clienteNombre =
        datosUsuario.nombre ||
        datosUsuario.nombreCompleto ||
        usuarioActual.displayName ||
        'Cliente';

      const clienteTelefono =
        datosUsuario.telefono ||
        datosUsuario.celular ||
        '';

      const correoCliente = usuarioActual.email || '';
      const fechaCompra = new Date();

      let fechaLimitePago: Timestamp | null = null;

      if (metodoCompra === 'credito') {
        const fechaLimite = new Date(fechaCompra);
        fechaLimite.setDate(fechaLimite.getDate() + 30);
        fechaLimitePago = Timestamp.fromDate(fechaLimite);
      }

      const productosVenta = carrito.map((producto) => ({
        productoId: resolverProductoId(
          producto.id,
          producto.productoId
        ),
        nombre: producto.nombre,
        codigo: producto.codigo || '',
        categoria: producto.categoria || '',
        marca: producto.marca || '',
        precioVenta: Number(producto.precioVenta || 0),
        cantidad: Math.floor(Number(producto.cantidad || 0)),
        subtotal:
          Number(producto.precioVenta || 0) *
          Math.floor(Number(producto.cantidad || 0)),
        imagenUrl: producto.imagenUrl || '',
        talla: producto.talla || '',
        color: producto.color || '',
        usaVariantes: Boolean(producto.usaVariantes),
      }));

      if (
        productosVenta.some(
          (producto) =>
            !producto.productoId ||
            !Number.isInteger(producto.cantidad) ||
            producto.cantidad < 1
        )
      ) {
        throw new Error(
          'Hay un producto con datos inválidos en el carrito. Elimina ese producto y agrégalo nuevamente.'
        );
      }

      const esCredito = metodoCompra === 'credito';

      const metodoPago =
        metodoCompra === 'efectivo'
          ? 'Efectivo'
          : metodoCompra === 'contado'
            ? 'Contado'
            : 'Crédito';

      const total = Number(totalCarrito);
      const montoPagado = esCredito ? 0 : total;
      const saldoPendiente = esCredito ? total : 0;
      const estado = esCredito ? 'Pendiente' : 'Pagada';

      const ventaRef = doc(collection(db, 'ventas'));

      const numeroFactura =
        `LS-${fechaCompra.getFullYear()}${String(
          fechaCompra.getMonth() + 1
        ).padStart(2, '0')}${String(
          fechaCompra.getDate()
        ).padStart(2, '0')}-${ventaRef.id
          .slice(0, 6)
          .toUpperCase()}`;

      /*
       * La venta y el descuento del inventario se ejecutan
       * en una sola transacción.
       *
       * Si algún producto no tiene suficientes unidades,
       * Firebase cancela toda la transacción.
       */
      await runTransaction(db, async (transaccion) => {
        const idsProductos = [
          ...new Set(
            productosVenta.map((producto) => producto.productoId)
          ),
        ];

        const referencias = new Map(
          idsProductos.map((id) => [
            id,
            doc(db, 'productos', id),
          ])
        );

        // Leer todos los productos antes de efectuar escrituras.
        const documentos = new Map<string, any>();

        for (const id of idsProductos) {
          const referencia = referencias.get(id)!;
          const snapshot = await transaccion.get(referencia);

          if (!snapshot.exists()) {
            throw new Error(
              `El producto "${id}" ya no existe en el inventario.`
            );
          }

          const datos = snapshot.data();

          documentos.set(id, {
            ...datos,
            variantes: Array.isArray(datos.variantes)
              ? datos.variantes.map((variante: any) => ({
                  ...variante,
                }))
              : undefined,
          });
        }

        /*
         * Actualizar primero los datos en memoria.
         * Así se acumulan correctamente las cantidades de cada
         * producto y de cada combinación de talla y color.
         */
        for (const linea of carrito) {
          const idProducto = resolverProductoId(
            linea.id,
            linea.productoId
          );

          const datosProducto = documentos.get(idProducto);

          if (!datosProducto) {
            throw new Error(
              `No se encontró el producto "${linea.nombre}".`
            );
          }

          const cantidad = Math.floor(Number(linea.cantidad));

          if (!Number.isFinite(cantidad) || cantidad < 1) {
            throw new Error(
              `La cantidad de "${linea.nombre}" no es válida.`
            );
          }

          if (
            Array.isArray(datosProducto.variantes) &&
            datosProducto.variantes.length > 0
          ) {
            const indiceVariante =
              datosProducto.variantes.findIndex(
                (variante: any) =>
                  normalizarValor(variante.talla) ===
                    normalizarValor(linea.talla) &&
                  normalizarValor(variante.color) ===
                    normalizarValor(linea.color)
              );

            if (indiceVariante === -1) {
              throw new Error(
                `No se encontró la talla y el color seleccionados de "${linea.nombre}".`
              );
            }

            const variante =
              datosProducto.variantes[indiceVariante];

            const stockDisponible = Math.max(
              0,
              Math.floor(Number(variante.stock) || 0)
            );

            if (stockDisponible < cantidad) {
              throw new Error(
                `Stock insuficiente de "${linea.nombre}" ` +
                  `(talla ${linea.talla || 'única'}, ` +
                  `color ${linea.color || 'no especificado'}). ` +
                  `Disponible: ${stockDisponible}; solicitado: ${cantidad}.`
              );
            }

            datosProducto.variantes[indiceVariante] = {
              ...variante,
              stock: stockDisponible - cantidad,
            };

            // El stock general será la suma de todas las variantes.
            datosProducto.stock =
              datosProducto.variantes.reduce(
                (suma: number, item: any) =>
                  suma + Math.max(0, Number(item.stock) || 0),
                0
              );
          } else {
            const stockDisponible = Math.max(
              0,
              Math.floor(Number(datosProducto.stock) || 0)
            );

            if (stockDisponible < cantidad) {
              throw new Error(
                `Stock insuficiente de "${linea.nombre}". ` +
                  `Disponible: ${stockDisponible}; solicitado: ${cantidad}.`
              );
            }

            datosProducto.stock = stockDisponible - cantidad;
          }
        }

        // Guardar los stocks actualizados.
        for (const id of idsProductos) {
          const datosProducto = documentos.get(id);
          const referencia = referencias.get(id)!;

          transaccion.update(referencia, {
            stock: datosProducto.stock,
            ...(Array.isArray(datosProducto.variantes)
              ? { variantes: datosProducto.variantes }
              : {}),
          });
        }

        // Crear la venta solamente si todo el inventario es válido.
        transaccion.set(ventaRef, {
          facturaNumero: numeroFactura,
          clienteId: usuarioActual.uid,
          clienteNombre,
          clienteTelefono,
          correoCliente,
          productos: productosVenta,
          cantidadProductos,
          total,
          montoPagado,
          saldoPendiente,
          estado,
          metodoPago,
          fechaVenta: serverTimestamp(),
          fechaLimitePago,
          creadoPor: 'cliente',
        });
      });

      const datosFactura: DatosFactura = {
        numeroFactura,
        fecha: fechaCompra,
        clienteNombre,
        clienteTelefono,
        correoCliente,
        metodoPago,
        estado,
        productos: productosVenta.map((producto) => ({
          nombre: producto.nombre,
          codigo: producto.codigo,
          cantidad: producto.cantidad,
          precioVenta: producto.precioVenta,
          subtotal: producto.subtotal,
        })),
        total,
        saldoPendiente,
      };

      // Vaciar el carrito después de guardar la venta y el inventario.
      vaciarCarrito();

      let facturaGenerada = false;
      let facturaCompartida = false;

      try {
        const html = crearHtmlFactura(datosFactura);
        const archivo = await Print.printToFileAsync({ html });

        facturaGenerada = true;

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(archivo.uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Factura ${numeroFactura}`,
            UTI: 'com.adobe.pdf',
          });

          facturaCompartida = true;
        } else {
          await Print.printAsync({ html });
        }
      } catch (error) {
        console.error(
          'Error al generar o compartir la factura:',
          error
        );
      }

      const mensaje =
        facturaGenerada && facturaCompartida
          ? `Tu compra fue registrada.\nNúmero de factura: ${numeroFactura}\nPodés guardar o compartir el PDF desde las opciones del dispositivo.`
          : facturaGenerada
            ? `Tu compra fue registrada y el PDF fue generado.\nNúmero de factura: ${numeroFactura}`
            : `Tu compra fue registrada, pero no se pudo generar el PDF en este momento.\nNúmero de factura: ${numeroFactura}`;

      Alert.alert(
        facturaGenerada
          ? 'Compra registrada'
          : 'Compra registrada sin PDF',
        mensaje,
        [
          {
            text: 'Aceptar',
            onPress: () => router.replace('/cliente-home'),
          },
        ]
      );
    } catch (error) {
      console.error('Error al registrar la venta:', error);

      const mensaje =
        error instanceof Error &&
        (
          error.message.includes('Stock insuficiente') ||
          error.message.includes('No se encontró') ||
          error.message.includes('no existe') ||
          error.message.includes('talla y el color') ||
          error.message.includes('datos inválidos') ||
          error.message.includes('no es válida')
        )
          ? error.message
          : 'No se pudo registrar la compra. Comprueba tu conexión e inténtalo nuevamente.';

      Alert.alert('No se pudo completar la compra', mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const opcionesPago = [
    {
      id: 'efectivo' as const,
      icono: 'cash-outline' as const,
      titulo: 'Pagar en efectivo',
      descripcion:
        'El pago se realiza al recibir o retirar tu pedido.',
    },
    {
      id: 'contado' as const,
      icono: 'card-outline' as const,
      titulo: 'Pago de contado',
      descripcion:
        'La compra se registra como pagada en su totalidad.',
    },
    {
      id: 'credito' as const,
      icono: 'calendar-outline' as const,
      titulo: 'Comprar al crédito',
      descripcion:
        'Registra tu compra con un plazo de pago de 30 días.',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
          disabled={guardando}
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={COLORES.rosaOscuro}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.brandName}>LIZMA STYLE</Text>
          <Text style={styles.headerTitle}>Confirmar pedido</Text>
        </View>

        <View style={styles.headerSpace} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="receipt-outline"
              size={29}
              color={COLORES.rosa}
            />
          </View>

          <View style={styles.heroText}>
            <Text style={styles.title}>Tu pedido, casi listo</Text>
            <Text style={styles.subtitle}>
              Revisa los detalles y selecciona cómo deseas comprar.
            </Text>
          </View>
        </View>

        <View style={styles.stepRow}>
          <View style={styles.stepCircle}>
            <Ionicons
              name="checkmark"
              size={16}
              color={COLORES.blanco}
            />
          </View>
          <View style={styles.stepLine} />
          <View style={[styles.stepCircle, styles.stepCircleActive]}>
            <Text style={styles.stepNumber}>2</Text>
          </View>
          <View style={styles.stepLineMuted} />
          <View style={[styles.stepCircle, styles.stepCircleMuted]}>
            <Text style={styles.stepNumberMuted}>3</Text>
          </View>
          <View style={styles.stepLabels}>
            <Text style={styles.stepLabel}>Carrito</Text>
            <Text style={styles.stepLabelActive}>Confirmación</Text>
            <Text style={styles.stepLabel}>Factura</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.headingIcon}>
              <Ionicons
                name="bag-handle-outline"
                size={19}
                color={COLORES.rosa}
              />
            </View>
            <View style={styles.headingText}>
              <Text style={styles.sectionTitle}>Tu selección</Text>
              <Text style={styles.sectionSubtitle}>
                {cantidadProductos}{' '}
                {cantidadProductos === 1
                  ? 'producto'
                  : 'productos'} en tu pedido
              </Text>
            </View>
          </View>

          {carrito.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons
                name="bag-outline"
                size={30}
                color={COLORES.secundario}
              />
              <Text style={styles.emptyCartText}>
                Tu carrito está vacío.
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/catalogo-cliente')}
                style={styles.catalogButton}
              >
                <Text style={styles.catalogButtonText}>
                  Volver al catálogo
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            carrito.map((producto, indice) => (
              <View
                key={producto.id}
                style={[
                  styles.productRow,
                  indice === carrito.length - 1 &&
                    styles.lastProductRow,
                ]}
              >
                <View style={styles.productIcon}>
                  <Ionicons
                    name="pricetag-outline"
                    size={23}
                    color={COLORES.rosa}
                  />
                </View>

                <View style={styles.productDetails}>
                  <Text
                    style={styles.productName}
                    numberOfLines={2}
                  >
                    {producto.nombre}
                  </Text>

                  {producto.codigo ? (
                    <Text style={styles.productCode}>
                      Código: {producto.codigo}
                    </Text>
                  ) : null}

                  {producto.talla || producto.color ? (
                    <Text style={styles.productCode}>
                      {producto.talla
                        ? `Talla: ${producto.talla}`
                        : ''}
                      {producto.talla && producto.color ? ' · ' : ''}
                      {producto.color
                        ? `Color: ${producto.color}`
                        : ''}
                    </Text>
                  ) : null}

                  <Text style={styles.productQuantity}>
                    Cantidad: {producto.cantidad}
                  </Text>
                </View>

                <View style={styles.productPriceContainer}>
                  <Text style={styles.productPrice}>
                    {dinero(
                      Number(producto.precioVenta || 0) *
                        Number(producto.cantidad || 0)
                    )}
                  </Text>
                  <Text style={styles.unitPrice}>
                    {dinero(Number(producto.precioVenta || 0))} c/u
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.headingIcon}>
              <Ionicons
                name="receipt-outline"
                size={19}
                color={COLORES.rosa}
              />
            </View>
            <View style={styles.headingText}>
              <Text style={styles.sectionTitle}>Resumen de compra</Text>
              <Text style={styles.sectionSubtitle}>
                El importe de tu pedido
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Cantidad de productos
            </Text>
            <Text style={styles.summaryValue}>
              {cantidadProductos}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {dinero(Number(totalCarrito))}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Total a pagar</Text>
              <Text style={styles.totalCaption}>
                Córdobas nicaragüenses
              </Text>
            </View>
            <Text style={styles.totalValue}>
              {dinero(Number(totalCarrito))}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.headingIcon}>
              <Ionicons
                name="wallet-outline"
                size={19}
                color={COLORES.rosa}
              />
            </View>
            <View style={styles.headingText}>
              <Text style={styles.sectionTitle}>Método de compra</Text>
              <Text style={styles.sectionSubtitle}>
                Selecciona una opción para continuar
              </Text>
            </View>
          </View>

          {opcionesPago.map((opcion) => {
            const seleccionada = metodoCompra === opcion.id;

            return (
              <TouchableOpacity
                key={opcion.id}
                style={[
                  styles.paymentOption,
                  seleccionada && styles.paymentOptionSelected,
                ]}
                onPress={() => setMetodoCompra(opcion.id)}
                activeOpacity={0.85}
                disabled={guardando}
              >
                <View
                  style={[
                    styles.paymentIcon,
                    seleccionada && styles.paymentIconSelected,
                  ]}
                >
                  <Ionicons
                    name={opcion.icono}
                    size={23}
                    color={
                      seleccionada
                        ? COLORES.blanco
                        : COLORES.rosa
                    }
                  />
                </View>

                <View style={styles.paymentTextContainer}>
                  <Text style={styles.paymentTitle}>
                    {opcion.titulo}
                  </Text>
                  <Text style={styles.paymentDescription}>
                    {opcion.descripcion}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radio,
                    seleccionada && styles.radioSelected,
                  ]}
                >
                  {seleccionada && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={COLORES.rosa}
            />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              {metodoCompra === 'credito'
                ? 'Compra al crédito'
                : metodoCompra === 'efectivo'
                  ? 'Pago en efectivo'
                  : 'Pago de contado'}
            </Text>
            <Text style={styles.infoText}>
              {metodoCompra === 'credito'
                ? 'La compra quedará registrada como pendiente, con un plazo de 30 días para pagar.'
                : metodoCompra === 'efectivo'
                  ? 'Tu pedido se registrará y el pago se realizará en efectivo al recibirlo o retirarlo.'
                  : 'La compra quedará registrada como pagada en su totalidad.'}
            </Text>
          </View>
        </View>

        <View style={styles.securityNote}>
          <Ionicons
            name="shield-checkmark-outline"
            size={17}
            color={COLORES.verde}
          />
          <Text style={styles.securityText}>
            Revisa tu pedido antes de confirmar la compra.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <View>
            <Text style={styles.footerLabel}>
              Total de tu pedido
            </Text>
            <Text style={styles.footerCaption}>
              {cantidadProductos}{' '}
              {cantidadProductos === 1
                ? 'producto'
                : 'productos'}
            </Text>
          </View>
          <Text style={styles.footerPrice}>
            {dinero(Number(totalCarrito))}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            (guardando || carrito.length === 0) &&
              styles.confirmButtonDisabled,
          ]}
          onPress={confirmarCompra}
          activeOpacity={0.85}
          disabled={guardando || carrito.length === 0}
        >
          {guardando ? (
            <>
              <ActivityIndicator
                size="small"
                color={COLORES.blanco}
              />
              <Text style={styles.confirmButtonText}>
                Registrando compra...
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.confirmButtonText}>
                {metodoCompra === 'credito'
                  ? 'Confirmar compra al crédito'
                  : metodoCompra === 'efectivo'
                    ? 'Confirmar pedido'
                    : 'Confirmar y pagar'}
              </Text>
              <Ionicons
                name="arrow-forward-circle-outline"
                size={23}
                color={COLORES.blanco}
              />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerSecure}>
          <Ionicons
            name="lock-closed-outline"
            size={12}
            color={COLORES.secundario}
          />{' '}
          Compra registrada de forma segura
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  header: {
    minHeight: 76,
    backgroundColor: COLORES.blanco,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.borde,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: COLORES.rosaClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  brandName: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    color: COLORES.rosa,
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORES.texto,
  },
  headerSpace: {
    width: 42,
  },
  content: {
    paddingHorizontal: 17,
    paddingTop: 21,
    paddingBottom: 225,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  heroIcon: {
    width: 57,
    height: 57,
    borderRadius: 19,
    backgroundColor: COLORES.rosaSuave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: {
    flex: 1,
    marginLeft: 13,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORES.texto,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORES.secundario,
    marginTop: 5,
  },
  stepRow: {
    height: 53,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  stepCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: COLORES.rosa,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    borderWidth: 2,
    borderColor: COLORES.rosa,
    backgroundColor: COLORES.blanco,
  },
  stepCircleMuted: {
    backgroundColor: '#F2E8ED',
  },
  stepNumber: {
    color: COLORES.rosa,
    fontSize: 11,
    fontWeight: '800',
  },
  stepNumberMuted: {
    color: COLORES.secundario,
    fontSize: 11,
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORES.rosa,
    marginTop: 12,
    marginHorizontal: 5,
  },
  stepLineMuted: {
    flex: 1,
    height: 2,
    backgroundColor: COLORES.borde,
    marginTop: 12,
    marginHorizontal: 5,
  },
  stepLabels: {
    position: 'absolute',
    top: 31,
    left: 7,
    right: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepLabel: {
    fontSize: 10,
    color: COLORES.secundario,
  },
  stepLabelActive: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORES.rosaOscuro,
  },
  section: {
    backgroundColor: COLORES.blanco,
    borderRadius: 21,
    padding: 17,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F8EAF0',
    shadowColor: '#9C5876',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.055,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headingIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: COLORES.rosaClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headingText: {
    flex: 1,
    marginLeft: 11,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORES.texto,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: COLORES.secundario,
    marginTop: 3,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F7EAF0',
  },
  lastProductRow: {
    borderBottomWidth: 0,
    paddingBottom: 1,
  },
  productIcon: {
    width: 43,
    height: 47,
    borderRadius: 14,
    backgroundColor: COLORES.rosaClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
    marginLeft: 11,
    marginRight: 7,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORES.texto,
    lineHeight: 18,
  },
  productCode: {
    fontSize: 10,
    color: COLORES.secundario,
    marginTop: 3,
  },
  productQuantity: {
    fontSize: 11,
    color: COLORES.secundario,
    marginTop: 4,
  },
  productPriceContainer: {
    alignItems: 'flex-end',
    maxWidth: 115,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORES.rosaOscuro,
    textAlign: 'right',
  },
  unitPrice: {
    fontSize: 10,
    color: COLORES.secundario,
    marginTop: 4,
    textAlign: 'right',
  },
  emptyCart: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyCartText: {
    color: COLORES.secundario,
    fontSize: 13,
    marginTop: 9,
  },
  catalogButton: {
    marginTop: 13,
    backgroundColor: COLORES.rosaClaro,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  catalogButtonText: {
    color: COLORES.rosaOscuro,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORES.secundario,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORES.texto,
  },
  divider: {
    height: 1,
    backgroundColor: COLORES.borde,
    marginTop: 1,
    marginBottom: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORES.texto,
  },
  totalCaption: {
    fontSize: 10,
    color: COLORES.secundario,
    marginTop: 4,
  },
  totalValue: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORES.rosa,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderWidth: 1.2,
    borderColor: COLORES.borde,
    borderRadius: 17,
    marginBottom: 11,
    backgroundColor: COLORES.blanco,
  },
  paymentOptionSelected: {
    borderColor: COLORES.rosa,
    backgroundColor: '#FFF5F9',
  },
  paymentIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: COLORES.rosaClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentIconSelected: {
    backgroundColor: COLORES.rosa,
  },
  paymentTextContainer: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORES.texto,
  },
  paymentDescription: {
    fontSize: 10,
    lineHeight: 15,
    color: COLORES.secundario,
    marginTop: 4,
  },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.7,
    borderColor: '#DCC4D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: COLORES.rosa,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORES.rosa,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF0F6',
    borderWidth: 1,
    borderColor: '#F7DCE8',
    borderRadius: 17,
    padding: 15,
    marginBottom: 15,
  },
  infoIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: COLORES.blanco,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 10,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORES.rosaOscuro,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORES.texto,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  securityText: {
    fontSize: 10,
    color: COLORES.secundario,
    marginLeft: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORES.blanco,
    paddingHorizontal: 19,
    paddingTop: 15,
    paddingBottom: 19,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
    shadowColor: '#9C5876',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 12,
  },
  footerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  footerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORES.texto,
  },
  footerCaption: {
    fontSize: 10,
    color: COLORES.secundario,
    marginTop: 3,
  },
  footerPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORES.rosa,
  },
  confirmButton: {
    minHeight: 53,
    backgroundColor: COLORES.rosa,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: COLORES.rosa,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmButtonDisabled: {
    opacity: 0.55,
  },
  confirmButtonText: {
    color: COLORES.blanco,
    fontSize: 13,
    fontWeight: '800',
    marginRight: 9,
  },
  footerSecure: {
    fontSize: 10,
    color: COLORES.secundario,
    textAlign: 'center',
    marginTop: 10,
  },
});
