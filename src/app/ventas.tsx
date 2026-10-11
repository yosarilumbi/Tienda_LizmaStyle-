import { Ionicons } from "@expo/vector-icons";

import { useRouter } from "expo-router";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { db } from "../database/firebaseConfig";

interface Producto {
  id: string;
  nombre: string;
  codigo: string;
  categoria: string;
  marca: string;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  imagenUrl: string;
}

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  direccion: string;
}

interface ProductoVenta {
  producto: Producto;
  cantidad: number;
}

export default function VentasScreen() {
  const router = useRouter();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  const [modalProducto, setModalProducto] = useState(false);
  const [modalCliente, setModalCliente] = useState(false);
  const [modalNuevoCliente, setModalNuevoCliente] =
    useState(false);

  const [productosVenta, setProductosVenta] = useState<
    ProductoVenta[]
  >([]);

  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);

  const [metodoPago, setMetodoPago] = useState<
    "Contado" | "Crédito"
  >("Contado");

  const [montoPagado, setMontoPagado] = useState("");

  // FECHA LÍMITE DE PAGO
  // FORMATO: DD/MM/AAAA
  const [fechaLimitePago, setFechaLimitePago] =
    useState("");

  const [busquedaProducto, setBusquedaProducto] =
    useState("");

  const [busquedaCliente, setBusquedaCliente] =
    useState("");

  // NUEVO CLIENTE
  const [nuevoClienteNombre, setNuevoClienteNombre] =
    useState("");

  const [nuevoClienteApellido, setNuevoClienteApellido] =
    useState("");

  const [nuevoClienteTelefono, setNuevoClienteTelefono] =
    useState("");

  const [nuevoClienteCorreo, setNuevoClienteCorreo] =
    useState("");

  const [nuevoClienteDireccion, setNuevoClienteDireccion] =
    useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  // =========================================================
  // CARGAR DATOS
  // =========================================================

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const productosSnapshot = await getDocs(
        collection(db, "productos")
      );

      const listaProductos: Producto[] =
        productosSnapshot.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            nombre: data.nombre || "",
            codigo: data.codigo || "",
            categoria: data.categoria || "",
            marca: data.marca || "",
            precioVenta: Number(data.precioVenta || 0),
            stock: Number(data.stock || 0),
            stockMinimo: Number(data.stockMinimo || 0),
            imagenUrl: data.imagenUrl || "",
          };
        });

      setProductos(listaProductos);

      const clientesSnapshot = await getDocs(
        collection(db, "clientes")
      );

      const listaClientes: Cliente[] =
        clientesSnapshot.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            nombre: data.nombre || "",
            apellido: data.apellido || "",
            telefono: data.telefono || "",
            correo: data.correo || "",
            direccion: data.direccion || "",
          };
        });

      setClientes(listaClientes);
    } catch (error) {
      console.error(
        "Error cargando datos de ventas:",
        error
      );

      Alert.alert(
        "Error",
        "No se pudieron cargar los productos y clientes."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // PRODUCTOS FILTRADOS
  // =========================================================

  const productosFiltrados = useMemo(() => {
    const texto = busquedaProducto
      .toLowerCase()
      .trim();

    if (!texto) {
      return productos;
    }

    return productos.filter((producto) => {
      return (
        producto.nombre
          .toLowerCase()
          .includes(texto) ||
        producto.codigo
          .toLowerCase()
          .includes(texto) ||
        producto.categoria
          .toLowerCase()
          .includes(texto) ||
        producto.marca
          .toLowerCase()
          .includes(texto)
      );
    });
  }, [productos, busquedaProducto]);

  // =========================================================
  // CLIENTES FILTRADOS
  // =========================================================

  const clientesFiltrados = useMemo(() => {
    const texto = busquedaCliente
      .toLowerCase()
      .trim();

    if (!texto) {
      return clientes;
    }

    return clientes.filter((cliente) => {
      const nombreCompleto =
        `${cliente.nombre} ${cliente.apellido}`.toLowerCase();

      return (
        nombreCompleto.includes(texto) ||
        cliente.telefono
          .toLowerCase()
          .includes(texto) ||
        cliente.correo
          .toLowerCase()
          .includes(texto)
      );
    });
  }, [clientes, busquedaCliente]);

  // =========================================================
  // AGREGAR PRODUCTO
  // =========================================================

  const agregarProducto = (producto: Producto) => {
    if (producto.stock <= 0) {
      Alert.alert(
        "Sin stock",
        `El producto "${producto.nombre}" no tiene existencias disponibles.`
      );

      return;
    }

    const existente = productosVenta.find(
      (item) => item.producto.id === producto.id
    );

    if (existente) {
      if (existente.cantidad >= producto.stock) {
        Alert.alert(
          "Stock insuficiente",
          `Solo hay ${producto.stock} unidades disponibles.`
        );

        return;
      }

      setProductosVenta((actuales) =>
        actuales.map((item) =>
          item.producto.id === producto.id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
              }
            : item
        )
      );
    } else {
      setProductosVenta((actuales) => [
        ...actuales,
        {
          producto,
          cantidad: 1,
        },
      ]);
    }

    setModalProducto(false);
    setBusquedaProducto("");
  };

  // =========================================================
  // AUMENTAR CANTIDAD
  // =========================================================

  const aumentarCantidad = (productoId: string) => {
    setProductosVenta((actuales) =>
      actuales.map((item) => {
        if (item.producto.id !== productoId) {
          return item;
        }

        if (item.cantidad >= item.producto.stock) {
          Alert.alert(
            "Stock insuficiente",
            `Solo hay ${item.producto.stock} unidades disponibles.`
          );

          return item;
        }

        return {
          ...item,
          cantidad: item.cantidad + 1,
        };
      })
    );
  };

  // =========================================================
  // DISMINUIR CANTIDAD
  // =========================================================

  const disminuirCantidad = (productoId: string) => {
    setProductosVenta((actuales) =>
      actuales
        .map((item) => {
          if (item.producto.id !== productoId) {
            return item;
          }

          return {
            ...item,
            cantidad: item.cantidad - 1,
          };
        })
        .filter((item) => item.cantidad > 0)
    );
  };

  // =========================================================
  // ELIMINAR PRODUCTO
  // =========================================================

  const eliminarProductoVenta = (productoId: string) => {
    setProductosVenta((actuales) =>
      actuales.filter(
        (item) => item.producto.id !== productoId
      )
    );
  };

  // =========================================================
  // CÁLCULOS
  // =========================================================

  const subtotal = useMemo(() => {
    return productosVenta.reduce(
      (total, item) =>
        total +
        item.producto.precioVenta * item.cantidad,
      0
    );
  }, [productosVenta]);

  const total = subtotal;

  const pago = Number(montoPagado || 0);

  const saldoPendiente =
    metodoPago === "Crédito"
      ? Math.max(total - pago, 0)
      : 0;

  // =========================================================
  // SELECCIONAR CLIENTE
  // =========================================================

  const seleccionarCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setModalCliente(false);
    setBusquedaCliente("");
  };

  // =========================================================
  // NUEVO CLIENTE
  // =========================================================

  const abrirNuevoCliente = () => {
    setNuevoClienteNombre("");
    setNuevoClienteApellido("");
    setNuevoClienteTelefono("");
    setNuevoClienteCorreo("");
    setNuevoClienteDireccion("");

    setModalCliente(false);
    setBusquedaCliente("");
    setModalNuevoCliente(true);
  };

  const cerrarNuevoCliente = () => {
    if (guardandoCliente) {
      return;
    }

    setModalNuevoCliente(false);

    setNuevoClienteNombre("");
    setNuevoClienteApellido("");
    setNuevoClienteTelefono("");
    setNuevoClienteCorreo("");
    setNuevoClienteDireccion("");
  };

  const guardarNuevoCliente = async () => {
    const nombre = nuevoClienteNombre.trim();
    const apellido = nuevoClienteApellido.trim();
    const telefono = nuevoClienteTelefono.trim();
    const correo = nuevoClienteCorreo.trim();
    const direccion = nuevoClienteDireccion.trim();

    if (
      !nombre ||
      !apellido ||
      !telefono ||
      !correo ||
      !direccion
    ) {
      Alert.alert(
        "Campos obligatorios",
        "Completa todos los campos del cliente."
      );

      return;
    }

    try {
      setGuardandoCliente(true);

      const datosCliente = {
        nombre,
        apellido,
        telefono,
        correo,
        direccion,
        fechaRegistro: serverTimestamp(),
      };

      const clienteRef = await addDoc(
        collection(db, "clientes"),
        datosCliente
      );

      const clienteNuevo: Cliente = {
        id: clienteRef.id,
        nombre,
        apellido,
        telefono,
        correo,
        direccion,
      };

      setClientes((actuales) => [
        clienteNuevo,
        ...actuales,
      ]);

      setClienteSeleccionado(clienteNuevo);

      setModalNuevoCliente(false);

      setNuevoClienteNombre("");
      setNuevoClienteApellido("");
      setNuevoClienteTelefono("");
      setNuevoClienteCorreo("");
      setNuevoClienteDireccion("");

      Alert.alert(
        "Cliente registrado",
        "El cliente fue agregado y seleccionado para esta venta."
      );
    } catch (error) {
      console.error(
        "Error registrando cliente:",
        error
      );

      Alert.alert(
        "Error",
        "No se pudo registrar el cliente."
      );
    } finally {
      setGuardandoCliente(false);
    }
  };

  // =========================================================
  // FECHA DE PAGO
  // DD/MM/AAAA
  // ESCRIBIR: 15102026
  // RESULTADO: 15/10/2026
  // =========================================================

  const manejarFechaPago = (texto: string) => {
    const numeros = texto
      .replace(/[^0-9]/g, "")
      .slice(0, 8);

    let fechaFormateada = numeros;

    if (numeros.length > 2) {
      fechaFormateada =
        numeros.substring(0, 2) +
        "/" +
        numeros.substring(2);
    }

    if (numeros.length > 4) {
      fechaFormateada =
        numeros.substring(0, 2) +
        "/" +
        numeros.substring(2, 4) +
        "/" +
        numeros.substring(4);
    }

    setFechaLimitePago(fechaFormateada);
  };

  // =========================================================
  // VALIDAR FECHA
  // =========================================================

  const fechaEsValida = (fecha: string) => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
      return false;
    }

    const partes = fecha.split("/");

    const dia = Number(partes[0]);
    const mes = Number(partes[1]);
    const anio = Number(partes[2]);

    if (
      dia < 1 ||
      dia > 31 ||
      mes < 1 ||
      mes > 12 ||
      anio < 2000
    ) {
      return false;
    }

    const fechaReal = new Date(
      anio,
      mes - 1,
      dia
    );

    return (
      fechaReal.getFullYear() === anio &&
      fechaReal.getMonth() === mes - 1 &&
      fechaReal.getDate() === dia
    );
  };

  // =========================================================
  // REGISTRAR VENTA
  // =========================================================

  const registrarVenta = async () => {
    if (productosVenta.length === 0) {
      Alert.alert(
        "Venta vacía",
        "Agrega al menos un producto a la venta."
      );

      return;
    }

    if (
      metodoPago === "Crédito" &&
      !clienteSeleccionado
    ) {
      Alert.alert(
        "Cliente requerido",
        "Para registrar una venta a crédito debes seleccionar un cliente."
      );

      return;
    }

    if (
      metodoPago === "Crédito" &&
      !fechaEsValida(fechaLimitePago)
    ) {
      Alert.alert(
        "Fecha inválida",
        "Ingresa una fecha válida en formato DD/MM/AAAA. Ejemplo: 15/10/2026."
      );

      return;
    }

    if (
      metodoPago === "Crédito" &&
      pago > total
    ) {
      Alert.alert(
        "Monto inválido",
        "El monto pagado no puede ser mayor que el total."
      );

      return;
    }

    for (const item of productosVenta) {
      if (item.cantidad > item.producto.stock) {
        Alert.alert(
          "Stock insuficiente",
          `El producto "${item.producto.nombre}" ya no tiene suficiente stock.`
        );

        await cargarDatos();

        return;
      }
    }

    try {
      setGuardando(true);

      const productosRegistrados =
        productosVenta.map((item) => ({
          productoId: item.producto.id,
          nombre: item.producto.nombre,
          codigo: item.producto.codigo,
          categoria: item.producto.categoria,
          marca: item.producto.marca,
          precioUnitario:
            item.producto.precioVenta,
          cantidad: item.cantidad,
          subtotal:
            item.producto.precioVenta *
            item.cantidad,
        }));

      const datosVenta = {
        clienteId:
          clienteSeleccionado?.id || "",

        clienteNombre:
          clienteSeleccionado
            ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`
            : "Cliente general",

        clienteTelefono:
          clienteSeleccionado?.telefono || "",

        productos: productosRegistrados,

        subtotal: subtotal,

        total: total,

        metodoPago: metodoPago,

        montoPagado:
          metodoPago === "Contado"
            ? total
            : pago,

        saldoPendiente:
          metodoPago === "Crédito"
            ? saldoPendiente
            : 0,

        fechaLimitePago:
          metodoPago === "Crédito"
            ? fechaLimitePago
            : "",

        estado:
          metodoPago === "Contado"
            ? "Pagada"
            : saldoPendiente === 0
            ? "Cancelado"
            : "Pendiente",

        fechaVenta: serverTimestamp(),
      };

      await addDoc(
        collection(db, "ventas"),
        datosVenta
      );

      for (const item of productosVenta) {
        await updateDoc(
          doc(
            db,
            "productos",
            item.producto.id
          ),
          {
            stock: increment(-item.cantidad),
          }
        );
      }

      Alert.alert(
        "Venta registrada",
        `La venta por C$ ${total.toFixed(
          2
        )} se registró correctamente.`
      );

      setProductosVenta([]);
      setClienteSeleccionado(null);
      setMetodoPago("Contado");
      setMontoPagado("");
      setFechaLimitePago("");

      await cargarDatos();
    } catch (error) {
      console.error(
        "Error registrando venta:",
        error
      );

      Alert.alert(
        "Error",
        "No se pudo registrar la venta."
      );
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================
  // RENDER PRODUCTO
  // =========================================================

  const renderProducto = ({
    item,
  }: {
    item: Producto;
  }) => {
    const sinStock = item.stock <= 0;

    return (
      <TouchableOpacity
        style={[
          styles.productoSeleccion,
          sinStock &&
            styles.productoSinStock,
        ]}
        onPress={() =>
          agregarProducto(item)
        }
        disabled={sinStock}
      >
        <View style={styles.iconoProducto}>
          {item.imagenUrl ? (
            <Image
              source={{
                uri: item.imagenUrl,
              }}
              style={styles.imagenProducto}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name="shirt-outline"
              size={25}
              color="#D94F8A"
            />
          )}
        </View>

        <View style={styles.infoProducto}>
          <Text
            style={styles.nombreProducto}
            numberOfLines={1}
          >
            {item.nombre}
          </Text>

          <Text style={styles.codigoProducto}>
            Código: {item.codigo}
          </Text>

          <Text style={styles.categoriaProducto}>
            {item.categoria}
            {item.marca
              ? ` • ${item.marca}`
              : ""}
          </Text>
        </View>

        <View style={styles.precioProducto}>
          <Text style={styles.precioTexto}>
            C$ {item.precioVenta.toFixed(2)}
          </Text>

          <Text
            style={[
              styles.stockTexto,
              sinStock &&
                styles.stockAgotado,
            ]}
          >
            Stock: {item.stock}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // =========================================================
  // RENDER CLIENTE
  // =========================================================

  const renderCliente = ({
    item,
  }: {
    item: Cliente;
  }) => {
    return (
      <TouchableOpacity
        style={styles.clienteSeleccion}
        onPress={() =>
          seleccionarCliente(item)
        }
      >
        <View style={styles.avatarCliente}>
          <Ionicons
            name="person"
            size={23}
            color="#D94F8A"
          />
        </View>

        <View style={styles.infoCliente}>
          <Text style={styles.nombreCliente}>
            {item.nombre} {item.apellido}
          </Text>

          <Text style={styles.datoCliente}>
            {item.telefono}
          </Text>

          {item.correo ? (
            <Text
              style={styles.datoCliente}
              numberOfLines={1}
            >
              {item.correo}
            </Text>
          ) : null}
        </View>

        <Ionicons
          name="chevron-forward"
          size={22}
          color="#D94F8A"
        />
      </TouchableOpacity>
    );
  };

  // =========================================================
  // INTERFAZ
  // =========================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
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
            Ventas
          </Text>

          <Text style={styles.subtitulo}>
            Registra las ventas de Lizma Style
          </Text>
        </View>

        <TouchableOpacity
          style={styles.botonHistorial}
          onPress={() =>
            router.push("/historial-ventas")
          }
        >
          <Ionicons
            name="receipt-outline"
            size={22}
            color="#D94F8A"
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color="#D94F8A"
          />

          <Text style={styles.loadingText}>
            Cargando información...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.contenido
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* CLIENTE */}

          <Text style={styles.seccionTitulo}>
            Cliente
          </Text>

          <TouchableOpacity
            style={styles.selector}
            onPress={() =>
              setModalCliente(true)
            }
          >
            <View style={styles.selectorIcono}>
              <Ionicons
                name="person-outline"
                size={22}
                color="#D94F8A"
              />
            </View>

            <View style={styles.selectorInfo}>
              <Text style={styles.selectorLabel}>
                {clienteSeleccionado
                  ? "Cliente seleccionado"
                  : "Cliente"}
              </Text>

              <Text
                style={styles.selectorTexto}
                numberOfLines={1}
              >
                {clienteSeleccionado
                  ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`
                  : "Seleccionar cliente"}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={22}
              color="#D94F8A"
            />
          </TouchableOpacity>

          {/* PRODUCTOS */}

          <View style={styles.tituloFila}>
            <Text style={styles.seccionTitulo}>
              Productos
            </Text>

            <View style={styles.contadorProductos}>
              <Text
                style={styles.contadorTexto}
              >
                {productosVenta.length}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={
              styles.botonAgregarProducto
            }
            onPress={() =>
              setModalProducto(true)
            }
          >
            <Ionicons
              name="add-circle-outline"
              size={23}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.textoAgregarProducto
              }
            >
              Agregar producto
            </Text>
          </TouchableOpacity>

          {productosVenta.length === 0 ? (
            <View style={styles.ventaVacia}>
              <Ionicons
                name="cart-outline"
                size={55}
                color="#D94F8A"
              />

              <Text
                style={
                  styles.ventaVaciaTitulo
                }
              >
                No hay productos
              </Text>

              <Text
                style={
                  styles.ventaVaciaTexto
                }
              >
                Agrega los productos que
                forman parte de esta venta.
              </Text>
            </View>
          ) : (
            productosVenta.map((item) => (
              <View
                key={item.producto.id}
                style={styles.productoVenta}
              >
                <View
                  style={
                    styles.productoVentaIcono
                  }
                >
                  {item.producto.imagenUrl ? (
                    <Image
                      source={{
                        uri: item.producto.imagenUrl,
                      }}
                      style={
                        styles.imagenProductoVenta
                      }
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons
                      name="shirt-outline"
                      size={23}
                      color="#D94F8A"
                    />
                  )}
                </View>

                <View
                  style={
                    styles.productoVentaInfo
                  }
                >
                  <Text
                    style={
                      styles.productoVentaNombre
                    }
                    numberOfLines={1}
                  >
                    {item.producto.nombre}
                  </Text>

                  <Text
                    style={
                      styles.productoVentaPrecio
                    }
                  >
                    C${" "}
                    {item.producto.precioVenta.toFixed(
                      2
                    )}{" "}
                    c/u
                  </Text>

                  <Text
                    style={
                      styles.productoVentaSubtotal
                    }
                  >
                    Subtotal: C${" "}
                    {(
                      item.producto.precioVenta *
                      item.cantidad
                    ).toFixed(2)}
                  </Text>
                </View>

                <View
                  style={
                    styles.controlesCantidad
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.botonCantidad
                    }
                    onPress={() =>
                      disminuirCantidad(
                        item.producto.id
                      )
                    }
                  >
                    <Ionicons
                      name="remove"
                      size={18}
                      color="#D94F8A"
                    />
                  </TouchableOpacity>

                  <Text
                    style={
                      styles.cantidadTexto
                    }
                  >
                    {item.cantidad}
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.botonCantidad
                    }
                    onPress={() =>
                      aumentarCantidad(
                        item.producto.id
                      )
                    }
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color="#D94F8A"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.botonQuitar}
                  onPress={() =>
                    eliminarProductoVenta(
                      item.producto.id
                    )
                  }
                >
                  <Ionicons
                    name="trash-outline"
                    size={19}
                    color="#D94F8A"
                  />
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* MÉTODO DE PAGO */}

          <Text style={styles.seccionTitulo}>
            Método de pago
          </Text>

          <View style={styles.metodosPago}>
            <TouchableOpacity
              style={[
                styles.metodoPago,
                metodoPago === "Contado" &&
                  styles.metodoPagoActivo,
              ]}
              onPress={() => {
                setMetodoPago("Contado");
                setMontoPagado("");
                setFechaLimitePago("");
              }}
            >
              <Ionicons
                name="cash-outline"
                size={24}
                color={
                  metodoPago === "Contado"
                    ? "#FFFFFF"
                    : "#D94F8A"
                }
              />

              <Text
                style={[
                  styles.metodoTexto,
                  metodoPago === "Contado" &&
                    styles.metodoTextoActivo,
                ]}
              >
                Contado
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.metodoPago,
                metodoPago === "Crédito" &&
                  styles.metodoPagoActivo,
              ]}
              onPress={() =>
                setMetodoPago("Crédito")
              }
            >
              <Ionicons
                name="card-outline"
                size={24}
                color={
                  metodoPago === "Crédito"
                    ? "#FFFFFF"
                    : "#D94F8A"
                }
              />

              <Text
                style={[
                  styles.metodoTexto,
                  metodoPago === "Crédito" &&
                    styles.metodoTextoActivo,
                ]}
              >
                Crédito
              </Text>
            </TouchableOpacity>
          </View>

          {/* CAMPOS DE CRÉDITO */}

          {metodoPago === "Crédito" && (
            <View>
              <Text style={styles.label}>
                Pago inicial
              </Text>

              <View
                style={styles.inputContenedor}
              >
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color="#D94F8A"
                />

                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#000000"
                  value={montoPagado}
                  onChangeText={
                    setMontoPagado
                  }
                  keyboardType="decimal-pad"
                  editable={!guardando}
                />
              </View>

              <Text style={styles.label}>
                Fecha de pago *
              </Text>

              <View
                style={styles.inputContenedor}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color="#D94F8A"
                />

                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#000000"
                  value={fechaLimitePago}
                  onChangeText={
                    manejarFechaPago
                  }
                  keyboardType="number-pad"
                  maxLength={10}
                  editable={!guardando}
                />
              </View>

              <Text style={styles.ayudaFecha}>
                Ejemplo: 15/10/2026
              </Text>

              <View style={styles.saldoCard}>
                <View>
                  <Text
                    style={styles.saldoLabel}
                  >
                    Saldo pendiente
                  </Text>

                  <Text
                    style={styles.saldoValor}
                  >
                    C${" "}
                    {saldoPendiente.toFixed(
                      2
                    )}
                  </Text>
                </View>

                <Ionicons
                  name="wallet-outline"
                  size={30}
                  color="#D94F8A"
                />
              </View>
            </View>
          )}

          {/* RESUMEN */}

          <View style={styles.resumen}>
            <Text
              style={styles.resumenTitulo}
            >
              Resumen de venta
            </Text>

            <View style={styles.resumenFila}>
              <Text
                style={styles.resumenLabel}
              >
                Productos
              </Text>

              <Text
                style={styles.resumenValor}
              >
                {productosVenta.reduce(
                  (cantidad, item) =>
                    cantidad + item.cantidad,
                  0
                )}
              </Text>
            </View>

            <View style={styles.resumenFila}>
              <Text
                style={styles.resumenLabel}
              >
                Subtotal
              </Text>

              <Text
                style={styles.resumenValor}
              >
                C$ {subtotal.toFixed(2)}
              </Text>
            </View>

            <View style={styles.linea} />

            <View style={styles.totalFila}>
              <Text
                style={styles.totalLabel}
              >
                TOTAL
              </Text>

              <Text
                style={styles.totalValor}
              >
                C$ {total.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* REGISTRAR */}

          <TouchableOpacity
            style={[
              styles.botonRegistrar,
              (guardando ||
                productosVenta.length ===
                  0) &&
                styles.botonDeshabilitado,
            ]}
            onPress={registrarVenta}
            disabled={
              guardando ||
              productosVenta.length === 0
            }
          >
            {guardando ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name="checkmark-circle-outline"
                size={23}
                color="#FFFFFF"
              />
            )}

            <Text
              style={styles.textoRegistrar}
            >
              {guardando
                ? "Registrando venta..."
                : "Registrar venta"}
            </Text>
          </TouchableOpacity>

          <View style={styles.espacioFinal} />
        </ScrollView>
      )}

      {/* =====================================================
          MODAL PRODUCTOS
      ===================================================== */}

      <Modal
        visible={modalProducto}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setModalProducto(false);
          setBusquedaProducto("");
        }}
      >
        <View style={styles.modalPantalla}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitulo}>
                Seleccionar producto
              </Text>

              <Text
                style={styles.modalSubtitulo}
              >
                Productos disponibles
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setModalProducto(false);
                setBusquedaProducto("");
              }}
            >
              <Ionicons
                name="close"
                size={29}
                color="#D94F8A"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.busqueda}>
            <Ionicons
              name="search-outline"
              size={21}
              color="#D94F8A"
            />

            <TextInput
              style={styles.inputBusqueda}
              placeholder="Buscar producto..."
              placeholderTextColor="#000000"
              value={busquedaProducto}
              onChangeText={
                setBusquedaProducto
              }
            />

            {busquedaProducto.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  setBusquedaProducto("")
                }
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color="#D94F8A"
                />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={productosFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={renderProducto}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.listaModal
            }
            ListEmptyComponent={
              <View style={styles.modalVacio}>
                <Ionicons
                  name="cube-outline"
                  size={60}
                  color="#D94F8A"
                />

                <Text
                  style={
                    styles.modalVacioTexto
                  }
                >
                  No hay productos disponibles
                </Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* =====================================================
          MODAL CLIENTES
      ===================================================== */}

      <Modal
        visible={modalCliente}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setModalCliente(false);
          setBusquedaCliente("");
        }}
      >
        <View style={styles.modalPantalla}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitulo}>
                Seleccionar cliente
              </Text>

              <Text
                style={styles.modalSubtitulo}
              >
                Clientes registrados
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setModalCliente(false);
                setBusquedaCliente("");
              }}
            >
              <Ionicons
                name="close"
                size={29}
                color="#D94F8A"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.botonNuevoCliente}
            onPress={abrirNuevoCliente}
          >
            <View
              style={styles.iconoNuevoCliente}
            >
              <Ionicons
                name="person-add-outline"
                size={23}
                color="#FFFFFF"
              />
            </View>

            <View
              style={styles.infoNuevoCliente}
            >
              <Text
                style={
                  styles.tituloNuevoCliente
                }
              >
                Agregar cliente
              </Text>

              <Text
                style={
                  styles.subtituloNuevoCliente
                }
              >
                Registrar un nuevo cliente
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={styles.busqueda}>
            <Ionicons
              name="search-outline"
              size={21}
              color="#D94F8A"
            />

            <TextInput
              style={styles.inputBusqueda}
              placeholder="Buscar cliente..."
              placeholderTextColor="#000000"
              value={busquedaCliente}
              onChangeText={
                setBusquedaCliente
              }
            />

            {busquedaCliente.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  setBusquedaCliente("")
                }
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color="#D94F8A"
                />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={clientesFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={renderCliente}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.listaModal
            }
            ListEmptyComponent={
              <View style={styles.modalVacio}>
                <Ionicons
                  name="people-outline"
                  size={60}
                  color="#D94F8A"
                />

                <Text
                  style={
                    styles.modalVacioTexto
                  }
                >
                  No hay clientes registrados
                </Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* =====================================================
          MODAL NUEVO CLIENTE
      ===================================================== */}

      <Modal
        visible={modalNuevoCliente}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={cerrarNuevoCliente}
      >
        <KeyboardAvoidingView
          style={styles.modalPantalla}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              styles.formularioCliente
            }
          >
            <View style={styles.modalHeader}>
              <View>
                <Text
                  style={styles.modalTitulo}
                >
                  Agregar cliente
                </Text>

                <Text
                  style={styles.modalSubtitulo}
                >
                  Registra los datos del cliente
                </Text>
              </View>

              <TouchableOpacity
                onPress={cerrarNuevoCliente}
                disabled={guardandoCliente}
              >
                <Ionicons
                  name="close"
                  size={29}
                  color="#D94F8A"
                />
              </TouchableOpacity>
            </View>

            <Text
              style={styles.labelCliente}
            >
              Nombre *
            </Text>

            <View
              style={
                styles.inputClienteContenedor
              }
            >
              <Ionicons
                name="person-outline"
                size={20}
                color="#D94F8A"
              />

              <TextInput
                style={styles.inputCliente}
                placeholder="Nombre"
                placeholderTextColor="#000000"
                value={nuevoClienteNombre}
                onChangeText={
                  setNuevoClienteNombre
                }
                editable={!guardandoCliente}
              />
            </View>

            <Text
              style={styles.labelCliente}
            >
              Apellido *
            </Text>

            <View
              style={
                styles.inputClienteContenedor
              }
            >
              <Ionicons
                name="person-outline"
                size={20}
                color="#D94F8A"
              />

              <TextInput
                style={styles.inputCliente}
                placeholder="Apellido"
                placeholderTextColor="#000000"
                value={nuevoClienteApellido}
                onChangeText={
                  setNuevoClienteApellido
                }
                editable={!guardandoCliente}
              />
            </View>

            <Text
              style={styles.labelCliente}
            >
              Teléfono *
            </Text>

            <View
              style={
                styles.inputClienteContenedor
              }
            >
              <Ionicons
                name="call-outline"
                size={20}
                color="#D94F8A"
              />

              <TextInput
                style={styles.inputCliente}
                placeholder="Teléfono"
                placeholderTextColor="#000000"
                value={nuevoClienteTelefono}
                onChangeText={
                  setNuevoClienteTelefono
                }
                keyboardType="phone-pad"
                editable={!guardandoCliente}
              />
            </View>

            <Text
              style={styles.labelCliente}
            >
              Correo *
            </Text>

            <View
              style={
                styles.inputClienteContenedor
              }
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color="#D94F8A"
              />

              <TextInput
                style={styles.inputCliente}
                placeholder="Correo electrónico"
                placeholderTextColor="#000000"
                value={nuevoClienteCorreo}
                onChangeText={
                  setNuevoClienteCorreo
                }
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!guardandoCliente}
              />
            </View>

            <Text
              style={styles.labelCliente}
            >
              Dirección *
            </Text>

            <View
              style={[
                styles.inputClienteContenedor,
                styles.inputDireccionContenedor,
              ]}
            >
              <Ionicons
                name="location-outline"
                size={20}
                color="#D94F8A"
              />

              <TextInput
                style={[
                  styles.inputCliente,
                  styles.inputDireccion,
                ]}
                placeholder="Dirección"
                placeholderTextColor="#000000"
                value={nuevoClienteDireccion}
                onChangeText={
                  setNuevoClienteDireccion
                }
                multiline
                editable={!guardandoCliente}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.botonGuardarCliente,
                guardandoCliente &&
                  styles.botonDeshabilitado,
              ]}
              onPress={guardarNuevoCliente}
              disabled={guardandoCliente}
            >
              {guardandoCliente ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={23}
                  color="#FFFFFF"
                />
              )}

              <Text
                style={
                  styles.textoGuardarCliente
                }
              >
                {guardandoCliente
                  ? "Guardando cliente..."
                  : "Guardar cliente"}
              </Text>
            </TouchableOpacity>

            <View
              style={styles.espacioFinal}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
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
    marginRight: 14,
  },

  headerInfo: {
    flex: 1,
  },

  titulo: {
    fontSize: 27,
    fontWeight: "800",
    color: "#000000",
  },

  subtitulo: {
    fontSize: 13,
    color: "#000000",
    marginTop: 2,
  },

  botonHistorial: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FCEAF2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  contenido: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    color: "#000000",
    fontSize: 14,
  },

  seccionTitulo: {
    fontSize: 19,
    fontWeight: "800",
    color: "#000000",
    marginTop: 8,
    marginBottom: 10,
  },

  tituloFila: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },

  contadorProductos: {
    minWidth: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: "#F7D9E6",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    paddingHorizontal: 8,
  },

  contadorTexto: {
    color: "#000000",
    fontWeight: "800",
  },

  selector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBD5DF",
    borderRadius: 15,
    padding: 12,
  },

  selectorIcono: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#FCEAF2",
    alignItems: "center",
    justifyContent: "center",
  },

  selectorInfo: {
    flex: 1,
    marginLeft: 12,
  },

  selectorLabel: {
    fontSize: 11,
    color: "#000000",
    marginBottom: 3,
  },

  selectorTexto: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
  },

  placeholder: {
    color: "#000000",
    fontWeight: "400",
  },

  botonAgregarProducto: {
    height: 52,
    borderRadius: 15,
    backgroundColor: "#D94F8A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },

  textoAgregarProducto: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },

  ventaVacia: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#F1DFE7",
    paddingVertical: 35,
    alignItems: "center",
    marginTop: 12,
  },

  ventaVaciaTitulo: {
    fontSize: 17,
    fontWeight: "800",
    color: "#000000",
    marginTop: 10,
  },

  ventaVaciaTexto: {
    fontSize: 13,
    color: "#000000",
    textAlign: "center",
    marginTop: 5,
    paddingHorizontal: 30,
  },

  productoVenta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#F1DFE7",
  },

  productoVentaIcono: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#FCEAF2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
  },

  imagenProductoVenta: {
    width: 45,
    height: 45,
    borderRadius: 12,
  },

  productoVentaInfo: {
    flex: 1,
  },

  productoVentaNombre: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
  },

  productoVentaPrecio: {
    fontSize: 11,
    color: "#000000",
    marginTop: 3,
  },

  productoVentaSubtotal: {
    fontSize: 12,
    color: "#000000",
    fontWeight: "700",
    marginTop: 3,
  },

  controlesCantidad: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 5,
  },

  botonCantidad: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FCEAF2",
    alignItems: "center",
    justifyContent: "center",
  },

  cantidadTexto: {
    width: 28,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },

  botonQuitar: {
    marginLeft: 7,
    padding: 4,
  },

  metodosPago: {
    flexDirection: "row",
    gap: 10,
  },

  metodoPago: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBD5DF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  metodoPagoActivo: {
    backgroundColor: "#D94F8A",
    borderColor: "#D94F8A",
  },

  metodoTexto: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 7,
  },

  metodoTextoActivo: {
    color: "#FFFFFF",
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 7,
    marginTop: 16,
  },

  inputContenedor: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBD5DF",
    borderRadius: 13,
    minHeight: 50,
    paddingHorizontal: 14,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: "#000000",
    marginLeft: 10,
  },

  ayudaFecha: {
    fontSize: 11,
    color: "#000000",
    marginTop: 5,
    marginLeft: 3,
  },

  saldoCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 15,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F0D5DF",
  },

  saldoLabel: {
    fontSize: 12,
    color: "#000000",
  },

  saldoValor: {
    fontSize: 21,
    fontWeight: "800",
    color: "#000000",
    marginTop: 3,
  },

  resumen: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#F1DFE7",
  },

  resumenTitulo: {
    fontSize: 17,
    fontWeight: "800",
    color: "#000000",
    marginBottom: 12,
  },

  resumenFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7,
  },

  resumenLabel: {
    color: "#000000",
    fontSize: 14,
  },

  resumenValor: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "600",
  },

  linea: {
    height: 1,
    backgroundColor: "#F0E0E7",
    marginVertical: 13,
  },

  totalFila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  totalLabel: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000000",
  },

  totalValor: {
    fontSize: 22,
    fontWeight: "900",
    color: "#000000",
  },

  botonRegistrar: {
    height: 55,
    borderRadius: 15,
    backgroundColor: "#D94F8A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    elevation: 3,
  },

  botonDeshabilitado: {
    opacity: 0.5,
  },

  textoRegistrar: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 8,
  },

  espacioFinal: {
    height: 30,
  },

  // =========================================================
  // MODALES
  // =========================================================

  modalPantalla: {
    flex: 1,
    backgroundColor: "#FFF7FB",
    paddingTop: 55,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 18,
  },

  modalTitulo: {
    fontSize: 23,
    fontWeight: "800",
    color: "#000000",
  },

  modalSubtitulo: {
    fontSize: 13,
    color: "#000000",
    marginTop: 3,
  },

  botonNuevoCliente: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D94F8A",
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 15,
    padding: 12,
    elevation: 3,
  },

  iconoNuevoCliente: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#C63E78",
    alignItems: "center",
    justifyContent: "center",
  },

  infoNuevoCliente: {
    flex: 1,
    marginLeft: 12,
  },

  tituloNuevoCliente: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  subtituloNuevoCliente: {
    fontSize: 12,
    color: "#FFFFFF",
    marginTop: 3,
  },

  formularioCliente: {
    paddingBottom: 30,
  },

  labelCliente: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
    marginHorizontal: 20,
    marginTop: 7,
    marginBottom: 7,
  },

  inputClienteContenedor: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBD5DF",
    borderRadius: 13,
    minHeight: 52,
    marginHorizontal: 20,
    paddingHorizontal: 14,
  },

  inputCliente: {
    flex: 1,
    fontSize: 15,
    color: "#000000",
    marginLeft: 10,
  },

  inputDireccionContenedor: {
    alignItems: "flex-start",
    paddingVertical: 14,
  },

  inputDireccion: {
    minHeight: 70,
    textAlignVertical: "top",
  },

  botonGuardarCliente: {
    height: 55,
    borderRadius: 15,
    backgroundColor: "#D94F8A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 24,
    elevation: 3,
  },

  textoGuardarCliente: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 8,
  },

  busqueda: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 12,
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

  listaModal: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  // =========================================================
  // PRODUCTOS DEL MODAL
  // =========================================================

  productoSeleccion: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1DFE7",
  },

  productoSinStock: {
    opacity: 0.5,
  },

  iconoProducto: {
    width: 47,
    height: 47,
    borderRadius: 13,
    backgroundColor: "#FCEAF2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    overflow: "hidden",
  },

  imagenProducto: {
    width: 47,
    height: 47,
    borderRadius: 13,
  },

  infoProducto: {
    flex: 1,
  },

  nombreProducto: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
  },

  codigoProducto: {
    fontSize: 11,
    color: "#000000",
    marginTop: 3,
  },

  categoriaProducto: {
    fontSize: 11,
    color: "#000000",
    marginTop: 3,
  },

  precioProducto: {
    alignItems: "flex-end",
    marginLeft: 8,
  },

  precioTexto: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },

  stockTexto: {
    fontSize: 11,
    color: "#000000",
    marginTop: 4,
    fontWeight: "700",
  },

  stockAgotado: {
    color: "#000000",
  },

  // =========================================================
  // CLIENTES
  // =========================================================

  clienteSeleccion: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1DFE7",
  },

  avatarCliente: {
    width: 47,
    height: 47,
    borderRadius: 24,
    backgroundColor: "#FCEAF2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  infoCliente: {
    flex: 1,
  },

  nombreCliente: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
  },

  datoCliente: {
    fontSize: 12,
    color: "#000000",
    marginTop: 3,
  },

  modalVacio: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 70,
  },

  modalVacioTexto: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    marginTop: 12,
  },
});