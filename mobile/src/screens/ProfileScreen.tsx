// Profile Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService, currencyService } from '@/services';
import { RootStackParamList, User } from '@/types';

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'>;
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [user, setUser] = useState<User | null>(null);
  const [preferredCurrency, setPreferredCurrency] = useState<'CNY' | 'USD'>('CNY');

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser({
        id: currentUser.id,
        email: currentUser.email || '',
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        phoneNumber: currentUser.phoneNumber,
        createdAt: currentUser.createdAt ?? new Date(),
      });
    }
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
              // Navigation will be handled by auth state listener
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const toggleCurrency = () => {
    setPreferredCurrency(preferredCurrency === 'CNY' ? 'USD' : 'CNY');
  };

  const menuItems = [
    { icon: '📋', title: 'My Itineraries', onPress: () => {} },
    { icon: '👥', title: 'Travel Companions', onPress: () => {} },
    { icon: '💳', title: 'Payment Methods', onPress: () => {} },
    { icon: '🔔', title: 'Notifications', onPress: () => {} },
    { icon: '🌐', title: 'Language', onPress: () => {} },
    { icon: '❓', title: 'Help & Support', onPress: () => {} },
    { icon: '📄', title: 'Terms & Privacy', onPress: () => {} },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user?.displayName?.charAt(0).toUpperCase() || '👤'}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.editAvatarButton}>
            <Text style={styles.editAvatarText}>📷</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{user?.displayName || 'Traveler'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.memberSince}>
          Member since {user?.createdAt.toLocaleDateString()}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Companions</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Cities</Text>
        </View>
      </View>

      {/* Currency Preference */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <TouchableOpacity style={styles.preferenceItem} onPress={toggleCurrency}>
          <View style={styles.preferenceLeft}>
            <Text style={styles.preferenceIcon}>💰</Text>
            <Text style={styles.preferenceText}>Preferred Currency</Text>
          </View>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyBadgeText}>{preferredCurrency}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.exchangeInfo}>
          <Text style={styles.exchangeText}>
            Current rate: {currencyService.formatCurrency(1, 'USD')} = {' '}
            {currencyService.formatCurrency(currencyService.usdToCny(1), 'CNY')}
          </Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuText}>{item.title}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>

      {/* App Version */}
      <Text style={styles.version}>SilkSync v1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#c9a227',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2a2a4a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#c9a227',
  },
  avatarText: {
    fontSize: 40,
    color: '#c9a227',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#c9a227',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarText: {
    fontSize: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  memberSince: {
    fontSize: 12,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#2a2a4a',
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#c9a227',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#444',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  preferenceItem: {
    backgroundColor: '#2a2a4a',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  preferenceText: {
    color: '#fff',
    fontSize: 16,
  },
  currencyBadge: {
    backgroundColor: '#c9a227',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currencyBadgeText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
  exchangeInfo: {
    marginTop: 10,
    paddingLeft: 10,
  },
  exchangeText: {
    color: '#888',
    fontSize: 12,
  },
  menuItem: {
    backgroundColor: '#2a2a4a',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
  },
  menuArrow: {
    color: '#888',
    fontSize: 24,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#3a2020',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#555',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 40,
  },
});

export default ProfileScreen;
