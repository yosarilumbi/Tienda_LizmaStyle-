
import { auth, db } from '@/database/firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu nombre completo');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Por favor ingresa una contraseña');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Error',
        'La contraseña debe tener al menos 6 caracteres'
      );
      return;
    }

    try {
      // Crear usuario en Firebase Authentication
      const usuarioCredential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const usuario = usuarioCredential.user;

      // Crear perfil del usuario en Firestore
      await setDoc(doc(db, 'usuarios', usuario.uid), {
        nombre: name.trim(),
        correo: email.trim(),
        rol: 'cliente',
        fechaRegistro: serverTimestamp(),
      });

      Alert.alert(
        '¡Registro exitoso!',
        'Tu cuenta de cliente ha sido creada correctamente.'
      );

      // Enviar al cliente a su pantalla principal
      router.replace('/cliente-home');

    } catch (error: any) {
      console.log('ERROR FIREBASE:', error.message);

      let mensaje = 'No se pudo crear la cuenta. Intenta de nuevo.';

      if (error.code === 'auth/email-already-in-use') {
        mensaje = 'Este correo ya está registrado. Intenta con otro.';
      } else if (error.code === 'auth/invalid-email') {
        mensaje = 'El correo electrónico no es válido.';
      } else if (error.code === 'auth/weak-password') {
        mensaje =
          'La contraseña es muy débil. Usa al menos 6 caracteres.';
      } else if (error.code === 'auth/operation-not-allowed') {
        mensaje =
          'El registro con correo está deshabilitado en Firebase. Actívalo en Authentication → Sign-in method.';
      } else if (error.code === 'auth/network-request-failed') {
        mensaje = 'Error de conexión. Verifica tu internet.';
      }

      Alert.alert('Error', mensaje);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FCE4EC"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* BOTÓN REGRESAR */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={28}
              color="#0c0c0c"
            />
          </TouchableOpacity>

          {/* LOGO / NOMBRE */}
          <View style={styles.logoSection}>
            <Text style={styles.brandName}>Lizma Style</Text>
          </View>

          {/* TÍTULO */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Crear Cuenta</Text>

            <Text style={styles.subtitle}>
              Regístrate para comenzar a disfrutar de Lizma Style
            </Text>
          </View>

          {/* FORMULARIO */}
          <View style={styles.formSection}>

            {/* NOMBRE */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="account-outline"
                size={22}
                color="#020202"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor="#C4C4C4"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* CORREO */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="email-outline"
                size={22}
                color="#030303"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                placeholderTextColor="#C4C4C4"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* CONTRASEÑA */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={22}
                color="#0e0d0d"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#C4C4C4"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <MaterialCommunityIcons
                  name={
                    showPassword
                      ? 'eye-outline'
                      : 'eye-off-outline'
                  }
                  size={22}
                  color="#0e0d0d"
                />
              </TouchableOpacity>
            </View>

            {/* CONFIRMAR CONTRASEÑA */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={22}
                color="#080808"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Confirmar contraseña"
                placeholderTextColor="#C4C4C4"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <TouchableOpacity
                onPress={() => setShowConfirm(!showConfirm)}
                style={styles.eyeButton}
              >
                <MaterialCommunityIcons
                  name={
                    showConfirm
                      ? 'eye-outline'
                      : 'eye-off-outline'
                  }
                  size={22}
                  color="#070707"
                />
              </TouchableOpacity>
            </View>

            {/* BOTÓN REGISTRAR */}
            <TouchableOpacity
              style={styles.registerButton}
              activeOpacity={0.8}
              onPress={handleRegister}
            >
              <Text style={styles.registerButtonText}>
                Registrarme
              </Text>
            </TouchableOpacity>

          </View>

          {/* IR A LOGIN */}
          <View style={styles.loginSection}>
            <Text style={styles.loginText}>
              ¿Ya tienes cuenta?{' '}
            </Text>

            <TouchableOpacity
              onPress={() => router.push('/login')}
            >
              <Text style={styles.loginLink}>
                Inicia Sesión
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCE4EC',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 10,
  },

  backButton: {
    marginTop: 10,
    marginBottom: 10,
    padding: 5,
  },

  logoSection: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  brandName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
  },

  titleSection: {
    alignItems: 'center',
    marginBottom: 25,
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000000',
  },

  subtitle: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },

  formSection: {
    width: '100%',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 55,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: '#131313',
  },

  eyeButton: {
    padding: 5,
  },

  registerButton: {
    backgroundColor: '#D94F8A',
    width: '100%',
    height: 55,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#D94F8A',
    elevation: 3,
    shadowColor: '#D94F8A',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  registerButtonText: {
    color: '#f0e7e7',
    fontSize: 18,
    fontWeight: 'bold',
  },

  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },

  loginText: {
    fontSize: 14,
    color: '#161616',
  },

  loginLink: {
    fontSize: 14,
    color: '#f10b0b',
    fontWeight: 'bold',
  },
});
