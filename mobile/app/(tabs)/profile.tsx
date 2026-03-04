import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useState, useCallback, useEffect } from 'react';
import { signOut, updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { auth } from '../../firebase/firebase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser, SocialIntent, SOCIAL_INTENT_LABELS, JourneyImage } from '@/src/context/UserContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = (SCREEN_WIDTH - 64) / 3;

export default function Profile() {
  const { user, profile, loading, updateProfile, updateSocialIntent, addJourneyImage, removeJourneyImage, updateProfilePhoto } = useUser();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showSocialIntentPicker, setShowSocialIntentPicker] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCustomStatus, setShowCustomStatus] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [customStatus, setCustomStatus] = useState('');

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please grant photo library access to upload images.',
            [{ text: 'OK' }]
          );
        }
      }
    })();
  }, []);

  const requestImagePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant photo library access in your device settings to upload images.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickProfileImage = useCallback(async () => {
    try {
      const hasPermission = await requestImagePermission();
      if (!hasPermission) return;

      console.log('Opening image picker for profile...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      console.log('Image picker result:', result.canceled ? 'canceled' : 'selected');
      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('Updating profile photo with URI:', result.assets[0].uri);
        await updateProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking profile image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  }, [updateProfilePhoto]);

  const pickJourneyImage = useCallback(async () => {
    try {
      const hasPermission = await requestImagePermission();
      if (!hasPermission) return;

      console.log('Opening image picker for journey...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      console.log('Image picker result:', result.canceled ? 'canceled' : 'selected');
      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('Adding journey image with URI:', result.assets[0].uri);
        const newImage: JourneyImage = {
          id: Date.now().toString(),
          uri: result.assets[0].uri,
          timestamp: Date.now(),
        };
        await addJourneyImage(newImage);
      }
    } catch (error) {
      console.error('Error picking journey image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  }, [addJourneyImage]);

  const handleRemoveImage = useCallback((imageId: string) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeJourneyImage(imageId) },
      ]
    );
  }, [removeJourneyImage]);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await signOut(auth);
            router.replace('/auth');
          },
        },
      ]
    );
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (editName.trim()) {
      await updateProfile({ displayName: editName.trim() });
      if (user) {
        await updateFirebaseProfile(user, { displayName: editName.trim() });
      }
    }
    setShowEditProfile(false);
  }, [editName, updateProfile, user]);

  const handleSelectIntent = useCallback(async (intent: SocialIntent) => {
    console.log('Selecting social intent:', intent);
    try {
      if (intent === 'custom') {
        // Show custom status modal
        setShowSocialIntentPicker(false);
        setCustomStatus(profile?.customStatus || '');
        setShowCustomStatus(true);
      } else {
        console.log('Calling updateSocialIntent...');
        await updateSocialIntent(intent);
        console.log('Social intent updated successfully');
        setShowSocialIntentPicker(false);
      }
    } catch (error) {
      console.error('Error updating social intent:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
      setShowSocialIntentPicker(false);
    }
  }, [updateSocialIntent, profile?.customStatus]);

  const handleSaveCustomStatus = useCallback(async () => {
    if (customStatus.trim()) {
      await updateSocialIntent('custom', customStatus.trim());
    }
    setShowCustomStatus(false);
  }, [customStatus, updateSocialIntent]);

  const getSocialIntentText = () => {
    if (!profile) return 'Tap to set your status';
    if (profile.socialIntent === 'custom' && profile.customStatus) {
      return profile.customStatus;
    }
    return SOCIAL_INTENT_LABELS[profile.socialIntent] || 'Tap to set your status';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PROFILE</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Avatar */}
        <TouchableOpacity onPress={pickProfileImage} style={styles.avatarContainer}>
          {profile?.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={50} color="#F5A962" />
            </View>
          )}
          <View style={styles.editAvatarBadge}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Name - fallback to Firebase auth user if profile not loaded */}
        <Text style={styles.userName}>
          {profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Guest User'}
        </Text>

        {/* Social Intent */}
        <TouchableOpacity onPress={() => setShowSocialIntentPicker(true)}>
          <Text style={styles.socialIntent}>{getSocialIntentText()}</Text>
        </TouchableOpacity>

        {/* Edit Profile Button */}
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => {
            setEditName(profile?.displayName || user?.displayName || user?.email?.split('@')[0] || '');
            setShowEditProfile(true);
          }}>
          <Text style={styles.editProfileText}>EDIT PROFILE</Text>
        </TouchableOpacity>

        {/* My Journeys Section */}
        <View style={styles.journeysHeader}>
          <Text style={styles.journeysTitle}>MY JOURNEYS</Text>
          <Text style={styles.journeysCount}>{profile?.journeyImages?.length || 0} stops</Text>
        </View>

        {/* Image Grid */}
        <View style={styles.imageGrid}>
          {profile?.journeyImages.map((image) => (
            <TouchableOpacity
              key={image.id}
              style={styles.imageContainer}
              onLongPress={() => handleRemoveImage(image.id)}>
              <Image source={{ uri: image.uri }} style={styles.journeyImage} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addImageButton} onPress={pickJourneyImage}>
            <Ionicons name="add" size={32} color="#2DD4BF" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setShowSettings(false);
                setEditName(profile?.displayName || '');
                setShowEditProfile(true);
              }}>
              <Ionicons name="person-outline" size={22} color="#333" />
              <Text style={styles.settingsItemText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setShowSettings(false);
                setShowSocialIntentPicker(true);
              }}>
              <Ionicons name="chatbubble-outline" size={22} color="#333" />
              <Text style={styles.settingsItemText}>Social Status</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            {/* Currently not to be added in MVP, but placeholders for future features 
            <TouchableOpacity style={styles.settingsItem}>
              <Ionicons name="notifications-outline" size={22} color="#333" />
              <Text style={styles.settingsItemText}>Notifications</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsItem}>
              <Ionicons name="lock-closed-outline" size={22} color="#333" />
              <Text style={styles.settingsItemText}>Privacy & Security</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsItem}>
              <Ionicons name="help-circle-outline" size={22} color="#333" />
              <Text style={styles.settingsItemText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity> */}

            <TouchableOpacity style={[styles.settingsItem, styles.logoutItem]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              <Text style={[styles.settingsItemText, styles.logoutText]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Social Intent Picker Modal */}
      <Modal visible={showSocialIntentPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>What are you looking for?</Text>
              <TouchableOpacity onPress={() => setShowSocialIntentPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {(Object.keys(SOCIAL_INTENT_LABELS) as SocialIntent[]).map((intent) => (
              <TouchableOpacity
                key={intent}
                style={[
                  styles.intentOption,
                  profile?.socialIntent === intent && styles.intentOptionActive,
                ]}
                onPress={() => handleSelectIntent(intent)}>
                <Text
                  style={[
                    styles.intentOptionText,
                    profile?.socialIntent === intent && styles.intentOptionTextActive,
                  ]}>
                  {SOCIAL_INTENT_LABELS[intent]}
                </Text>
                {profile?.socialIntent === intent && (
                  <Ionicons name="checkmark" size={20} color="#2DD4BF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfile} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your name"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.textInput, styles.disabledInput]}
              value={profile?.email || ''}
              editable={false}
              placeholder="Your email"
              placeholderTextColor="#999"
            />
            <Text style={styles.helperText}>Email cannot be changed</Text>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Status Modal */}
      <Modal visible={showCustomStatus} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Status</Text>
              <TouchableOpacity onPress={() => setShowCustomStatus(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>What are you looking for?</Text>
            <TextInput
              style={styles.textInput}
              value={customStatus}
              onChangeText={setCustomStatus}
              placeholder="e.g., Chasing sunsets and silk roads"
              placeholderTextColor="#999"
              multiline
              maxLength={100}
            />
            <Text style={styles.helperText}>{customStatus.length}/100 characters</Text>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveCustomStatus}>
              <Text style={styles.saveButtonText}>Save Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 1,
  },
  settingsButton: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: '#FDEBD0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#2DD4BF',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8FAFC',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  socialIntent: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  editProfileButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 32,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    letterSpacing: 0.5,
  },
  journeysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  journeysTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  journeysCount: {
    fontSize: 14,
    color: '#666',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 100,
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  journeyImage: {
    width: '100%',
    height: '100%',
  },
  addImageButton: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    backgroundColor: '#E0F7F4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2DD4BF',
    borderStyle: 'dashed',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  logoutItem: {
    borderBottomWidth: 0,
    marginTop: 16,
  },
  logoutText: {
    color: '#EF4444',
  },
  intentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  intentOptionActive: {
    backgroundColor: '#E0F7F4',
    borderWidth: 1,
    borderColor: '#2DD4BF',
  },
  intentOptionText: {
    fontSize: 16,
    color: '#333',
  },
  intentOptionTextActive: {
    color: '#2DD4BF',
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F8FAFC',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#999',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#2DD4BF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
