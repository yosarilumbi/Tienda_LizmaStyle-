
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { auth, db } from '../database/firebaseConfig';

interface ProductoVenta {
  productoId?: string;
  nombre?: string;
  codigo?: string;
  cantidad?: number;
  precioVenta?: number;
  subtotal?: number;
}

interface Venta {
  id: string;
  clienteId: string;
  clienteNombre?: string;
  total?: number;
  montoPagado?: number;
  saldoPendiente?: number;
  estado?: string;
  metodoPago?: string;
  fechaVenta?: any;
  fechaLimitePago?: any;
  productos?: ProductoVenta[];
}

type Seccion = 'compras' | 'deudas';

export default function HistorialClienteScreen() {
  const router = useRouter();

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seccion, setSeccion] = useState<Seccion>('compras');

  useEffect(() => {
    cargarVentas();
  }, []);

  const cargarVentas = async () => {
    try {
      setCargando(true);

      const usuario = auth.currentUser;

      if (!usuario) {
        Alert.alert(
          'Sesión requerida',
          'Debes iniciar sesión para consultar tus compras.'
        );
        router.replace('/');
        return;
      }

      const ventasRef = collection(db, 'ventas');

      const ventasQuery = query(
        ventasRef,
        where('clienteId', '==', usuario.uid)
      );

      const snapshot = await getDocs(ventasQuery);

      const lista: Venta[] = snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          clienteId: data.clienteId || '',
          clienteNombre: data.clienteNombre || '',
          total: Number(data.total || 0),
          montoPagado: Number(data.montoPagado || 0),
          saldoPendiente: Number(data.saldoPendiente || 0),
          estado: data.estado || '',
          metodoPago: data.metodoPago || '',
          fechaVenta: data.fechaVenta,
          fechaLimitePago: data.fechaLimitePago,
          productos: Array.isArray(data.productos)
            ? data.productos
            : [],
        };
      });

      lista.sort((a, b) => {
        const fechaA = obtenerFecha(a.fechaVenta)?.getTime() || 0;
        const fechaB = obtenerFecha(b.fechaVenta)?.getTime() || 0;

        return fechaB - fechaA;
      });

      setVentas(lista);
    } catch (error) {
      console.error('Error al cargar historial:', error);

      Alert.alert(
        'Error',
        'No fue posible cargar tu historial de compras.'
      );
    } finally {
      setCargando(false);
    }
  };

  const obtenerFecha = (fecha: any): Date | null => {
    if (!fecha) {
      return null;
    }

    if (fecha?.toDate) {
      return fecha.toDate();
    }

    if (fecha instanceof Date) {
      return fecha;
    }

    if (typeof fecha === 'string') {
      const fechaConvertida = new Date(fecha);

      if (!isNaN(fechaConvertida.getTime())) {
        return fechaConvertida;
      }
    }

    return null;
  };

  const formatearFecha = (fecha: any) => {
    const fechaConvertida = obtenerFecha(fecha);

    if (!fechaConvertida) {
      return 'Fecha no disponible';
    }

    return fechaConvertida.toLocaleDateString('es-NI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatearMonto = (monto: number) => {
    return `C$ ${Number(monto || 0).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const deudasPendientes = useMemo(() => {
    return ventas.filter(
      (venta) =>
        venta.metodoPago === 'Crédito' &&
        Number(venta.saldoPendiente || 0) > 0.01
    );
  }, [ventas]);

  const totalDeuda = useMemo(() => {
    return deudasPendientes.reduce(
      (total, venta) =>
        total + Number(venta.saldoPendiente || 0),
      0
    );
  }, [deudasPendientes]);

  const renderVenta = ({ item }: { item: Venta }) => {
    const saldo = Number(item.saldoPendiente || 0);
    const esCredito = item.metodoPago === 'Crédito';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={
                esCredito
                  ? 'credit-card-clock-outline'
                  : 'shopping-outline'
              }
              size={23}
              color="#D94F8A"
            />
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.orderTitle}>
              Compra #{item.id.slice(0, 8)}
            </Text>

            <Text style={styles.date}>
              {formatearFecha(item.fechaVenta)}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              esCredito && saldo > 0
                ? styles.statusPending
                : styles.statusPaid,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                esCredito && saldo > 0
                  ? styles.statusPendingText
                  : styles.statusPaidText,
              ]}
            >
              {esCredito && saldo > 0
                ? 'Pendiente'
                : 'Pagada'}
            </Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.productList}>
          {(item.productos || []).map((producto, index) => (
            <View
              key={`${producto.productoId || index}-${index}`}
              style={styles.productRow}
            >
              <View style={styles.productInfo}>
                <Text
                  style={styles.productName}
                  numberOfLines={2}
                >
                  {producto.nombre || 'Producto'}
                </Text>

                <Text style={styles.productQuantity}>
                  Cantidad: {producto.cantidad || 0}
                </Text>
              </View>

              <Text style={styles.productPrice}>
                {formatearMonto(
                  Number(
                    producto.subtotal ||
                      Number(producto.precioVenta || 0) *
                        Number(producto.cantidad || 0)
                  )
                )}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.separator} />

        <View style={styles.paymentRow}>
          <View>
            <Text style={styles.paymentLabel}>
              Método de pago
            </Text>

            <Text style={styles.paymentMethod}>
              {item.metodoPago || 'No especificado'}
            </Text>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>
              Total
            </Text>

            <Text style={styles.total}>
              {formatearMonto(Number(item.total || 0))}
            </Text>
          </View>
        </View>

        {esCredito && saldo > 0.01 && (
          <View style={styles.debtBox}>
            <View>
              <Text style={styles.debtTitle}>
                Saldo pendiente
              </Text>

              <Text style={styles.debtAmount}>
                {formatearMonto(saldo)}
              </Text>
            </View>

            <View style={styles.dueDateContainer}>
              <Text style={styles.dueDateLabel}>
                Fecha límite
              </Text>

              <Text style={styles.dueDate}>
                {formatearFecha(item.fechaLimitePago)}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const contenido = () => {
    if (cargando) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#D94F8A"
          />

          <Text style={styles.loadingText}>
            Cargando información...
          </Text>
        </View>
      );
    }

    if (seccion === 'compras') {
      if (ventas.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="shopping-outline"
              size={65}
              color="#D94F8A"
            />

            <Text style={styles.emptyTitle}>
              Aún no tienes compras
            </Text>

            <Text style={styles.emptyText}>
              Tus compras aparecerán aquí cuando realices
              tu primer pedido.
            </Text>

            <TouchableOpacity
              style={styles.shopButton}
              onPress={() =>
                router.push('/catalogo-cliente')
              }
              activeOpacity={0.85}
            >
              <Text style={styles.shopButtonText}>
                Ver catálogo
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <FlatList
          data={ventas}
          keyExtractor={(item) => item.id}
          renderItem={renderVenta}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshing={cargando}
          onRefresh={cargarVentas}
        />
      );
    }

    if (deudasPendientes.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={65}
            color="#2E7D32"
          />

          <Text style={styles.emptyTitle}>
            No tienes deudas pendientes
          </Text>

          <Text style={styles.emptyText}>
            Actualmente no tienes compras a crédito con
            saldo pendiente.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={deudasPendientes}
        keyExtractor={(item) => item.id}
        renderItem={renderVenta}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshing={cargando}
        onRefresh={cargarVentas}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFF7FB"
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#222"
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            Mis compras
          </Text>

          <Text style={styles.headerSubtitle}>
            Historial y deudas
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            seccion === 'compras' && styles.tabActive,
          ]}
          onPress={() => setSeccion('compras')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="receipt-outline"
            size={19}
            color={
              seccion === 'compras'
                ? '#D94F8A'
                : '#888'
            }
          />

          <Text
            style={[
              styles.tabText,
              seccion === 'compras' &&
                styles.tabTextActive,
            ]}
          >
            Mis compras
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            seccion === 'deudas' && styles.tabActive,
          ]}
          onPress={() => setSeccion('deudas')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="card-outline"
            size={19}
            color={
              seccion === 'deudas'
                ? '#D94F8A'
                : '#888'
            }
          />

          <Text
            style={[
              styles.tabText,
              seccion === 'deudas' &&
                styles.tabTextActive,
            ]}
          >
            Mis deudas
          </Text>

          {deudasPendientes.length > 0 && (
            <View style={styles.debtCount}>
              <Text style={styles.debtCountText}>
                {deudasPendientes.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {seccion === 'deudas' &&
        deudasPendientes.length > 0 && (
          <View style={styles.totalDebtCard}>
            <View>
              <Text style={styles.totalDebtLabel}>
                Deuda total pendiente
              </Text>

              <Text style={styles.totalDebtAmount}>
                {formatearMonto(totalDeuda)}
              </Text>
            </View>

            <MaterialCommunityIcons
              name="cash-clock"
              size={34}
              color="#D94F8A"
            />
          </View>
        )}

      {contenido()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7FB',
  },

  header: {
    height: 70,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#222',
  },

  headerSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },

  headerPlaceholder: {
    width: 42,
  },

  tabs: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  tab: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  tabActive: {
    backgroundColor: '#FCE4EC',
  },

  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },

  tabTextActive: {
    color: '#D94F8A',
    fontWeight: '800',
  },

  debtCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#D94F8A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  debtCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  totalDebtCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  totalDebtLabel: {
    fontSize: 12,
    color: '#777',
    fontWeight: '600',
  },

  totalDebtAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#D94F8A',
    marginTop: 3,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FCE4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },

  orderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#222',
  },

  date: {
    fontSize: 11,
    color: '#888',
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },

  statusPaid: {
    backgroundColor: '#E8F5E9',
  },

  statusPending: {
    backgroundColor: '#FFF3E0',
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  statusPaidText: {
    color: '#2E7D32',
  },

  statusPendingText: {
    color: '#EF6C00',
  },

  separator: {
    height: 1,
    backgroundColor: '#F1F1F1',
    marginVertical: 12,
  },

  productList: {
    gap: 10,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  productInfo: {
    flex: 1,
    paddingRight: 10,
  },

  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },

  productQuantity: {
    fontSize: 11,
    color: '#888',
    marginTop: 3,
  },

  productPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },

  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  paymentLabel: {
    fontSize: 10,
    color: '#999',
  },

  paymentMethod: {
    fontSize: 12,
    color: '#555',
    fontWeight: '700',
    marginTop: 2,
  },

  totalContainer: {
    alignItems: 'flex-end',
  },

  totalLabel: {
    fontSize: 10,
    color: '#999',
  },

  total: {
    fontSize: 17,
    fontWeight: '800',
    color: '#D94F8A',
    marginTop: 2,
  },

  debtBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF5F8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  debtTitle: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
  },

  debtAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D94F8A',
    marginTop: 2,
  },

  dueDateContainer: {
    alignItems: 'flex-end',
  },

  dueDateLabel: {
    fontSize: 10,
    color: '#999',
  },

  dueDate: {
    fontSize: 12,
    color: '#555',
    fontWeight: '700',
    marginTop: 2,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: '#777',
    fontSize: 14,
    marginTop: 12,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 35,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginTop: 15,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 7,
  },

  shopButton: {
    marginTop: 20,
    backgroundColor: '#D94F8A',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
  },

  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
