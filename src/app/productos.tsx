
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
  imagenUrl?: string;
  imagenUri?: string;
  imagenBase64?: string;
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

const CATEGORIAS_INICIALES = [
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

const esCategoriaConTalla = (categoria: string) =>
  CATEGORIAS_CON_TALLA.includes(normalizarCategoria(categoria));

const esCartera = (categoria: string) =>
  normalizarCategoria(categoria) === 'carteras';

// Acepta letras, espacios y signos habituales en nombres y marcas.
// Rechaza números, emojis y símbolos que no corresponden.
const validarNombre = (valor: string) =>
  /^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*$/u.test(valor.trim());

// Los códigos admiten letras, números y guiones.
// Ejemplos válidos: VES-001, PERFUME01, ZAP-38.
const validarCodigo = (valor: string) =>
  /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(valor.trim().toUpperCase());

// Permite nombres de marcas con números, como marcas comerciales.
const validarMarca = (valor: string) =>
  /^[\p{L}\p{M}0-9]+(?:[ .&'-][\p{L}\p{M}0-9]+)*$/u.test(
    valor.trim(),
  );

// Evita letras, signos, valores negativos y más de dos decimales.
const limpiarDecimal = (valor: string) => {
  let resultado = valor.replace(',', '.').replace(/[^\d.]/g, '');
  const partes = resultado.split('.');

  if (partes.length > 2) {
    resultado = `${partes[0]}.${partes.slice(1).join('')}`;
  }

  const [entero = '', decimal] = resultado.split('.');
  return decimal !== undefined
    ? `${entero}.${decimal.slice(0, 2)}`
    : entero;
};

// El stock solo acepta números enteros.
const limpiarEntero = (valor: string) =>
  valor.replace(/\D/g, '');

const validarTextoCategoria = (valor: string) =>
  /^[\p{L}\p{M}0-9]+(?:[ &'-][\p{L}\p{M}0-9]+)*$/u.test(
    valor.trim(),
  );

// Formato visual: coma para miles y punto para decimales.
const formatoCantidad = (valor: number | string) =>
  Number(valor || 0).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });

const formatoDinero = (valor: number | string) =>
  Number(valor || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function ProductosScreen() {
  const router = useRouter();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>(
    CATEGORIAS_INICIALES,
  );
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [modalProductoVisible, setModalProductoVisible] = useState(false);
  const [modalCategoriaVisible, setModalCategoriaVisible] = useState(false);

  const [productoEditando, setProductoEditando] = useState<string | null>(
    null,
  );

  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [marca, setMarca] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [porcentajeGanancia, setPorcentajeGanancia] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');
  const [stockSimple, setStockSimple] = useState('0');

  const [variantes, setVariantes] = useState<VarianteProducto[]>([]);
  const [fotoUri, setFotoUri] = useState('');
  const [fotoBase64, setFotoBase64] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      setCargando(true);

      const consulta = query(
        collection(db, 'productos'),
        orderBy('fechaRegistro', 'desc'),
      );

      const resultado = await getDocs(consulta);

      const lista: Producto[] = resultado.docs.map((documento) => {
        const datos = documento.data();

        const variantesGuardadas: VarianteProducto[] = Array.isArray(
          datos.variantes,
        )
          ? datos.variantes.map((variante: any) => ({
              talla: String(variante.talla ?? ''),
              color: String(variante.color ?? ''),
              stock: Math.max(0, Number(variante.stock ?? 0)),
              imagenUrl: String(variante.imagenUrl ?? ''),
              imagenUri: String(variante.imagenUrl ?? ''),
              imagenBase64: '',
            }))
          : [];

        return {
          id: documento.id,
          nombre: String(datos.nombre ?? ''),
          codigo: String(datos.codigo ?? ''),
          categoria: String(datos.categoria ?? ''),
          marca: String(datos.marca ?? ''),
          precioCompra: Number(datos.precioCompra ?? 0),
          porcentajeGanancia: Number(datos.porcentajeGanancia ?? 0),
          precioVenta: Number(datos.precioVenta ?? 0),
          stock: Math.max(0, Number(datos.stock ?? 0)),
          stockMinimo: Math.max(0, Number(datos.stockMinimo ?? 0)),
          fechaRegistro: datos.fechaRegistro,
          imagenUrl: String(datos.imagenUrl ?? ''),
          variantes: variantesGuardadas,
        };
      });

      setProductos(lista);

      const categoriasGuardadas = lista
        .map((producto) => producto.categoria.trim())
        .filter(Boolean);

      setCategorias(
        Array.from(
          new Set([...CATEGORIAS_INICIALES, ...categoriasGuardadas]),
        ),
      );
    } catch (error) {
      console.error('Error al cargar productos:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos.');
    } finally {
      setCargando(false);
    }
  };

  const limpiarFormulario = () => {
    setProductoEditando(null);
    setNombre('');
    setCodigo('');
    setCategoria('');
    setMarca('');
    setPrecioCompra('');
    setPorcentajeGanancia('');
    setStockMinimo('');
    setStockSimple('0');
    setVariantes([]);
    setFotoUri('');
    setFotoBase64('');
  };

  const abrirNuevoProducto = () => {
    limpiarFormulario();
    setModalProductoVisible(true);
  };

  const abrirEditarProducto = (producto: Producto) => {
    setProductoEditando(producto.id);
    setNombre(producto.nombre);
    setCodigo(producto.codigo);
    setCategoria(producto.categoria);
    setMarca(producto.marca);
    setPrecioCompra(String(producto.precioCompra));
    setPorcentajeGanancia(String(producto.porcentajeGanancia));
    setStockMinimo(String(producto.stockMinimo));
    setStockSimple(String(producto.stock));
    setFotoUri(producto.imagenUrl ?? '');
    setFotoBase64('');

    setVariantes(
      (producto.variantes ?? []).map((variante) => ({
        talla: variante.talla ?? '',
        color: variante.color ?? '',
        stock: Number(variante.stock ?? 0),
        imagenUrl: variante.imagenUrl ?? '',
        imagenUri: variante.imagenUrl ?? '',
        imagenBase64: '',
      })),
    );

    setModalProductoVisible(true);
  };

  const seleccionarFotoPrincipal = async () => {
    try {
      const permiso =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permiso.granted) {
        Alert.alert(
          'Permiso requerido',
          'Debes permitir el acceso a tus fotos para seleccionar una imagen.',
        );
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (resultado.canceled || !resultado.assets?.[0]) return;

      const imagen = resultado.assets[0];

      if (!imagen.base64) {
        Alert.alert(
          'Imagen inválida',
          'No se pudieron obtener los datos de la imagen. Selecciona otra.',
        );
        return;
      }

      setFotoUri(imagen.uri);
      setFotoBase64(imagen.base64);
    } catch (error) {
      console.error('Error al seleccionar foto principal:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  };

  const seleccionarFotoVariante = async (indice: number) => {
    try {
      const permiso =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permiso.granted) {
        Alert.alert(
          'Permiso requerido',
          'Debes permitir el acceso a tus fotos para seleccionar una imagen.',
        );
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (resultado.canceled || !resultado.assets?.[0]) return;

      const imagen = resultado.assets[0];

      if (!imagen.base64) {
        Alert.alert(
          'Imagen inválida',
          'No se pudieron obtener los datos de la imagen. Selecciona otra.',
        );
        return;
      }

      setVariantes((actuales) =>
        actuales.map((variante, posicion) =>
          posicion === indice
            ? {
                ...variante,
                imagenUri: imagen.uri,
                imagenBase64: imagen.base64 ?? '',
              }
            : variante,
        ),
      );
    } catch (error) {
      console.error('Error al seleccionar foto de variante:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen de la variante.');
    }
  };

  const agregarVariante = () => {
    setVariantes((actuales) => [
      ...actuales,
      {
        talla: '',
        color: '',
        stock: 0,
        imagenUrl: '',
        imagenUri: '',
        imagenBase64: '',
      },
    ]);
  };

  const actualizarVariante = (
    indice: number,
    campo: 'talla' | 'color' | 'stock',
    valor: string,
  ) => {
    setVariantes((actuales) =>
      actuales.map((variante, posicion) => {
        if (posicion !== indice) return variante;

        if (campo === 'stock') {
          const limpio = limpiarEntero(valor);
          const cantidad = limpio === '' ? 0 : Number(limpio);

          return {
            ...variante,
            stock: Number.isSafeInteger(cantidad) ? cantidad : 0,
          };
        }

        if (campo === 'talla') {
          // Las tallas admiten letras, números y formatos como 2XL o 38.
          const tallaLimpia = valor.replace(
            /[^\p{L}\p{M}0-9 .-]/gu,
            '',
          );

          return { ...variante, talla: tallaLimpia };
        }

        // El color admite nombres, espacios y guiones; no números ni emojis.
        const colorLimpio = valor.replace(
          /[^\p{L}\p{M} .'-]/gu,
          '',
        );

        return { ...variante, color: colorLimpio };
      }),
    );
  };

  const eliminarVariante = (indice: number) => {
    setVariantes((actuales) =>
      actuales.filter((_, posicion) => posicion !== indice),
    );
  };

  const obtenerVariantesNormalizadas = () =>
    variantes.map((variante) => ({
      ...variante,
      talla: variante.talla.trim(),
      color: variante.color.trim(),
      stock: Math.max(0, Number(variante.stock) || 0),
    }));

  const subirImagenASupabase = async (
    base64: string,
    nombreArchivo: string,
  ): Promise<string> => {
    if (!base64) {
      throw new Error('La imagen seleccionada no contiene datos.');
    }

    const contenido = decode(base64);

    const { error } = await supabase.storage
      .from('productos')
      .upload(nombreArchivo, contenido, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Error al subir imagen a Supabase:', error);
      throw error;
    }

    const { data } = supabase.storage
      .from('productos')
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  };

  const subirFotoPrincipalASupabase = async (
    productoId: string,
  ): Promise<string> => {
    if (!fotoBase64) return fotoUri;

    const nombreArchivo = `${productoId}_${Date.now()}.jpg`;

    return subirImagenASupabase(fotoBase64, nombreArchivo);
  };

  const subirFotoVarianteASupabase = async (
    productoId: string,
    indice: number,
    base64: string,
  ): Promise<string> => {
    const nombreArchivo =
      `variantes/${productoId}_${indice}_${Date.now()}.jpg`;

    return subirImagenASupabase(base64, nombreArchivo);
  };

  const guardarImagenesVariantes = async (
    productoId: string,
    lista: VarianteProducto[],
  ) => {
    return Promise.all(
      lista.map(async (variante, indice) => {
        let imagenUrl = variante.imagenUrl ?? '';

        if (variante.imagenBase64) {
          imagenUrl = await subirFotoVarianteASupabase(
            productoId,
            indice,
            variante.imagenBase64,
          );
        }

        return {
          talla: variante.talla.trim(),
          color: variante.color.trim(),
          stock: Math.max(0, Number(variante.stock) || 0),
          imagenUrl,
        };
      }),
    );
  };

  const validarFormulario = (): boolean => {
    const nombreLimpio = nombre.trim();
    const codigoLimpio = codigo.trim().toUpperCase();
    const marcaLimpia = marca.trim();
    const categoriaLimpia = categoria.trim();

    if (!nombreLimpio) {
      Alert.alert('Nombre requerido', 'Escribe el nombre del producto.');
      return false;
    }

    if (!validarNombre(nombreLimpio)) {
      Alert.alert(
        'Nombre inválido',
        'El nombre solo puede contener letras, espacios, puntos, apóstrofes y guiones. No se permiten números.',
      );
      return false;
    }

    if (nombreLimpio.length < 2 || nombreLimpio.length > 80) {
      Alert.alert(
        'Nombre inválido',
        'El nombre debe tener entre 2 y 80 caracteres.',
      );
      return false;
    }

    if (!codigoLimpio) {
      Alert.alert('Código requerido', 'Escribe el código del producto.');
      return false;
    }

    if (!validarCodigo(codigoLimpio)) {
      Alert.alert(
        'Código inválido',
        'Usa únicamente letras, números y guiones. Ejemplo: VES-001.',
      );
      return false;
    }

    if (codigoLimpio.length > 30) {
      Alert.alert('Código inválido', 'El código no puede superar 30 caracteres.');
      return false;
    }

    const codigoDuplicado = productos.some(
      (producto) =>
        producto.id !== productoEditando &&
        producto.codigo.trim().toUpperCase() === codigoLimpio,
    );

    if (codigoDuplicado) {
      Alert.alert(
        'Código existente',
        'Ya hay un producto registrado con ese código.',
      );
      return false;
    }

    if (!marcaLimpia) {
      Alert.alert('Marca requerida', 'Escribe la marca del producto.');
      return false;
    }

    if (!validarMarca(marcaLimpia) || marcaLimpia.length > 60) {
      Alert.alert(
        'Marca inválida',
        'La marca solo puede contener letras, números, espacios y los signos . & - o apóstrofe. Máximo 60 caracteres.',
      );
      return false;
    }

    if (!categoriaLimpia) {
      Alert.alert(
        'Categoría requerida',
        'Selecciona una categoría para el producto.',
      );
      return false;
    }

    if (
      !categorias.some(
        (item) => normalizarCategoria(item) === normalizarCategoria(categoriaLimpia),
      )
    ) {
      Alert.alert(
        'Categoría inválida',
        'Selecciona una categoría de la lista o registra una nueva.',
      );
      return false;
    }

    if (
      precioCompra.trim() === '' ||
      porcentajeGanancia.trim() === '' ||
      stockMinimo.trim() === ''
    ) {
      Alert.alert(
        'Campos requeridos',
        'Completa el precio de compra, el porcentaje de ganancia y el stock mínimo.',
      );
      return false;
    }

    if (
      !/^\d+(?:[.,]\d{1,2})?$/.test(precioCompra.trim()) ||
      !/^\d+(?:[.,]\d{1,2})?$/.test(porcentajeGanancia.trim()) ||
      !/^\d+$/.test(stockMinimo.trim())
    ) {
      Alert.alert(
        'Formato inválido',
        'Los precios y porcentajes deben ser numéricos. El stock mínimo debe ser un número entero.',
      );
      return false;
    }

    const compra = Number(precioCompra.replace(',', '.'));
    const ganancia = Number(porcentajeGanancia.replace(',', '.'));
    const minimo = Number(stockMinimo);

    if (
      !Number.isFinite(compra) ||
      !Number.isFinite(ganancia) ||
      !Number.isFinite(minimo) ||
      compra <= 0 ||
      ganancia < 0 ||
      ganancia > 1000 ||
      minimo < 0 ||
      !Number.isSafeInteger(minimo)
    ) {
      Alert.alert(
        'Valores inválidos',
        'El precio de compra debe ser mayor que cero, la ganancia debe estar entre 0 y 1000 %, y el stock mínimo debe ser un entero no negativo.',
      );
      return false;
    }

    if (compra > 999999999) {
      Alert.alert('Precio inválido', 'El precio de compra es demasiado alto.');
      return false;
    }

    if (!productoEditando && !fotoBase64) {
      Alert.alert(
        'Foto requerida',
        'Selecciona una foto principal para el producto.',
      );
      return false;
    }

    if (fotoBase64 && !fotoUri) {
      Alert.alert(
        'Foto inválida',
        'Vuelve a seleccionar la foto principal del producto.',
      );
      return false;
    }

    const requiereTalla = esCategoriaConTalla(categoriaLimpia);
    const requiereColor = requiereTalla || esCartera(categoriaLimpia);

    if (requiereColor) {
      if (variantes.length === 0) {
        Alert.alert(
          'Variantes requeridas',
          'Agrega al menos una variante con su color y stock.',
        );
        return false;
      }

      for (let indice = 0; indice < variantes.length; indice++) {
        const variante = variantes[indice];
        const numero = indice + 1;
        const talla = variante.talla.trim();
        const color = variante.color.trim();

        if (requiereTalla && !talla) {
          Alert.alert(
            'Talla requerida',
            `Completa la talla de la variante ${numero}.`,
          );
          return false;
        }

        if (
          requiereTalla &&
          (talla.length > 15 ||
            !/^[\p{L}\p{M}0-9]+(?:[ .-][\p{L}\p{M}0-9]+)*$/u.test(talla))
        ) {
          Alert.alert(
            'Talla inválida',
            `La talla de la variante ${numero} solo admite letras, números, espacios, puntos y guiones. Máximo 15 caracteres.`,
          );
          return false;
        }

        if (!color) {
          Alert.alert(
            'Color requerido',
            `Completa el color de la variante ${numero}.`,
          );
          return false;
        }

        if (
          color.length > 30 ||
          !/^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*$/u.test(color)
        ) {
          Alert.alert(
            'Color inválido',
            `El color de la variante ${numero} solo puede contener letras y separadores habituales. Máximo 30 caracteres.`,
          );
          return false;
        }

        if (
          !Number.isSafeInteger(variante.stock) ||
          variante.stock < 0 ||
          variante.stock > 1000000
        ) {
          Alert.alert(
            'Stock inválido',
            `El stock de la variante ${numero} debe ser un entero entre 0 y 1 000 000.`,
          );
          return false;
        }

        if (variante.imagenBase64 && !variante.imagenUri) {
          Alert.alert(
            'Imagen inválida',
            `Vuelve a seleccionar la foto de la variante ${numero}.`,
          );
          return false;
        }
      }

      const combinaciones = variantes.map((variante) =>
        esCartera(categoriaLimpia)
          ? variante.color.trim().toLocaleLowerCase('es')
          : `${variante.talla.trim().toLocaleLowerCase('es')}|${variante.color.trim().toLocaleLowerCase('es')}`,
      );

      if (new Set(combinaciones).size !== combinaciones.length) {
        Alert.alert(
          'Variantes duplicadas',
          esCartera(categoriaLimpia)
            ? 'No puedes registrar el mismo color de cartera más de una vez.'
            : 'No puedes registrar dos variantes con la misma talla y color.',
        );
        return false;
      }
    } else {
      if (!/^\d+$/.test(stockSimple.trim())) {
        Alert.alert(
          'Stock inválido',
          'El stock debe ser un número entero no negativo.',
        );
        return false;
      }

      const cantidad = Number(stockSimple);

      if (
        !Number.isSafeInteger(cantidad) ||
        cantidad < 0 ||
        cantidad > 1000000
      ) {
        Alert.alert(
          'Stock inválido',
          'El stock debe ser un entero entre 0 y 1 000 000.',
        );
        return false;
      }
    }

    return true;
  };

  const guardarProducto = async () => {
    if (guardando) return;
    if (!validarFormulario()) return;

    const compra = Number(precioCompra.replace(',', '.'));
    const ganancia = Number(porcentajeGanancia.replace(',', '.'));
    const minimo = Number(stockMinimo);

    const categoriaConTalla = esCategoriaConTalla(categoria);
    const categoriaCartera = esCartera(categoria);
    const requiereVariantes = categoriaConTalla || categoriaCartera;

    const variantesNormalizadas = requiereVariantes
      ? obtenerVariantesNormalizadas()
      : [];

    const stockTotal = requiereVariantes
      ? variantesNormalizadas.reduce(
          (total, variante) => total + variante.stock,
          0,
        )
      : Number(stockSimple);

    const precioVenta = Number((compra * (1 + ganancia / 100)).toFixed(2));

    if (!Number.isFinite(precioVenta) || precioVenta <= 0) {
      Alert.alert(
        'Precio inválido',
        'No se pudo calcular un precio de venta válido. Revisa el costo y el porcentaje de ganancia.',
      );
      return;
    }

    try {
      setGuardando(true);

      const datosBase = {
        nombre: nombre.trim(),
        codigo: codigo.trim().toUpperCase(),
        categoria: categoria.trim(),
        marca: marca.trim(),
        precioCompra: compra,
        porcentajeGanancia: ganancia,
        precioVenta,
        stock: stockTotal,
        stockMinimo: minimo,
      };

      if (productoEditando) {
        const referencia = doc(db, 'productos', productoEditando);

        const [imagenPrincipal, variantesConImagenes] = await Promise.all([
          subirFotoPrincipalASupabase(productoEditando),
          guardarImagenesVariantes(
            productoEditando,
            variantesNormalizadas,
          ),
        ]);

        await updateDoc(referencia, {
          ...datosBase,
          imagenUrl: imagenPrincipal,
          variantes: variantesConImagenes,
          fechaActualizacion: Timestamp.now(),
        });

        Alert.alert('Éxito', 'Producto actualizado correctamente.');
      } else {
        const nuevoProducto = await addDoc(collection(db, 'productos'), {
          ...datosBase,
          imagenUrl: '',
          variantes: [],
          fechaRegistro: Timestamp.now(),
        });

        const [imagenPrincipal, variantesConImagenes] = await Promise.all([
          subirFotoPrincipalASupabase(nuevoProducto.id),
          guardarImagenesVariantes(
            nuevoProducto.id,
            variantesNormalizadas,
          ),
        ]);

        await updateDoc(doc(db, 'productos', nuevoProducto.id), {
          imagenUrl: imagenPrincipal,
          variantes: variantesConImagenes,
        });

        Alert.alert('Éxito', 'Producto registrado correctamente.');
      }

      setModalProductoVisible(false);
      limpiarFormulario();
      await cargarProductos();
    } catch (error: any) {
      console.error('Error al guardar producto:', error);

      Alert.alert(
        'Error al guardar',
        error?.message ||
          'No se pudo guardar el producto. Verifica la conexión, Firebase y la configuración del almacenamiento de Supabase.',
      );
    } finally {
      setGuardando(false);
    }
  };

  const eliminarFotoDeSupabase = async (url?: string) => {
    if (!url) return;

    try {
      const marcador = '/storage/v1/object/public/productos/';
      const posicion = url.indexOf(marcador);

      if (posicion === -1) return;

      const rutaArchivo = decodeURIComponent(
        url.substring(posicion + marcador.length).split('?')[0],
      );

      if (!rutaArchivo) return;

      const { error } = await supabase.storage
        .from('productos')
        .remove([rutaArchivo]);

      if (error) {
        console.warn('No se pudo eliminar la imagen de Supabase:', error);
      }
    } catch (error) {
      console.warn('Error al eliminar imagen:', error);
    }
  };

  const eliminarProducto = (producto: Producto) => {
    Alert.alert(
      'Eliminar producto',
      `¿Deseas eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarFotoDeSupabase(producto.imagenUrl);

              for (const variante of producto.variantes ?? []) {
                await eliminarFotoDeSupabase(variante.imagenUrl);
              }

              await deleteDoc(doc(db, 'productos', producto.id));
              await cargarProductos();

              Alert.alert('Éxito', 'Producto eliminado correctamente.');
            } catch (error) {
              console.error('Error al eliminar producto:', error);
              Alert.alert('Error', 'No se pudo eliminar el producto.');
            }
          },
        },
      ],
    );
  };

  const agregarCategoria = () => {
    const valor = nuevaCategoria.trim();

    if (!valor) {
      Alert.alert('Categoría requerida', 'Escribe el nombre de la categoría.');
      return;
    }

    if (
      valor.length < 2 ||
      valor.length > 40 ||
      !validarTextoCategoria(valor)
    ) {
      Alert.alert(
        'Categoría inválida',
        'Usa entre 2 y 40 caracteres. Solo se permiten letras, números, espacios, guiones, apóstrofes y el signo &.',
      );
      return;
    }

    const existe = categorias.some(
      (item) => normalizarCategoria(item) === normalizarCategoria(valor),
    );

    if (existe) {
      Alert.alert('Categoría existente', 'Esa categoría ya está registrada.');
      return;
    }

    setCategorias((actuales) => [...actuales, valor]);
    setCategoria(valor);
    setNuevaCategoria('');
    setModalCategoriaVisible(false);
  };

  const seleccionarCategoria = (valor: string) => {
    setCategoria(valor);

    if (!esCategoriaConTalla(valor) && !esCartera(valor)) {
      setVariantes([]);
    } else if (esCartera(valor)) {
      setVariantes((actuales) =>
        actuales.map((variante) => ({
          ...variante,
          talla: '',
        })),
      );
    }
  };

  const stockCalculado = variantes.reduce(
    (total, variante) => total + Math.max(0, Number(variante.stock) || 0),
    0,
  );

  const precioVentaVista =
    (Number(precioCompra.replace(',', '.')) || 0) *
    (1 + (Number(porcentajeGanancia.replace(',', '.')) || 0) / 100);

  const requiereVariantes =
    esCategoriaConTalla(categoria) || esCartera(categoria);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F8" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color="#762449"
          />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerEyebrow}>LIZMA STYLE · ADMINISTRACIÓN</Text>
          <Text style={styles.headerTitle}>Productos</Text>
          <Text style={styles.headerSubtitle}>
            Gestiona tu inventario y catálogo
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={abrirNuevoProducto}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={25} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B83268" />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <MaterialCommunityIcons
                name="package-variant"
                size={27}
                color="#B83268"
              />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Inventario</Text>
              <Text style={styles.summaryDescription}>
                Productos registrados en el sistema
              </Text>
            </View>
            <View style={styles.summaryNumberContainer}>
              <Text style={styles.summaryValue}>{formatoCantidad(productos.length)}</Text>
            </View>
          </View>

          <View style={styles.listHeading}>
            <View>
              <Text style={styles.listTitle}>Tu catálogo</Text>
              <Text style={styles.listSubtitle}>
                Administra los productos registrados
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{formatoCantidad(productos.length)}</Text>
            </View>
          </View>

          {productos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={48}
                  color="#B83268"
                />
              </View>
              <Text style={styles.emptyTitle}>Tu catálogo está vacío</Text>
              <Text style={styles.emptyText}>
                Agrega tu primer producto para comenzar a administrar el
                inventario de Lizma Style.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={abrirNuevoProducto}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={19}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryButtonText}>Agregar producto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            productos.map((producto) => (
              <View key={producto.id} style={styles.productCard}>
                <View style={styles.productImageContainer}>
                  {producto.imagenUrl ? (
                    <Image
                      source={{ uri: producto.imagenUrl }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[styles.productImage, styles.imagePlaceholder]}
                    >
                      <MaterialCommunityIcons
                        name="image-outline"
                        size={35}
                        color="#B83268"
                      />
                    </View>
                  )}

                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText} numberOfLines={1}>
                      {producto.categoria}
                    </Text>
                  </View>
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {producto.nombre}
                  </Text>

                  <Text style={styles.productMeta}>
                    Código: {producto.codigo}
                  </Text>

                  <View style={styles.brandRow}>
                    <MaterialCommunityIcons
                      name="tag-outline"
                      size={14}
                      color="#9A7183"
                    />
                    <Text style={styles.productMeta} numberOfLines={1}>
                      {producto.marca}
                    </Text>
                  </View>

                  <Text style={styles.productPrice}>
                    C$ {formatoDinero(producto.precioVenta)}
                  </Text>

                  <View
                    style={[
                      styles.stockBadge,
                      producto.stock <= producto.stockMinimo &&
                        styles.stockBadgeLow,
                    ]}
                  >
                    <View
                      style={[
                        styles.stockDot,
                        producto.stock <= producto.stockMinimo &&
                          styles.stockDotLow,
                      ]}
                    />
                    <Text
                      style={[
                        styles.stockText,
                        producto.stock <= producto.stockMinimo &&
                          styles.lowStockText,
                      ]}
                    >
                      Stock: {formatoCantidad(producto.stock)}
                      {producto.stock <= producto.stockMinimo
                        ? ' · Stock bajo'
                        : ''}
                    </Text>
                  </View>

                  {!!producto.variantes?.length && (
                    <View style={styles.variantCountRow}>
                      <MaterialCommunityIcons
                        name="layers-outline"
                        size={14}
                        color="#91677A"
                      />
                      <Text style={styles.variantCount}>
                        {formatoCantidad(producto.variantes.length)} variante(s)
                      </Text>
                    </View>
                  )}

                  <View style={styles.productActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => abrirEditarProducto(producto)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={styles.actionButtonText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => eliminarProducto(producto)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name="delete-outline"
                        size={17}
                        color="#B32645"
                      />
                      <Text style={styles.deleteButtonText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal
        visible={modalProductoVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!guardando) setModalProductoVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeadingText}>
                <Text style={styles.modalEyebrow}>LIZMA STYLE</Text>
                <Text style={styles.modalTitle}>
                  {productoEditando ? 'Editar producto' : 'Nuevo producto'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Información y detalles del inventario
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalProductoVisible(false)}
                disabled={guardando}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={23}
                  color="#762449"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formContent}
            >
              <View style={styles.formSection}>
                <View style={styles.sectionHeadingRow}>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons
                      name="image-outline"
                      size={20}
                      color="#B83268"
                    />
                  </View>
                  <View style={styles.sectionHeadingText}>
                    <Text style={styles.sectionTitle}>
                      Foto principal del producto
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Imagen de presentación del producto
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.mainPhotoButton}
                  onPress={seleccionarFotoPrincipal}
                  disabled={guardando}
                  activeOpacity={0.85}
                >
                  {fotoUri ? (
                    <Image
                      source={{ uri: fotoUri }}
                      style={styles.mainPhotoPreview}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <View style={styles.photoIconCircle}>
                        <MaterialCommunityIcons
                          name="camera-plus-outline"
                          size={30}
                          color="#B83268"
                        />
                      </View>
                      <Text style={styles.photoPlaceholderText}>
                        Seleccionar foto principal
                      </Text>
                      <Text style={styles.photoHint}>
                        Elige una imagen desde tu galería
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <View style={styles.sectionHeadingRow}>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons
                      name="clipboard-text-outline"
                      size={20}
                      color="#B83268"
                    />
                  </View>
                  <View style={styles.sectionHeadingText}>
                    <Text style={styles.sectionTitle}>
                      Información del producto
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Completa los datos de identificación
                    </Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Nombre del producto *</Text>
                <TextInput
                  style={styles.input}
                  value={nombre}
                  onChangeText={(valor) =>
                    setNombre(
                      valor.replace(
                        /[^\p{L}\p{M} .'-]/gu,
                        '',
                      ),
                    )
                  }
                  placeholder="Ej. Vestido elegante"
                  placeholderTextColor="#B19AA5"
                  maxLength={80}
                  autoCapitalize="words"
                />

                <Text style={styles.inputLabel}>Código *</Text>
                <TextInput
                  style={styles.input}
                  value={codigo}
                  onChangeText={(valor) =>
                    setCodigo(
                      valor
                        .toUpperCase()
                        .replace(/[^A-Z0-9-]/g, '')
                        .replace(/-{2,}/g, '-'),
                    )
                  }
                  placeholder="Ej. VES-001"
                  placeholderTextColor="#B19AA5"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={30}
                />

                <Text style={styles.inputLabel}>Marca *</Text>
                <TextInput
                  style={styles.input}
                  value={marca}
                  onChangeText={(valor) =>
                    setMarca(
                      valor.replace(
                        /[^\p{L}\p{M}0-9 .&'-]/gu,
                        '',
                      ),
                    )
                  }
                  placeholder="Nombre de la marca"
                  placeholderTextColor="#B19AA5"
                  maxLength={60}
                  autoCapitalize="words"
                />

                <Text style={styles.inputLabel}>Categoría *</Text>
                <View style={styles.categoryGrid}>
                  {categorias.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.categoryChip,
                        categoria === item && styles.categoryChipSelected,
                      ]}
                      onPress={() => seleccionarCategoria(item)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          categoria === item &&
                            styles.categoryChipTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.addCategoryButton}
                  onPress={() => setModalCategoriaVisible(true)}
                >
                  <MaterialCommunityIcons
                    name="plus-circle-outline"
                    size={19}
                    color="#B83268"
                  />
                  <Text style={styles.addCategoryText}>
                    Agregar categoría
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <View style={styles.sectionHeadingRow}>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons
                      name="cash-multiple"
                      size={20}
                      color="#B83268"
                    />
                  </View>
                  <View style={styles.sectionHeadingText}>
                    <Text style={styles.sectionTitle}>
                      Precios e inventario
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Configura los costos y el control de existencias
                    </Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Precio de compra (C$) *</Text>
                <TextInput
                  style={styles.input}
                  value={precioCompra}
                  onChangeText={(valor) => setPrecioCompra(limpiarDecimal(valor))}
                  placeholder="Ej. 250.00"
                  placeholderTextColor="#B19AA5"
                  keyboardType="decimal-pad"
                  maxLength={12}
                />

                <Text style={styles.inputLabel}>
                  Porcentaje de ganancia (%) *
                </Text>
                <TextInput
                  style={styles.input}
                  value={porcentajeGanancia}
                  onChangeText={(valor) =>
                    setPorcentajeGanancia(limpiarDecimal(valor))
                  }
                  placeholder="Ej. 30"
                  placeholderTextColor="#B19AA5"
                  keyboardType="decimal-pad"
                  maxLength={7}
                />

                <Text style={styles.inputLabel}>Stock mínimo *</Text>
                <TextInput
                  style={styles.input}
                  value={stockMinimo}
                  onChangeText={(valor) => setStockMinimo(limpiarEntero(valor))}
                  placeholder="Ej. 5"
                  placeholderTextColor="#B19AA5"
                  keyboardType="number-pad"
                  maxLength={7}
                />

                {!requiereVariantes && (
                  <>
                    <Text style={styles.inputLabel}>Stock disponible *</Text>
                    <TextInput
                      style={styles.input}
                      value={stockSimple}
                      onChangeText={(valor) =>
                        setStockSimple(limpiarEntero(valor))
                      }
                      placeholder="Ej. 10"
                      placeholderTextColor="#B19AA5"
                      keyboardType="number-pad"
                      maxLength={7}
                    />
                    <Text style={styles.photoHint}>
                      Para perfumes, accesorios y otros productos sin tallas,
                      indica aquí las unidades disponibles.
                    </Text>
                  </>
                )}
              </View>

              {requiereVariantes && (
                <View style={styles.formSection}>
                  <View style={styles.variantSectionHeader}>
                    <View style={styles.sectionHeadingRow}>
                      <View style={styles.sectionIcon}>
                        <MaterialCommunityIcons
                          name="palette-outline"
                          size={20}
                          color="#B83268"
                        />
                      </View>
                      <View style={styles.variantTitleContainer}>
                        <Text style={styles.sectionTitle}>
                          Variantes del producto
                        </Text>
                        <Text style={styles.sectionSubtitle}>
                          Registra cada color, talla y cantidad. Puedes
                          seleccionar una foto para cada variante.
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.addVariantButton}
                      onPress={agregarVariante}
                      disabled={guardando}
                    >
                      <MaterialCommunityIcons
                        name="plus"
                        size={21}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </View>

                  {variantes.map((variante, indice) => (
                    <View key={`variante-${indice}`} style={styles.variantCard}>
                      <View style={styles.variantCardHeader}>
                        <View style={styles.variantNumberBadge}>
                          <Text style={styles.variantNumberText}>
                            {String(indice + 1).padStart(2, '0')}
                          </Text>
                        </View>

                        <Text style={styles.variantLabel}>
                          Variante {indice + 1}
                        </Text>

                        <TouchableOpacity
                          style={styles.removeVariantButton}
                          onPress={() => eliminarVariante(indice)}
                          disabled={guardando}
                        >
                          <MaterialCommunityIcons
                            name="trash-can-outline"
                            size={20}
                            color="#B32645"
                          />
                        </TouchableOpacity>
                      </View>

                      {!esCartera(categoria) && (
                        <>
                          <Text style={styles.inputLabel}>Talla *</Text>
                          <TextInput
                            style={styles.input}
                            value={variante.talla}
                            onChangeText={(valor) =>
                              actualizarVariante(indice, 'talla', valor)
                            }
                            placeholder="Ej. S, M, L, XL, 38"
                            placeholderTextColor="#B19AA5"
                            maxLength={15}
                            autoCapitalize="characters"
                          />
                        </>
                      )}

                      <Text style={styles.inputLabel}>Color *</Text>
                      <TextInput
                        style={styles.input}
                        value={variante.color}
                        onChangeText={(valor) =>
                          actualizarVariante(indice, 'color', valor)
                        }
                        placeholder="Ej. Negro, Rojo, Azul"
                        placeholderTextColor="#B19AA5"
                        maxLength={30}
                        autoCapitalize="words"
                      />

                      <Text style={styles.inputLabel}>Stock de esta variante *</Text>
                      <TextInput
                        style={styles.input}
                        value={String(variante.stock)}
                        onChangeText={(valor) =>
                          actualizarVariante(indice, 'stock', valor)
                        }
                        placeholder="0"
                        placeholderTextColor="#B19AA5"
                        keyboardType="number-pad"
                        maxLength={7}
                      />

                      <Text style={styles.inputLabel}>
                        Foto de esta variante
                      </Text>
                      <TouchableOpacity
                        style={styles.variantePhotoButton}
                        onPress={() => seleccionarFotoVariante(indice)}
                        disabled={guardando}
                        activeOpacity={0.85}
                      >
                        {variante.imagenUri ? (
                          <Image
                            source={{ uri: variante.imagenUri }}
                            style={styles.variantePreviewImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.variantePhotoPlaceholder}>
                            <View style={styles.variantCameraCircle}>
                              <MaterialCommunityIcons
                                name="camera-plus-outline"
                                size={25}
                                color="#B83268"
                              />
                            </View>
                            <Text style={styles.variantePhotoText}>
                              Agregar foto para {variante.color || 'este color'}
                            </Text>
                            <Text style={styles.photoHint}>
                              Toca aquí para seleccionar
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}

                  <View style={styles.stockTotalCard}>
                    <View style={styles.stockTotalIcon}>
                      <MaterialCommunityIcons
                        name="package-variant"
                        size={21}
                        color="#B83268"
                      />
                    </View>
                    <View style={styles.stockTotalInfo}>
                      <Text style={styles.stockTotalLabel}>Stock total</Text>
                      <Text style={styles.stockTotalDescription}>
                        Unidades registradas en las variantes
                      </Text>
                    </View>
                    <Text style={styles.stockTotalValue}>{formatoCantidad(stockCalculado)}</Text>
                  </View>
                </View>
              )}

              <View style={styles.pricePreviewCard}>
                <View style={styles.pricePreviewTop}>
                  <View style={styles.pricePreviewIcon}>
                    <MaterialCommunityIcons
                      name="calculator-variant-outline"
                      size={22}
                      color="#B83268"
                    />
                  </View>
                  <View style={styles.pricePreviewInfo}>
                    <Text style={styles.pricePreviewLabel}>
                      Precio de venta calculado
                    </Text>
                    <Text style={styles.pricePreviewHint}>
                      Incluye el porcentaje de ganancia
                    </Text>
                  </View>
                </View>

                <Text style={styles.pricePreviewValue}>
                  C$ {Number.isFinite(precioVentaVista)
                    ? formatoDinero(precioVentaVista)
                    : formatoDinero(0)}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  guardando && styles.saveButtonDisabled,
                ]}
                onPress={guardarProducto}
                disabled={guardando}
                activeOpacity={0.85}
              >
                {guardando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="content-save-outline"
                      size={21}
                      color="#FFFFFF"
                    />
                    <Text style={styles.saveButtonText}>
                      {productoEditando
                        ? 'Guardar cambios'
                        : 'Registrar producto'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalProductoVisible(false)}
                disabled={guardando}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={modalCategoriaVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCategoriaVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.categoryModalContent}>
            <View style={styles.categoryModalIcon}>
              <MaterialCommunityIcons
                name="shape-plus"
                size={27}
                color="#B83268"
              />
            </View>

            <Text style={styles.modalTitle}>Nueva categoría</Text>
            <Text style={styles.categoryModalSubtitle}>
              Agrega una categoría para organizar tus productos.
            </Text>

            <TextInput
              style={styles.input}
              value={nuevaCategoria}
              onChangeText={(valor) =>
                setNuevaCategoria(
                  valor.replace(
                    /[^\p{L}\p{M}0-9 &'-]/gu,
                    '',
                  ),
                )
              }
              placeholder="Nombre de la categoría"
              placeholderTextColor="#B19AA5"
              autoCapitalize="words"
              maxLength={40}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={agregarCategoria}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name="plus"
                size={19}
                color="#FFFFFF"
              />
              <Text style={styles.saveButtonText}>Agregar categoría</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalCategoriaVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F8',
    paddingHorizontal: 17,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E1E8',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E1E8',
  },
  headerTextContainer: { flex: 1 },
  headerEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#B83268',
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#442333',
    letterSpacing: -0.5,
  },
  headerSubtitle: { marginTop: 3, fontSize: 12, color: '#8B7180' },
  addButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: '#B83268',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    elevation: 3,
    shadowColor: '#9C2856',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#80596D',
    fontSize: 14,
    fontWeight: '500',
  },
  productList: { padding: 17, paddingBottom: 35 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 17,
    marginBottom: 25,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0E4EA',
    elevation: 2,
    shadowColor: '#6D304B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.045,
    shadowRadius: 8,
  },
  summaryIcon: {
    width: 51,
    height: 51,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCEAF1',
  },
  summaryTextContainer: { flex: 1, marginLeft: 13 },
  summaryLabel: { fontSize: 14, fontWeight: '800', color: '#49303D' },
  summaryDescription: { marginTop: 4, fontSize: 11, color: '#9B8290' },
  summaryNumberContainer: {
    minWidth: 48,
    minHeight: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 10,
  },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#B83268' },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  listTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#442333',
    letterSpacing: -0.3,
  },
  listSubtitle: { marginTop: 4, fontSize: 12, color: '#947A88' },
  countBadge: {
    minWidth: 34,
    height: 31,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: '#FCEAF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { color: '#B83268', fontWeight: '800', fontSize: 13 },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0E4EA',
  },
  emptyIconContainer: {
    width: 85,
    height: 85,
    borderRadius: 26,
    backgroundColor: '#FCEAF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '800',
    color: '#442333',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 9,
    fontSize: 13,
    color: '#8F7784',
    textAlign: 'center',
    lineHeight: 21,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 22,
    backgroundColor: '#B83268',
    paddingHorizontal: 21,
    paddingVertical: 13,
    borderRadius: 13,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  productCard: {
    flexDirection: 'row',
    padding: 11,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEE2E8',
    elevation: 2,
    shadowColor: '#6D304B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.045,
    shadowRadius: 7,
  },
  productImageContainer: {
    width: 112,
    height: 151,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: '#F8EDF2',
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8EDF2',
  },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  categoryBadge: {
    position: 'absolute',
    left: 5,
    right: 5,
    bottom: 5,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  categoryBadgeText: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '800',
    color: '#8F2C58',
  },
  productInfo: { flex: 1, marginLeft: 12, paddingVertical: 2 },
  productName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: '#442333',
  },
  productMeta: { marginTop: 4, fontSize: 11, color: '#927B88' },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  productPrice: { marginTop: 8, fontSize: 17, fontWeight: '800', color: '#B83268' },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#EAF7EF',
  },
  stockBadgeLow: { backgroundColor: '#FFF0F0' },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E9158',
    marginRight: 5,
  },
  stockDotLow: { backgroundColor: '#C73543' },
  stockText: { fontSize: 10, fontWeight: '700', color: '#267D4B' },
  lowStockText: { color: '#BD2C3B' },
  variantCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  variantCount: { fontSize: 10, color: '#8F7181' },
  productActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 7,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B83268',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#F4D8DC',
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 9,
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deleteButtonText: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '800',
    color: '#B32645',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(42, 21, 32, 0.57)',
    padding: 12,
  },
  modalContent: {
    maxHeight: '94%',
    backgroundColor: '#FAF7F9',
    borderRadius: 22,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 19,
    paddingVertical: 17,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E4EA',
  },
  modalHeadingText: { flex: 1 },
  modalEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#B83268',
    marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#442333' },
  modalSubtitle: { marginTop: 4, fontSize: 11, color: '#947A88' },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  formContent: { padding: 15, paddingBottom: 30 },
  formSection: {
    marginBottom: 15,
    padding: 14,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E5EA',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },
  sectionIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCEAF1',
    marginRight: 10,
  },
  sectionHeadingText: { flex: 1 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#542C40',
    marginBottom: 4,
  },
  sectionSubtitle: { fontSize: 11, lineHeight: 16, color: '#987D8B' },
  mainPhotoButton: {
    height: 185,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAD7E0',
    backgroundColor: '#FFF5F8',
  },
  mainPhotoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE6EF',
  },
  photoPlaceholderText: {
    marginTop: 10,
    color: '#8D345B',
    fontSize: 13,
    fontWeight: '800',
  },
  photoHint: { marginTop: 5, color: '#A58A98', fontSize: 11 },
  inputLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#674456',
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E9DCE3',
    backgroundColor: '#FFFEFF',
    color: '#452333',
    fontSize: 13,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9DCE3',
    backgroundColor: '#FFFFFF',
  },
  categoryChipSelected: { backgroundColor: '#B83268', borderColor: '#B83268' },
  categoryChipText: { fontSize: 11, color: '#79586A', fontWeight: '700' },
  categoryChipTextSelected: { color: '#FFFFFF' },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 13,
    marginBottom: 2,
    paddingVertical: 4,
  },
  addCategoryText: { marginLeft: 6, fontSize: 12, fontWeight: '800', color: '#B83268' },
  variantSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  variantTitleContainer: { flex: 1, paddingRight: 5 },
  addVariantButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B83268',
    marginLeft: 6,
  },
  variantCard: {
    padding: 13,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDDEE5',
    backgroundColor: '#FFFAFC',
  },
  variantCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  variantNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE6EF',
    marginRight: 9,
  },
  variantNumberText: { fontSize: 11, fontWeight: '800', color: '#B83268' },
  variantLabel: { flex: 1, fontSize: 13, fontWeight: '800', color: '#542C40' },
  removeVariantButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F1',
  },
  variantePhotoButton: {
    minHeight: 145,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#DAB4C5',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  variantePreviewImage: { width: '100%', height: 190 },
  variantePhotoPlaceholder: {
    minHeight: 145,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  variantCameraCircle: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: '#FCEAF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantePhotoText: {
    marginTop: 9,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    color: '#8D345B',
  },
  stockTotalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 13,
    backgroundColor: '#FFF1F6',
    borderWidth: 1,
    borderColor: '#F2DDE6',
    marginTop: 2,
  },
  stockTotalIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  stockTotalInfo: { flex: 1, marginLeft: 10 },
  stockTotalLabel: { fontSize: 13, fontWeight: '800', color: '#65364D' },
  stockTotalDescription: { marginTop: 3, fontSize: 10, color: '#987B8B' },
  stockTotalValue: {
    fontSize: 23,
    fontWeight: '800',
    color: '#B83268',
    marginLeft: 8,
  },
  pricePreviewCard: {
    marginTop: 3,
    marginBottom: 4,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF0F5',
    borderWidth: 1,
    borderColor: '#F0D8E3',
  },
  pricePreviewTop: { flexDirection: 'row', alignItems: 'center' },
  pricePreviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricePreviewInfo: { flex: 1, marginLeft: 11 },
  pricePreviewLabel: { fontSize: 12, fontWeight: '800', color: '#75445B' },
  pricePreviewHint: { marginTop: 4, fontSize: 10, color: '#A08291' },
  pricePreviewValue: {
    marginTop: 13,
    fontSize: 27,
    fontWeight: '800',
    color: '#B83268',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    marginTop: 15,
    borderRadius: 13,
    backgroundColor: '#B83268',
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#9C2856',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 45,
    marginTop: 9,
    borderRadius: 12,
    backgroundColor: '#F4EAF0',
  },
  cancelButtonText: { color: '#80506A', fontSize: 13, fontWeight: '800' },
  categoryModalContent: {
    padding: 21,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E4EA',
  },
  categoryModalIcon: {
    width: 51,
    height: 51,
    borderRadius: 16,
    backgroundColor: '#FCEAF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  categoryModalSubtitle: {
    marginTop: 7,
    marginBottom: 16,
    fontSize: 12,
    lineHeight: 18,
    color: '#947A88',
  },
});
