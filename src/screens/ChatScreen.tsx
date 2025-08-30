import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

type Message = {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  read: boolean;
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [friendData, setFriendData] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const user = auth().currentUser;

  const { friendUid, friendName, friendPhoto } = route.params;

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
    const chatId = [user.uid, friendUid].sort().join('_');
    const messagesRef = firestore().collection('chats').doc(chatId).collection('messages');

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

    // Mark messages as read
    markMessagesAsRead(chatId);

    return unsubscribe;
  }, [user, friendUid, friendName, navigation]);

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
        batch.update(doc.ref, { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !friendUid || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      const chatId = [user.uid, friendUid].sort().join('_');
      const messagesRef = firestore().collection('chats').doc(chatId).collection('messages');

      await messagesRef.add({
        text: newMessage.trim(),
        senderId: user.uid,
        timestamp: firestore.FieldValue.serverTimestamp(),
        read: false,
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const messageTime = timestamp.toDate();
    return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.uid;

    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 16,
      }}>
        <View style={{
          maxWidth: '70%',
          backgroundColor: isOwnMessage ? '#2563EB' : '#F3F4F6',
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingVertical: 10,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}>
          <Text style={{
            color: isOwnMessage ? 'white' : '#111827',
            fontSize: 16,
            lineHeight: 20,
          }}>
            {item.text}
          </Text>
          <Text style={{
            color: isOwnMessage ? 'rgba(255,255,255,0.7)' : '#9CA3AF',
            fontSize: 12,
            marginTop: 4,
            alignSelf: 'flex-end',
          }}>
            {formatTime(item.timestamp)}
            {isOwnMessage && (
              <Text style={{ marginLeft: 4 }}>
                {item.read ? '✓✓' : '✓'}
              </Text>
            )}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      {/* Custom Header */}
      <View style={{
        backgroundColor: 'white',
        paddingTop:10,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        {/* Back Button */}
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#F3F4F6',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          <Image 
              source={require('../assets/left-arrow.png')} 
              style={{  width: 20, height: 20, tintColor: 'black', resizeMode: 'contain' }}
            />
        </TouchableOpacity>

        {/* Friend Profile Photo */}
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#E5E7EB',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}>
          {friendPhoto ? (
            <Image 
              source={{ uri: friendPhoto }} 
              style={{ width: 40, height: 40, borderRadius: 20 }}
            />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#6B7280' }}>
              {(friendData?.driverName || friendName || 'F').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>

        {/* Friend Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '700', 
            color: '#111827',
            marginBottom: 2,
          }}>
            {friendData?.driverName || friendName || 'Friend'}
          </Text>
          <Text style={{ 
            fontSize: 12, 
            color: '#6B7280',
            marginBottom: 1,
          }}>
            {friendData?.vehicleName || 'Vehicle'}
          </Text>
          {friendData?.vehicleNumber && (
            <Text style={{ 
              fontSize: 12, 
              color: '#9CA3AF',
              fontWeight: '600',
            }}>
              {friendData.vehicleNumber}
            </Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ color: '#6B7280', fontSize: 16, textAlign: 'center' }}>
                No messages yet
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
                Start the conversation!
              </Text>
            </View>
          }
        />

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
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
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
