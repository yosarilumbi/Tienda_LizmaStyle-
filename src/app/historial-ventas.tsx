import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { db } from "../database/firebaseConfig";

interface ProductoVendido {
  productoId: string;
  nombre: string;
  codigo: string;
  categoria: string;
  marca: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

interface Venta {
  id: string;
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;
  productos: ProductoVendido[];
  subtotal: number;
  total: number;
  metodoPago: "Contado" | "Crédito";
  montoPagado: number;
  saldoPendiente: number;
  estado: string;
  fechaVenta: Timestamp | null;
}

export default function HistorialVentasScreen() {
  const router = useRouter();

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [ventaSeleccionada, setVentaSeleccionada] =
    useState<Venta | null>(null);

  useEffect(() => {
    cargarVentas();
  }, []);

  const cargarVentas = async () => {
    try {
      setLoading(true);

      const ventasQuery = query(
        collection(db, "ventas"),
        orderBy("fechaVenta", "desc")
      );

      const snapshot = await getDocs(ventasQuery);

      const listaVentas: Venta[] = snapshot.docs.map((item) => {
        const data = item.data();

        return {
          id: item.id,
          clienteId: data.clienteId || "",
          clienteNombre:
            data.clienteNombre || "Cliente general",
          clienteTelefono:
            data.clienteTelefono || "",
          productos: Array.isArray(data.productos)
            ? data.productos.map((producto: any) => ({
                productoId:
                  producto.productoId || "",
                nombre: producto.nombre || "",
                codigo: producto.codigo || "",
                categoria:
                  producto.categoria || "",
                marca: producto.marca || "",
                precioUnitario:
                  Number(
                    producto.precioUnitario || 0
                  ),
                cantidad:
                  Number(producto.cantidad || 0),
                subtotal:
                  Number(producto.subtotal || 0),
              }))
            : [],
          subtotal: Number(data.subtotal || 0),
          total: Number(data.total || 0),
          metodoPago:
            data.metodoPago === "Crédito"
              ? "Crédito"
              : "Contado",
          montoPagado:
            Number(data.montoPagado || 0),
          saldoPendiente:
            Number(data.saldoPendiente || 0),
          estado: data.estado || "",
          fechaVenta:
            data.fechaVenta || null,
        };
      });

      setVentas(listaVentas);
    } catch (error) {
      console.error(
        "Error cargando historial de ventas:",
        error
      );

      Alert.alert(
        "Error",
        "No se pudieron cargar las ventas."
      );
    } finally {
      setLoading(false);
    }
  };

  const ventasFiltradas = useMemo(() => {
    const texto = busqueda
      .toLowerCase()
      .trim();

    if (!texto) {
      return ventas;
    }

    return ventas.filter((venta) => {
      const productosTexto = venta.productos
        .map(
          (producto) =>
            `${producto.nombre} ${producto.codigo}`
        )
        .join(" ")
        .toLowerCase();

      return (
        venta.clienteNombre
          .toLowerCase()
          .includes(texto) ||
        venta.clienteTelefono
          .toLowerCase()
          .includes(texto) ||
        venta.metodoPago
          .toLowerCase()
          .includes(texto) ||
        venta.estado
          .toLowerCase()
          .includes(texto) ||
        productosTexto.includes(texto)
      );
    });
  }, [ventas, busqueda]);

  const formatearFecha = (
    fecha: Timestamp | null
  ) => {
    if (!fecha) {
      return "Fecha no disponible";
    }

    const fechaReal = fecha.toDate();

    return fechaReal.toLocaleDateString(
      "es-NI",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };

  const formatearHora = (
    fecha: Timestamp | null
  ) => {
    if (!fecha) {
      return "";
    }

    const fechaReal = fecha.toDate();

    return fechaReal.toLocaleTimeString(
      "es-NI",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  const obtenerCantidadProductos = (
    venta: Venta
  ) => {
    return venta.productos.reduce(
      (total, producto) =>
        total + producto.cantidad,
      0
    );
  };

  const obtenerTextoEstado = (
    estado: string
  ) => {
    if (estado === "Pagada") {
      return "Pagada";
    }

    if (estado === "Cancelado") {
      return "Cancelado";
    }

    if (estado === "Pendiente") {
      return "Pendiente";
    }

    return estado || "Sin estado";
  };

  const renderVenta = ({
    item,
  }: {
    item: Venta;
  }) => {
    const cantidadProductos =
      obtenerCantidadProductos(item);

    return (
      <TouchableOpacity
        style={styles.cardVenta}
        onPress={() =>
          setVentaSeleccionada(item)
        }
        activeOpacity={0.8}
      >
        <View style={styles.cardVentaHeader}>
          <View style={styles.iconoVenta}>
            <Ionicons
              name="receipt-outline"
              size={25}
              color="#D94F8A"
            />
          </View>

          <View style={styles.infoVenta}>
            <Text
              style={styles.clienteVenta}
              numberOfLines={1}
            >
              {item.clienteNombre}
            </Text>

            <Text style={styles.fechaVenta}>
              {formatearFecha(item.fechaVenta)}
              {" • "}
              {formatearHora(item.fechaVenta)}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#D94F8A"
          />
        </View>

        <View style={styles.separador} />

        <View style={styles.resumenVenta}>
          <View>
            <Text style={styles.labelVenta}>
              Productos
            </Text>

            <Text style={styles.valorVenta}>
              {cantidadProductos}
            </Text>
          </View>

          <View>
            <Text style={styles.labelVenta}>
              Método
            </Text>

            <View
              style={[
                styles.etiquetaMetodo,
                item.metodoPago ===
                  "Crédito" &&
                  styles.etiquetaCredito,
              ]}
            >
              <Text
                style={
                  styles.textoEtiquetaMetodo
                }
              >
                {item.metodoPago}
              </Text>
            </View>
          </View>

          <View style={styles.totalVenta}>
            <Text style={styles.labelVenta}>
              Total
            </Text>

            <Text style={styles.valorTotal}>
              C$ {item.total.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.estadoFila}>
          <View
            style={[
              styles.puntoEstado,
              item.estado === "Pagada" &&
                styles.puntoPagada,
              item.estado === "Pendiente" &&
                styles.puntoPendiente,
            ]}
          />

          <Text style={styles.estadoTexto}>
            {obtenerTextoEstado(item.estado)}
          </Text>

          {item.metodoPago ===
            "Crédito" &&
            item.saldoPendiente > 0 && (
              <Text style={styles.saldoTexto}>
                Saldo: C${" "}
                {item.saldoPendiente.toFixed(
                  2
                )}
              </Text>
            )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.botonRegresar}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={25}
            color="#D94F8A"
          />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.titulo}>
            Historial de ventas
          </Text>

          <Text style={styles.subtitulo}>
            Consulta las ventas realizadas
          </Text>
        </View>

        <TouchableOpacity
          style={styles.botonActualizar}
          onPress={cargarVentas}
        >
          <Ionicons
            name="refresh"
            size={22}
            color="#D94F8A"
          />
        </TouchableOpacity>
      </View>

      {/* BUSCADOR */}

      <View style={styles.busqueda}>
        <Ionicons
          name="search-outline"
          size={21}
          color="#D94F8A"
        />

        <TextInput
          style={styles.inputBusqueda}
          placeholder="Buscar cliente o producto..."
          placeholderTextColor="#000000"
          value={busqueda}
          onChangeText={setBusqueda}
        />

        {busqueda.length > 0 && (
          <TouchableOpacity
            onPress={() => setBusqueda("")}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color="#D94F8A"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* CONTADOR */}

      {!loading && (
        <View style={styles.contadorContainer}>
          <Text style={styles.contadorTexto}>
            {ventasFiltradas.length}{" "}
            {ventasFiltradas.length === 1
              ? "venta"
              : "ventas"}
          </Text>

          <Text style={styles.contadorTotal}>
            Total: C${" "}
            {ventasFiltradas
              .reduce(
                (total, venta) =>
                  total + venta.total,
                0
              )
              .toFixed(2)}
          </Text>
        </View>
      )}

      {/* LISTA */}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color="#D94F8A"
          />

          <Text style={styles.loadingTexto}>
            Cargando ventas...
          </Text>
        </View>
      ) : (
        <FlatList
          data={ventasFiltradas}
          keyExtractor={(item) => item.id}
          renderItem={renderVenta}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            ventasFiltradas.length === 0
              ? styles.listaVacia
              : styles.lista
          }
          refreshing={loading}
          onRefresh={cargarVentas}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Ionicons
                name="receipt-outline"
                size={65}
                color="#D94F8A"
              />

              <Text style={styles.vacioTitulo}>
                No hay ventas
              </Text>

              <Text style={styles.vacioTexto}>
                Las ventas que registres
                aparecerán aquí.
              </Text>
            </View>
          }
        />
      )}

      {/* =====================================================
          MODAL DETALLE DE VENTA
      ===================================================== */}

      <Modal
        visible={!!ventaSeleccionada}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() =>
          setVentaSeleccionada(null)
        }
      >
        {ventaSeleccionada && (
          <View style={styles.modalPantalla}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitulo}>
                  Detalle de venta
                </Text>

                <Text style={styles.modalSubtitulo}>
                  {formatearFecha(
                    ventaSeleccionada.fechaVenta
                  )}{" "}
                  •{" "}
                  {formatearHora(
                    ventaSeleccionada.fechaVenta
                  )}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setVentaSeleccionada(null)
                }
              >
                <Ionicons
                  name="close"
                  size={29}
                  color="#D94F8A"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.detalleContenido
              }
            >
              {/* CLIENTE */}

