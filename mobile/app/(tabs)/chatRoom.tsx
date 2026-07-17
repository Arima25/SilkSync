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
import { logger } from '@/lib/logger';
import {
  subscribeToChatMessages,
  sendChatMessage,
  sendCoordinationMessage,
  getTrainTravelers,
  checkJourneyDisruption,
  formatAlternativesSummary,
  ChatMessage,
  Traveler,
  getSocialIntentBadge,
} from '../../src/services/trainChatService';
import {
  blockUser,
  getBlockedUserIds,
  reportUser,
  ReportReason,
  REPORT_REASON_LABELS,
} from '../../src/services/safetyService';
import { getCoTravelers, CoTraveler } from '../../src/services/trustService';

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
  const departureStationZh = params.departureStationZh as string | undefined;
  const arrivalStationZh = params.arrivalStationZh as string | undefined;
  const departureTime = params.departureTime as string | undefined;
  // journeyId is built server-side as `${trainNumber}-${departureDate}` -- recover the date from it.
  const departureDate =
    (params.departureDate as string | undefined) ||
    (journeyId?.startsWith(`${trainNumber}-`) ? journeyId.slice(trainNumber.length + 1) : '');
  const soloPrice = Number(params.price);
  const hasPrice = Number.isFinite(soloPrice) && soloPrice > 0;

  // State
  const [activeTab, setActiveTab] = useState<TabType>('Chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCoordinationModal, setShowCoordinationModal] = useState(false);
  const [coordinationType, setCoordinationType] = useState<'pickup' | 'meal' | 'dining-car' | 'general'>('pickup');
  const [coordinationMessage, setCoordinationMessage] = useState('');
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [reportTarget, setReportTarget] = useState<Traveler | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>('harassment');
  const [reportMessage, setReportMessage] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [priorCoTravelerIds, setPriorCoTravelerIds] = useState<Set<string>>(new Set());

  const scrollViewRef = useRef<ScrollView>(null);

  // Check if user has joined (checked in)
  const userHasJoined = travelers.some(t => t.userId === user?.uid);

  // Hide anyone the current user has blocked
  const visibleTravelers = travelers.filter(t => !blockedUserIds.includes(t.userId));
  const visibleMessages = messages.filter(m => !blockedUserIds.includes(m.userId));

  // Load blocked users
  useEffect(() => {
    if (!user?.uid) return;

    getBlockedUserIds(user.uid).then(setBlockedUserIds);
  }, [user?.uid]);

  // Load users the current user has verifiably shared a *different* journey with before,
  // so returning travelers can be flagged as more trusted than someone just met.
  useEffect(() => {
    if (!user?.uid) return;

    getCoTravelers(user.uid).then((coTravelers: CoTraveler[]) => {
      const priorIds = coTravelers
        .filter((c) => c.journeyId !== journeyId)
        .map((c) => c.userId);
      setPriorCoTravelerIds(new Set(priorIds));
    });
  }, [user?.uid, journeyId]);

  const handleBlockTraveler = (traveler: Traveler) => {
    if (!user?.uid) return;

    Alert.alert(
      'Block this traveler?',
      `You won't see messages or check-ins from ${traveler.userName} anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(user.uid, traveler.userId);
              setBlockedUserIds((prev) => [...prev, traveler.userId]);
            } catch {
              Alert.alert('Error', 'Failed to block this traveler. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleOpenReport = (traveler: Traveler) => {
    setReportTarget(traveler);
    setReportReason('harassment');
    setReportMessage('');
  };

  const handleSubmitReport = async () => {
    if (!user?.uid || !reportTarget) return;

    setSubmittingReport(true);
    try {
      await reportUser(user.uid, reportTarget.userId, reportReason, reportMessage.trim(), journeyId);
      setReportTarget(null);
      Alert.alert('Report submitted', 'Thanks for letting us know. Our team will review it.');
    } catch {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleTravelerMenu = (traveler: Traveler) => {
    Alert.alert(
      traveler.userName,
      undefined,
      [
        { text: 'Report', style: 'destructive', onPress: () => handleOpenReport(traveler) },
        { text: 'Block', style: 'destructive', onPress: () => handleBlockTraveler(traveler) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Load travelers list
  useEffect(() => {
    if (!journeyId) return;

    const loadTravelers = async () => {
      try {
        const travelersList = await getTrainTravelers(journeyId);
        setTravelers(travelersList);
      } catch (error) {
        logger.error('Error loading travelers:', error);
      }
    };

    loadTravelers();

    // Refresh travelers list every 30 seconds
    const interval = setInterval(loadTravelers, 30000);

    return () => clearInterval(interval);
  }, [journeyId]);

  // Re-check the journey's schedule against 12306 and post an in-chat alert the
  // first time it flips to disrupted, reusing the same 30s cadence as the traveler refresh.
  useEffect(() => {
    if (!journeyId) return;

    const runDisruptionCheck = async () => {
      const result = await checkJourneyDisruption(journeyId);
      if (!result || !result.justTransitioned || result.status !== 'disrupted') return;

      try {
        await sendChatMessage(
          journeyId,
          'system',
          'SilkSync',
          null,
          `⚠️ Train ${trainNumber} appears unavailable for ${departureDate || 'this date'}. ${formatAlternativesSummary(result.alternatives)}`,
          'system'
        );
      } catch (error) {
        logger.error('Failed to post disruption alert:', error);
      }
    };

    runDisruptionCheck();
    const interval = setInterval(runDisruptionCheck, 30000);

    return () => clearInterval(interval);
  }, [journeyId, trainNumber, departureDate]);

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
      logger.error('Send message error:', error);
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
      logger.error('Send coordination error:', error);
    }
  };

  const handleOpenStationCard = () => {
    const cardParams = new URLSearchParams({
      journeyId,
      trainNumber,
      departureStation,
      arrivalStation,
      departureDate,
      departureTime: departureTime || '--:--',
      ...(departureStationZh ? { departureStationZh } : {}),
      ...(arrivalStationZh ? { arrivalStationZh } : {}),
    });
    router.push(`/(tabs)/station-card?${cardParams.toString()}`);
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

    if (visibleMessages.length === 0) {
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
        {visibleMessages.map((message) => {
          if (message.messageType === 'system') {
            return (
              <View key={message.id} style={styles.systemMessageRow}>
                <Ionicons name="alert-circle" size={16} color="#B45309" />
                <Text style={styles.systemMessageText}>{message.message}</Text>
              </View>
            );
          }

          const isOwnMessage = message.userId === user?.uid;
          const badge = getSocialIntentBadge(
            visibleTravelers.find(t => t.userId === message.userId)?.socialIntent || 'open_to_connect'
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
    if (visibleTravelers.length === 0) {
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

    // Cost split reflects everyone actually checked in, not just who's visible after blocking.
    const perPersonPrice = hasPrice ? soloPrice / travelers.length : null;
    const savings = hasPrice ? soloPrice - (perPersonPrice as number) : null;

    // Self-reported at check-in -- surfaces travelers in the same physical carriage,
    // not just the same train, which is a much stronger social signal.
    const myCoach = travelers.find(t => t.userId === user?.uid)?.coach || null;
    const sortedTravelers = myCoach
      ? [...visibleTravelers].sort((a, b) => {
          const aMatch = a.coach === myCoach ? 0 : 1;
          const bMatch = b.coach === myCoach ? 0 : 1;
          return aMatch - bMatch;
        })
      : visibleTravelers;
    const sameCoachCount = myCoach
      ? visibleTravelers.filter(t => t.coach === myCoach && t.userId !== user?.uid).length
      : 0;

    return (
      <ScrollView style={styles.travelersContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.travelersHeader}>
          {travelers.length} {travelers.length === 1 ? 'Traveler' : 'Travelers'} on this journey
        </Text>
        <View style={styles.verifiedNote}>
          <Ionicons name="shield-checkmark" size={14} color="#64748B" />
          <Text style={styles.verifiedNoteText}>
            Everyone here is a confirmed check-in on this exact train -- not a self-reported plan.
          </Text>
        </View>

        {myCoach && sameCoachCount > 0 && (
          <View style={styles.sameCoachBanner}>
            <Ionicons name="people-circle" size={18} color="#0F766E" />
            <Text style={styles.sameCoachBannerText}>
              {sameCoachCount} {sameCoachCount === 1 ? 'traveler is' : 'travelers are'} in your carriage (Coach {myCoach})
            </Text>
          </View>
        )}

        {hasPrice && (
          <View style={styles.splitCard}>
            <Text style={styles.splitCardLabel}>Split with the group</Text>
            <View style={styles.splitCardRow}>
              <View>
                <Text style={styles.splitCardPrice}>¥{(perPersonPrice as number).toFixed(2)}</Text>
                <Text style={styles.splitCardSub}>per person, {travelers.length} checked in</Text>
              </View>
              {travelers.length > 1 && (savings as number) > 0 && (
                <View style={styles.splitSavingsBadge}>
                  <Text style={styles.splitSavingsText}>Save ¥{(savings as number).toFixed(2)}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {sortedTravelers.map((traveler, index) => {
          const badge = getSocialIntentBadge(traveler.socialIntent);
          const isCurrentUser = traveler.userId === user?.uid;
          const isSameCoach = !isCurrentUser && myCoach !== null && traveler.coach === myCoach;
          const traveledTogetherBefore = !isCurrentUser && priorCoTravelerIds.has(traveler.userId);

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
                  {isSameCoach && (
                    <View style={styles.sameCoachBadge}>
                      <Text style={styles.sameCoachBadgeText}>YOUR CARRIAGE</Text>
                    </View>
                  )}
                </View>
                {traveledTogetherBefore && (
                  <View style={styles.traveledBeforeRow}>
                    <Ionicons name="shield-checkmark" size={12} color="#2563EB" />
                    <Text style={styles.traveledBeforeText}>Traveled together before</Text>
                  </View>
                )}
                <View style={[styles.socialIntentBadge, { backgroundColor: badge.color + '20' }]}>
                  <Ionicons name={badge.icon as any} size={14} color={badge.color} />
                  <Text style={[styles.socialIntentText, { color: badge.color }]}>
                    {badge.label}
                  </Text>
                </View>
              </View>
              {!isCurrentUser && (
                <TouchableOpacity
                  style={styles.travelerMenuButton}
                  onPress={() => handleTravelerMenu(traveler)}
                  accessibilityLabel={`More options for ${traveler.userName}`}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderReportModal = () => (
    <Modal
      visible={reportTarget !== null}
      transparent
      animationType="slide"
      onRequestClose={() => setReportTarget(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report {reportTarget?.userName}</Text>
            <TouchableOpacity onPress={() => setReportTarget(null)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Reason</Text>
          <View style={styles.coordinationTypes}>
            {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.coordinationTypeButton,
                  reportReason === reason && styles.coordinationTypeButtonActive,
                ]}
                onPress={() => setReportReason(reason)}
              >
                <Text
                  style={[
                    styles.coordinationTypeText,
                    reportReason === reason && styles.coordinationTypeTextActive,
                  ]}
                >
                  {REPORT_REASON_LABELS[reason]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.modalLabel}>Details (optional)</Text>
          <TextInput
            style={styles.coordinationInput}
            placeholder="What happened?"
            placeholderTextColor="#94A3B8"
            value={reportMessage}
            onChangeText={setReportMessage}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.sendCoordinationButton, submittingReport && styles.sendCoordinationButtonDisabled]}
            onPress={handleSubmitReport}
            disabled={submittingReport}
          >
            {submittingReport ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="flag" size={20} color="#fff" />
                <Text style={styles.sendCoordinationButtonText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
        <TouchableOpacity
          style={styles.infoButton}
          onPress={handleOpenStationCard}
          accessibilityLabel="Open offline station card"
        >
          <Ionicons name="qr-code-outline" size={24} color="#64748B" />
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
      {renderReportModal()}
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
  systemMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    maxWidth: '90%',
    gap: 8,
  },
  systemMessageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
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
  splitCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  splitCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
    marginBottom: 6,
  },
  splitCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  splitCardPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  splitCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  splitSavingsBadge: {
    backgroundColor: '#2DD4BF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  splitSavingsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  sameCoachBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 8,
  },
  sameCoachBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F766E',
    flex: 1,
  },
  sameCoachBadge: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  sameCoachBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  verifiedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  verifiedNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  traveledBeforeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  traveledBeforeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
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
  travelerMenuButton: {
    padding: 8,
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
