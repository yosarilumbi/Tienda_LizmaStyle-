import { MaterialCommunityIcons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { db } from '@/database/firebaseConfig';
import { supabase } from '@/database/supabase';

interface VarianteProducto {
  talla: string;
  color: string;
  stock: number;
}

interface Producto {
  id: string;
  nombre: string;
  codigo: string;
  categoria: string;
  marca: string;
  precioCompra: number;
  porcentajeGanancia: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  fechaRegistro?: any;
  imagenUrl?: string;
  variantes?: VarianteProducto[];
}

const CATEGORIAS_PREDEFINIDAS = [
  'Camisetas',
  'Pantalones',
  'Vestidos',
  'Faldas',
  'Blusas',
  'Carteras',
  'Perfumes',
  'Accesorios',
  'Zapatos',
  'Otros',
];

const CATEGORIAS_CON_TALLA = [
  'camisetas',
  'pantalones',
  'vestidos',
  'faldas',
  'blusas',
  'zapatos',
];

const normalizarCategoria = (valor: string) =>
  valor.trim().toLocaleLowerCase('es');

export default function Productos() {
  const router = useRouter();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>(
    CATEGORIAS_PREDEFINIDAS
  );

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [categoriaModalVisible, setCategoriaModalVisible] =
    useState(false);

  const [productoCategoriaEditando, setProductoCategoriaEditando] =
    useState<Producto | null>(null);

  const [cambiandoCategoria, setCambiandoCategoria] =
    useState(false);

  const [modalClasificarVisible, setModalClasificarVisible] =
    useState(false);

  const [productoEditando, setProductoEditando] =
    useState<Producto | null>(null);

  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [marca, setMarca] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [porcentajeGanancia, setPorcentajeGanancia] =
    useState('');
  const [stock, setStock] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');

  const [variantes, setVariantes] = useState<VarianteProducto[]>([]);

  const [fotoUri, setFotoUri] = useState('');
  const [fotoBase64, setFotoBase64] = useState('');

  const [nuevaCategoria, setNuevaCategoria] = useState('');

  // CONFIGURACIÓN DE VARIANTES

  const categoriaNormalizada = normalizarCategoria(categoria);
  const esCartera = categoriaNormalizada === 'carteras';

  const permiteTalla = CATEGORIAS_CON_TALLA.includes(
    categoriaNormalizada
  );

  const permiteColor = esCartera || permiteTalla;

  const agregarVariante = () => {
    if (!permiteColor) return;

    setVariantes((actuales) => [
      ...actuales,
      { talla: '', color: '', stock: 0 },
    ]);
  };

  const actualizarVariante = (
    indice: number,
    campo: keyof VarianteProducto,
    valor: string
  ) => {
    setVariantes((actuales) =>
      actuales.map((variante, i) => {
        if (i !== indice) return variante;

        if (campo === 'stock') {
          const cantidad =
            valor.trim() === ''
              ? 0
              : Math.max(0, Math.floor(Number(valor) || 0));

          return { ...variante, stock: cantidad };
        }

        return { ...variante, [campo]: valor };
      })
    );
  };

  const eliminarVariante = (indice: number) => {
    setVariantes((actuales) =>
      actuales.filter((_, i) => i !== indice)
    );
  };

  const obtenerVariantesNormalizadas = (
    variantesGuardadas: any
  ): VarianteProducto[] => {
    if (!Array.isArray(variantesGuardadas)) return [];

    return variantesGuardadas.map((variante: any) => ({
      talla: String(variante?.talla ?? ''),
      color: String(variante?.color ?? ''),
      stock: Math.max(
        0,
        Math.floor(Number(variante?.stock) || 0)
      ),
    }));
  };

  // CARGAR PRODUCTOS

  const cargarProductos = async () => {
    try {
      setLoading(true);

      const q = query(
        collection(db, 'productos'),
        orderBy('fechaRegistro', 'desc')
      );

      const snapshot = await getDocs(q);

      const lista: Producto[] = snapshot.docs.map((item) => {
        const data = item.data();

        return {
          id: item.id,
          nombre: data.nombre || '',
          codigo: data.codigo || '',
          categoria: data.categoria || '',
          marca: data.marca || '',
          precioCompra: Number(data.precioCompra || 0),
          porcentajeGanancia: Number(
            data.porcentajeGanancia || 0
          ),
          precioVenta: Number(data.precioVenta || 0),
          stock: Number(data.stock || 0),
          stockMinimo: Number(data.stockMinimo || 0),
          fechaRegistro: data.fechaRegistro,
          imagenUrl: data.imagenUrl || '',
          variantes: obtenerVariantesNormalizadas(data.variantes),
        };
      });

      setProductos(lista);

      const categoriasFirestore = lista
        .map((producto) => producto.categoria.trim())
        .filter((item) => item.length > 0);

      const categoriasUnicas = Array.from(
        new Set([
          ...CATEGORIAS_PREDEFINIDAS,
          ...categoriasFirestore,
        ].map((item) => item.trim()))
      );

      setCategorias(categoriasUnicas);
    } catch (error) {
      console.log('ERROR CARGANDO PRODUCTOS:', error);

      Alert.alert(
        'Error',
        'No se pudieron cargar los productos.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  // LIMPIAR FORMULARIO

  const limpiarFormulario = () => {
    setNombre('');
    setCodigo('');
    setCategoria('');
    setMarca('');
    setPrecioCompra('');
    setPorcentajeGanancia('');
    setStock('');
    setStockMinimo('');
    setVariantes([]);
    setFotoUri('');
    setFotoBase64('');
    setNuevaCategoria('');
    setProductoEditando(null);
  };

  // NUEVO PRODUCTO

  const abrirNuevoProducto = () => {
    limpiarFormulario();
    setModalVisible(true);
  };

  // EDITAR PRODUCTO

  const abrirEditarProducto = (producto: Producto) => {
    setProductoEditando(producto);

    setNombre(producto.nombre);
    setCodigo(producto.codigo);
    setCategoria(producto.categoria);
    setMarca(producto.marca);
    setPrecioCompra(String(producto.precioCompra));
    setPorcentajeGanancia(String(producto.porcentajeGanancia));
    setStock(String(producto.stock));
    setStockMinimo(String(producto.stockMinimo));

    setVariantes(
      obtenerVariantesNormalizadas(producto.variantes)
    );

    setFotoUri(producto.imagenUrl || '');
    setFotoBase64('');

    setModalVisible(true);
  };

  // CERRAR MODAL

  const cerrarModal = () => {
    if (guardando) return;

    setModalVisible(false);
    limpiarFormulario();
  };

  // SELECCIONAR FOTO

  const seleccionarFoto = async () => {
    try {
      const permiso =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permiso.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitas permitir el acceso a las imágenes.'
        );
        return;
      }

      const resultado =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
        });

      if (resultado.canceled) return;

      const asset = resultado.assets[0];

      if (!asset) return;

      setFotoUri(asset.uri);
      setFotoBase64(asset.base64 || '');
    } catch (error) {
      console.log('ERROR SELECCIONANDO FOTO:', error);

      Alert.alert(
        'Error',
        'No se pudo seleccionar la imagen.'
      );
    }
  };

  // SELECCIONAR CATEGORÍA

  const seleccionarCategoria = (
    categoriaSeleccionada: string
  ) => {
    const categoriaAnterior = normalizarCategoria(categoria);
    const categoriaNueva = normalizarCategoria(
      categoriaSeleccionada
    );

    setCategoria(categoriaSeleccionada);
    setCategoriaModalVisible(false);

    const nuevaPermiteVariantes =
      categoriaNueva === 'carteras' ||
      CATEGORIAS_CON_TALLA.includes(categoriaNueva);

    if (!nuevaPermiteVariantes) {
      setVariantes([]);
      return;
    }

    const anteriorEraCartera = categoriaAnterior === 'carteras';
    const nuevaEsCartera = categoriaNueva === 'carteras';

    if (
      categoriaAnterior !== categoriaNueva &&
      anteriorEraCartera !== nuevaEsCartera
    ) {
      setVariantes([]);
    }
  };

  // AGREGAR NUEVA CATEGORÍA

  const agregarNuevaCategoria = () => {
    const categoriaNueva = nuevaCategoria.trim();

    if (!categoriaNueva) {
      Alert.alert(
        'Campo requerido',
        'Escribe el nombre de la nueva categoría.'
      );
      return;
    }

    const categoriaExistente = categorias.some(
      (item) =>
        item.toLowerCase() === categoriaNueva.toLowerCase()
    );

    if (categoriaExistente) {
      Alert.alert(
        'Categoría existente',
        'Esa categoría ya está registrada.'
      );
      return;
    }

    setCategorias((prev) => [...prev, categoriaNueva]);
    setCategoria(categoriaNueva);
    setVariantes([]);
    setNuevaCategoria('');
    setCategoriaModalVisible(false);
  };

  // CLASIFICAR PRODUCTO

  const abrirClasificarProducto = (producto: Producto) => {
    setProductoCategoriaEditando(producto);
    setModalClasificarVisible(true);
  };

  // CAMBIAR CATEGORÍA

  const cambiarCategoriaProducto = async (
    nuevaCategoriaSeleccionada: string
  ) => {
    if (!productoCategoriaEditando || cambiandoCategoria) {
      return;
    }

    try {
      setCambiandoCategoria(true);

      const productoRef = doc(
        db,
        'productos',
        productoCategoriaEditando.id
      );

      const categoriaNueva = nuevaCategoriaSeleccionada.trim();
      const categoriaNormalizadaNueva =
        normalizarCategoria(categoriaNueva);

      const nuevaPermiteVariantes =
        categoriaNormalizadaNueva === 'carteras' ||
        CATEGORIAS_CON_TALLA.includes(
          categoriaNormalizadaNueva
        );

      const esNuevaCartera =
        categoriaNormalizadaNueva === 'carteras';

      let variantesActualizadas =
        obtenerVariantesNormalizadas(
          productoCategoriaEditando.variantes
        );

      if (!nuevaPermiteVariantes) {
        variantesActualizadas = [];
      } else if (esNuevaCartera) {
        variantesActualizadas = variantesActualizadas.map(
          (variante) => ({
            talla: '',
            color: variante.color,
            stock: variante.stock,
          })
        );
      }

      const stockActualizado =
        variantesActualizadas.length > 0
          ? variantesActualizadas.reduce(
              (total, variante) => total + variante.stock,
              0
            )
          : productoCategoriaEditando.stock;

      await updateDoc(productoRef, {
        categoria: categoriaNueva,
        variantes: variantesActualizadas,
        stock: stockActualizado,
      });

      setProductos((prev) =>
        prev.map((producto) =>
          producto.id === productoCategoriaEditando.id
            ? {
                ...producto,
                categoria: categoriaNueva,
                variantes: variantesActualizadas,
                stock: stockActualizado,
              }
            : producto
        )
      );

      setModalClasificarVisible(false);
      setProductoCategoriaEditando(null);

      Alert.alert(
        'Categoría actualizada',
        `"${productoCategoriaEditando.nombre}" ahora pertenece a "${categoriaNueva}".`
      );
    } catch (error) {
      console.log('ERROR CAMBIANDO CATEGORÍA:', error);

      Alert.alert(
        'Error',
        'No se pudo actualizar la categoría del producto.'
      );
    } finally {
      setCambiandoCategoria(false);
    }
  };

  const cerrarClasificador = () => {
    if (cambiandoCategoria) return;

    setModalClasificarVisible(false);
    setProductoCategoriaEditando(null);
  };

  // SUBIR FOTO A SUPABASE

  const subirFotoASupabase = async (
    productoId: string
  ): Promise<string> => {
    if (!fotoBase64) return '';

    try {
      const ruta = `${productoId}_${Date.now()}.jpg`;
      const imagenBytes = decode(fotoBase64);

      const resultadoUpload = await supabase.storage
        .from('productos')
        .upload(ruta, imagenBytes, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (resultadoUpload.error) {
        throw new Error(
          resultadoUpload.error.message ||
            'Error al subir la imagen.'
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from('productos')
        .getPublicUrl(ruta);

      const imagenUrl = publicUrlData.publicUrl;

      if (!imagenUrl) {
        throw new Error(
          'No se pudo obtener la URL de la imagen.'
        );
      }

      return imagenUrl;
    } catch (error: any) {
      console.log('ERROR SUBIENDO FOTO:', error);

      throw new Error(
        error?.message || 'No se pudo subir la foto.'
      );
    }
  };

  // GUARDAR PRODUCTO

  const guardarProducto = async () => {
    if (guardando) return;

    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el nombre del producto.');
      return;
    }

    if (!codigo.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el código del producto.');
      return;
    }

    if (!categoria.trim()) {
      Alert.alert('Campo requerido', 'Selecciona una categoría.');
      return;
    }

    if (!marca.trim()) {
      Alert.alert('Campo requerido', 'Ingresa la marca.');
      return;
    }

    if (!precioCompra.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el precio de compra.');
      return;
    }

    if (!porcentajeGanancia.trim()) {
      Alert.alert(
        'Campo requerido',
        'Ingresa el porcentaje de ganancia.'
      );
      return;
    }

    if (!stockMinimo.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el stock mínimo.');
      return;
    }

    if (!productoEditando && !fotoBase64) {
      Alert.alert(
        'Foto requerida',
        'Debes seleccionar una foto del producto.'
      );
      return;
    }

    const compra = Number(precioCompra);
    const ganancia = Number(porcentajeGanancia);
    const stockMinimoNumero = Number(stockMinimo);

    if (
      !Number.isFinite(compra) ||
      !Number.isFinite(ganancia) ||
      !Number.isFinite(stockMinimoNumero)
    ) {
      Alert.alert(
        'Datos inválidos',
        'Verifica los valores numéricos.'
      );
      return;
    }

    if (compra < 0) {
      Alert.alert(
        'Precio inválido',
        'El precio de compra no puede ser negativo.'
      );
      return;
    }

    if (ganancia < 0) {
      Alert.alert(
        'Ganancia inválida',
        'El porcentaje de ganancia no puede ser negativo.'
      );
      return;
    }

    if (stockMinimoNumero < 0) {
      Alert.alert(
        'Stock inválido',
        'El stock mínimo no puede ser negativo.'
      );
      return;
    }

    const categoriaActual = normalizarCategoria(categoria);
    const categoriaEsCartera = categoriaActual === 'carteras';

    const categoriaTieneVariantes =
      categoriaEsCartera ||
      CATEGORIAS_CON_TALLA.includes(categoriaActual);

    const variantesFinales: VarianteProducto[] =
      categoriaTieneVariantes
        ? variantes
            .filter((v) => v.talla.trim() || v.color.trim())
            .map((v) => ({
              talla: categoriaEsCartera ? '' : v.talla.trim(),
              color: v.color.trim(),
              stock: Math.max(
                0,
                Math.floor(Number(v.stock) || 0)
              ),
            }))
        : [];

    if (
      categoriaEsCartera &&
      variantesFinales.some((v) => !v.color)
    ) {
      Alert.alert(
        'Color requerido',
        'Indica el color de cada variante de la cartera.'
      );
      return;
    }

    if (
      !categoriaEsCartera &&
      CATEGORIAS_CON_TALLA.includes(categoriaActual) &&
      variantesFinales.some((v) => !v.talla || !v.color)
    ) {
      Alert.alert(
        'Variante incompleta',
        'Completa la talla y el color de cada variante registrada.'
      );
      return;
    }

    const combinaciones = variantesFinales.map((v) =>
      categoriaEsCartera
        ? v.color.trim().toLocaleLowerCase('es')
        : `${v.talla.trim().toLocaleLowerCase('es')}|${v.color
            .trim()
            .toLocaleLowerCase('es')}`
    );

    if (
      new Set(combinaciones).size !== combinaciones.length
    ) {
      Alert.alert(
        'Variante duplicada',
        categoriaEsCartera
          ? 'No puedes registrar dos variantes del mismo color.'
          : 'No puedes registrar dos variantes con la misma talla y color.'
      );
      return;
    }

    const hayVariantes = variantesFinales.length > 0;

    if (!hayVariantes && !stock.trim()) {
      Alert.alert(
        'Campo requerido',
        'Ingresa el stock del producto.'
      );
      return;
    }

    const stockIntroducido =
      stock.trim() === '' ? 0 : Number(stock);

    if (
      !hayVariantes &&
      (!Number.isFinite(stockIntroducido) ||
        stockIntroducido < 0)
    ) {
      Alert.alert(
        'Stock inválido',
        'El stock debe ser un número igual o mayor que cero.'
      );
      return;
    }

    const stockVariantes = variantesFinales.reduce(
      (total, variante) => total + variante.stock,
      0
    );

    const stockFinal = hayVariantes
      ? stockVariantes
      : Math.floor(stockIntroducido);

    const precioVenta =
      compra + (compra * ganancia) / 100;

    try {
      setGuardando(true);

      if (productoEditando) {
        const productoRef = doc(
          db,
          'productos',
          productoEditando.id
        );

        const productoData = {
          nombre: nombre.trim(),
          codigo: codigo.trim(),
          categoria: categoria.trim(),
          marca: marca.trim(),
          precioCompra: compra,
          porcentajeGanancia: ganancia,
          precioVenta,
          stock: stockFinal,
          stockMinimo: stockMinimoNumero,
          variantes: variantesFinales,
        };

        await updateDoc(productoRef, productoData);

        if (fotoBase64) {
          const imagenUrl = await subirFotoASupabase(
            productoEditando.id
          );

          if (imagenUrl) {
            await updateDoc(productoRef, { imagenUrl });
          }
        }

        Alert.alert(
          'Éxito',
          'Producto actualizado correctamente.'
        );
      } else {
        const productoData = {
          nombre: nombre.trim(),
          codigo: codigo.trim(),
          categoria: categoria.trim(),
          marca: marca.trim(),
          precioCompra: compra,
          porcentajeGanancia: ganancia,
          precioVenta,
          stock: stockFinal,
          stockMinimo: stockMinimoNumero,
          variantes: variantesFinales,
          fechaRegistro: Timestamp.now(),
          imagenUrl: '',
        };

        const documento = await addDoc(
          collection(db, 'productos'),
          productoData
        );

        const imagenUrl = await subirFotoASupabase(
          documento.id
        );

        if (imagenUrl) {
          await updateDoc(
            doc(db, 'productos', documento.id),
            { imagenUrl }
          );
        }

        Alert.alert(
          'Éxito',
          'Producto guardado correctamente.'
        );
      }

      setModalVisible(false);
      limpiarFormulario();

      await cargarProductos();
    } catch (error: any) {
      console.log('ERROR GUARDANDO PRODUCTO:', error);

      Alert.alert(
        'Error',
        error?.message || 'No se pudo guardar el producto.'
      );
    } finally {
      setGuardando(false);
    }
  };

  // ELIMINAR FOTO DE SUPABASE

  const eliminarFotoDeSupabase = async (
    imagenUrl: string
  ) => {
    try {
      const partes = imagenUrl.split('/');
      const nombreArchivo = partes[partes.length - 1];

      if (!nombreArchivo) return;

      const { error } = await supabase.storage
        .from('productos')
        .remove([nombreArchivo]);

      if (error) {
        console.log('ERROR ELIMINANDO FOTO:', error);
      }
    } catch (error) {
      console.log('ERROR ELIMINANDO FOTO:', error);
    }
  };

  // ELIMINAR PRODUCTO

  const eliminarProducto = (producto: Producto) => {
    Alert.alert(
      'Eliminar producto',
      `¿Estás seguro de eliminar "${producto.nombre}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              if (producto.imagenUrl) {
                await eliminarFotoDeSupabase(
                  producto.imagenUrl
                );
              }

              await deleteDoc(
                doc(db, 'productos', producto.id)
              );

              Alert.alert(
                'Éxito',
                'Producto eliminado correctamente.'
              );

              await cargarProductos();
            } catch (error) {
              console.log(
                'ERROR ELIMINANDO PRODUCTO:',
                error
              );

              Alert.alert(
                'Error',
                'No se pudo eliminar el producto.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // INTERFAZ

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FCE7F0"
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color="#8E3158"
          />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Inventario</Text>
          <Text style={styles.headerSubtitle}>
            Lizma Style · Catálogo
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addHeaderButton}
          onPress={abrirNuevoProducto}
        >
          <MaterialCommunityIcons
            name="plus"
            size={26}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D63384" />
          <Text style={styles.loadingText}>
            Cargando productos...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.productosContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeEyebrow}>
                LIZMA STYLE
              </Text>
              <Text style={styles.welcomeTitle}>
                Tu inventario,
              </Text>
              <Text style={styles.welcomeTitleAccent}>
                siempre en orden.
              </Text>
              <Text style={styles.welcomeDescription}>
                Administra tus productos, precios y existencias.
              </Text>
            </View>

            <View style={styles.welcomeIcon}>
              <MaterialCommunityIcons
                name="shopping-outline"
                size={38}
                color="#B83270"
              />
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Catálogo</Text>
              <Text style={styles.sectionSubtitle}>
                Tus productos registrados
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {productos.length}
              </Text>
            </View>
          </View>

          {productos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons
                  name="package-variant"
                  size={45}
                  color="#D63384"
                />
              </View>

              <Text style={styles.emptyTitle}>
                No hay productos
              </Text>

              <Text style={styles.emptyText}>
                Agrega tu primer producto para comenzar a organizar
                tu inventario.
              </Text>

              <TouchableOpacity
                style={styles.addButton}
                onPress={abrirNuevoProducto}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={21}
                  color="#FFFFFF"
                />

                <Text style={styles.addButtonText}>
                  Agregar producto
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            productos.map((producto) => {
              const stockBajo =
                producto.stock <= producto.stockMinimo;

              return (
                <View
                  key={producto.id}
                  style={styles.productCard}
                >
                  <View style={styles.productCardTop}>
                    <View style={styles.imageContainer}>
                      {producto.imagenUrl ? (
                        <Image
                          source={{ uri: producto.imagenUrl }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name="image-outline"
                          size={40}
                          color="#D4A1B8"
                        />
                      )}
                    </View>

                    <View style={styles.productInfo}>
                      <Text
                        style={styles.productName}
                        numberOfLines={2}
                      >
                        {producto.nombre}
                      </Text>

                      <Text style={styles.productCode}>
                        Código: {producto.codigo}
                      </Text>

                      <TouchableOpacity
                        style={styles.categoryChangeButton}
                        onPress={() =>
                          abrirClasificarProducto(producto)
                        }
                      >
                        <MaterialCommunityIcons
                          name="tag-outline"
                          size={14}
                          color="#C02670"
                        />

                        <Text
                          style={styles.productCategory}
                          numberOfLines={1}
                        >
                          {producto.categoria || 'Sin categoría'}
                        </Text>

                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={14}
                          color="#C02670"
                        />
                      </TouchableOpacity>

                      <Text
                        style={styles.productBrand}
                        numberOfLines={1}
                      >
                        {producto.marca}
                      </Text>
                    </View>

                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() =>
                          abrirEditarProducto(producto)
                        }
                      >
                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={20}
                          color="#8E3158"
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() =>
                          eliminarProducto(producto)
                        }
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={20}
                          color="#C02670"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.productDivider} />

                  <View style={styles.productMetrics}>
                    <View style={styles.priceMetric}>
                      <Text style={styles.metricLabel}>
                        Precio de venta
                      </Text>

                      <Text style={styles.price}>
                        C$ {producto.precioVenta.toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.stockMetric}>
                      <Text style={styles.metricLabel}>
                        Existencias
                      </Text>

                      <View
                        style={[
                          styles.stockBadge,
                          stockBajo
                            ? styles.stockBadgeLow
                            : styles.stockBadgeOk,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={
                            stockBajo
                              ? 'alert-circle-outline'
                              : 'check-circle-outline'
                          }
                          size={15}
                          color={stockBajo ? '#B45309' : '#18794E'}
                        />

                        <Text
                          style={[
                            styles.stock,
                            stockBajo
                              ? styles.stockLow
                              : styles.stockNormal,
                          ]}
                        >
                          {producto.stock} unidades
                        </Text>
                      </View>
                    </View>
                  </View>

                  {stockBajo && (
                    <View style={styles.lowStockNotice}>
                      <MaterialCommunityIcons
                        name="alert-outline"
                        size={16}
                        color="#B45309"
                      />

                      <Text style={styles.lowStockNoticeText}>
                        Existencias en el mínimo o por debajo
                      </Text>
                    </View>
                  )}

                  {producto.variantes &&
                    producto.variantes.length > 0 && (
                      <View style={styles.variantSummaryContainer}>
                        <MaterialCommunityIcons
                          name="palette-outline"
                          size={15}
                          color="#A34C76"
                        />

                        <Text style={styles.variantSummary}>
                          {producto.variantes.length}{' '}
                          {normalizarCategoria(producto.categoria) ===
                          'carteras'
                            ? 'color(es) registrados'
                            : 'variantes registradas'}
                        </Text>
                      </View>
                    )}
                </View>
              );
            })
          )}

          <Text style={styles.footerText}>
            LIZMA STYLE · GESTIÓN DE INVENTARIO
          </Text>
        </ScrollView>
      )}

      {/* MODAL NUEVO / EDITAR PRODUCTO */}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={cerrarModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {productoEditando
                  ? 'Editar producto'
                  : 'Nuevo producto'}
              </Text>

              <TouchableOpacity
                onPress={cerrarModal}
                disabled={guardando}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={25}
                  color="#8E3158"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formContainer}
            >
              <View style={styles.photoSection}>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={seleccionarFoto}
                  disabled={guardando}
                >
                  {fotoUri ? (
                    <Image
                      source={{ uri: fotoUri }}
                      style={styles.previewImage}
                    />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="camera-plus-outline"
                        size={42}
                        color="#D63384"
                      />

                      <Text style={styles.photoText}>
                        Seleccionar foto
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {fotoUri && (
                  <TouchableOpacity
                    style={styles.changePhotoButton}
                    onPress={seleccionarFoto}
                    disabled={guardando}
                  >
                    <MaterialCommunityIcons
                      name="camera"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text style={styles.changePhotoText}>
                      Cambiar foto
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.label}>
                Nombre del producto *
              </Text>

              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej. Camisa manga corta"
                placeholderTextColor="#A89AA1"
                editable={!guardando}
              />

              <Text style={styles.label}>Código *</Text>

              <TextInput
                style={styles.input}
                value={codigo}
                onChangeText={setCodigo}
                placeholder="Ej. CAM-001"
                placeholderTextColor="#A89AA1"
                editable={!guardando}
              />

              <Text style={styles.label}>Categoría *</Text>

              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setCategoriaModalVisible(true)}
                disabled={guardando}
              >
                <Text
                  style={[
                    styles.categorySelectorText,
                    !categoria && styles.placeholderText,
                  ]}
                >
                  {categoria || 'Seleccionar categoría'}
                </Text>

                <MaterialCommunityIcons
                  name="chevron-down"
                  size={23}
                  color="#8E3158"
                />
              </TouchableOpacity>

              <Text style={styles.label}>Marca *</Text>

              <TextInput
                style={styles.input}
                value={marca}
                onChangeText={setMarca}
                placeholder="Ej. Zara"
                placeholderTextColor="#A89AA1"
                editable={!guardando}
              />

              {permiteColor && (
                <View style={styles.variantesSection}>
                  <Text style={styles.variantesTitle}>
                    {esCartera
                      ? 'Colores disponibles'
                      : 'Tallas, colores y existencias'}
                  </Text>

                  <Text style={styles.variantesDescription}>
                    {esCartera
                      ? 'Registra cada color disponible y la cantidad de carteras que tienes en ese color. El stock general se calculará automáticamente.'
                      : 'Registra cada combinación de talla y color con su cantidad. El stock general será la suma de las cantidades registradas.'}
                  </Text>

                  {variantes.map((variante, indice) => (
                    <View
                      key={`variante-${indice}`}
                      style={styles.varianteCard}
                    >
                      <Text style={styles.varianteLabel}>
                        {esCartera
                          ? `Color ${indice + 1}`
                          : `Variante ${indice + 1}`}
                      </Text>

                      {!esCartera && (
                        <>
                          <Text style={styles.label}>Talla *</Text>

                          <TextInput
                            style={styles.input}
                            value={variante.talla}
                            onChangeText={(valor) =>
                              actualizarVariante(
                                indice,
                                'talla',
                                valor
                              )
                            }
                            placeholder="Ej. S, M, L, XL o Única"
                            placeholderTextColor="#A89AA1"
                            editable={!guardando}
                          />
                        </>
                      )}

                      <Text style={styles.label}>Color *</Text>

                      <TextInput
                        style={styles.input}
                        value={variante.color}
                        onChangeText={(valor) =>
                          actualizarVariante(
                            indice,
                            'color',
                            valor
                          )
                        }
                        placeholder="Ej. Negro, blanco, rosado"
                        placeholderTextColor="#A89AA1"
                        editable={!guardando}
                      />

                      <Text style={styles.label}>
                        Cantidad disponible *
                      </Text>

                      <TextInput
                        style={styles.input}
                        value={String(variante.stock)}
                        onChangeText={(valor) =>
                          actualizarVariante(
                            indice,
                            'stock',
                            valor
                          )
                        }
                        placeholder="0"
                        placeholderTextColor="#A89AA1"
                        keyboardType="numeric"
                        editable={!guardando}
                      />

                      <TouchableOpacity
                        style={styles.removeVariantButton}
                        onPress={() => eliminarVariante(indice)}
                        disabled={guardando}
                      >
                        <MaterialCommunityIcons
                          name="delete-outline"
                          size={18}
                          color="#B9366D"
                        />

                        <Text style={styles.removeVariantText}>
                          Eliminar {esCartera ? 'color' : 'variante'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.addVariantButton}
                    onPress={agregarVariante}
                    disabled={guardando}
                  >
                    <MaterialCommunityIcons
                      name="plus-circle-outline"
                      size={21}
                      color="#B9366D"
                    />

                    <Text style={styles.addVariantText}>
                      {esCartera
                        ? 'Agregar color'
                        : 'Agregar talla y color'}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.stockTotalText}>
                    Stock total:{' '}
                    {variantes.reduce(
                      (total, variante) =>
                        total +
                        Math.max(
                          0,
                          Math.floor(Number(variante.stock) || 0)
                        ),
                      0
                    )}
                  </Text>
                </View>
              )}

              <Text style={styles.label}>
                Precio de compra *
              </Text>

              <TextInput
                style={styles.input}
                value={precioCompra}
                onChangeText={setPrecioCompra}
                placeholder="0.00"
                placeholderTextColor="#A89AA1"
                keyboardType="decimal-pad"
                editable={!guardando}
              />

              <Text style={styles.label}>
                Porcentaje de ganancia *
              </Text>

              <TextInput
                style={styles.input}
                value={porcentajeGanancia}
                onChangeText={setPorcentajeGanancia}
                placeholder="Ej. 30"
                placeholderTextColor="#A89AA1"
                keyboardType="decimal-pad"
                editable={!guardando}
              />

              {precioCompra.trim() !== '' &&
                porcentajeGanancia.trim() !== '' &&
                Number.isFinite(Number(precioCompra)) &&
                Number.isFinite(Number(porcentajeGanancia)) && (
                  <View style={styles.calculatedBox}>
                    <Text style={styles.calculatedLabel}>
                      Precio de venta:
                    </Text>

                    <Text style={styles.calculatedValue}>
                      C${' '}
                      {(
                        Number(precioCompra) +
                        (Number(precioCompra) *
                          Number(porcentajeGanancia)) /
                          100
                      ).toFixed(2)}
                    </Text>
                  </View>
                )}

              <Text style={styles.label}>
                Stock general {!variantes.length ? '*' : ''}
              </Text>

              <Text style={styles.stockDescription}>
                {variantes.length > 0 && permiteColor
                  ? 'Se calcula automáticamente sumando las cantidades de las variantes.'
                  : 'Ingresa la cantidad total disponible del producto.'}
              </Text>

              <TextInput
                style={[
                  styles.input,
                  variantes.length > 0 &&
                    permiteColor &&
                    styles.inputDisabled,
                ]}
                value={
                  variantes.length > 0 && permiteColor
                    ? String(
                        variantes.reduce(
                          (total, variante) =>
                            total +
                            Math.max(
                              0,
                              Math.floor(
                                Number(variante.stock) || 0
                              )
                            ),
                          0
                        )
                      )
                    : stock
                }
                onChangeText={setStock}
                placeholder="0"
                placeholderTextColor="#A89AA1"
                keyboardType="numeric"
                editable={
                  !guardando &&
                  !(variantes.length > 0 && permiteColor)
                }
              />

              <Text style={styles.label}>Stock mínimo *</Text>

              <TextInput
                style={styles.input}
                value={stockMinimo}
                onChangeText={setStockMinimo}
                placeholder="0"
                placeholderTextColor="#A89AA1"
                keyboardType="numeric"
                editable={!guardando}
              />

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  guardando && styles.saveButtonDisabled,
                ]}
                onPress={guardarProducto}
                disabled={guardando}
              >
                {guardando ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />

                    <Text style={styles.saveButtonText}>
                      Guardando...
                    </Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="content-save"
                      size={21}
                      color="#FFFFFF"
                    />

                    <Text style={styles.saveButtonText}>
                      {productoEditando
                        ? 'Actualizar producto'
                        : 'Guardar producto'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CATEGORÍAS */}

      <Modal
        visible={categoriaModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setCategoriaModalVisible(false)}
      >
        <View style={styles.categoryModalOverlay}>
          <View style={styles.categoryModal}>
            <View style={styles.categoryModalHeader}>
              <Text style={styles.categoryModalTitle}>
                Seleccionar categoría
              </Text>

              <TouchableOpacity
                onPress={() => setCategoriaModalVisible(false)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={25}
                  color="#8E3158"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.categoriesList}
              showsVerticalScrollIndicator={false}
            >
              {categorias.map((item, index) => (
                <TouchableOpacity
                  key={`${item}-${index}`}
                  style={[
                    styles.categoryItem,
                    categoria === item &&
                      styles.selectedCategoryItem,
                  ]}
                  onPress={() => seleccionarCategoria(item)}
                >
                  <Text
                    style={[
                      styles.categoryItemText,
                      categoria === item &&
                        styles.selectedCategoryText,
                    ]}
                  >
                    {item}
                  </Text>

                  {categoria === item && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={21}
                      color="#D63384"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.newCategorySection}>
              <Text style={styles.newCategoryTitle}>
                Agregar nueva categoría
              </Text>

              <TextInput
                style={styles.newCategoryInput}
                value={nuevaCategoria}
                onChangeText={setNuevaCategoria}
                placeholder="Ej. Vestidos"
                placeholderTextColor="#A89AA1"
              />

              <TouchableOpacity
                style={styles.newCategoryButton}
                onPress={agregarNuevaCategoria}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={20}
                  color="#FFFFFF"
                />

                <Text style={styles.newCategoryButtonText}>
                  Agregar categoría
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PARA CLASIFICAR PRODUCTOS EXISTENTES */}

      <Modal
        visible={modalClasificarVisible}
        animationType="fade"
        transparent
        onRequestClose={cerrarClasificador}
      >
        <View style={styles.categoryModalOverlay}>
          <View style={styles.classificationModal}>
            <View style={styles.categoryModalHeader}>
              <View style={styles.classificationTitleContainer}>
                <Text style={styles.categoryModalTitle}>
                  Cambiar categoría
                </Text>

                {productoCategoriaEditando && (
                  <Text
                    style={styles.classificationProductName}
                    numberOfLines={2}
                  >
                    {productoCategoriaEditando.nombre}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={cerrarClasificador}
                disabled={cambiandoCategoria}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={25}
                  color="#8E3158"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.classificationInstruction}>
              Selecciona la categoría correcta para este producto.
            </Text>

            <ScrollView
              style={styles.classificationList}
              showsVerticalScrollIndicator={false}
            >
              {categorias.map((item, index) => {
                const seleccionada =
                  productoCategoriaEditando?.categoria?.toLowerCase() ===
                  item.toLowerCase();

                return (
                  <TouchableOpacity
                    key={`clasificar-${item}-${index}`}
                    style={[
                      styles.classificationItem,
                      seleccionada &&
                        styles.selectedClassificationItem,
                    ]}
                    onPress={() =>
                      cambiarCategoriaProducto(item)
                    }
                    disabled={cambiandoCategoria}
                  >
                    <View style={styles.classificationItemLeft}>
                      <View
                        style={[
                          styles.categoryIcon,
                          seleccionada &&
                            styles.categoryIconSelected,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="tag-outline"
                          size={20}
                          color={
                            seleccionada ? '#FFFFFF' : '#D63384'
                          }
                        />
                      </View>

                      <Text
                        style={[
                          styles.classificationItemText,
                          seleccionada &&
                            styles.selectedClassificationText,
                        ]}
                      >
                        {item}
                      </Text>
                    </View>

                    {seleccionada ? (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={23}
                        color="#D63384"
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={21}
                        color="#B59AA8"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {cambiandoCategoria && (
              <View style={styles.changingCategoryContainer}>
                <ActivityIndicator
                  size="small"
                  color="#D63384"
                />

                <Text style={styles.changingCategoryText}>
                  Actualizando categoría...
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ESTILOS

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCE7F0',
  },

  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3D6E4',
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FCE7F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#54253B',
  },

  headerSubtitle: {
    fontSize: 12,
    color: '#9D7187',
    marginTop: 2,
  },

  addHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#D63384',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E3158',
  },

  productosContainer: {
    paddingHorizontal: 17,
    paddingTop: 18,
    paddingBottom: 35,
  },

  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 23,
    backgroundColor: '#FCE7F0',
    borderWidth: 1,
    borderColor: '#F3D6E4',
    marginBottom: 24,
  },

  welcomeTextContainer: {
    flex: 1,
    paddingRight: 8,
  },

  welcomeEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#B83270',
    marginBottom: 9,
  },

  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#54253B',
  },

  welcomeTitleAccent: {
    fontSize: 22,
    fontWeight: '800',
    color: '#D63384',
  },

  welcomeDescription: {
    fontSize: 12,
    color: '#805B6E',
    lineHeight: 18,
    marginTop: 8,
  },

  welcomeIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#E9A8C6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#54253B',
  },

  sectionSubtitle: {
    fontSize: 12,
    color: '#987D8C',
    marginTop: 4,
  },

  countBadge: {
    minWidth: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#FCE7F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  countBadgeText: {
    color: '#A62965',
    fontSize: 14,
    fontWeight: '800',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 35,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F3D6E4',
  },

  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: '#FCE7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#54253B',
    marginTop: 16,
  },

  emptyText: {
    fontSize: 13,
    color: '#987D8C',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D63384',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 22,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },

  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3D6E4',
  },

  productCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  imageContainer: {
    width: 88,
    height: 100,
    borderRadius: 15,
    backgroundColor: '#FCE7F0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  productInfo: {
    flex: 1,
    paddingHorizontal: 11,
  },

  productName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: '#54253B',
  },

  productCode: {
    fontSize: 11,
    color: '#A08897',
    marginTop: 5,
  },

  categoryChangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FCE7F0',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginTop: 8,
    maxWidth: '100%',
  },

  productCategory: {
    fontSize: 10,
    color: '#C02670',
    fontWeight: '800',
    marginHorizontal: 4,
    flexShrink: 1,
  },

  productBrand: {
    fontSize: 11,
    color: '#8D7382',
    marginTop: 6,
  },

  actions: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
  },

  editButton: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: '#FCE7F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  deleteButton: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: '#FFF5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  productDivider: {
    height: 1,
    backgroundColor: '#F3E7ED',
    marginVertical: 13,
  },

  productMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  priceMetric: {
    flex: 1,
  },

  stockMetric: {
    alignItems: 'flex-end',
  },

  metricLabel: {
    fontSize: 11,
    color: '#A08897',
    marginBottom: 5,
  },

  price: {
    fontSize: 17,
    fontWeight: '800',
    color: '#8E3158',
  },

  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    gap: 4,
  },

  stockBadgeLow: {
    backgroundColor: '#FFF1D6',
  },

  stockBadgeOk: {
    backgroundColor: '#E7F7ED',
  },

  stock: {
    fontSize: 11,
    fontWeight: '800',
  },

  stockLow: {
    color: '#B45309',
  },

  stockNormal: {
    color: '#18794E',
  },

  lowStockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7E8',
    borderRadius: 9,
    padding: 9,
    marginTop: 12,
  },

  lowStockNoticeText: {
    color: '#9A5B13',
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },

  variantSummaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 11,
  },

  variantSummary: {
    fontSize: 11,
    color: '#A34C76',
    fontWeight: '700',
  },

  footerText: {
    color: '#B59AA8',
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 13,
    marginBottom: 10,
  },

  // MODAL DE PRODUCTO

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(55, 20, 39, 0.48)',
    justifyContent: 'flex-end',
  },

  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '94%',
    paddingTop: 8,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3D6E4',
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#54253B',
  },

  modalCloseButton: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: '#FCE7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  photoSection: {
    alignItems: 'center',
    marginBottom: 18,
  },

  photoButton: {
    width: 130,
    height: 130,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E7A3C2',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#FCE7F0',
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },

  photoText: {
    fontSize: 13,
    color: '#C02670',
    fontWeight: '700',
    marginTop: 7,
  },

  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D63384',
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 11,
    marginTop: 10,
  },

  changePhotoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#75435C',
    marginBottom: 7,
    marginTop: 12,
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#EBD9E2',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#54253B',
    backgroundColor: '#FFFCFD',
  },

  inputDisabled: {
    backgroundColor: '#F7F0F4',
    color: '#8D7382',
  },

  categorySelector: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#EBD9E2',
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFCFD',
  },

  categorySelectorText: {
    fontSize: 14,
    color: '#54253B',
  },

  placeholderText: {
    color: '#A89AA1',
  },

  calculatedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FCE7F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: 12,
  },

  calculatedLabel: {
    fontSize: 13,
    color: '#805B6E',
  },

  calculatedValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#8E3158',
  },

  stockDescription: {
    fontSize: 12,
    color: '#987D8C',
    marginBottom: 8,
    lineHeight: 18,
  },

  // VARIANTES

  variantesSection: {
    marginTop: 18,
    marginBottom: 8,
    padding: 14,
    backgroundColor: '#FCE7F0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0C9DB',
  },

  variantesTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8E3158',
  },

  variantesDescription: {
    fontSize: 12,
    color: '#8D7382',
    marginTop: 5,
    marginBottom: 10,
    lineHeight: 18,
  },

  varianteCard: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#F1D3E0',
    marginBottom: 10,
  },

  varianteLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8E3158',
    marginBottom: 4,
  },

  addVariantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D63384',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },

  addVariantText: {
    color: '#B9366D',
    fontSize: 13,
    fontWeight: '800',
  },

  removeVariantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    marginTop: 10,
    padding: 6,
  },

  removeVariantText: {
    color: '#B9366D',
    fontSize: 12,
    fontWeight: '700',
  },

  stockTotalText: {
    marginTop: 10,
    color: '#8E3158',
    fontSize: 12,
    fontWeight: '800',
  },

  saveButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#D63384',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 20,
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },

  // MODAL CATEGORÍAS

  categoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(55, 20, 39, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  categoryModal: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },

  classificationModal: {
    width: '100%',
    maxHeight: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },

  categoryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: '#F3D6E4',
  },

  categoryModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#54253B',
  },

  classificationTitleContainer: {
    flex: 1,
    paddingRight: 15,
  },

  classificationProductName: {
    fontSize: 13,
    color: '#987D8C',
    marginTop: 3,
  },

  classificationInstruction: {
    fontSize: 13,
    color: '#8D7382',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 5,
  },

  categoriesList: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 260,
  },

  classificationList: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 420,
  },

  categoryItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderRadius: 11,
    marginBottom: 7,
    backgroundColor: '#FCE7F0',
    borderWidth: 1,
    borderColor: '#F3D6E4',
  },

  selectedCategoryItem: {
    backgroundColor: '#F9D5E5',
    borderWidth: 1,
    borderColor: '#D63384',
  },

  categoryItemText: {
    fontSize: 14,
    color: '#75435C',
  },

  selectedCategoryText: {
    color: '#8E3158',
    fontWeight: '800',
  },

  classificationItem: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#FCE7F0',
    borderWidth: 1,
    borderColor: '#F0D4E1',
  },

  selectedClassificationItem: {
    backgroundColor: '#F9D5E5',
    borderColor: '#D63384',
  },

  classificationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#FCE7F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  categoryIconSelected: {
    backgroundColor: '#D63384',
  },

  classificationItemText: {
    fontSize: 14,
    color: '#75435C',
    fontWeight: '600',
  },

  selectedClassificationText: {
    color: '#C02670',
    fontWeight: '800',
  },

  changingCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F3D6E4',
  },

  changingCategoryText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#D63384',
    fontWeight: '700',
  },

  noCategoriesText: {
    textAlign: 'center',
    color: '#987D8C',
    fontSize: 13,
    paddingVertical: 20,
  },

  newCategorySection: {
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: '#F3D6E4',
    backgroundColor: '#FFFFFF',
  },

  newCategoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#54253B',
    marginBottom: 9,
  },

  newCategoryInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#EBD9E2',
    borderRadius: 12,
    paddingHorizontal: 13,
    fontSize: 14,
    color: '#54253B',
    marginBottom: 10,
    backgroundColor: '#FFFCFD',
  },

  newCategoryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#D63384',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  newCategoryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 7,
  },
});