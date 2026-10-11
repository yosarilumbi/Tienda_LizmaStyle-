
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CartProvider } from '../context/CartContext';
import { AuthProvider, useAuth } from '../database/AuthContext';

const RUTAS_PUBLICAS: string[] = [
  'login',
  'register',
  'welcome',
];

const RUTAS_ADMIN: string[] = [
  'home',
  'productos',
  'ventas',
  'creditos',
  'clientes',
  'historial-ventas',
  'perfil',
];

const RUTAS_CLIENTE: string[] = [
  'cliente-home',
  'catalogo-cliente',
  'carrito',
  'confirmar-pedido',
  'historial-cliente',
  'perfil',
  'asistente-ia',
];

function RouteGuard() {
  const { user, role, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const ruta: string = String(segments[0] ?? '');
  const esRutaPublica = RUTAS_PUBLICAS.includes(ruta);

  useEffect(() => {
    if (loading) {
      return;
    }

    // Si no inició sesión, permitir únicamente las rutas públicas.
    if (!user) {
      if (!esRutaPublica) {
        router.replace('/login');
      }
      return;
    }

    // Esperar a que Firebase determine un rol válido.
    if (role !== 'admin' && role !== 'cliente') {
      return;
    }

    // Si accede a una ruta pública, enviarlo a su pantalla de inicio.
    if (esRutaPublica || ruta === '') {
      router.replace(
        role === 'admin' ? '/home' : '/cliente-home'
      );
      return;
    }

    // Comprobar las rutas permitidas según el rol.
    const rutasPermitidas: string[] =
      role === 'admin' ? RUTAS_ADMIN : RUTAS_CLIENTE;

    if (!rutasPermitidas.includes(ruta)) {
      router.replace(
        role === 'admin' ? '/home' : '/cliente-home'
      );
    }
  }, [
    user,
    role,
    loading,
    ruta,
    esRutaPublica,
    router,
  ]);

  // Mostrar un indicador mientras se verifica la sesión o el rol.
  if (
    loading ||
    (user !== null && role !== 'admin' && role !== 'cliente')
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#D94F8A" />

          <Text style={styles.text}>
            {loading
              ? 'Verificando sesión...'
              : 'No se pudo verificar tu rol. Contacta al administrador.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <RouteGuard />
      </CartProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8FB',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    marginTop: 14,
    textAlign: 'center',
    color: '#444444',
    fontSize: 15,
  },
});
