import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Image, TextInput, Modal, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

type ChatItem = {
  id: string;
  type: 'individual' | 'group';
  name: string;
  photoURL?: string;
  lastMessage?: {
    text: string;
    timestamp: any;
    senderId: string;
    senderName?: string;
  };
  unreadCount?: number;
  participants?: string[];
  groupInfo?: {
    createdBy: string;
    createdAt: any;
    description?: string;
  };
  isGroup?: boolean;
};

export default function MessagesScreen() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [availableFriends, setAvailableFriends] = useState<any[]>([]);
  const navigation = useNavigation<any>();
  const user = auth().currentUser;

  const loadChats = useCallback(async () => {
    if (!user) return;
    
    try {
      const chatsData: ChatItem[] = [];
      
      // Load individual chats (friends)
      const friendsRef = firestore().collection('connections').doc(user.uid).collection('friends');
      const friendsSnap = await friendsRef.where('status', '==', 'accepted').get();
      
      for (const friendDoc of friendsSnap.docs) {
        const friendUid = friendDoc.id;
        
        // Get friend's profile data
        const userDoc = await firestore().collection('users').doc(friendUid).get();
        const userData = userDoc.data() as any;
        
        // Get last message from chat
        const chatId = [user.uid, friendUid].sort().join('_');
        const messagesRef = firestore().collection('chats').doc(chatId).collection('messages');
        const lastMessageSnap = await messagesRef.orderBy('timestamp', 'desc').limit(1).get();
        
        let lastMessage = undefined;
        let unreadCount = 0;
        
        if (!lastMessageSnap.empty) {
          const lastMsg = lastMessageSnap.docs[0];
          const senderDoc = await firestore().collection('users').doc(lastMsg.data().senderId).get();
          const senderData = senderDoc.data() as any;
          
          lastMessage = {
            text: lastMsg.data().text,
            timestamp: lastMsg.data().timestamp,
            senderId: lastMsg.data().senderId,
            senderName: senderData?.driverName || 'Unknown',
          };
          
          // Count unread messages
          const unreadSnap = await messagesRef
            .where('senderId', '==', friendUid)
            .where('read', '==', false)
            .get();
          unreadCount = unreadSnap.size;
        }
        
        chatsData.push({
          id: chatId,
          type: 'individual',
          name: userData?.driverName || userData?.vehicleName || 'Friend',
          photoURL: userData?.photoURL,
          lastMessage,
          unreadCount,
          participants: [user.uid, friendUid],
        });
      }
      
      // Load group chats
      const groupsRef = firestore().collection('groups');
      const groupsSnap = await groupsRef.where('participants', 'array-contains', user.uid).get();
      
      for (const groupDoc of groupsSnap.docs) {
        const groupData = groupDoc.data() as any;
        
        // Get last message from group chat
        const messagesRef = firestore().collection('groupChats').doc(groupDoc.id).collection('messages');
        const lastMessageSnap = await messagesRef.orderBy('timestamp', 'desc').limit(1).get();
        
        let lastMessage = undefined;
        let unreadCount = 0;
        
        if (!lastMessageSnap.empty) {
          const lastMsg = lastMessageSnap.docs[0];
          const senderDoc = await firestore().collection('users').doc(lastMsg.data().senderId).get();
          const senderData = senderDoc.data() as any;
          
          lastMessage = {
            text: lastMsg.data().text,
            timestamp: lastMsg.data().timestamp,
            senderId: lastMsg.data().senderId,
            senderName: senderData?.driverName || 'Unknown',
          };
          
          // Count unread messages for this user
          const unreadSnap = await messagesRef
            .where('readBy', 'array-contains', user.uid)
            .get();
          unreadCount = unreadSnap.size;
        }
        
        chatsData.push({
          id: groupDoc.id,
          type: 'group',
          name: groupData.name,
          photoURL: groupData.photoURL,
          lastMessage,
          unreadCount,
          participants: groupData.participants,
          groupInfo: {
            createdBy: groupData.createdBy,
            createdAt: groupData.createdAt,
            description: groupData.description,
          },
          isGroup: true,
        });
      }
      
      // Sort by latest message timestamp
      chatsData.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return b.lastMessage.timestamp.toMillis() - a.lastMessage.timestamp.toMillis();
      });
      
      setChats(chatsData);
      setFilteredChats(chatsData);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  }, [user]);

  const loadAvailableFriends = useCallback(async () => {
    if (!user) return;
    
    try {
      const friendsRef = firestore().collection('connections').doc(user.uid).collection('friends');
      const friendsSnap = await friendsRef.where('status', '==', 'accepted').get();
      
      const friendsData: any[] = [];
      
      for (const friendDoc of friendsSnap.docs) {
        const friendUid = friendDoc.id;
        const userDoc = await firestore().collection('users').doc(friendUid).get();
        const userData = userDoc.data() as any;
        
        friendsData.push({
          uid: friendUid,
          name: userData?.driverName || userData?.vehicleName || 'Friend',
          photoURL: userData?.photoURL,
        });
      }
      
      setAvailableFriends(friendsData);
    } catch (error) {
      console.error('Error loading available friends:', error);
    }
  }, [user]);

  useEffect(() => {
    loadChats().finally(() => setLoading(false));
    loadAvailableFriends();
  }, [loadChats, loadAvailableFriends]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage?.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    }
  }, [searchQuery, chats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadChats(), loadAvailableFriends()]);
    setRefreshing(false);
  }, [loadChats, loadAvailableFriends]);

  const openChat = (chat: ChatItem) => {
    if (chat.type === 'individual') {
      // Find the friend UID from participants
      const friendUid = chat.participants?.find(uid => uid !== user?.uid);
      if (friendUid) {
        navigation.navigate('Chat', { 
          chatId: chat.id,
          chatType: 'individual',
          friendUid: friendUid,
          friendName: chat.name,
          friendPhoto: chat.photoURL,
        });
      }
    } else {
      navigation.navigate('GroupChat', { 
        chatId: chat.id,
        groupName: chat.name,
        groupPhoto: chat.photoURL,
        participants: chat.participants || [],
      });
    }
  };

  const createGroup = async () => {
    if (!user || !groupName.trim() || selectedFriends.length === 0) return;
    
    try {
      const participants = [user.uid, ...selectedFriends];
      const groupData = {
        name: groupName.trim(),
        description: '',
        createdBy: user.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
        participants,
        photoURL: null,
      };
      
      const groupRef = await firestore().collection('groups').add(groupData);
      
      // Create initial group chat message
      await firestore().collection('groupChats').doc(groupRef.id).collection('messages').add({
        text: `${user.displayName || 'You'} created group "${groupName.trim()}"`,
        senderId: user.uid,
        timestamp: firestore.FieldValue.serverTimestamp(),
        type: 'system',
        readBy: participants,
      });
      
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedFriends([]);
      
      // Refresh chats
      await loadChats();
      
      Alert.alert('Success', 'Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    }
  };

  const toggleFriendSelection = (friendUid: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendUid) 
        ? prev.filter(uid => uid !== friendUid)
        : [...prev, friendUid]
    );
  };

  const formatLastMessage = (message: any) => {
    if (!message) return 'No messages yet';
    
    const isOwnMessage = message.senderId === user?.uid;
    const prefix = isOwnMessage ? 'You: ' : message.senderName ? `${message.senderName}: ` : '';
    const text = message.text.length > 30 ? message.text.substring(0, 30) + '...' : message.text;
    
    return prefix + text;
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const messageTime = timestamp.toDate();
    const diffInHours = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return messageTime.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
        <Text style={{ color: '#6B7280' }}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827' }}>Messages</Text>
          <TouchableOpacity 
            onPress={() => setShowCreateGroup(true)}
            style={{
              backgroundColor: '#2563EB',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>New Group</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
          {filteredChats.length} conversation{filteredChats.length !== 1 ? 's' : ''}
        </Text>

        {/* Search Bar */}
        <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <TextInput
            placeholder="Search conversations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ fontSize: 16, color: '#111827' }}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Chats List */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => openChat(item)}
            style={{ 
              backgroundColor: 'white', 
              borderRadius: 16, 
              padding: 16, 
              marginBottom: 12, 
              shadowColor: '#000', 
              shadowOpacity: 0.08, 
              shadowRadius: 12, 
              elevation: 3,
              borderWidth: 1,
              borderColor: '#F3F4F6'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Profile Photo */}
              <View style={{ 
                width: 50, 
                height: 50, 
                borderRadius: 25, 
                backgroundColor: '#E5E7EB', 
                justifyContent: 'center', 
                alignItems: 'center',
                marginRight: 12,
                position: 'relative'
              }}>
                {item.photoURL ? (
                  <Image 
                    source={{ uri: item.photoURL }} 
                    style={{ width: 50, height: 50, borderRadius: 25 }}
                  />
                ) : (
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#6B7280' }}>
                    {item.isGroup ? 'G' : (item.name?.charAt(0) || 'U').toUpperCase()}
                  </Text>
                )}
                
                {/* Online indicator for individual chats */}
                {!item.isGroup && (
                  <View style={{ 
                    position: 'absolute', 
                    bottom: 2, 
                    right: 2, 
                    width: 12, 
                    height: 12, 
                    borderRadius: 6, 
                    backgroundColor: '#10B981',
                    borderWidth: 2,
                    borderColor: 'white'
                  }} />
                )}
                
                {/* Group indicator */}
                {item.isGroup && (
                  <View style={{ 
                    position: 'absolute', 
                    bottom: 2, 
                    right: 2, 
                    width: 12, 
                    height: 12, 
                    borderRadius: 6, 
                    backgroundColor: '#8B5CF6',
                    borderWidth: 2,
                    borderColor: 'white'
                  }} />
                )}
              </View>
              
              {/* Chat Info */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#111827', fontSize: 16, flex: 1 }}>
                      {item.name}
                    </Text>
                    {item.isGroup && (
                      <View style={{ 
                        backgroundColor: '#8B5CF6', 
                        paddingHorizontal: 6, 
                        paddingVertical: 2, 
                        borderRadius: 8,
                        marginLeft: 8
                      }}>
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>GROUP</Text>
                      </View>
                    )}
                  </View>
                  {item.lastMessage && (
                    <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                      {formatTime(item.lastMessage.timestamp)}
                    </Text>
                  )}
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#6B7280', fontSize: 14, flex: 1 }}>
                    {formatLastMessage(item.lastMessage)}
                  </Text>
                  
                  {item.unreadCount && item.unreadCount > 0 && (
                    <View style={{ 
                      backgroundColor: '#EF4444', 
                      borderRadius: 10, 
                      minWidth: 20, 
                      height: 20, 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      marginLeft: 8
                    }}>
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>
                        {item.unreadCount > 99 ? '99+' : item.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ color: '#6B7280', fontSize: 16, textAlign: 'center' }}>
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
              {searchQuery ? 'Try adjusting your search terms' : 'Start chatting with your friends or create a group'}
            </Text>
          </View>
        }
      />

      {/* Create Group Modal */}
      <Modal
        visible={showCreateGroup}
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
            <TouchableOpacity onPress={() => setShowCreateGroup(false)}>
              <Text style={{ color: '#2563EB', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Create Group</Text>
            <TouchableOpacity 
              onPress={createGroup}
              disabled={!groupName.trim() || selectedFriends.length === 0}
            >
              <Text style={{ 
                color: (!groupName.trim() || selectedFriends.length === 0) ? '#9CA3AF' : '#2563EB', 
                fontSize: 16, 
                fontWeight: '600' 
              }}>
                Create
              </Text>
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <View style={{ flex: 1, padding: 16 }}>
            {/* Group Name Input */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                Group Name
              </Text>
              <TextInput
                style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
                placeholder="Enter group name"
                value={groupName}
                onChangeText={setGroupName}
                maxLength={50}
              />
            </View>

            {/* Friends Selection */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
                Select Friends ({selectedFriends.length} selected)
              </Text>
              
              <FlatList
                data={availableFriends}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => toggleFriendSelection(item.uid)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      backgroundColor: 'white',
                      borderRadius: 12,
                      marginBottom: 8,
                      borderWidth: 2,
                      borderColor: selectedFriends.includes(item.uid) ? '#2563EB' : 'transparent',
                    }}
                  >
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
                    
                    <Text style={{ flex: 1, fontSize: 16, color: '#111827' }}>
                      {item.name}
                    </Text>
                    
                    {selectedFriends.includes(item.uid) && (
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: '#2563EB',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}


