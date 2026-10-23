import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const ROSA = '#D94F87';
const ROSA_OSCURO = '#B9366D';
const ROSA_CLARO = '#FFF0F6';
const ROSA_SUAVE = '#FBE3ED';
const NEGRO = '#292129';
const GRIS = '#817680';
const BLANCO = '#FFFFFF';
const FONDO = '#FFFAFC';
const BORDE = '#F1E3EA';

export default function ClienteHome() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');

  // Conserva la navegación a las categorías.
  const abrirCategoria = (categoria: string) => {
    router.push({
      pathname: '/catalogo-cliente',
      params: { categoria },
    });
  };

  // Conserva la búsqueda de productos.
  const buscarProducto = () => {
    router.push({
      pathname: '/catalogo-cliente',
      params: {
        categoria: 'Ver todo',
        busqueda: busqueda.trim(),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor={BLANCO}
        barStyle="dark-content"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ENCABEZADO */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>¡Hola!</Text>
            <Text style={styles.subtitle}>
              Bienvenida a tu espacio favorito
            </Text>
          </View>

          <TouchableOpacity
            style={styles.brandIcon}
            onPress={() => router.push('/perfil')}
            activeOpacity={0.8}
            accessibilityLabel="Ir a mi perfil"
          >
            <MaterialCommunityIcons
              name="flower-tulip-outline"
              size={28}
              color={ROSA}
            />
          </TouchableOpacity>
        </View>

        {/* IDENTIDAD DE MARCA */}
        <View style={styles.brandRow}>
          <View style={styles.brandLine} />
          <Text style={styles.brandName}>LIZMA STYLE</Text>
          <View style={styles.brandLine} />
        </View>

        {/* BUSCADOR */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={21}
            color={ROSA}
          />

          <TextInput
            style={styles.searchInput}
            placeholder="¿Qué estás buscando?"
            placeholderTextColor="#A99AA3"
            value={busqueda}
            onChangeText={setBusqueda}
            onSubmitEditing={buscarProducto}
            returnKeyType="search"
            autoCapitalize="none"
            accessibilityLabel="Buscar productos"
          />

          {busqueda.length > 0 && (
            <TouchableOpacity
              onPress={() => setBusqueda('')}
              activeOpacity={0.7}
              accessibilityLabel="Borrar búsqueda"
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={GRIS}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* BANNER PRINCIPAL */}
        <View style={styles.banner}>
          <View style={styles.bannerDecoration} />
          <View style={styles.bannerContent}>
            <View style={styles.bannerLabel}>
              <Ionicons
                name="sparkles"
                size={12}
                color={ROSA_OSCURO}
              />
              <Text style={styles.bannerSmall}>
                TU ESTILO, TU ESENCIA
              </Text>
            </View>

            <Text style={styles.bannerTitle}>
              Belleza en cada{'\n'}detalle.
            </Text>

            <Text style={styles.bannerDescription}>
              Encuentra eso que te hace única.
            </Text>

            <TouchableOpacity
              style={styles.bannerButton}
              onPress={() => abrirCategoria('Ver todo')}
              activeOpacity={0.85}
            >
              <Text style={styles.bannerButtonText}>
                Descubrir colección
              </Text>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={BLANCO}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.bannerArtwork}>
            <View style={styles.bannerCircle}>
              <MaterialCommunityIcons
                name="flower-tulip"
                size={73}
                color={BLANCO}
              />
            </View>
            <View style={styles.bannerMiniHeart}>
              <Ionicons
                name="heart"
                size={21}
                color={ROSA}
              />
            </View>
            <View style={styles.bannerSparkle}>
              <Ionicons
                name="sparkles"
                size={24}
                color={BLANCO}
              />
            </View>
          </View>
        </View>

        {/* ACCESO A PEDIDOS */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeadingGroup}>
            <View style={styles.sectionAccent} />
            <View>
              <Text style={styles.sectionTitle}>Tu espacio</Text>
              <Text style={styles.sectionSubtitle}>
                Todo lo que necesitas
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.orderCard}
          onPress={() => router.push('/historial-cliente')}
          activeOpacity={0.85}
        >
          <View style={styles.orderIconContainer}>
            <Ionicons
              name="receipt-outline"
              size={25}
              color={ROSA}
            />
          </View>

          <View style={styles.orderTextContainer}>
            <Text style={styles.orderTitle}>Mis pedidos</Text>
            <Text style={styles.orderDescription}>
              Revisa tus compras y pedidos anteriores
            </Text>
          </View>

          <View style={styles.orderArrow}>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={ROSA}
            />
          </View>
        </TouchableOpacity>

        {/* CATEGORÍAS */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeadingGroup}>
            <View style={styles.sectionAccent} />
            <View>
              <Text style={styles.sectionTitle}>
                Explora nuestras categorías
              </Text>
              <Text style={styles.sectionSubtitle}>
                Encuentra tus favoritos
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => abrirCategoria('Ver todo')}
            activeOpacity={0.8}
          >
            <Text style={styles.seeAll}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.categories}>
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => abrirCategoria('Blusas')}
            activeOpacity={0.8}
          >
            <View style={styles.categoryIcon}>
              <Ionicons
                name="shirt-outline"
                size={27}
                color={ROSA}
              />
            </View>
            <Text style={styles.categoryText}>Blusas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => abrirCategoria('Perfumes')}
            activeOpacity={0.8}
          >
            <View style={styles.categoryIcon}>
              <MaterialCommunityIcons
                name="bottle-tonic-outline"
                size={27}
                color={ROSA}
              />
            </View>
            <Text style={styles.categoryText}>Perfumes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => abrirCategoria('Carteras')}
            activeOpacity={0.8}
          >
            <View style={styles.categoryIcon}>
              <Ionicons
                name="bag-handle-outline"
                size={27}
                color={ROSA}
              />
            </View>
            <Text style={styles.categoryText}>Carteras</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => abrirCategoria('Accesorios')}
            activeOpacity={0.8}
          >
            <View style={styles.categoryIcon}>
              <Ionicons
                name="sparkles-outline"
                size={27}
                color={ROSA}
              />
            </View>
            <Text style={styles.categoryText}>Accesorios</Text>
          </TouchableOpacity>
        </View>

        {/* PRODUCTOS DESTACADOS */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeadingGroup}>
            <View style={styles.sectionAccent} />
            <View>
              <Text style={styles.sectionTitle}>
                Productos destacados
              </Text>
              <Text style={styles.sectionSubtitle}>
                Algo especial para ti
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.emptyProducts}>
          <View style={styles.emptyIconContainer}>
            <Ionicons
              name="bag-handle-outline"
              size={34}
              color={ROSA}
            />
            <View style={styles.emptySparkle}>
              <Ionicons
                name="sparkles"
                size={15}
                color={ROSA_OSCURO}
              />
            </View>
          </View>

          <Text style={styles.emptyTitle}>
            Tu próximo favorito te espera
          </Text>

          <Text style={styles.emptyDescription}>
            Descubre prendas, perfumes y accesorios
            que combinan contigo.
          </Text>

          <TouchableOpacity
            style={styles.catalogButton}
            onPress={() => abrirCategoria('Ver todo')}
            activeOpacity={0.85}
          >
            <Text style={styles.catalogButtonText}>
              Explorar catálogo
            </Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={BLANCO}
            />
          </TouchableOpacity>
        </View>

        {/* MENSAJE DE MARCA */}
        <View style={styles.footerMessage}>
          <Ionicons
            name="heart"
            size={15}
            color={ROSA}
          />
          <Text style={styles.footerMessageText}>
            Hecho para resaltar tu esencia
          </Text>
          <Ionicons
            name="heart"
            size={15}
            color={ROSA}
          />
        </View>
      </ScrollView>

      {/* NAVEGACIÓN INFERIOR */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace('/cliente-home')}
          activeOpacity={0.7}
        >
          <View style={[styles.navIconBox, styles.navActive]}>
            <Ionicons
              name="home"
              size={21}
              color={ROSA}
            />
          </View>
          <Text style={[styles.navText, styles.navTextActive]}>
            Inicio
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => abrirCategoria('Ver todo')}
          activeOpacity={0.7}
        >
          <View style={styles.navIconBox}>
            <Ionicons
              name="grid-outline"
              size={21}
              color={GRIS}
            />
          </View>
          <Text style={styles.navText}>Catálogo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/asistente-ia')}
          activeOpacity={0.7}
        >
          <View style={styles.navIconBox}>
            <MaterialCommunityIcons
              name="robot-outline"
              size={22}
              color={GRIS}
            />
          </View>
          <Text style={styles.navText}>Asistente</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/carrito')}
          activeOpacity={0.7}
        >
          <View style={styles.navIconBox}>
            <Ionicons
              name="cart-outline"
              size={22}
              color={GRIS}
            />
          </View>
          <Text style={styles.navText}>Carrito</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/perfil')}
          activeOpacity={0.7}
        >
          <View style={styles.navIconBox}>
            <Ionicons
              name="person-outline"
              size={21}
              color={GRIS}
            />
          </View>
          <Text style={styles.navText}>Mi perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FONDO,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 22,
  },

  // Encabezado
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  headerText: {
    flex: 1,
  },

  greeting: {
    fontSize: 29,
    fontWeight: '800',
    color: NEGRO,
    letterSpacing: -0.8,
  },

  subtitle: {
    fontSize: 13,
    color: GRIS,
    marginTop: 4,
  },

  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: ROSA_CLARO,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDE,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    gap: 12,
  },

  brandLine: {
    height: 1,
    flex: 1,
    backgroundColor: BORDE,
  },

  brandName: {
    color: ROSA_OSCURO,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
  },

  // Buscador
  searchContainer: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BLANCO,
    borderRadius: 17,
    paddingLeft: 15,
    paddingRight: 7,
    marginBottom: 23,
    gap: 10,
    borderWidth: 1,
    borderColor: BORDE,
    shadowColor: '#9B5675',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    height: '100%',
    color: NEGRO,
    fontSize: 13,
    paddingVertical: 0,
  },

  // Banner
  banner: {
    minHeight: 208,
    backgroundColor: ROSA_SUAVE,
    borderRadius: 23,
    paddingVertical: 20,
    paddingLeft: 19,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 29,
    borderWidth: 1,
    borderColor: '#F5D6E3',
  },

  bannerDecoration: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#F6CDDF',
    right: -62,
    top: -75,
  },

  bannerContent: {
    flex: 1,
    zIndex: 1,
  },

  bannerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },

  bannerSmall: {
    color: ROSA_OSCURO,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },

  bannerTitle: {
    color: NEGRO,
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -0.7,
  },

  bannerDescription: {
    color: '#6D5260',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
    maxWidth: 190,
  },

  bannerButton: {
    backgroundColor: ROSA,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 13,
    marginTop: 15,
  },

  bannerButtonText: {
    color: BLANCO,
    fontWeight: '700',
    fontSize: 11,
  },

  bannerArtwork: {
    width: 95,
    height: 145,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },

  bannerCircle: {
    width: 91,
    height: 91,
    borderRadius: 46,
    backgroundColor: ROSA,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#F8D9E6',
  },

  bannerMiniHeart: {
    position: 'absolute',
    right: 0,
    bottom: 19,
    width: 37,
    height: 37,
    borderRadius: 14,
    backgroundColor: BLANCO,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },

  bannerSparkle: {
    position: 'absolute',
    top: 4,
    right: 8,
  },

  // Encabezados de sección
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  sectionHeadingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },

  sectionAccent: {
    width: 4,
    height: 35,
    borderRadius: 4,
    backgroundColor: ROSA,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: NEGRO,
    letterSpacing: -0.25,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: GRIS,
    marginTop: 3,
  },

  seeAll: {
    color: ROSA_OSCURO,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 8,
    paddingLeft: 8,
  },

  // Tarjeta de pedidos
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BLANCO,
    borderRadius: 18,
    padding: 14,
    marginBottom: 29,
    borderWidth: 1,
    borderColor: BORDE,
    shadowColor: '#8C4B69',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  orderIconContainer: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: ROSA_CLARO,
    alignItems: 'center',
    justifyContent: 'center',
  },

  orderTextContainer: {
    flex: 1,
    marginLeft: 13,
  },

  orderTitle: {
    color: NEGRO,
    fontSize: 14,
    fontWeight: '800',
  },

  orderDescription: {
    color: GRIS,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  orderArrow: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: ROSA_CLARO,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Categorías
  categories: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 29,
  },

  categoryCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 104,
    borderRadius: 17,
    backgroundColor: BLANCO,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: BORDE,
    shadowColor: '#8C4B69',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 1,
  },

  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: ROSA_CLARO,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  categoryText: {
    color: NEGRO,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Productos destacados
  emptyProducts: {
    alignItems: 'center',
    backgroundColor: BLANCO,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 25,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: BORDE,
  },

  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 25,
    backgroundColor: ROSA_CLARO,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  emptySparkle: {
    position: 'absolute',
    top: 7,
    right: 7,
  },

  emptyTitle: {
    color: NEGRO,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptyDescription: {
    color: GRIS,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 265,
  },

  catalogButton: {
    backgroundColor: ROSA,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 14,
    paddingHorizontal: 19,
    paddingVertical: 12,
    marginTop: 18,
  },

  catalogButtonText: {
    color: BLANCO,
    fontSize: 12,
    fontWeight: '800',
  },

  // Firma de la marca
  footerMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingTop: 2,
    paddingBottom: 9,
  },

  footerMessageText: {
    color: GRIS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Barra inferior
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: BLANCO,
    borderTopWidth: 1,
    borderTopColor: BORDE,
    paddingTop: 8,
    paddingBottom: 5,
    minHeight: 68,
    shadowColor: '#6E3C55',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 8,
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  navIconBox: {
    width: 42,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navActive: {
    backgroundColor: ROSA_CLARO,
  },

  navText: {
    color: GRIS,
    fontSize: 9,
    fontWeight: '600',
  },

  navTextActive: {
    color: ROSA_OSCURO,
    fontWeight: '800',
  },
});