
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { db } from '../database/firebaseConfig';

type Abono = {
  id: string;
  monto: number;
  metodoPago: string;
  fecha: Date | null;
};

type ProductoCredito = {
  nombre: string;
  cantidad: number;
  precioVenta: number;
};

type Credito = {
  id: string;
  clienteNombre: string;
  clienteTelefono: string;
  total: number;
  montoPagado: number;
  saldoPendiente: number;
  estado: string;
  fechaVenta: Date | null;
  fechaLimitePago: Date | null;
  productos: ProductoCredito[];
  abonos: Abono[];
};

export default function CreditosScreen() {
  const router = useRouter();

  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  const [modalAbonoVisible, setModalAbonoVisible] = useState(false);
  const [creditoSeleccionado, setCreditoSeleccionado] = useState<Credito | null>(null);

  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPagoAbono, setMetodoPagoAbono] = useState('Efectivo');
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  const [creditoHistorial, setCreditoHistorial] = useState<Credito | null>(null);

  const convertirFecha = (valor: any): Date | null => {
    if (!valor) {
      return null;
    }

    if (valor instanceof Timestamp) {
      return valor.toDate();
    }

    if (valor && typeof valor.toDate === 'function') {
      return valor.toDate();
    }

    if (valor instanceof Date) {
      return valor;
    }

    return null;
  };

  const obtenerFechaLimite = (
    fechaVenta: Date | null,
    fechaLimiteGuardada: Date | null
  ): Date | null => {
    if (fechaLimiteGuardada) {
      return fechaLimiteGuardada;
    }

    if (!fechaVenta) {
      return null;
    }

    const fecha = new Date(fechaVenta);
    fecha.setDate(fecha.getDate() + 30);

    return fecha;
  };

  const cargarCreditos = async (mostrarCarga = true) => {
    try {
      if (mostrarCarga) {
        setCargando(true);
      }

      const ventasSnapshot = await getDocs(collection(db, 'ventas'));
      const lista: Credito[] = [];

      for (const documento of ventasSnapshot.docs) {
        const venta = documento.data();

        if (venta.metodoPago !== 'Crédito') {
          continue;
        }

        const fechaVenta = convertirFecha(venta.fechaVenta);
        const fechaLimiteGuardada = convertirFecha(venta.fechaLimitePago);

        const fechaLimitePago = obtenerFechaLimite(
          fechaVenta,
          fechaLimiteGuardada
        );

        const productos: ProductoCredito[] = Array.isArray(venta.productos)
          ? venta.productos.map((producto: any) => ({
              nombre: producto.nombre || 'Producto',
              cantidad: Number(producto.cantidad || 0),
              precioVenta: Number(producto.precioVenta || 0),
            }))
          : [];

        const abonosSnapshot = await getDocs(
          collection(db, 'ventas', documento.id, 'abonos')
        );

        const abonos: Abono[] = [];

        abonosSnapshot.forEach((abonoDocumento) => {
          const abono = abonoDocumento.data();
          const fecha = convertirFecha(abono.fecha);

          abonos.push({
            id: abonoDocumento.id,
            monto: Number(abono.monto || 0),
            metodoPago: abono.metodoPago || 'Efectivo',
            fecha,
          });
        });

        abonos.sort((a, b) => {
          const fechaA = a.fecha ? a.fecha.getTime() : 0;
          const fechaB = b.fecha ? b.fecha.getTime() : 0;
          return fechaB - fechaA;
        });

        lista.push({
          id: documento.id,
          clienteNombre: venta.clienteNombre || 'Cliente sin nombre',
          clienteTelefono: venta.clienteTelefono || 'Sin teléfono',
          total: Number(venta.total || 0),
          montoPagado: Number(venta.montoPagado || 0),
          saldoPendiente: Number(venta.saldoPendiente || 0),
          estado: venta.estado || 'Pendiente',
          fechaVenta,
          fechaLimitePago,
          productos,
          abonos,
        });
      }

      lista.sort((a, b) => {
        const fechaA = a.fechaVenta ? a.fechaVenta.getTime() : 0;
        const fechaB = b.fechaVenta ? b.fechaVenta.getTime() : 0;
        return fechaB - fechaA;
      });

      setCreditos(lista);
    } catch (error) {
      console.error('Error cargando créditos:', error);
      Alert.alert('Error', 'No se pudieron cargar los créditos.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCreditos();
  }, []);

  const actualizar = async () => {
    if (actualizando) {
      return;
    }

    setActualizando(true);

    try {
      await cargarCreditos(false);
    } catch (error) {
      console.error('Error actualizando créditos:', error);
    } finally {
      setActualizando(false);
    }
  };

  const abrirModalAbono = (credito: Credito) => {
    setCreditoSeleccionado(credito);
    setMontoAbono('');
    setMetodoPagoAbono('Efectivo');
    setModalAbonoVisible(true);
  };

  const cerrarModalAbono = () => {
    if (guardandoAbono) {
      return;
    }

    setModalAbonoVisible(false);
    setCreditoSeleccionado(null);
    setMontoAbono('');
    setMetodoPagoAbono('Efectivo');
  };

  const registrarAbono = async () => {
    if (!creditoSeleccionado) {
      return;
    }

    const monto = Number(montoAbono.replace(',', '.'));

    if (!montoAbono.trim() || isNaN(monto)) {
      Alert.alert('Monto inválido', 'Ingresa un monto de abono válido.');
      return;
    }

    if (monto <= 0) {
      Alert.alert('Monto inválido', 'El abono debe ser mayor que C$ 0.00.');
      return;
    }

    if (monto > creditoSeleccionado.saldoPendiente) {
      Alert.alert(
        'Abono excedido',
        `El abono no puede ser mayor al saldo pendiente de ${formatearMoneda(
          creditoSeleccionado.saldoPendiente
        )}.`
      );
      return;
    }

    try {
      setGuardandoAbono(true);

      const nuevoMontoPagado = creditoSeleccionado.montoPagado + monto;
      const nuevoSaldo = creditoSeleccionado.total - nuevoMontoPagado;

      const nuevoEstado = nuevoSaldo <= 0.01 ? 'Pagada' : 'Pendiente';

      const ventaRef = doc(db, 'ventas', creditoSeleccionado.id);

      await updateDoc(ventaRef, {
        montoPagado: nuevoMontoPagado,
        saldoPendiente: nuevoSaldo <= 0.01 ? 0 : nuevoSaldo,
        estado: nuevoEstado,
      });

      await addDoc(
        collection(db, 'ventas', creditoSeleccionado.id, 'abonos'),
        {
          monto,
          metodoPago: metodoPagoAbono,
          fecha: serverTimestamp(),
        }
      );

      setModalAbonoVisible(false);
      setCreditoSeleccionado(null);
      setMontoAbono('');
      setMetodoPagoAbono('Efectivo');

      await cargarCreditos(false);

      Alert.alert(
        'Abono registrado',
        `Se registró correctamente un abono de ${formatearMoneda(monto)}.`
      );
    } catch (error) {
      console.error('Error registrando abono:', error);
      Alert.alert('Error', 'No se pudo registrar el abono.');
    } finally {
      setGuardandoAbono(false);
    }
  };

  const formatearMoneda = (valor: number) => {
    return `C$ ${valor.toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatearFecha = (fecha: Date | null) => {
    if (!fecha) {
      return 'Fecha no disponible';
    }

    return fecha.toLocaleDateString('es-NI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const verificarFechaLimite = (credito: Credito) => {
    if (!credito.fechaLimitePago || credito.saldoPendiente <= 0) {
      return 'normal';
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const limite = new Date(credito.fechaLimitePago);
    limite.setHours(0, 0, 0, 0);

    if (limite < hoy) {
      return 'vencido';
    }

    return 'normal';
  };

  const totalCreditos = creditos.reduce(
    (total, credito) => total + credito.total,
    0
  );

  const totalPagado = creditos.reduce(
    (total, credito) => total + credito.montoPagado,
    0
  );

  const totalPendiente = creditos.reduce(
    (total, credito) => total + credito.saldoPendiente,
    0
  );

  const creditosPendientes = creditos.filter(
    (credito) => credito.saldoPendiente > 0
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF0F5" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.replace('/home')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={23} color="#9D174D" />
        </TouchableOpacity>

        <View style={styles.headerCentro}>
          <Text style={styles.headerTitle}>Créditos</Text>
          <Text style={styles.headerSubtitle}>Control de pagos y saldos</Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={actualizar}
          activeOpacity={0.7}
        >
          {actualizando ? (
            <ActivityIndicator size="small" color="#DB2777" />
          ) : (
            <Ionicons name="refresh" size={22} color="#9D174D" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={actualizando} onRefresh={actualizar} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.resumenCard}>
          <View style={styles.resumenTituloFila}>
            <View style={styles.resumenIcono}>
              <Ionicons name="wallet-outline" size={22} color="#BE185D" />
            </View>
            <View>
              <Text style={styles.resumenTitulo}>Resumen de créditos</Text>
              <Text style={styles.resumenSubtitulo}>
                Estado general de las ventas a crédito
              </Text>
            </View>
          </View>

          <View style={styles.resumenFila}>
            <View style={styles.resumenItem}>
              <Text style={styles.resumenValor}>{creditos.length}</Text>
              <Text style={styles.resumenLabel}>Créditos registrados</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.resumenItem}>
              <Text style={styles.resumenValor}>{creditosPendientes}</Text>
              <Text style={styles.resumenLabel}>Pendientes de pago</Text>
            </View>
          </View>
        </View>

        <View style={styles.dineroContainer}>
          <View style={styles.dineroCard}>
            <View style={[styles.dineroIcono, styles.iconoTotal]}>
              <Ionicons name="receipt-outline" size={21} color="#BE185D" />
            </View>
            <Text style={styles.dineroLabel}>Total de créditos</Text>
            <Text style={styles.dineroValor}>
              {formatearMoneda(totalCreditos)}
            </Text>
          </View>

          <View style={styles.dineroCard}>
            <View style={[styles.dineroIcono, styles.iconoPagado]}>
              <Ionicons name="checkmark-circle-outline" size={21} color="#15803D" />
            </View>
            <Text style={styles.dineroLabel}>Total abonado</Text>
            <Text style={[styles.dineroValor, styles.valorPagado]}>
              {formatearMoneda(totalPagado)}
            </Text>
          </View>

          <View style={styles.dineroCard}>
            <View style={[styles.dineroIcono, styles.iconoPendiente]}>
              <Ionicons name="time-outline" size={21} color="#C2410C" />
            </View>
            <Text style={styles.dineroLabel}>Saldo pendiente</Text>
            <Text style={[styles.dineroValor, styles.valorPendiente]}>
              {formatearMoneda(totalPendiente)}
            </Text>
          </View>
        </View>

        <View style={styles.seccionEncabezado}>
          <View>
            <Text style={styles.seccionTitulo}>Lista de créditos</Text>
            <Text style={styles.seccionSubtitulo}>
              Consulta saldos, fechas y abonos
            </Text>
          </View>
          <View style={styles.contadorBadge}>
            <Text style={styles.contadorTexto}>{creditos.length}</Text>
          </View>
        </View>

        {cargando ? (
          <View style={styles.cargandoContainer}>
            <ActivityIndicator size="large" color="#DB2777" />
            <Text style={styles.cargandoTexto}>Cargando créditos...</Text>
          </View>
        ) : creditos.length === 0 ? (
          <View style={styles.vacioCard}>
            <View style={styles.vacioIcono}>
              <Ionicons name="card-outline" size={43} color="#DB2777" />
            </View>
            <Text style={styles.vacioTitulo}>No hay créditos registrados</Text>
            <Text style={styles.vacioTexto}>
              Los créditos registrados desde Ventas aparecerán aquí.
            </Text>
          </View>
        ) : (
          creditos.map((credito) => {
            const estadoFecha = verificarFechaLimite(credito);

            return (
              <View key={credito.id} style={styles.creditoCard}>
                <View style={styles.creditoHeader}>
                  <View style={styles.clienteInfo}>
                    <View style={styles.iconoCliente}>
                      <Ionicons name="person-outline" size={22} color="#BE185D" />
                    </View>

                    <View style={styles.clienteDatos}>
                      <Text style={styles.clienteNombre} numberOfLines={1}>
                        {credito.clienteNombre}
                      </Text>
                      <View style={styles.telefonoFila}>
                        <Ionicons name="call-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.telefono}>{credito.clienteTelefono}</Text>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.estado,
                      credito.saldoPendiente > 0
                        ? estadoFecha === 'vencido'
                          ? styles.estadoVencido
                          : styles.estadoPendiente
                        : styles.estadoPagado,
                    ]}
                  >
                    <View
                      style={[
                        styles.estadoPunto,
                        credito.saldoPendiente > 0
                          ? estadoFecha === 'vencido'
                            ? styles.puntoVencido
                            : styles.puntoPendiente
                          : styles.puntoPagado,
                      ]}
                    />
                    <Text
                      style={[
                        styles.estadoTexto,
                        credito.saldoPendiente > 0
                          ? estadoFecha === 'vencido'
                            ? styles.estadoTextoVencido
                            : styles.estadoTextoPendiente
                          : styles.estadoTextoPagado,
                      ]}
                    >
                      {credito.saldoPendiente <= 0
                        ? 'Pagado'
                        : estadoFecha === 'vencido'
                        ? 'Vencido'
                        : 'Pendiente'}
                    </Text>
                  </View>
                </View>

                <View style={styles.linea} />

                <View style={styles.productosCredito}>
                  <Text style={styles.productosTitulo}>Producto(s) pendiente(s)</Text>

                  {credito.productos.length === 0 ? (
                    <View style={styles.productoSinDatos}>
                      <Ionicons name="cube-outline" size={18} color="#9CA3AF" />
                      <Text style={styles.productoSinDatosTexto}>
                        Producto no disponible
                      </Text>
                    </View>
                  ) : (
                    credito.productos.map((producto, index) => (
                      <View
                        key={`${credito.id}-${index}`}
                        style={styles.productoCredito}
                      >
                        <View style={styles.productoCreditoInfo}>
                          <View style={styles.productoIcono}>
                            <Ionicons
                              name="cube-outline"
                              size={18}
                              color="#BE185D"
                            />
                          </View>

                          <View style={styles.productoCreditoTexto}>
                            <Text
                              style={styles.productoCreditoNombre}
                              numberOfLines={2}
                            >
                              {producto.nombre}
                            </Text>
                            <Text style={styles.productoCreditoCantidad}>
                              Cantidad: {producto.cantidad}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.productoCreditoPrecio}>
                          {formatearMoneda(
                            producto.precioVenta * producto.cantidad
                          )}
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                <View style={styles.fechasCredito}>
                  <View style={styles.fechaItem}>
                    <View style={styles.fechaIcono}>
                      <Ionicons
                        name="calendar-outline"
                        size={17}
                        color="#BE185D"
                      />
                    </View>
                    <View style={styles.fechaTextoContenedor}>
                      <Text style={styles.fechaLabel}>Fecha de venta</Text>
                      <Text style={styles.fechaValor}>
                        {formatearFecha(credito.fechaVenta)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.fechaItem,
                      estadoFecha === 'vencido' &&
                        credito.saldoPendiente > 0 &&
                        styles.fechaItemVencida,
                    ]}
                  >
                    <View
                      style={[
                        styles.fechaIcono,
                        estadoFecha === 'vencido' &&
                          credito.saldoPendiente > 0 &&
                          styles.fechaIconoVencida,
                      ]}
                    >
                      <Ionicons
                        name="calendar-clear-outline"
                        size={17}
                        color={
                          estadoFecha === 'vencido' &&
                          credito.saldoPendiente > 0
                            ? '#C62828'
                            : '#BE185D'
                        }
                      />
                    </View>
                    <View style={styles.fechaTextoContenedor}>
                      <Text style={styles.fechaLabel}>Fecha límite de pago</Text>
                      <Text
                        style={[
                          styles.fechaValor,
                          estadoFecha === 'vencido' &&
                            credito.saldoPendiente > 0 &&
                            styles.fechaValorVencida,
                        ]}
                      >
                        {formatearFecha(credito.fechaLimitePago)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.datosCredito}>
                  <View style={styles.dato}>
                    <Text style={styles.datoLabel}>Total del crédito</Text>
                    <Text style={styles.datoValor}>
                      {formatearMoneda(credito.total)}
                    </Text>
                  </View>

                  <View style={styles.dato}>
                    <Text style={styles.datoLabel}>Total abonado</Text>
                    <Text style={[styles.datoValor, styles.datoValorPagado]}>
                      {formatearMoneda(credito.montoPagado)}
                    </Text>
                  </View>
                </View>

                <View style={styles.saldoCredito}>
                  <View style={styles.saldoIcono}>
                    <Ionicons name="wallet-outline" size={20} color="#BE185D" />
                  </View>

                  <View style={styles.saldoInformacion}>
                    <Text style={styles.saldoLabel}>Saldo pendiente</Text>
                    <Text style={styles.saldoValor}>
                      {formatearMoneda(credito.saldoPendiente)}
                    </Text>
                  </View>

                  {credito.saldoPendiente > 0 && estadoFecha === 'vencido' && (
                    <View style={styles.vencidoAviso}>
                      <Ionicons name="warning-outline" size={16} color="#C62828" />
                      <Text style={styles.vencidoAvisoTexto}>Vencido</Text>
                    </View>
                  )}
                </View>

                <View style={styles.botonesCredito}>
                  {credito.saldoPendiente > 0 && (
                    <TouchableOpacity
                      style={styles.botonAbono}
                      onPress={() => abrirModalAbono(credito)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.botonAbonoTexto}>Registrar abono</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.botonHistorial,
                      credito.saldoPendiente <= 0 &&
                        styles.botonHistorialCompleto,
                    ]}
                    onPress={() => setCreditoHistorial(credito)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="receipt-outline" size={18} color="#BE185D" />
                    <Text style={styles.botonHistorialTexto}>Ver abonos</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* MODAL REGISTRAR ABONO */}
      <Modal
        visible={modalAbonoVisible}
        transparent
        animationType="slide"
        onRequestClose={cerrarModalAbono}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitulo}>Registrar abono</Text>
                <Text style={styles.modalSubtitulo}>
                  Registra un pago del cliente
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCerrar}
                onPress={cerrarModalAbono}
                disabled={guardandoAbono}
              >
                <Ionicons name="close" size={24} color="#9D174D" />
              </TouchableOpacity>
            </View>

            {creditoSeleccionado && (
              <>
                <Text style={styles.modalClienteLabel}>Cliente</Text>
                <Text style={styles.modalCliente}>
                  {creditoSeleccionado.clienteNombre}
                </Text>

                <Text style={styles.modalClienteLabel}>Producto(s)</Text>
                <View style={styles.modalProductos}>
                  {creditoSeleccionado.productos.length === 0 ? (
                    <Text style={styles.modalProductoTexto}>
                      Producto no disponible
                    </Text>
                  ) : (
                    creditoSeleccionado.productos.map((producto, index) => (
                      <View
                        key={`${creditoSeleccionado.id}-modal-${index}`}
                        style={styles.modalProductoFila}
                      >
                        <Text
                          style={styles.modalProductoNombre}
                          numberOfLines={1}
                        >
                          {producto.nombre}
                        </Text>
                        <Text style={styles.modalProductoCantidad}>
                          x{producto.cantidad}
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                <View style={styles.modalFechaLimite}>
                  <View style={styles.modalFechaItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#BE185D"
                    />
                    <View>
                      <Text style={styles.modalFechaLabel}>Fecha límite</Text>
                      <Text style={styles.modalFechaValor}>
                        {formatearFecha(creditoSeleccionado.fechaLimitePago)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalSaldo}>
                  <Text style={styles.modalSaldoLabel}>Saldo pendiente</Text>
                  <Text style={styles.modalSaldoValor}>
                    {formatearMoneda(creditoSeleccionado.saldoPendiente)}
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Monto del abono</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.simboloMoneda}>C$</Text>
                  <TextInput
                    style={styles.input}
                    value={montoAbono}
                    onChangeText={setMontoAbono}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    editable={!guardandoAbono}
                  />
                </View>

                <Text style={styles.inputLabel}>Método de pago</Text>
                <View style={styles.metodosContainer}>
                  {['Efectivo', 'Transferencia', 'Tarjeta'].map((metodo) => (
                    <TouchableOpacity
                      key={metodo}
                      style={[
                        styles.metodoButton,
                        metodoPagoAbono === metodo && styles.metodoButtonActivo,
                      ]}
                      onPress={() => setMetodoPagoAbono(metodo)}
                      disabled={guardandoAbono}
                    >
                      <Text
                        style={[
                          styles.metodoTexto,
                          metodoPagoAbono === metodo && styles.metodoTextoActivo,
                        ]}
                      >
                        {metodo}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalBotones}>
                  <TouchableOpacity
                    style={styles.botonCancelar}
                    onPress={cerrarModalAbono}
                    disabled={guardandoAbono}
                  >
                    <Text style={styles.botonCancelarTexto}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.botonConfirmar}
                    onPress={registrarAbono}
                    disabled={guardandoAbono}
                  >
                    {guardandoAbono ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={19}
                          color="#FFFFFF"
                        />
                        <Text style={styles.botonConfirmarTexto}>Registrar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL HISTORIAL */}
      <Modal
        visible={creditoHistorial !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCreditoHistorial(null)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitulo}>Historial de abonos</Text>
                <Text style={styles.modalSubtitulo}>
                  Pagos registrados del crédito
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCerrar}
                onPress={() => setCreditoHistorial(null)}
              >
                <Ionicons name="close" size={24} color="#9D174D" />
              </TouchableOpacity>
            </View>

            {creditoHistorial && (
              <>
                <Text style={styles.modalCliente}>
                  {creditoHistorial.clienteNombre}
                </Text>

                <Text style={styles.modalClienteLabel}>Producto(s)</Text>
                <View style={styles.modalProductos}>
                  {creditoHistorial.productos.length === 0 ? (
                    <Text style={styles.modalProductoTexto}>
                      Producto no disponible
                    </Text>
                  ) : (
                    creditoHistorial.productos.map((producto, index) => (
                      <View
                        key={`${creditoHistorial.id}-historial-${index}`}
                        style={styles.modalProductoFila}
                      >
                        <Text
                          style={styles.modalProductoNombre}
                          numberOfLines={1}
                        >
                          {producto.nombre}
                        </Text>
                        <Text style={styles.modalProductoCantidad}>
                          x{producto.cantidad}
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                <View style={styles.historialFecha}>
                  <View style={styles.historialDato}>
                    <Text style={styles.historialLabel}>Fecha de venta</Text>
                    <Text style={styles.historialValor}>
                      {formatearFecha(creditoHistorial.fechaVenta)}
                    </Text>
                  </View>

                  <View style={styles.historialDato}>
                    <Text style={styles.historialLabel}>Fecha límite</Text>
                    <Text style={styles.historialValor}>
                      {formatearFecha(creditoHistorial.fechaLimitePago)}
                    </Text>
                  </View>
                </View>

                <View style={styles.historialResumen}>
                  <View style={styles.historialDato}>
                    <Text style={styles.historialLabel}>Total</Text>
                    <Text style={styles.historialValor}>
                      {formatearMoneda(creditoHistorial.total)}
                    </Text>
                  </View>

                  <View style={styles.historialDato}>
                    <Text style={styles.historialLabel}>Saldo</Text>
                    <Text style={styles.historialSaldo}>
                      {formatearMoneda(creditoHistorial.saldoPendiente)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.historialListaTitulo}>Movimientos de pago</Text>

                <ScrollView
                  style={styles.historialScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {creditoHistorial.abonos.length === 0 ? (
                    <View style={styles.historialVacio}>
                      <View style={styles.historialVacioIcono}>
                        <Ionicons
                          name="receipt-outline"
                          size={35}
                          color="#DB2777"
                        />
                      </View>
                      <Text style={styles.historialVacioTexto}>
                        Este crédito todavía no tiene abonos registrados.
                      </Text>
                    </View>
                  ) : (
                    creditoHistorial.abonos.map((abono) => (
                      <View key={abono.id} style={styles.abonoItem}>
                        <View style={styles.abonoIcono}>
                          <Ionicons
                            name="cash-outline"
                            size={20}
                            color="#15803D"
                          />
                        </View>

                        <View style={styles.abonoDatos}>
                          <Text style={styles.abonoMonto}>
                            {formatearMoneda(abono.monto)}
                          </Text>
                          <Text style={styles.abonoFecha}>
                            {formatearFecha(abono.fecha)}
                          </Text>
                        </View>

                        <View style={styles.abonoMetodoContenedor}>
                          <Text style={styles.abonoMetodo}>
                            {abono.metodoPago}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={styles.botonCerrarHistorial}
                  onPress={() => setCreditoHistorial(null)}
                >
                  <Text style={styles.botonCerrarHistorialTexto}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7FA',
  },

  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#FFF0F5',
    borderBottomWidth: 1,
    borderBottomColor: '#FCE7F0',
  },

  headerButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FBCFE8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerCentro: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#831843',
    letterSpacing: 0.2,
  },

  headerSubtitle: {
    fontSize: 11,
    color: '#9D174D',
    marginTop: 3,
  },

  scrollContent: {
    paddingHorizontal: 17,
    paddingTop: 17,
    paddingBottom: 35,
  },

  resumenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 19,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FCE7F0',
    elevation: 3,
    shadowColor: '#9D174D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },

  resumenTituloFila: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  resumenIcono: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  resumenTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#831843',
  },

  resumenSubtitulo: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },

  resumenFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFF7FA',
    borderRadius: 15,
    paddingVertical: 15,
  },

  resumenItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
  },

  resumenValor: {
    fontSize: 27,
    fontWeight: '800',
    color: '#BE185D',
  },

  resumenLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 5,
    textAlign: 'center',
  },

  divider: {
    width: 1,
    height: 42,
    backgroundColor: '#FBCFE8',
  },

  dineroContainer: {
    marginBottom: 22,
    gap: 10,
  },

  dineroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FCE7F0',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    elevation: 2,
    shadowColor: '#9D174D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },

  dineroIcono: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  iconoTotal: {
    backgroundColor: '#FCE7F3',
  },

  iconoPagado: {
    backgroundColor: '#DCFCE7',
  },

  iconoPendiente: {
    backgroundColor: '#FFEDD5',
  },

  dineroLabel: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },

  dineroValor: {
    width: '100%',
    fontSize: 20,
    fontWeight: '800',
    color: '#831843',
    marginTop: 9,
    marginLeft: 54,
  },

  valorPagado: {
    color: '#15803D',
  },

  valorPendiente: {
    color: '#C2410C',
  },

  seccionEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  seccionTitulo: {
    fontSize: 19,
    fontWeight: '800',
    color: '#831843',
  },

  seccionSubtitulo: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },

  contadorBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: 12,
    paddingHorizontal: 9,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  contadorTexto: {
    fontSize: 14,
    fontWeight: '800',
    color: '#BE185D',
  },

  cargandoContainer: {
    alignItems: 'center',
    paddingVertical: 45,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
  },

  cargandoTexto: {
    marginTop: 12,
    fontSize: 13,
    color: '#9D174D',
  },

  vacioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCE7F0',
  },

  vacioIcono: {
    width: 82,
    height: 82,
    borderRadius: 27,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  vacioTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#831843',
    marginTop: 17,
    textAlign: 'center',
  },

  vacioTexto: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 9,
    lineHeight: 19,
  },

  creditoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FCE7F0',
    elevation: 3,
    shadowColor: '#831843',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
  },

  creditoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  clienteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },

  clienteDatos: {
    flex: 1,
  },

  iconoCliente: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  clienteNombre: {
    fontSize: 14,
    fontWeight: '800',
    color: '#831843',
  },

  telefonoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  telefono: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4,
  },

  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
  },

  estadoPendiente: {
    backgroundColor: '#FFF7ED',
  },

  estadoVencido: {
    backgroundColor: '#FEF2F2',
  },

  estadoPagado: {
    backgroundColor: '#F0FDF4',
  },

  estadoPunto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  puntoPendiente: {
    backgroundColor: '#EA580C',
  },

  puntoVencido: {
    backgroundColor: '#DC2626',
  },

  puntoPagado: {
    backgroundColor: '#16A34A',
  },

  estadoTexto: {
    fontSize: 10,
    fontWeight: '800',
  },

  estadoTextoPendiente: {
    color: '#C2410C',
  },

  estadoTextoVencido: {
    color: '#B91C1C',
  },

  estadoTextoPagado: {
    color: '#15803D',
  },

  linea: {
    height: 1,
    backgroundColor: '#F3E4EB',
    marginVertical: 15,
  },

  productosCredito: {
    marginBottom: 15,
  },

  productosTitulo: {
    fontSize: 12,
    fontWeight: '800',
    color: '#831843',
    marginBottom: 9,
  },

  productoCredito: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7FA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: '#FCE7F0',
  },

  productoCreditoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  productoIcono: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  productoCreditoTexto: {
    flex: 1,
    marginLeft: 9,
  },

  productoCreditoNombre: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },

  productoCreditoCantidad: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },

  productoCreditoPrecio: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9D174D',
    marginLeft: 8,
  },

  productoSinDatos: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 11,
    padding: 12,
  },

  productoSinDatosTexto: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 7,
  },

  fechasCredito: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 8,
  },

  fechaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7FA',
    borderRadius: 12,
    padding: 9,
    borderWidth: 1,
    borderColor: '#FCE7F0',
  },

  fechaItemVencida: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },

  fechaIcono: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
  },

  fechaIconoVencida: {
    backgroundColor: '#FEE2E2',
  },

  fechaTextoContenedor: {
    flex: 1,
  },

  fechaLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    marginBottom: 4,
  },

  fechaValor: {
    fontSize: 10,
    fontWeight: '800',
    color: '#374151',
  },

  fechaValorVencida: {
    color: '#B91C1C',
  },

  datosCredito: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 13,
    paddingHorizontal: 2,
  },

  dato: {
    width: '48%',
  },

  datoLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 5,
  },

  datoValor: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
  },

  datoValorPagado: {
    color: '#15803D',
  },

  saldoCredito: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F6',
    borderRadius: 15,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },

  saldoIcono: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  saldoInformacion: {
    flex: 1,
  },

  saldoLabel: {
    fontSize: 10,
    color: '#9D174D',
    marginBottom: 4,
  },

  saldoValor: {
    fontSize: 17,
    fontWeight: '900',
    color: '#9D174D',
  },

  vencidoAviso: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 6,
    marginLeft: 5,
  },

  vencidoAvisoTexto: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B91C1C',
    marginLeft: 4,
  },

  botonesCredito: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 4,
  },

  botonAbono: {
    flex: 1,
    minHeight: 45,
    borderRadius: 13,
    backgroundColor: '#DB2777',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    elevation: 2,
    shadowColor: '#BE185D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  botonAbonoTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
  },

  botonHistorial: {
    flex: 1,
    minHeight: 45,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#F9A8D4',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  botonHistorialCompleto: {
    flex: 1,
  },

  botonHistorialTexto: {
    color: '#BE185D',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
  },

  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(76, 5, 25, 0.48)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    paddingHorizontal: 21,
    paddingTop: 22,
    paddingBottom: 28,
    maxHeight: '92%',
    borderTopWidth: 3,
    borderTopColor: '#F9A8D4',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 19,
  },

  modalTitulo: {
    fontSize: 20,
    fontWeight: '900',
    color: '#831843',
  },

  modalSubtitulo: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },

  modalCerrar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalClienteLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 4,
  },

  modalCliente: {
    fontSize: 16,
    fontWeight: '800',
    color: '#831843',
    marginBottom: 14,
  },

  modalProductos: {
    backgroundColor: '#FFF7FA',
    borderRadius: 13,
    padding: 11,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FCE7F0',
  },

  modalProductoFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },

  modalProductoNombre: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },

  modalProductoCantidad: {
    fontSize: 12,
    fontWeight: '800',
    color: '#BE185D',
    marginLeft: 10,
  },

  modalProductoTexto: {
    fontSize: 12,
    color: '#6B7280',
  },

  modalFechaLimite: {
    backgroundColor: '#FFF7FA',
    borderRadius: 13,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FCE7F0',
  },

  modalFechaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  modalFechaLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },

  modalFechaValor: {
    fontSize: 13,
    fontWeight: '800',
    color: '#831843',
    marginTop: 3,
  },

  modalSaldo: {
    backgroundColor: '#FFF0F6',
    borderRadius: 15,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },

  modalSaldoLabel: {
    fontSize: 11,
    color: '#9D174D',
    marginBottom: 5,
  },

  modalSaldoValor: {
    fontSize: 23,
    fontWeight: '900',
    color: '#9D174D',
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#831843',
    marginBottom: 7,
  },

  inputContainer: {
    minHeight: 51,
    borderWidth: 1,
    borderColor: '#F9A8D4',
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 17,
    backgroundColor: '#FFFFFF',
  },

  simboloMoneda: {
    fontSize: 15,
    fontWeight: '900',
    color: '#BE185D',
    marginRight: 9,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: '#831843',
    paddingVertical: 10,
  },

  metodosContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 21,
  },

  metodoButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#FBCFE8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  metodoButtonActivo: {
    backgroundColor: '#FCE7F3',
    borderColor: '#DB2777',
  },

  metodoTexto: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '700',
  },

  metodoTextoActivo: {
    color: '#BE185D',
    fontWeight: '900',
  },

  modalBotones: {
    flexDirection: 'row',
    gap: 10,
  },

  botonCancelar: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  botonCancelarTexto: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '800',
  },

  botonConfirmar: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#DB2777',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  botonConfirmarTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },

  historialFecha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7FA',
    borderRadius: 13,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FCE7F0',
  },

  historialResumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFF0F6',
    borderRadius: 13,
    padding: 13,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },

  historialDato: {
    flex: 1,
  },

  historialLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 5,
  },

  historialValor: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
  },

  historialSaldo: {
    fontSize: 12,
    fontWeight: '900',
    color: '#BE185D',
  },

  historialListaTitulo: {
    fontSize: 13,
    fontWeight: '800',
    color: '#831843',
    marginBottom: 10,
  },

  historialScroll: {
    maxHeight: 260,
  },

  historialVacio: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  historialVacioIcono: {
    width: 65,
    height: 65,
    borderRadius: 22,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  historialVacioTexto: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    marginTop: 12,
    lineHeight: 19,
  },

  abonoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCE7F0',
    borderRadius: 13,
    padding: 11,
    marginBottom: 9,
  },

  abonoIcono: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  abonoDatos: {
    flex: 1,
  },

  abonoMonto: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803D',
  },

  abonoFecha: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },

  abonoMetodoContenedor: {
    maxWidth: 100,
    backgroundColor: '#FCE7F3',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  abonoMetodo: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9D174D',
    textAlign: 'center',
  },

  botonCerrarHistorial: {
    height: 48,
    borderRadius: 13,
    backgroundColor: '#DB2777',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  botonCerrarHistorialTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
