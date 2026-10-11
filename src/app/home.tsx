
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { db } from '../database/firebaseConfig';

const COLORS = {
  background: '#FFF8FB',
  white: '#FFFFFF',
  primary: '#D94F91',
  primaryDark: '#B83272',
  primaryLight: '#FCE7F1',
  primaryPale: '#FFF0F6',
  text: '#422536',
  secondaryText: '#987F8D',
  border: '#F2DFE8',
  green: '#269A69',
  orange: '#D98727',
  red: '#D64562',
  purple: '#8750A1',
};

const quickActions = [
  {
    icon: 'cart-outline' as const,
    label: 'Ventas',
    color: '#C63D7F',
    background: '#FCE7F1',
    description: 'Gestionar ventas',
  },
  {
    icon: 'package-variant-closed' as const,
    label: 'Inventario',
    color: '#9455A5',
    background: '#F3E9F8',
    description: 'Control de productos',
  },
  {
    icon: 'account-group-outline' as const,
    label: 'Clientes',
    color: '#C65370',
    background: '#FDE9ED',
    description: 'Administrar clientes',
  },
  {
    icon: 'credit-card-outline' as const,
    label: 'Créditos',
    color: '#B77735',
    background: '#FFF1DF',
    description: 'Control de créditos',
  },
];

