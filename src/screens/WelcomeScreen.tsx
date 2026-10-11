import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FCE4EC" />

      <View style={styles.content}>

        {/* Foto del negocio */}
        <Image
          source={require('../../assets/foto-negocio.jpeg')}
          style={styles.fotoNegocio}
          resizeMode="cover"
        />

        {/* Logo */}
        <View style={styles.logoSection}>
          <MaterialCommunityIcons
            name="hanger"
            size={45}
            color="#D94F8A"
          />

          <Text style={styles.brandName}>Lizma Style</Text>

          <Text style={styles.tagline}>
            Moda que va contigo ✨
          </Text>
        </View>

        {/* Bienvenida */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>
            Bienvenido a Lizma Style
          </Text>

          <Text style={styles.welcomeSubtitle}>
            TU APLICACIÓN MÓVIL
          </Text>
        </View>

        {/* Botones */}
        <View style={styles.buttonsSection}>
          <TouchableOpacity
            style={styles.loginButton}
            activeOpacity={0.8}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>
              Iniciar Sesión
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            activeOpacity={0.8}
            onPress={() => router.push('/register')}
          >
            <Text style={styles.registerButtonText}>
              Registrarme
            </Text>
          </TouchableOpacity>
        </View>

        {/* Versión */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>
            Versión 1.0.0
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCE4EC',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },

  fotoNegocio: {
    width: '100%',
    height: 210,
    borderRadius: 22,
    marginBottom: 20,
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: 25,
  },

  brandName: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#070707',
    marginTop: 3,
  },

  tagline: {
    fontSize: 14,
    color: '#030303',
    marginTop: 5,
    fontStyle: 'italic',
  },

  welcomeSection: {
    alignItems: 'center',
    marginBottom: 25,
  },

  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },

  welcomeSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 4,
    marginTop: 6,
  },

  buttonsSection: {
    width: '100%',
    alignItems: 'center',
  },

  loginButton: {
    backgroundColor: '#D94F8A',
    width: '100%',
    height: 55,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#D94F8A',
    elevation: 3,
    shadowColor: '#111111',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  registerButton: {
    backgroundColor: '#D94F8A',
    width: '100%',
    height: 55,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D94F8A',
  },

  registerButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  footer: {
    position: 'absolute',
    bottom: 25,
  },

  versionText: {
    fontSize: 12,
    color: '#080808',
    fontWeight: '500',
  },
});