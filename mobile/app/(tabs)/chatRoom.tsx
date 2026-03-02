import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUser } from '../../src/context/UserContext';
import {
  subscribeToChatMessages,
  sendChatMessage,
  sendCoordinationMessage,
  getTrainTravelers,
  ChatMessage,
  Traveler,
  getSocialIntentBadge,
} from '../../src/services/trainChatService';

type TabType = 'Chat' | 'Traveler List';

export default function ChatRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, profile } = useUser();
  
  // Extract route params
  const trainNumber = params.trainNumber as string || 'G101';
  const journeyId = params.journeyId as string;
  const departureStation = params.departureStation as string || 'Shanghai';
  const arrivalStation = params.arrivalStation as string || 'Beijing';

  // State
  const [activeTab, setActiveTab] = useState<TabType>('Chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCoordinationModal, setShowCoordinationModal] = useState(false);
  const [coordinationType, setCoordinationType] = useState<'pickup' | 'meal' | 'dining-car' | 'general'>('pickup');
  const [coordinationMessage, setCoordinationMessage] = useState('');
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Check if user has joined (checked in)
  const userHasJoined = travelers.some(t => t.userId === user?.uid);

  // Load travelers list
  useEffect(() => {
    if (!journeyId) return;

    const loadTravelers = async () => {
      try {
        const travelersList = await getTrainTravelers(journeyId);
        setTravelers(travelersList);
      } catch (error) {
        console.error('Error loading travelers:', error);
      }
    };

    loadTravelers();
    
    // Refresh travelers list every 30 seconds
    const interval = setInterval(loadTravelers, 30000);
    
    return () => clearInterval(interval);
  }, [journeyId]);

  // Subscribe to chat messages
  useEffect(() => {
    if (!journeyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToChatMessages(journeyId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [journeyId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !profile) return;

    try {
      await sendChatMessage(
        journeyId,
        user.uid,
        profile.displayName,
        profile.photoURL,
        newMessage.trim()
      );
      setNewMessage('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
      console.error('Send message error:', error);
    }
  };

  const handleSendCoordination = async () => {
    if (!coordinationMessage.trim() || !user || !profile) return;

    try {
      await sendCoordinationMessage(
        journeyId,
        user.uid,
        profile.displayName,
        profile.photoURL,
        coordinationType,
        coordinationMessage.trim()
      );
      setCoordinationMessage('');
      setShowCoordinationModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to send coordination message');
      console.error('Send coordination error:', error);
    }
  };

  const formatMessageTime = (timestamp: any): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const renderChatTab = () => {
    if (!userHasJoined) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="chatbubbles" size={64} color="#2DD4BF" />
          </View>
          <Text style={styles.emptyStateTitle}>Welcome to your journey</Text>
          <Text style={styles.emptyStateSubtitle}>
            No one has chatted yet. Be the first to say hi and set your Social Intent!
          </Text>
          <TouchableOpacity 
            style={styles.setSocialIntentButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.setSocialIntentButtonText}>Set Social Intent</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2DD4BF" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      );
    }

    if (messages.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="chatbubbles-outline" size={64} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyStateTitle}>Start the conversation</Text>
          <Text style={styles.emptyStateSubtitle}>
            Be the first to say hi! Introduce yourself and share your travel plans.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => {
          const isOwnMessage = message.userId === user?.uid;
          const badge = getSocialIntentBadge(
            travelers.find(t => t.userId === message.userId)?.socialIntent || 'open_to_connect'
          );

          return (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                isOwnMessage && styles.messageRowOwn,
              ]}
            >
              {!isOwnMessage && (
                <Image
                  source={{ uri: message.userPhoto || 'https://via.placeholder.com/40' }}
                  style={styles.messageAvatar}
                />
              )}
              <View
                style={[
                  styles.messageBubble,
                  isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther,
                  message.messageType === 'coordination' && styles.messageBubbleCoordination,
                ]}
              >
                {!isOwnMessage && (
                  <View style={styles.messageHeader}>
                    <Text style={styles.messageSender}>{message.userName}</Text>
                    <View style={[styles.socialBadge, { backgroundColor: badge.color + '20' }]}>
                      <Ionicons name={badge.icon as any} size={10} color={badge.color} />
                      <Text style={[styles.socialBadgeText, { color: badge.color }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>
                )}
                {message.messageType === 'coordination' && (
                  <View style={styles.coordinationHeader}>
                    <Ionicons name="flash" size={14} color="#F59E0B" />
                    <Text style={styles.coordinationLabel}>
                      {message.coordinationType?.toUpperCase()} COORDINATION
                    </Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.messageText,
                    isOwnMessage && styles.messageTextOwn,
                  ]}
                >
                  {message.message}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    isOwnMessage && styles.messageTimeOwn,
                  ]}
                >
                  {formatMessageTime(message.timestamp)}
                </Text>
              </View>
              {isOwnMessage && (
                <Image
                  source={{ uri: message.userPhoto || 'https://via.placeholder.com/40' }}
                  style={styles.messageAvatar}
                />
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderTravelerList = () => {
    if (travelers.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="people-outline" size={64} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyStateTitle}>No travelers yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Be the first to check in to this journey!
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.travelersContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.travelersHeader}>
          JOINED CARRIAGE 04 • {travelers.length} {travelers.length === 1 ? 'Traveler' : 'Travelers'}
        </Text>
        {travelers.map((traveler, index) => {
          const badge = getSocialIntentBadge(traveler.socialIntent);
          const isCurrentUser = traveler.userId === user?.uid;

          return (
            <View key={`${traveler.userId}-${index}`} style={styles.travelerCard}>
              <Image
                source={{ uri: traveler.userPhoto || 'https://via.placeholder.com/48' }}
                style={styles.travelerAvatar}
              />
              <View style={styles.travelerInfo}>
                <View style={styles.travelerNameRow}>
                  <Text style={styles.travelerName}>{traveler.userName}</Text>
                  {isCurrentUser && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>ME</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.socialIntentBadge, { backgroundColor: badge.color + '20' }]}>
                  <Ionicons name={badge.icon as any} size={14} color={badge.color} />
                  <Text style={[styles.socialIntentText, { color: badge.color }]}>
                    {badge.label}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderCoordinationModal = () => (
    <Modal
      visible={showCoordinationModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCoordinationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Quick Coordination</Text>
            <TouchableOpacity onPress={() => setShowCoordinationModal(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Coordination Type</Text>
          <View style={styles.coordinationTypes}>
            {[
              { type: 'pickup' as const, label: 'Share a Didi/Taxi', icon: 'car' },
              { type: 'meal' as const, label: 'Meal Together', icon: 'restaurant' },
              { type: 'dining-car' as const, label: 'Dining Car', icon: 'fast-food' },
              { type: 'general' as const, label: 'General', icon: 'chatbubbles' },
            ].map((item) => (
              <TouchableOpacity
                key={item.type}
                style={[
                  styles.coordinationTypeButton,
                  coordinationType === item.type && styles.coordinationTypeButtonActive,
                ]}
                onPress={() => setCoordinationType(item.type)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={coordinationType === item.type ? '#2DD4BF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.coordinationTypeText,
                    coordinationType === item.type && styles.coordinationTypeTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.modalLabel}>Message</Text>
          <TextInput
            style={styles.coordinationInput}
            placeholder="E.g., Anyone heading to the dining car? Let's grab lunch!"
            placeholderTextColor="#94A3B8"
            value={coordinationMessage}
            onChangeText={setCoordinationMessage}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[
              styles.sendCoordinationButton,
              !coordinationMessage.trim() && styles.sendCoordinationButtonDisabled,
            ]}
            onPress={handleSendCoordination}
            disabled={!coordinationMessage.trim()}
          >
            <Ionicons name="flash" size={20} color="#fff" />
            <Text style={styles.sendCoordinationButtonText}>Send Coordination Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Train {trainNumber}</Text>
          <View style={styles.routeBadge}>
            <Ionicons name="train" size={12} color="#10B981" />
            <Text style={styles.routeText}>
              {departureStation} → {arrivalStation}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Chat' && styles.tabActive]}
          onPress={() => setActiveTab('Chat')}
        >
          <Text style={[styles.tabText, activeTab === 'Chat' && styles.tabTextActive]}>
            Chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Traveler List' && styles.tabActive]}
          onPress={() => setActiveTab('Traveler List')}
        >
          <Text style={[styles.tabText, activeTab === 'Traveler List' && styles.tabTextActive]}>
            Traveler List
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'Chat' ? renderChatTab() : renderTravelerList()}
      </View>

      {/* Input Section (only show in chat tab if user has joined) */}
      {activeTab === 'Chat' && userHasJoined && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
        >
          <View style={styles.inputSection}>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => setShowCoordinationModal(true)}
              >
                <Ionicons name="car" size={16} color="#2DD4BF" />
                <Text style={styles.quickActionText}>Didi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => {
                  setCoordinationType('meal');
                  setShowCoordinationModal(true);
                }}
              >
                <Ionicons name="restaurant" size={16} color="#2DD4BF" />
                <Text style={styles.quickActionText}>Meal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => {
                  setCoordinationType('dining-car');
                  setShowCoordinationModal(true);
                }}
              >
                <Ionicons name="fast-food" size={16} color="#2DD4BF" />
                <Text style={styles.quickActionText}>Dining</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.attachButton}>
                <Ionicons name="add-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
              <TextInput
                style={styles.messageInput}
                placeholder="Say hi to fellow travelers..."
                placeholderTextColor="#94A3B8"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !newMessage.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {renderCoordinationModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  routeText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  infoButton: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#F1F5F9',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2DD4BF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#2DD4BF',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  setSocialIntentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2DD4BF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
    gap: 8,
  },
  setSocialIntentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  messageRowOwn: {
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 16,
    padding: 12,
  },
  messageBubbleOther: {
    backgroundColor: '#F1F5F9',
  },
  messageBubbleOwn: {
    backgroundColor: '#2DD4BF',
  },
  messageBubbleCoordination: {
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  messageHeader: {
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 2,
  },
  socialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
    gap: 4,
  },
  socialBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  coordinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  coordinationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  messageTimeOwn: {
    color: '#D1FAE5',
  },
  travelersContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  travelersHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 12,
  },
  travelerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  travelerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  travelerInfo: {
    flex: 1,
  },
  travelerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  travelerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 8,
  },
  youBadge: {
    backgroundColor: '#2DD4BF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  socialIntentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  socialIntentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputSection: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2DD4BF',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachButton: {
    padding: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2DD4BF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
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
    color: '#0F172A',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  coordinationTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  coordinationTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  coordinationTypeButtonActive: {
    borderColor: '#2DD4BF',
    backgroundColor: '#F0FDFA',
  },
  coordinationTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  coordinationTypeTextActive: {
    color: '#2DD4BF',
  },
  coordinationInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  sendCoordinationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  sendCoordinationButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendCoordinationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
