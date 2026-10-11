import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const quickActions = [
  { icon: 'cart' as const, label: 'Ventas', color: '#0d0e0d' },
  { icon: 'package-variant' as const, label: 'Inventario', color: '#0f0f0f' },
  { icon: 'account-group' as const, label: 'Clientes', color: '#1d1c1c' },
  { icon: 'credit-card' as const, label: 'Créditos', color: '#050505' },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FCE4EC" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>¡Hola! 👋</Text>
            <Text style={styles.userName}>Bienvenido a Lizma Style</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <MaterialCommunityIcons name="account-circle" size={40} color="#131212" />
          </TouchableOpacity>
        </View>

        {/* Resumen rápido */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Resumen del día</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>--</Text>
              <Text style={styles.summaryLabel}>Ventas</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>--</Text>
              <Text style={styles.summaryLabel}>Productos</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>--</Text>
              <Text style={styles.summaryLabel}>Clientes</Text>
            </View>
          </View>
        </View>

        {/* Acciones rápidas */}
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: action.color + '15' },
                ]}
              >
                <MaterialCommunityIcons name={action.icon} size={28} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPIs recientes */}
        <Text style={styles.sectionTitle}>Indicadores recientes</Text>
        <View style={styles.kpiCard}>
          <View style={styles.kpiRow}>
            <MaterialCommunityIcons name="trending-up" size={20} color="#4CAF50" />
            <Text style={styles.kpiText}>Ventas del mes: Sin datos</Text>
          </View>
          <View style={styles.kpiRow}>
            <MaterialCommunityIcons name="trending-down" size={20} color="#F44336" />
            <Text style={styles.kpiText}>Créditos pendientes: Sin datos</Text>
          </View>
          <View style={styles.kpiRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF9800" />
            <Text style={styles.kpiText}>Stock bajo: Sin datos</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCE4EC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  userName: {
    fontSize: 14,
    color: '#000000',
    marginTop: 2,
  },
  profileButton: {
    padding: 5,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#000000',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F5E1EA',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiText: {
    fontSize: 14,
    color: '#000000',
    marginLeft: 10,
  },
});