              <View style={styles.detalleCard}>
                <View style={styles.detalleTituloFila}>
                  <View style={styles.detalleIcono}>
                    <Ionicons
                      name="person-outline"
                      size={21}
                      color="#D94F8A"
                    />
                  </View>

                  <Text
                    style={
                      styles.detalleTitulo
                    }
                  >
                    Cliente
                  </Text>
                </View>

                <Text
                  style={styles.detalleCliente}
                >
                  {ventaSeleccionada.clienteNombre}
                </Text>

                {ventaSeleccionada
                  .clienteTelefono ? (
                  <Text
                    style={
                      styles.detalleDato
                    }
                  >
                    Teléfono:{" "}
                    {
                      ventaSeleccionada.clienteTelefono
                    }
                  </Text>
                ) : null}
              </View>

              {/* PRODUCTOS */}

              <Text
                style={styles.seccionTitulo}
              >
                Productos vendidos
              </Text>

              <View style={styles.detalleCard}>
                {ventaSeleccionada.productos.map(
                  (producto, index) => (
                    <View
                      key={`${producto.productoId}-${index}`}
                      style={styles.productoDetalle}
                    >
                      <View
                        style={
                          styles.productoDetalleIcono
                        }
                      >
                        <Ionicons
                          name="shirt-outline"
                          size={22}
                          color="#D94F8A"
                        />
                      </View>

                      <View
                        style={
                          styles.productoDetalleInfo
                        }
                      >
                        <Text
                          style={
                            styles.productoDetalleNombre
                          }
                          numberOfLines={2}
                        >
                          {producto.nombre}
                        </Text>

                        <Text
                          style={
                            styles.productoDetalleCodigo
                          }
                        >
                          Código:{" "}
                          {producto.codigo}
                        </Text>

                        <Text
                          style={
                            styles.productoDetalleCantidad
                          }
                        >
                          {producto.cantidad}{" "}
                          × C${" "}
                          {producto.precioUnitario.toFixed(
                            2
                          )}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.productoDetalleSubtotal
                        }
                      >
                        C${" "}
                        {producto.subtotal.toFixed(
                          2
                        )}
                      </Text>
                    </View>
                  )
                )}
              </View>

              {/* PAGO */}

              <Text
                style={styles.seccionTitulo}
              >
                Información de pago
              </Text>

              <View style={styles.detalleCard}>
                <View
                  style={styles.detalleFila}
                >
                  <Text
                    style={styles.detalleLabel}
                  >
                    Método de pago
                  </Text>

                  <Text
                    style={styles.detalleValor}
                  >
                    {
                      ventaSeleccionada.metodoPago
                    }
                  </Text>
                </View>

                <View
                  style={styles.detalleFila}
                >
                  <Text
                    style={styles.detalleLabel}
                  >
                    Subtotal
                  </Text>

                  <Text
                    style={styles.detalleValor}
                  >
                    C${" "}
                    {ventaSeleccionada.subtotal.toFixed(
                      2
                    )}
                  </Text>
                </View>

                <View
                  style={styles.detalleFila}
                >
                  <Text
                    style={styles.detalleLabel}
                  >
                    Monto pagado
                  </Text>

                  <Text
                    style={styles.detalleValor}
                  >
                    C${" "}
                    {ventaSeleccionada.montoPagado.toFixed(
                      2
                    )}
                  </Text>
                </View>

                {ventaSeleccionada
                  .metodoPago ===
                  "Crédito" && (
                  <View
                    style={styles.detalleFila}
                  >
                    <Text
                      style={
                        styles.detalleLabel
                      }
                    >
                      Saldo pendiente
                    </Text>

                    <Text
                      style={
                        styles.saldoDetalle
                      }
                    >
                      C${" "}
                      {ventaSeleccionada.saldoPendiente.toFixed(
                        2
                      )}
                    </Text>
                  </View>
                )}

                <View
                  style={styles.lineaDetalle}
                />

                <View
                  style={styles.totalDetalleFila}
                >
                  <Text
                    style={
                      styles.totalDetalleLabel
                    }
                  >
                    TOTAL
                  </Text>

                  <Text
                    style={
                      styles.totalDetalleValor
                    }
                  >
                    C${" "}
                    {ventaSeleccionada.total.toFixed(
                      2
                    )}
                  </Text>
                </View>

                <View
                  style={styles.estadoDetalle}
                >
                  <Text
                    style={
                      styles.estadoDetalleLabel
                    }
                  >
                    Estado
                  </Text>

                  <Text
                    style={
                      styles.estadoDetalleValor
                    }
                  >
                    {obtenerTextoEstado(
                      ventaSeleccionada.estado
                    )}
                  </Text>
                </View>
              </View>

              <View style={styles.espacioFinal} />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF7FB",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 18,
    backgroundColor: "#FFFFFF",
  },

  botonRegresar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F8F8F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerInfo: {
    flex: 1,
  },

  titulo: {
    fontSize: 25,
    fontWeight: "800",
    color: "#000000",
  },

  subtitulo: {
    fontSize: 13,
    color: "#000000",
    marginTop: 2,
  },

  botonActualizar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FCEAF2",
    alignItems: "center",
    justifyContent: "center",
  },

  busqueda: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: "#F0D8E3",
  },

  inputBusqueda: {
    flex: 1,
    fontSize: 15,
    color: "#000000",
    marginLeft: 10,
  },

  contadorContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 8,
  },

  contadorTexto: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },

  contadorTotal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#080808",
  },

  lista: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  cardVenta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#F1DFE7",
  },

  cardVentaHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconoVenta: {
    width: 47,
    height: 47,
    borderRadius: 13,
    backgroundColor: "#FCEAF2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  infoVenta: {
    flex: 1,
  },

  clienteVenta: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },

  fechaVenta: {
    fontSize: 12,
    color: "#000000",
    marginTop: 4,
  },

  separador: {
    height: 1,
    backgroundColor: "#F1DFE7",
    marginVertical: 13,
  },

  resumenVenta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  labelVenta: {
    fontSize: 11,
    color: "#000000",
    marginBottom: 4,
  },

  valorVenta: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },

  etiquetaMetodo: {
    backgroundColor: "#E9F8EF",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  etiquetaCredito: {
    backgroundColor: "#FFF0F6",
  },

  textoEtiquetaMetodo: {
    fontSize: 11,
    fontWeight: "800",
    color: "#000000",
  },

  totalVenta: {
    alignItems: "flex-end",
  },

  valorTotal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0c0c0c",
  },

  estadoFila: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
  },

  puntoEstado: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#999999",
    marginRight: 7,
  },

  puntoPagada: {
    backgroundColor: "#35A866",
  },

  puntoPendiente: {
    backgroundColor: "#E6A21A",
  },

  estadoTexto: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
  },

  saldoTexto: {
    marginLeft: "auto",
    fontSize: 12,
    fontWeight: "800",
    color: "#050505b6",
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingTexto: {
    marginTop: 10,
    fontSize: 14,
    color: "#000000",
  },

  listaVacia: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  vacio: {
    alignItems: "center",
  },

  vacioTitulo: {
    fontSize: 19,
    fontWeight: "800",
    color: "#000000",
    marginTop: 12,
  },

  vacioTexto: {
    fontSize: 13,
    color: "#000000",
    textAlign: "center",
    marginTop: 6,
  },

  // =======================================================
  // MODAL
  // =======================================================

  modalPantalla: {
    flex: 1,
    backgroundColor: "#FFF7FB",
    paddingTop: 55,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 18,
  },

  modalTitulo: {
    fontSize: 24,
    fontWeight: "800",
    color: "#000000",
  },

  modalSubtitulo: {
    fontSize: 13,
    color: "#000000",
    marginTop: 3,
  },

  detalleContenido: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  detalleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#F1DFE7",
    padding: 16,
    marginBottom: 18,
  },

  detalleTituloFila: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  detalleIcono: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FCEAF2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  detalleTitulo: {
    fontSize: 17,
    fontWeight: "800",
    color: "#000000",
  },

  detalleCliente: {
    fontSize: 17,
    fontWeight: "800",
    color: "#000000",
  },

  detalleDato: {
    fontSize: 13,
    color: "#000000",
    marginTop: 5,
  },

  seccionTitulo: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
    marginBottom: 10,
  },

  productoDetalle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1DFE7",
  },

  productoDetalleIcono: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: "#FCEAF2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  productoDetalleInfo: {
    flex: 1,
  },

  productoDetalleNombre: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },

  productoDetalleCodigo: {
    fontSize: 11,
    color: "#000000",
    marginTop: 3,
  },

  productoDetalleCantidad: {
    fontSize: 12,
    color: "#000000",
    marginTop: 3,
  },

  productoDetalleSubtotal: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0d0d0eb9",
    marginLeft: 8,
  },

  detalleFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 11,
  },

  detalleLabel: {
    fontSize: 13,
    color: "#000000",
  },

  detalleValor: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },

  saldoDetalle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#D94F8A",
  },

  lineaDetalle: {
    height: 1,
    backgroundColor: "#F0E0E7",
    marginVertical: 7,
  },

  totalDetalleFila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },

  totalDetalleLabel: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000000",
  },

  totalDetalleValor: {
    fontSize: 21,
    fontWeight: "900",
    color: "#101011c5",
  },

  estadoDetalle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    backgroundColor: "#FFF0F6",
    borderRadius: 11,
    padding: 12,
  },

  estadoDetalleLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000000",
  },

  estadoDetalleValor: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0a0a0ab0",
  },

  espacioFinal: {
    height: 30,
  },
});