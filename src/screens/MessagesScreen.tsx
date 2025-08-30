import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Image, TextInput, Modal, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout, CommonStyles, Responsive } from '../design/DesignSystem';

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
      
      // Show search results toast
      if (searchQuery.trim().length > 2) {
        const resultCount = filtered.length;
        if (resultCount === 0) {
          Toast.show({
            type: 'info',
            text1: 'No Results Found',
            text2: `No conversations match "${searchQuery}"`,
            position: 'top',
            visibilityTime: 2000,
          });
        } else {
          Toast.show({
            type: 'success',
            text1: 'Search Results',
            text2: `Found ${resultCount} conversation${resultCount !== 1 ? 's' : ''}`,
            position: 'top',
            visibilityTime: 2000,
          });
        }
      }
    }
  }, [searchQuery, chats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadChats(), loadAvailableFriends()]);
      Toast.show({
        type: 'success',
        text1: 'Refreshed!',
        text2: 'Messages updated successfully',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Refresh Failed',
        text2: 'Unable to update messages',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setRefreshing(false);
    }
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
      
      Toast.show({
        type: 'success',
        text1: 'Group Created!',
        text2: `"${groupName.trim()}" group created successfully`,
        position: 'top',
        visibilityTime: 3000,
      });
    } catch (error) {
      console.error('Error creating group:', error);
      Toast.show({
        type: 'error',
        text1: 'Group Creation Failed',
        text2: 'Unable to create group. Please try again.',
        position: 'top',
        visibilityTime: 4000,
      });
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
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ 
        backgroundColor: Colors.card, 
        paddingTop: Responsive.verticalScale(10), 
        paddingBottom: Spacing.lg, 
        paddingHorizontal: Layout.screenPadding, 
        borderBottomWidth: 1, 
        borderBottomColor: Colors.border 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
          <Text style={{ fontSize: Typography['3xl'], fontWeight: '800', color: Colors.textPrimary }}>Messages</Text>
          <TouchableOpacity 
            onPress={() => setShowCreateGroup(true)}
            style={{
              backgroundColor: Colors.primary,
              paddingHorizontal: Spacing.lg,
              paddingVertical: Responsive.verticalScale(8),
              borderRadius: BorderRadius.full,
            }}
          >
            <Text style={{ color: Colors.textInverse, fontWeight: '700', fontSize: Typography.base }}>New Group</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={{ fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.lg }}>
          {filteredChats.length} conversation{filteredChats.length !== 1 ? 's' : ''}
        </Text>

        {/* Search Bar */}
        <View style={{ 
          backgroundColor: Colors.surface, 
          borderRadius: BorderRadius.lg, 
          paddingHorizontal: Spacing.lg, 
          borderWidth: 1, 
          borderColor: Colors.border 
        }}>
          <TextInput
            placeholder="Search conversations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ fontSize: Typography.lg, color: Colors.textPrimary }}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
      </View>

      {/* Chats List */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Layout.screenPadding }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => openChat(item)}
            onLongPress={() => {
              if (item.type === 'individual') {
                const friendUid = item.participants?.find(uid => uid !== user?.uid);
                if (friendUid) {
                  navigation.navigate('UserProfile', { 
                    userId: friendUid,
                    userName: item.name,
                    userPhoto: item.photoURL,
                  });
                }
              }
            }}
            style={{ 
              backgroundColor: Colors.card, 
              borderRadius: BorderRadius.xl, 
              padding: Layout.cardPadding, 
              marginBottom: Spacing.md, 
              ...Shadows.md,
              borderWidth: 1,
              borderColor: Colors.border
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Profile Photo */}
              <View style={{ 
                width: Layout.avatarMedium, 
                height: Layout.avatarMedium, 
                borderRadius: BorderRadius.full, 
                backgroundColor: Colors.surface, 
                justifyContent: 'center', 
                alignItems: 'center',
                marginRight: Spacing.md,
                position: 'relative'
              }}>
                {item.photoURL ? (
                  <Image 
                    source={{ uri: item.photoURL }} 
                    style={{ width: Layout.avatarMedium, height: Layout.avatarMedium, borderRadius: BorderRadius.full }}
                  />
                ) : (
                  <Text style={{ fontSize: Responsive.moderateScale(18), fontWeight: '700', color: Colors.textSecondary }}>
                    {item.isGroup ? 'G' : (item.name?.charAt(0) || 'U').toUpperCase()}
                  </Text>
                )}
                
                {/* Online indicator for individual chats */}
                {!item.isGroup && (
                  <View style={{ 
                    position: 'absolute', 
                    bottom: Responsive.verticalScale(2), 
                    right: Responsive.scale(2), 
                    width: Responsive.scale(12), 
                    height: Responsive.scale(12), 
                    borderRadius: BorderRadius.full, 
                    backgroundColor: Colors.success,
                    borderWidth: 2,
                    borderColor: Colors.background
                  }} />
                )}
                
                {/* Group indicator */}
                {item.isGroup && (
                  <View style={{ 
                    position: 'absolute', 
                    bottom: Responsive.verticalScale(2), 
                    right: Responsive.scale(2), 
                    width: Responsive.scale(12), 
                    height: Responsive.scale(12), 
                    borderRadius: BorderRadius.full, 
                    backgroundColor: Colors.primary,
                    borderWidth: 2,
                    borderColor: Colors.background
                  }} />
                )}
              </View>
              
              {/* Chat Info */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Responsive.verticalScale(4) }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: Colors.textPrimary, fontSize: Typography.lg, flex: 1 }}>
                      {item.name}
                    </Text>
                    {item.isGroup && (
                      <View style={{ 
                        backgroundColor: Colors.primary, 
                        paddingHorizontal: Responsive.scale(6), 
                        paddingVertical: Responsive.verticalScale(2), 
                        borderRadius: BorderRadius.md,
                        marginLeft: Spacing.sm
                      }}>
                        <Text style={{ color: Colors.textInverse, fontSize: Typography.xs, fontWeight: '700' }}>GROUP</Text>
                      </View>
                    )}
                  </View>
                  {item.lastMessage && (
                    <Text style={{ color: Colors.textTertiary, fontSize: Typography.sm }}>
                      {formatTime(item.lastMessage.timestamp)}
                    </Text>
                  )}
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: Colors.textSecondary, fontSize: Typography.base, flex: 1 }}>
                    {formatLastMessage(item.lastMessage)}
                  </Text>
                  
                  {item.unreadCount && item.unreadCount > 0 && (
                    <View style={{ 
                      backgroundColor: Colors.error, 
                      borderRadius: BorderRadius.lg, 
                      minWidth: Responsive.scale(20), 
                      height: Responsive.scale(20), 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      marginLeft: Spacing.sm
                    }}>
                      <Text style={{ color: Colors.textInverse, fontSize: Typography.sm, fontWeight: '700' }}>
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
            paddingTop: 10, 
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


