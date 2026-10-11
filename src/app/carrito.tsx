
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCart } from '../context/CartContext';

const ROSA = '#C94F82';
const ROSA_OSCURO = '#8E3158';
const ROSA_CLARO = '#FFF0F6';
const FONDO = '#FFFAFC';
const TEXTO = '#442C37';
const SECUNDARIO = '#997080';
const BORDE = '#F1DFE8';

const formatoPrecio = (precio: number) =>
  `C$ ${Number(precio || 0).toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function CarritoScreen() {
  const router = useRouter();

  const {
    carrito,
    cantidadProductos,
    totalCarrito,
    aumentarCantidad,
    disminuirCantidad,
    eliminarDelCarrito,
    vaciarCarrito,
  } = useCart();

  const confirmarVaciar = () => {
    Alert.alert(
      'Vaciar carrito',
      '¿Deseas eliminar todos los productos de tu carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, vaciar',
          style: 'destructive',
          onPress: vaciarCarrito,
        },
      ],
    );
  };

  const confirmarEliminar = (id: string, nombre: string) => {
    Alert.alert(
      'Eliminar producto',
      `¿Deseas quitar "${nombre}" de tu carrito?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => eliminarDelCarrito(id),
        },
      ],
    );
  };

  const continuarCompra = () => {
    if (carrito.length === 0) {
      Alert.alert(
        'Carrito vacío',
        'Agrega productos antes de continuar.',
      );
      return;
    }

    const lineaInvalida = carrito.find(
      (producto) =>
        producto.cantidad <= 0 ||
        producto.stock <= 0 ||
        producto.cantidad > producto.stock,
    );

    if (lineaInvalida) {
      Alert.alert(
        'Revisa las existencias',
        `La cantidad de "${lineaInvalida.nombre}" supera las unidades disponibles. Ajusta la cantidad antes de continuar.`,
      );
      return;
    }

    router.push('/confirmar-pedido');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={FONDO} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={22} color={TEXTO} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.brand}>LIZMA STYLE</Text>
          <Text style={styles.headerTitle}>Mi carrito</Text>
        </View>

        {carrito.length > 0 ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={confirmarVaciar}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Vaciar carrito"
          >
            <Ionicons name="trash-outline" size={21} color={ROSA} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      <View style={styles.intro}>
        <View>
          <Text style={styles.introTitle}>Tu selección</Text>
          <Text style={styles.introSubtitle}>
            Revisa tus favoritos antes de continuar.
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Ionicons name="bag-handle-outline" size={16} color={ROSA} />
          <Text style={styles.countText}>{cantidadProductos}</Text>
        </View>
      </View>

      {carrito.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCircle}>
            <MaterialCommunityIcons
              name="shopping-outline"
              size={66}
              color={ROSA}
            />

            <View style={styles.emptyHeart}>
              <Ionicons name="heart" size={20} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.emptyTitle}>
            Tu carrito está esperando
          </Text>

          <Text style={styles.emptyText}>
            Todavía no has agregado productos. Descubre nuestros
            artículos y encuentra algo que te encante.
          </Text>

          <TouchableOpacity
            style={styles.catalogButton}
            onPress={() => router.push('/catalogo-cliente')}
            activeOpacity={0.85}
          >
            <Ionicons name="bag-outline" size={20} color="#FFFFFF" />
            <Text style={styles.catalogButtonText}>
              Explorar catálogo
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.emptyNote}>
            LIZMA STYLE · Tu estilo, tu esencia
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>
                Productos agregados
              </Text>

              <Text style={styles.sectionCaption}>
                {carrito.length}{' '}
                {carrito.length === 1 ? 'artículo' : 'artículos'}
              </Text>
            </View>

            {carrito.map((producto) => {
              const stockDisponible = Math.max(
                0,
                Number(producto.stock || 0),
              );

              const cantidadMaxima =
                producto.cantidad >= stockDisponible;

              const sinStock = stockDisponible <= 0;

              const detalleVariante = [
                producto.talla?.trim()
                  ? `Talla: ${producto.talla.trim()}`
                  : '',
                producto.color?.trim()
                  ? `Color: ${producto.color.trim()}`
                  : '',
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <View key={producto.id} style={styles.productCard}>
                  <View style={styles.imageFrame}>
                    {producto.imagenUrl ? (
                      <Image
                        source={{ uri: producto.imagenUrl }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.noImage}>
                        <MaterialCommunityIcons
                          name="image-outline"
                          size={36}
                          color={ROSA}
                        />
                        <Text style={styles.noImageText}>
                          Lizma Style
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.productInfo}>
                    <View style={styles.productTop}>
                      <View style={styles.productNameContainer}>
                        {!!producto.marca && (
                          <Text
                            style={styles.brandLabel}
                            numberOfLines={1}
                          >
                            {producto.marca}
                          </Text>
                        )}

                        <Text
                          style={styles.productName}
                          numberOfLines={2}
                        >
                          {producto.nombre}
                        </Text>

                        {!!detalleVariante && (
                          <View style={styles.variantBadge}>
                            <Ionicons
                              name="pricetag-outline"
                              size={13}
                              color={ROSA_OSCURO}
                            />

                            <Text style={styles.variantText}>
                              {detalleVariante}
                            </Text>
                          </View>
                        )}

                        {producto.usaVariantes && (
                          <Text style={styles.stockDisponibleText}>
                            {stockDisponible} disponible
                            {stockDisponible === 1 ? '' : 's'} de esta
                            variante
                          </Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() =>
                          confirmarEliminar(
                            producto.id,
                            producto.nombre,
                          )
                        }
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Eliminar ${producto.nombre}`}
                      >
                        <Ionicons
                          name="close-outline"
                          size={20}
                          color={SECUNDARIO}
                        />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.unitPrice}>
                      {formatoPrecio(producto.precioVenta)}
                    </Text>

                    <View style={styles.quantityAndSubtotal}>
                      <View style={styles.quantityBox}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() =>
                            disminuirCantidad(producto.id)
                          }
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Disminuir cantidad de ${producto.nombre}`}
                        >
                          <Ionicons
                            name="remove"
                            size={17}
                            color={ROSA}
                          />
                        </TouchableOpacity>

                        <Text style={styles.quantityValue}>
                          {producto.cantidad}
                        </Text>

                        <TouchableOpacity
                          style={[
                            styles.quantityButton,
                            (cantidadMaxima || sinStock) &&
                              styles.disabledButton,
                          ]}
                          onPress={() =>
                            aumentarCantidad(producto.id)
                          }
                          disabled={cantidadMaxima || sinStock}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Aumentar cantidad de ${producto.nombre}`}
                        >
                          <Ionicons
                            name="add"
                            size={17}
                            color={
                              cantidadMaxima || sinStock
                                ? '#C7B6BE'
                                : ROSA
                            }
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.subtotalContainer}>
                        <Text style={styles.subtotalLabel}>
                          Subtotal
                        </Text>

                        <Text style={styles.subtotalValue}>
                          {formatoPrecio(
                            producto.precioVenta * producto.cantidad,
                          )}
                        </Text>
                      </View>
                    </View>

                    {cantidadMaxima && !sinStock ? (
                      <Text style={styles.stockNote}>
                        Alcanzaste el stock disponible
                      </Text>
                    ) : null}

                    {sinStock ? (
                      <Text style={styles.stockErrorNote}>
                        Sin existencias. Elimina este artículo o revisa
                        el catálogo.
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}

            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryIcon}>
                  <Ionicons
                    name="receipt-outline"
                    size={21}
                    color={ROSA}
                  />
                </View>

                <View>
                  <Text style={styles.summaryTitle}>
                    Resumen de compra
                  </Text>
                  <Text style={styles.summarySubtitle}>
                    Detalle de tu selección
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
                  {formatoPrecio(totalCarrito)}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.totalRow}>
                <View style={styles.totalDescription}>
                  <Text style={styles.totalLabel}>
                    Total estimado
                  </Text>
                  <Text style={styles.totalHint}>
                    Cargos adicionales, si aplican, se confirmarán al
                    completar el pedido.
                  </Text>
                </View>

                <Text style={styles.totalValue}>
                  {formatoPrecio(totalCarrito)}
                </Text>
              </View>
            </View>

            <View style={styles.secureNote}>
              <Ionicons name="heart-outline" size={17} color={ROSA} />
              <Text style={styles.secureText}>
                Gracias por elegir Lizma Style.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerTotal}>
              <Text style={styles.footerLabel}>
                Total de tu compra
              </Text>

              <Text style={styles.footerPrice}>
                {formatoPrecio(totalCarrito)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              activeOpacity={0.85}
              onPress={continuarCompra}
            >
              <Text style={styles.continueButtonText}>
                Continuar compra
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FONDO,
  },
  header: {
    minHeight: 76,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F8EAF0',
  },
  headerButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  brand: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    color: ROSA,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: TEXTO,
    marginTop: 3,
  },
  intro: {
    marginHorizontal: 18,
    marginTop: 21,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  introTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: TEXTO,
  },
  introSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: SECUNDARIO,
    marginTop: 4,
  },
  countBadge: {
    minWidth: 47,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: ROSA_CLARO,
    borderWidth: 1,
    borderColor: BORDE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  countText: {
    color: ROSA_OSCURO,
    fontSize: 14,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 205,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXTO,
  },
  sectionCaption: {
    fontSize: 12,
    color: SECUNDARIO,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3E4EB',
    padding: 11,
    marginBottom: 13,
    flexDirection: 'row',
    shadowColor: '#8E3158',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.055,
    shadowRadius: 9,
    elevation: 2,
  },
  imageFrame: {
    width: 112,
    height: 137,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: ROSA_CLARO,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    fontSize: 9,
    fontWeight: '700',
    color: ROSA_OSCURO,
    marginTop: 5,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 12,
    paddingTop: 2,
    justifyContent: 'space-between',
  },
  productTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  productNameContainer: {
    flex: 1,
    minWidth: 0,
  },
  brandLabel: {
    fontSize: 10,
    color: ROSA,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    color: TEXTO,
  },
  variantBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    backgroundColor: ROSA_CLARO,
    borderWidth: 1,
    borderColor: BORDE,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginTop: 7,
    maxWidth: '100%',
  },
  variantText: {
    flexShrink: 1,
    color: ROSA_OSCURO,
    fontSize: 10,
    fontWeight: '700',
  },
  stockDisponibleText: {
    color: SECUNDARIO,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 5,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#FFF7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  unitPrice: {
    color: ROSA,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 7,
  },
  quantityAndSubtotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 9,
    gap: 4,
  },
  quantityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7FA',
    borderWidth: 1,
    borderColor: BORDE,
    borderRadius: 11,
    minHeight: 32,
  },
  quantityButton: {
    width: 29,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.55,
  },
  quantityValue: {
    minWidth: 23,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: TEXTO,
  },
  subtotalContainer: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  subtotalLabel: {
    fontSize: 10,
    color: SECUNDARIO,
  },
  subtotalValue: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXTO,
    marginTop: 2,
  },
  stockNote: {
    fontSize: 10,
    color: ROSA_OSCURO,
    marginTop: 5,
  },
  stockErrorNote: {
    fontSize: 10,
    color: '#B83250',
    lineHeight: 14,
    marginTop: 5,
  },
  summaryCard: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDE,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 19,
  },
  summaryIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: ROSA_CLARO,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXTO,
  },
  summarySubtitle: {
    fontSize: 11,
    color: SECUNDARIO,
    marginTop: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
    gap: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: SECUNDARIO,
    flexShrink: 1,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXTO,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: BORDE,
    marginVertical: 5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  totalDescription: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXTO,
  },
  totalHint: {
    maxWidth: 190,
    fontSize: 10,
    lineHeight: 15,
    color: SECUNDARIO,
    marginTop: 5,
  },
  totalValue: {
    fontSize: 19,
    fontWeight: '900',
    color: ROSA,
    flexShrink: 0,
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 19,
    gap: 7,
  },
  secureText: {
    fontSize: 11,
    color: SECUNDARIO,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: BORDE,
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
    shadowColor: '#8E3158',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  footerTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SECUNDARIO,
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: TEXTO,
  },
  continueButton: {
    minHeight: 53,
    borderRadius: 16,
    backgroundColor: ROSA,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: ROSA,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 3,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  emptyCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: ROSA_CLARO,
    borderWidth: 1,
    borderColor: BORDE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  emptyHeart: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: ROSA,
    borderWidth: 3,
    borderColor: FONDO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: TEXTO,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 21,
    color: SECUNDARIO,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 300,
  },
  catalogButton: {
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: 16,
    backgroundColor: ROSA,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 25,
  },
  catalogButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyNote: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#C6A2B2',
    marginTop: 25,
  },
});
