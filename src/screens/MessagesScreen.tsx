import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

type ChatFriend = {
  uid: string;
  driverName?: string;
  vehicleName?: string;
  photoURL?: string;
  lastMessage?: {
    text: string;
    timestamp: any;
    senderId: string;
  };
  unreadCount?: number;
};

export default function MessagesScreen() {
  const [friends, setFriends] = useState<ChatFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();
  const user = auth().currentUser;

  const loadFriendsWithMessages = useCallback(async () => {
    if (!user) return;
    
    try {
      // Get accepted friends
      const friendsRef = firestore().collection('connections').doc(user.uid).collection('friends');
      const friendsSnap = await friendsRef.where('status', '==', 'accepted').get();
      
      const friendsData: ChatFriend[] = [];
      
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
          lastMessage = {
            text: lastMsg.data().text,
            timestamp: lastMsg.data().timestamp,
            senderId: lastMsg.data().senderId,
          };
          
          // Count unread messages
          const unreadSnap = await messagesRef
            .where('senderId', '==', friendUid)
            .where('read', '==', false)
            .get();
          unreadCount = unreadSnap.size;
        }
        
        friendsData.push({
          uid: friendUid,
          driverName: userData?.driverName,
          vehicleName: userData?.vehicleName,
          photoURL: userData?.photoURL,
          lastMessage,
          unreadCount,
        });
      }
      
      // Sort by latest message timestamp
      friendsData.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return b.lastMessage.timestamp.toMillis() - a.lastMessage.timestamp.toMillis();
      });
      
      setFriends(friendsData);
    } catch (error) {
      console.error('Error loading friends with messages:', error);
    }
  }, [user]);

  useEffect(() => {
    loadFriendsWithMessages().finally(() => setLoading(false));
  }, [loadFriendsWithMessages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFriendsWithMessages();
    setRefreshing(false);
  }, [loadFriendsWithMessages]);

  const openChat = (friend: ChatFriend) => {
    navigation.navigate('Chat', { 
      friendUid: friend.uid,
      friendName: friend.driverName || friend.vehicleName || 'Friend',
      friendPhoto: friend.photoURL,
    });
  };

  const formatLastMessage = (message: any) => {
    if (!message) return 'No messages yet';
    
    const isOwnMessage = message.senderId === user?.uid;
    const prefix = isOwnMessage ? 'You: ' : '';
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
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827' }}>Messages</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
          {friends.length} conversation{friends.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Friends List */}
      <FlatList
        data={friends}
        keyExtractor={(item) => item.uid}
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
                    {item.driverName?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                )}
                
                {/* Online indicator */}
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
              </View>
              
              {/* Chat Info */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontWeight: '700', color: '#111827', fontSize: 16 }}>
                    {item.driverName || item.vehicleName || 'Friend'}
                  </Text>
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
              No conversations yet
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
              Start chatting with your friends from the Friends tab
            </Text>
          </View>
        }
      />
    </View>
  );
}