export default function HomeScreen() {
  const router = useRouter();

  const [ventasHoy, setVentasHoy] = useState(0);
  const [productos, setProductos] = useState(0);
  const [clientes, setClientes] = useState(0);
  const [ventasMes, setVentasMes] = useState(0);
  const [creditosPendientes, setCreditosPendientes] = useState(0);
  const [stockBajo, setStockBajo] = useState(0);
  const [cargando, setCargando] = useState(true);

  const handleQuickAction = (label: string) => {
    if (label === 'Ventas') {
      router.push('/ventas');
      return;
    }

    if (label === 'Inventario') {
      router.push('/productos');
      return;
    }

    if (label === 'Clientes') {
      router.push('/clientes');
      return;
    }

    if (label === 'Créditos') {
      router.push('/creditos');
      return;
    }
  };

  const cargarDatos = async () => {
    try {
      setCargando(true);

      const productosSnapshot = await getDocs(
        collection(db, 'productos')
      );

      setProductos(productosSnapshot.size);

      const clientesSnapshot = await getDocs(
        collection(db, 'clientes')
      );

      setClientes(clientesSnapshot.size);

      const ventasSnapshot = await getDocs(
        collection(db, 'ventas')
      );

      const ahora = new Date();

      const inicioHoy = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate(),
        0, 0, 0, 0
      );

      const finHoy = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate(),
        23, 59, 59, 999
      );

      const inicioMes = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        1,
        0, 0, 0, 0
      );

      let cantidadVentasHoy = 0;
      let cantidadVentasMes = 0;
      let cantidadCreditosPendientes = 0;

      ventasSnapshot.forEach((ventaDoc) => {
        const venta = ventaDoc.data();

        let fechaVenta: Date | null = null;

        if (venta.fechaVenta instanceof Timestamp) {
          fechaVenta = venta.fechaVenta.toDate();
        } else if (
          venta.fechaVenta &&
          typeof venta.fechaVenta.toDate === 'function'
        ) {
          fechaVenta = venta.fechaVenta.toDate();
        }

        if (!fechaVenta) return;

        if (
          fechaVenta >= inicioHoy &&
          fechaVenta <= finHoy
        ) {
          cantidadVentasHoy++;
        }

        if (fechaVenta >= inicioMes) {
          cantidadVentasMes++;
        }

        if (
          venta.metodoPago === 'Crédito' &&
          Number(venta.saldoPendiente || 0) > 0
        ) {
          cantidadCreditosPendientes++;
        }
      });

      setVentasHoy(cantidadVentasHoy);
      setVentasMes(cantidadVentasMes);
      setCreditosPendientes(cantidadCreditosPendientes);

      let cantidadStockBajo = 0;

      productosSnapshot.forEach((productoDoc) => {
        const producto = productoDoc.data();

        const stock = Number(
          producto.stock ??
          producto.cantidad ??
          producto.existencias ??
          0
        );

        if (stock <= 5) {
          cantidadStockBajo++;
        }
      });

      setStockBajo(cantidadStockBajo);
    } catch (error) {
      console.error(
        'Error cargando datos del inicio:',
        error
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PORTADA */}
        <View style={styles.fotoNegocioContainer}>
          <Image
            source={require('../../assets/foto-negocio.jpeg')}
            style={styles.fotoNegocio}
            resizeMode="cover"
          />

          <View style={styles.fotoOverlay} />

          <View style={styles.fotoTexto}>
            <View style={styles.brandBadge}>
              <MaterialCommunityIcons
                name="heart"
                size={13}
                color={COLORS.white}
              />
              <Text style={styles.brandBadgeText}>
                MODA · BELLEZA · ESTILO
              </Text>
            </View>

            <Text style={styles.nombreNegocio}>
              Lizma Style
            </Text>

            <Text style={styles.subtituloNegocio}>
              Tu estilo, nuestra pasión
            </Text>
          </View>
        </View>

        {/* SALUDO */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              ¡Hola! 👋
            </Text>

            <Text style={styles.userName}>
              Administra tu negocio desde aquí
            </Text>
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            activeOpacity={0.75}
            accessibilityLabel="Abrir perfil"
            onPress={() => router.push('/perfil')}
          >
            <MaterialCommunityIcons
              name="account-outline"
              size={29}
              color={COLORS.primaryDark}
            />
            <View style={styles.profileDot} />
          </TouchableOpacity>
        </View>

        {/* RESUMEN GENERAL */}
        <View style={styles.summaryCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons
                name="chart-box-outline"
                size={22}
                color={COLORS.primaryDark}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.cardTitle}>
                Resumen general
              </Text>
              <Text style={styles.cardSubtitle}>
                Así marcha tu negocio
              </Text>
            </View>

            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>RESUMEN</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryIcon,
                  { backgroundColor: '#FCE7F1' },
                ]}
              >
                <MaterialCommunityIcons
                  name="cart-check"
                  size={21}
                  color={COLORS.primaryDark}
                />
              </View>

              <Text style={styles.summaryValue}>
                {cargando ? '—' : ventasHoy}
              </Text>
              <Text style={styles.summaryLabel}>
                Ventas hoy
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryIcon,
                  { backgroundColor: '#F3E9F8' },
                ]}
              >
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={21}
                  color={COLORS.purple}
                />
              </View>

              <Text style={styles.summaryValue}>
                {cargando ? '—' : productos}
              </Text>
              <Text style={styles.summaryLabel}>
                Productos
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryIcon,
                  { backgroundColor: '#FDE9ED' },
                ]}
              >
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={21}
                  color="#C65370"
                />
              </View>

              <Text style={styles.summaryValue}>
                {cargando ? '—' : clientes}
              </Text>
              <Text style={styles.summaryLabel}>
                Clientes
              </Text>
            </View>
          </View>
        </View>

        {/* ACCIONES RÁPIDAS */}
        <View style={styles.sectionHeading}>
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionTitle}>
              Accesos rápidos
            </Text>
            <Text style={styles.sectionDescription}>
              Todo lo que necesitas, en un solo lugar
            </Text>
          </View>

          <View style={styles.headingDecoration}>
            <MaterialCommunityIcons
              name="apps"
              size={21}
              color={COLORS.primaryDark}
            />
          </View>
        </View>

        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              activeOpacity={0.78}
              onPress={() => handleQuickAction(action.label)}
            >
              <View style={styles.actionTopRow}>
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: action.background },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={action.icon}
                    size={27}
                    color={action.color}
                  />
                </View>

                <View
                  style={[
                    styles.actionArrow,
                    { backgroundColor: action.background },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="arrow-top-right"
                    size={17}
                    color={action.color}
                  />
                </View>
              </View>

              <Text style={styles.actionLabel}>
                {action.label}
              </Text>

              <Text style={styles.actionDescription}>
                {action.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* INDICADORES */}
        <View style={styles.sectionHeading}>
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionTitle}>
              Indicadores recientes
            </Text>
            <Text style={styles.sectionDescription}>
              Información clave de tu tienda
            </Text>
          </View>

          <View style={styles.headingDecoration}>
            <MaterialCommunityIcons
              name="chart-line"
              size={21}
              color={COLORS.primaryDark}
            />
          </View>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiRow}>
            <View
              style={[
                styles.kpiIconContainer,
                { backgroundColor: '#E6F7EE' },
              ]}
            >
              <MaterialCommunityIcons
                name="trending-up"
                size={23}
                color={COLORS.green}
              />
            </View>

            <View style={styles.kpiContent}>
              <Text style={styles.kpiText}>
                Ventas del mes
              </Text>
              <Text style={styles.kpiDescription}>
                Ventas registradas durante este mes
              </Text>
            </View>

            <View style={styles.kpiValueContainer}>
              <Text style={styles.kpiValue}>
                {cargando ? '—' : ventasMes}
              </Text>
              <Text style={styles.kpiUnit}>ventas</Text>
            </View>
          </View>

          <View style={styles.kpiDivider} />

          <View style={styles.kpiRow}>
            <View
              style={[
                styles.kpiIconContainer,
                { backgroundColor: '#FFF1DF' },
              ]}
            >
              <MaterialCommunityIcons
                name="credit-card-clock-outline"
                size={23}
                color={COLORS.orange}
              />
            </View>

            <View style={styles.kpiContent}>
              <Text style={styles.kpiText}>
                Créditos pendientes
              </Text>
              <Text style={styles.kpiDescription}>
                Ventas a crédito con saldo pendiente
              </Text>
            </View>

            <View style={styles.kpiValueContainer}>
              <Text style={styles.kpiValue}>
                {cargando ? '—' : creditosPendientes}
              </Text>
              <Text style={styles.kpiUnit}>créditos</Text>
            </View>
          </View>

          <View style={styles.kpiDivider} />

          <View style={styles.kpiRow}>
            <View
              style={[
                styles.kpiIconContainer,
                { backgroundColor: '#FDE8EB' },
              ]}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={23}
                color={COLORS.red}
              />
            </View>

            <View style={styles.kpiContent}>
              <Text style={styles.kpiText}>
                Stock bajo
              </Text>
              <Text style={styles.kpiDescription}>
                Productos con cinco unidades o menos
              </Text>
            </View>

            <View style={styles.kpiValueContainer}>
              <Text style={styles.kpiValue}>
                {cargando ? '—' : stockBajo}
              </Text>
              <Text style={styles.kpiUnit}>productos</Text>
            </View>
          </View>
        </View>

        {/* MENSAJE DE INVENTARIO */}
        {!cargando && stockBajo > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            activeOpacity={0.8}
            onPress={() => router.push('/productos')}
          >
            <View style={styles.alertIcon}>
              <MaterialCommunityIcons
                name="alert-outline"
                size={23}
                color={COLORS.red}
              />
            </View>

            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                Revisa tu inventario
              </Text>
              <Text style={styles.alertDescription}>
                {stockBajo === 1
                  ? 'Hay 1 producto con existencias bajas.'
                  : `Hay ${stockBajo} productos con existencias bajas.`}
              </Text>
            </View>

            <MaterialCommunityIcons
              name="chevron-right"
              size={23}
              color={COLORS.red}
            />
          </TouchableOpacity>
        )}

        {/* PIE */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <View style={styles.footerBrand}>
            <MaterialCommunityIcons
              name="heart"
              size={14}
              color={COLORS.primary}
            />
            <Text style={styles.footerText}>
              Lizma Style
            </Text>
          </View>

          <Text style={styles.footerSubtext}>
            Tu estilo, nuestra pasión
          </Text>

          <View style={styles.footerLine} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 35,
  },

  // PORTADA
  fotoNegocioContainer: {
    width: '100%',
    height: 215,
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 25,
    backgroundColor: '#E9A8C6',
    elevation: 4,
    shadowColor: '#A64D77',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },

  fotoNegocio: {
    width: '100%',
    height: '100%',
  },

  fotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(55, 12, 35, 0.19)',
  },

  fotoTexto: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: 'rgba(78, 23, 51, 0.68)',
  },

  brandBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },

  brandBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: COLORS.white,
  },

  nombreNegocio: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.3,
  },

  subtituloNegocio: {
    fontSize: 13,
    color: '#FFEAF3',
    marginTop: 4,
  },

  // SALUDO
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  greeting: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.7,
  },

  userName: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.secondaryText,
    marginTop: 5,
  },

  profileButton: {
    width: 53,
    height: 53,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1C8DA',
  },

  profileDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#41B77A',
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    right: 5,
    top: 5,
  },

  // RESUMEN
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: '#8D4268',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 11,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 21,
  },

  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  sectionHeaderText: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  cardSubtitle: {
    fontSize: 11,
    color: COLORS.secondaryText,
    marginTop: 4,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F9F1F5',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },

  liveText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: COLORS.primaryDark,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },

  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.secondaryText,
    marginTop: 5,
    textAlign: 'center',
  },

  summaryDivider: {
    width: 1,
    height: 66,
    backgroundColor: COLORS.border,
  },

  // ENCABEZADOS DE SECCIÓN
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  sectionHeadingText: {
    flex: 1,
    paddingRight: 10,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.35,
  },

  sectionDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.secondaryText,
    marginTop: 5,
  },

  headingDecoration: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ACCIONES RÁPIDAS
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 19,
  },

  actionCard: {
    width: '48.2%',
    minHeight: 157,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#8D4268',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },

  actionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  actionIconContainer: {
    width: 49,
    height: 49,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
  },

  actionDescription: {
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.secondaryText,
    marginTop: 5,
    paddingRight: 2,
  },

  actionArrow: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // INDICADORES
  kpiCard: {
    backgroundColor: COLORS.white,
    borderRadius: 23,
    paddingHorizontal: 15,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: '#8D4268',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },

  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },

  kpiIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  kpiContent: {
    flex: 1,
    paddingRight: 5,
  },

  kpiText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },

  kpiDescription: {
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.secondaryText,
    marginTop: 4,
  },

  kpiValueContainer: {
    alignItems: 'flex-end',
    minWidth: 48,
    marginLeft: 4,
  },

  kpiValue: {
    fontSize: 21,
    fontWeight: '900',
    color: COLORS.primaryDark,
    textAlign: 'right',
  },

  kpiUnit: {
    fontSize: 9,
    color: COLORS.secondaryText,
    marginTop: 2,
  },

  kpiDivider: {
    height: 1,
    backgroundColor: '#F4E8EE',
    marginLeft: 57,
  },

  // ALERTA DE INVENTARIO
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F1',
    borderWidth: 1,
    borderColor: '#F6D4DA',
    borderRadius: 19,
    padding: 14,
    marginTop: 15,
  },

  alertIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FDE1E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  alertContent: {
    flex: 1,
  },

  alertTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#A62F4A',
  },

  alertDescription: {
    fontSize: 10,
    lineHeight: 15,
    color: '#A65D6C',
    marginTop: 4,
  },

  // PIE DE PÁGINA
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 29,
    gap: 10,
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0DCE5',
  },

  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  footerText: {
    fontSize: 11,
    color: COLORS.primaryDark,
    fontWeight: '800',
  },

  footerSubtext: {
    display: 'none',
  },
});
