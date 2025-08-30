import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout, CommonStyles, Responsive } from '../design/DesignSystem';

type Message = {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  timestamp: any;
  read: boolean;
  readBy?: string[];
  reactions?: { [key: string]: string[] }; // emoji: [userId1, userId2]
  type?: 'text' | 'image' | 'system';
  imageURL?: string;
};

type TypingUser = {
  uid: string;
  name: string;
  timestamp: any;
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [friendData, setFriendData] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const user = auth().currentUser;

  const { chatId, chatType, friendUid, friendName, friendPhoto } = route.params;

  useEffect(() => {
    if (!user || !friendUid) return;

    // Load friend's complete profile data
    const loadFriendData = async () => {
      try {
        const friendDoc = await firestore().collection('users').doc(friendUid).get();
        const data = friendDoc.data();
        setFriendData(data);
      } catch (error) {
        console.error('Error loading friend data:', error);
      }
    };

    loadFriendData();

    // Create chat ID (sorted to ensure consistency)
    const actualChatId = chatId || [user.uid, friendUid].sort().join('_');
    const messagesRef = firestore().collection('chats').doc(actualChatId).collection('messages');

    // Listen to messages in real-time
    const unsubscribe = messagesRef
      .orderBy('timestamp', 'asc')
      .onSnapshot((snapshot) => {
        const messageList: Message[] = [];
        snapshot.forEach((doc) => {
          messageList.push({
            id: doc.id,
            ...doc.data(),
          } as Message);
        });
        setMessages(messageList);
        setLoading(false);
      }, (error) => {
        console.error('Error listening to messages:', error);
        setLoading(false);
      });

    // Listen to typing indicators
    const typingRef = firestore().collection('chats').doc(actualChatId).collection('typing');
    const typingUnsubscribe = typingRef
      .where('uid', '==', friendUid)
      .onSnapshot((snapshot) => {
        const typing: TypingUser[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Remove typing indicator after 5 seconds
          const now = new Date();
          const typingTime = data.timestamp.toDate();
          if ((now.getTime() - typingTime.getTime()) < 5000) {
            typing.push({
              uid: data.uid,
              name: data.name,
              timestamp: data.timestamp,
            });
          }
        });
        setTypingUsers(typing);
      });

    // Mark messages as read
    markMessagesAsRead(actualChatId);

    return () => {
      unsubscribe();
      typingUnsubscribe();
    };
  }, [user, friendUid, friendName, navigation, chatId]);

  const markMessagesAsRead = async (chatId: string) => {
    if (!user) return;
    
    try {
      const messagesRef = firestore().collection('chats').doc(chatId).collection('messages');
      const unreadMessages = await messagesRef
        .where('senderId', '==', friendUid)
        .where('read', '==', false)
        .get();

      const batch = firestore().batch();
      unreadMessages.docs.forEach((doc) => {
        batch.update(doc.ref, { 
          read: true,
          readBy: firestore.FieldValue.arrayUnion(user.uid)
        });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendTypingIndicator = async (isTyping: boolean) => {
    if (!user || !friendUid) return;
    
    const actualChatId = chatId || [user.uid, friendUid].sort().join('_');
    const typingRef = firestore().collection('chats').doc(actualChatId).collection('typing').doc(user.uid);
    
    if (isTyping) {
      await typingRef.set({
        uid: user.uid,
        name: user.displayName || 'You',
        timestamp: firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await typingRef.delete();
    }
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    
    // Send typing indicator
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      sendTypingIndicator(true);
    } else if (isTyping && text.length === 0) {
      setIsTyping(false);
      sendTypingIndicator(false);
    }
    
    // Clear typing indicator after 2 seconds of no typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (text.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTypingIndicator(false);
      }, 2000);
    }
  };

  const sendMessage = async () => {
    if (!user || !friendUid || !newMessage.trim() || sending) return;

    setSending(true);
    setIsTyping(false);
    sendTypingIndicator(false);
    
    try {
      const actualChatId = chatId || [user.uid, friendUid].sort().join('_');
      const messagesRef = firestore().collection('chats').doc(actualChatId).collection('messages');

      await messagesRef.add({
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || friendData?.driverName || 'You',
        timestamp: firestore.FieldValue.serverTimestamp(),
        read: false,
        readBy: [user.uid],
        type: 'text',
        reactions: {},
      });

      setNewMessage('');
      
      Toast.show({
        type: 'success',
        text1: 'Message Sent',
        text2: 'Your message has been delivered',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      Toast.show({
        type: 'error',
        text1: 'Send Failed',
        text2: 'Unable to send message. Please try again.',
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setSending(false);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    
    try {
      const actualChatId = chatId || [user.uid, friendUid].sort().join('_');
      const messageRef = firestore().collection('chats').doc(actualChatId).collection('messages').doc(messageId);
      
      await messageRef.update({
        [`reactions.${emoji}`]: firestore.FieldValue.arrayUnion(user.uid)
      });
      
      setShowReactions(null);
      
      Toast.show({
        type: 'success',
        text1: 'Reaction Added',
        text2: 'Your reaction has been added',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      Toast.show({
        type: 'error',
        text1: 'Reaction Failed',
        text2: 'Unable to add reaction. Please try again.',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    
    try {
      const actualChatId = chatId || [user.uid, friendUid].sort().join('_');
      const messageRef = firestore().collection('chats').doc(actualChatId).collection('messages').doc(messageId);
      
      await messageRef.update({
        [`reactions.${emoji}`]: firestore.FieldValue.arrayRemove(user.uid)
      });
      
      Toast.show({
        type: 'success',
        text1: 'Reaction Removed',
        text2: 'Your reaction has been removed',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Error removing reaction:', error);
      Toast.show({
        type: 'error',
        text1: 'Remove Failed',
        text2: 'Unable to remove reaction. Please try again.',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const messageTime = timestamp.toDate();
    return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    
    const messageTime = timestamp.toDate();
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else {
      return messageTime.toLocaleDateString();
    }
  };

  const renderReactions = (message: Message) => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) return null;
    
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
        {Object.entries(message.reactions).map(([emoji, users]) => (
          <TouchableOpacity
            key={emoji}
            onPress={() => {
              const hasReacted = users.includes(user?.uid || '');
              if (hasReacted) {
                removeReaction(message.id, emoji);
              } else {
                addReaction(message.id, emoji);
              }
            }}
            style={{
              backgroundColor: users.includes(user?.uid || '') ? '#2563EB' : '#F3F4F6',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              marginRight: 4,
              marginBottom: 4,
            }}
          >
            <Text style={{ fontSize: 12, marginRight: 4 }}>{emoji}</Text>
            <Text style={{ 
              fontSize: 10, 
              color: users.includes(user?.uid || '') ? 'white' : '#6B7280',
              fontWeight: '600'
            }}>
              {users.length}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === user?.uid;
    const showDate = index === 0 || 
      (messages[index - 1] && 
       formatDate(messages[index - 1].timestamp) !== formatDate(item.timestamp));

    return (
      <View>
        {showDate && (
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <View style={{
              backgroundColor: Colors.surface,
              paddingHorizontal: Spacing.md,
              paddingVertical: Responsive.verticalScale(6),
              borderRadius: BorderRadius.lg,
            }}>
              <Text style={{ color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '600' }}>
                {formatDate(item.timestamp)}
              </Text>
            </View>
          </View>
        )}
        
        <View style={{
          flexDirection: 'row',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          marginVertical: 4,
          paddingHorizontal: 16,
        }}>
          <View style={{
            maxWidth: '70%',
            backgroundColor: isOwnMessage ? Colors.primary : Colors.surface,
            borderRadius: BorderRadius.xl,
            paddingHorizontal: Spacing.lg,
            paddingVertical: Responsive.verticalScale(10),
            ...Shadows.sm,
          }}>
            {!isOwnMessage && (
              <Text style={{
                color: Colors.textSecondary,
                fontSize: Typography.sm,
                fontWeight: '600',
                marginBottom: Responsive.verticalScale(4),
              }}>
                {item.senderName || 'Unknown'}
              </Text>
            )}
            
            <Text style={{
              color: isOwnMessage ? Colors.textInverse : Colors.textPrimary,
              fontSize: Typography.lg,
              lineHeight: 20,
            }}>
              {item.text}
            </Text>
            
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 4,
            }}>
              <Text style={{
                color: isOwnMessage ? Colors.textInverse : Colors.textTertiary,
                fontSize: Typography.sm,
              }}>
                {formatTime(item.timestamp)}
              </Text>
              
              {isOwnMessage && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: Spacing.sm }}>
                  <Text style={{ color: Colors.textInverse, fontSize: Typography.sm }}>
                    {item.read ? '✓✓' : '✓'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowReactions(showReactions === item.id ? null : item.id)}
                    style={{ marginLeft: Spacing.sm }}
                  >
                    <Text style={{ color: Colors.textInverse, fontSize: Typography.lg }}>😊</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            {renderReactions(item)}
          </View>
        </View>
        
        {showReactions === item.id && (
          <View style={{
            position: 'absolute',
            right: isOwnMessage ? Responsive.scale(80) : Layout.screenPadding,
            bottom: 0,
            backgroundColor: Colors.card,
            borderRadius: BorderRadius.lg,
            padding: Spacing.sm,
            ...Shadows.lg,
            flexDirection: 'row',
          }}>
            {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => addReaction(item.id, emoji)}
                style={{ marginHorizontal: 4 }}
              >
                <Text style={{ fontSize: 20 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMessages(messages);
    } else {
      const filtered = messages.filter(message => 
        message.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMessages(filtered);
    }
  }, [searchQuery, messages]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Custom Header */}
      <View style={{
        backgroundColor: Colors.card,
        paddingTop: Responsive.verticalScale(10),
        paddingBottom: Spacing.lg,
        paddingHorizontal: Layout.screenPadding,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        {/* Back Button */}
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{
            width: Responsive.scale(40),
            height: Responsive.scale(40),
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: Spacing.md,
          }}
        >
          <Image 
            source={require('../assets/left-arrow.png')} 
            style={{ width: Responsive.scale(20), height: Responsive.scale(20), tintColor: Colors.textPrimary, resizeMode: 'contain' }}
          />
        </TouchableOpacity>

        {/* Friend Profile Photo */}
        <TouchableOpacity 
          onPress={() => {
            // Navigate to friend profile
            Alert.alert('Profile', 'Friend profile view coming soon!');
          }}
          style={{
            width: Responsive.scale(40),
            height: Responsive.scale(40),
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: Spacing.md,
          }}
        >
          {friendPhoto ? (
            <Image 
              source={{ uri: friendPhoto }} 
              style={{ width: Responsive.scale(40), height: Responsive.scale(40), borderRadius: BorderRadius.full }}
            />
          ) : (
            <Text style={{ fontSize: Typography.lg, fontWeight: '700', color: Colors.textSecondary }}>
              {(friendData?.driverName || friendName || 'F').charAt(0).toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>

        {/* Friend Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ 
            fontSize: Typography.lg, 
            fontWeight: '700', 
            color: Colors.textPrimary,
            marginBottom: Responsive.verticalScale(2),
          }}>
            {friendData?.driverName || friendName || 'Friend'}
          </Text>
          <Text style={{ 
            fontSize: Typography.sm, 
            color: Colors.textSecondary,
            marginBottom: Responsive.verticalScale(1),
          }}>
            {friendData?.vehicleName || 'Vehicle'}
          </Text>
          {friendData?.vehicleNumber && (
            <Text style={{ 
              fontSize: Typography.sm, 
              color: Colors.textTertiary,
              fontWeight: '600',
            }}>
              {friendData.vehicleNumber}
            </Text>
          )}
        </View>

        {/* Header Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => setShowSearch(!showSearch)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#F3F4F6',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 8,
            }}
          >
            <Text style={{ fontSize: 18 }}>🔍</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => {
              Alert.alert('More Options', 'More options coming soon!');
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#F3F4F6',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 18 }}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={{
          backgroundColor: 'white',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}>
          <TextInput
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 16,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
            placeholder="Search messages..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      )}

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={filteredMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ color: '#6B7280', fontSize: 16, textAlign: 'center' }}>
                {searchQuery ? 'No messages found' : 'No messages yet'}
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
                {searchQuery ? 'Try adjusting your search terms' : 'Start the conversation!'}
              </Text>
            </View>
          }
        />

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <View style={{
            backgroundColor: '#F3F4F6',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
          }}>
            <Text style={{ color: '#6B7280', fontSize: 14, fontStyle: 'italic' }}>
              {typingUsers[0].name} is typing...
            </Text>
          </View>
        )}

        {/* Message Input */}
        <View style={{
          backgroundColor: 'white',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Media', 'Media sharing coming soon!');
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#F3F4F6',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 8,
            }}
          >
            <Text style={{ fontSize: 18 }}>📎</Text>
          </TouchableOpacity>
          
          <TextInput
            style={{
              flex: 1,
              backgroundColor: '#F9FAFB',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              marginRight: 8,
              fontSize: 16,
              color: '#111827',
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={newMessage}
            onChangeText={handleTyping}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
            style={{
              backgroundColor: newMessage.trim() ? '#2563EB' : '#E5E7EB',
              borderRadius: 20,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Image source={require('../assets/send.png')} style={{ width: 20, height: 20, tintColor: 'white', resizeMode: 'contain' }} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
