import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

type GroupMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  timestamp: any;
  readBy: string[];
  reactions?: { [key: string]: string[] };
  type?: 'text' | 'image' | 'system';
  imageURL?: string;
};

type GroupMember = {
  uid: string;
  name: string;
  photoURL?: string;
  role: 'admin' | 'member';
  joinedAt: any;
  isOnline?: boolean;
};

export default function GroupChatScreen() {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [groupData, setGroupData] = useState<any>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const user = auth().currentUser;

  const { chatId, groupName, groupPhoto, participants } = route.params;

  useEffect(() => {
    if (!user || !chatId) return;

    // Load group data
    const loadGroupData = async () => {
      try {
        const groupDoc = await firestore().collection('groups').doc(chatId).get();
        const data = groupDoc.data();
        setGroupData(data);
      } catch (error) {
        console.error('Error loading group data:', error);
      }
    };

    // Load group members
    const loadMembers = async () => {
      try {
        const membersData: GroupMember[] = [];
        for (const participantId of participants) {
          const userDoc = await firestore().collection('users').doc(participantId).get();
          const userData = userDoc.data() as any;
          
          membersData.push({
            uid: participantId,
            name: userData?.driverName || userData?.vehicleName || 'Unknown',
            photoURL: userData?.photoURL,
            role: participantId === groupData?.createdBy ? 'admin' : 'member',
            joinedAt: groupData?.createdAt,
            isOnline: true,
          });
        }
        setMembers(membersData);
      } catch (error) {
        console.error('Error loading members:', error);
      }
    };

    loadGroupData();
    loadMembers();

    // Listen to messages in real-time
    const messagesRef = firestore().collection('groupChats').doc(chatId).collection('messages');
    const unsubscribe = messagesRef
      .orderBy('timestamp', 'asc')
      .onSnapshot((snapshot) => {
        const messageList: GroupMessage[] = [];
        snapshot.forEach((doc) => {
          messageList.push({
            id: doc.id,
            ...doc.data(),
          } as GroupMessage);
        });
        setMessages(messageList);
        setLoading(false);
      }, (error) => {
        console.error('Error listening to messages:', error);
        setLoading(false);
      });

    return unsubscribe;
  }, [user, chatId, participants, groupData?.createdBy, groupData?.createdAt]);

  const sendMessage = async () => {
    if (!user || !newMessage.trim() || sending) return;

    setSending(true);
    
    try {
      const messagesRef = firestore().collection('groupChats').doc(chatId).collection('messages');
      const senderMember = members.find(m => m.uid === user.uid);

      await messagesRef.add({
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: senderMember?.name || user.displayName || 'Unknown',
        timestamp: firestore.FieldValue.serverTimestamp(),
        readBy: [user.uid],
        type: 'text',
        reactions: {},
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const messageTime = timestamp.toDate();
    return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: GroupMessage }) => {
    const isOwnMessage = item.senderId === user?.uid;
    const isSystemMessage = item.type === 'system';

    if (isSystemMessage) {
      return (
        <View style={{ alignItems: 'center', marginVertical: 8, paddingHorizontal: 16 }}>
          <View style={{
            backgroundColor: '#F3F4F6',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 16,
            maxWidth: '80%',
          }}>
            <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', fontStyle: 'italic' }}>
              {item.text}
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
              {formatTime(item.timestamp)}
            </Text>
          </View>
        </View>
      );
    }

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
          {!isOwnMessage && (
            <Text style={{
              color: '#6B7280',
              fontSize: 12,
              fontWeight: '600',
              marginBottom: 4,
            }}>
              {item.senderName || 'Unknown'}
            </Text>
          )}
          
          <Text style={{
            color: isOwnMessage ? 'white' : '#111827',
            fontSize: 16,
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
              color: isOwnMessage ? 'rgba(255,255,255,0.7)' : '#9CA3AF',
              fontSize: 12,
            }}>
              {formatTime(item.timestamp)}
            </Text>
            
            {isOwnMessage && (
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                {item.readBy.length > 1 ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
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
        paddingTop: 10,
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
            style={{ width: 20, height: 20, tintColor: 'black', resizeMode: 'contain' }}
          />
        </TouchableOpacity>

        {/* Group Photo */}
        <TouchableOpacity 
          onPress={() => setShowGroupInfo(true)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#8B5CF6',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          {groupPhoto ? (
            <Image 
              source={{ uri: groupPhoto }} 
              style={{ width: 40, height: 40, borderRadius: 20 }}
            />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: 'white' }}>
              G
            </Text>
          )}
        </TouchableOpacity>

        {/* Group Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '700', 
            color: '#111827',
            marginBottom: 2,
          }}>
            {groupName}
          </Text>
          <Text style={{ 
            fontSize: 12, 
            color: '#6B7280',
          }}>
            {members.length} members
          </Text>
        </View>

        {/* Header Actions */}
        <TouchableOpacity 
          onPress={() => setShowGroupInfo(true)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#F3F4F6',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 18 }}>ℹ️</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 16 }}
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

      {/* Group Info Modal */}
      <Modal
        visible={showGroupInfo}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
          {/* Modal Header */}
          <View style={{ 
            backgroundColor: 'white', 
            paddingTop: 50, 
            paddingBottom: 16, 
            paddingHorizontal: 16, 
            borderBottomWidth: 1, 
            borderBottomColor: '#E5E7EB',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <TouchableOpacity onPress={() => setShowGroupInfo(false)}>
              <Text style={{ color: '#2563EB', fontSize: 16, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Group Info</Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Modal Content */}
          <View style={{ flex: 1, padding: 16 }}>
            {/* Group Details */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: '#8B5CF6',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  {groupPhoto ? (
                    <Image 
                      source={{ uri: groupPhoto }} 
                      style={{ width: 80, height: 80, borderRadius: 40 }}
                    />
                  ) : (
                    <Text style={{ fontSize: 32, fontWeight: '700', color: 'white' }}>
                      G
                    </Text>
                  )}
                </View>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827' }}>
                  {groupName}
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                  {members.length} members
                </Text>
              </View>
            </View>

            {/* Members List */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 }}>
                Members ({members.length})
              </Text>
              
              <FlatList
                data={members}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    backgroundColor: 'white',
                    borderRadius: 12,
                    marginBottom: 8,
                  }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#E5E7EB',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}>
                      {item.photoURL ? (
                        <Image 
                          source={{ uri: item.photoURL }} 
                          style={{ width: 40, height: 40, borderRadius: 20 }}
                        />
                      ) : (
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#6B7280' }}>
                          {(item.name?.charAt(0) || 'U').toUpperCase()}
                        </Text>
                      )}
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>
                        {item.role === 'admin' ? 'Admin' : 'Member'}
                      </Text>
                    </View>
                  </View>
                )}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
