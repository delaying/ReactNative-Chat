import { useCallback, useEffect, useState } from 'react';
import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import _ from 'lodash';

import { Chat, Collections, Message, User } from '../types';

// userIds를 받아서 규칙에 따라 lodash를 사용하여 정렬해주는 함수
const getChatKey = (userIds: string[]) => {
  // userId값을 오름차순으로 정렬하는 것
  return _.orderBy(userIds, userId => userId, 'asc');
};

// 사용자가 포함된 채팅방이 있다면 불러오고, 없다면 새로생성
const useChat = (userIds: string[]) => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const addNewMessage = useCallback((newMessages: Message[]) => {
    // 새로운 메시지가 중복되더라도 같은메시지가 있으면 lodash uniqBy로 제거해줌
    setMessages(prevMessages => {
      return _.uniqBy(newMessages.concat(prevMessages), m => m.id);
    });
  }, []);

  // 채팅방에서 프로필이미지를 가져오기위함
  const loadUsers = async (uIds: string[]) => {
    const usersSnapshot = await firestore()
      .collection(Collections.USERS)
      .where('userId', 'in', uIds)
      .get();
    const users = usersSnapshot.docs.map<User>(doc => doc.data() as User);
    return users;
  };

  const loadChat = useCallback(async () => {
    try {
      setLoadingChat(true);
      // userIds랑 우리가 준 userIds가 같은 채팅방이 생성되어있는지 체크
      const chatSnapshot = await firestore()
        .collection(Collections.CHATS)
        .where('userIds', '==', getChatKey(userIds))
        .get();

      if (chatSnapshot.docs.length > 0) {
        const doc = chatSnapshot.docs[0];
        const chatUserIds = doc.data().userIds as string[];
        const users = await loadUsers(chatUserIds);

        setChat({
          id: doc.id,
          userIds: chatUserIds,
          users: users,
        });
        return;
      }

      const users = await loadUsers(userIds);
      const data = {
        userIds: getChatKey(userIds),
        users,
      };

      const doc = await firestore().collection(Collections.CHATS).add(data);
      setChat({
        id: doc.id,
        ...data,
      });
    } finally {
      setLoadingChat(false);
    }
  }, [userIds]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  //   메시지 전송 구현
  const sendMessage = useCallback(
    async (text: string, user: User) => {
      if (chat?.id == null) {
        throw new Error('Chat is not loaded');
      }

      try {
        setSending(true);

        //   서브컬렉션 열어주어 저장하기
        const doc = await firestore()
          .collection(Collections.CHATS)
          .doc(chat.id)
          .collection(Collections.MESSAGES)
          .add({
            text: text,
            user: user,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });

        // 이전 메시지 + 새로운 메시지 업데이트
        addNewMessage([
          {
            id: doc.id,
            text: text,
            user: user,
            imageUrl: null,
            createdAt: new Date(),
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [chat?.id, addNewMessage],
  );

  //    onSnapshot활용하여 실시간으로 메시지 받기
  useEffect(() => {
    if (chat?.id == null) {
      return;
    }
    setLoadingMessages(true);
    const unsubscribe = firestore()
      .collection(Collections.CHATS)
      .doc(chat.id)
      .collection(Collections.MESSAGES)
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        if (snapshot.metadata.hasPendingWrites) {
          return;
        }
        // 메시지가 추가될때만 내용변경
        const newMessages = snapshot
          .docChanges()
          .filter(({ type }) => type === 'added')
          .map(docChange => {
            const { doc } = docChange;
            const docData = doc.data();
            const newMessage: Message = {
              id: doc.id,
              text: docData.text ?? null,
              imageUrl: docData.imageUrl ?? null,
              user: docData.user,
              createdAt: docData.createdAt.toDate(),
            };
            return newMessage;
          });
        addNewMessage(newMessages);
        setLoadingMessages(false);
      });

    return () => {
      unsubscribe();
    };
  }, [addNewMessage, chat?.id]);

  // 메시지 읽음 표시기능
  const updateMessageReadAt = useCallback(
    async (userId: string) => {
      if (chat == null) {
        return null;
      }
      firestore()
        .collection(Collections.CHATS)
        .doc(chat.id)
        .update({
          [`userToMessageReadAt.${userId}`]:
            firestore.FieldValue.serverTimestamp(),
        });
    },
    [chat],
  );

  const [userToMessageReadAt, setUserToMessageReadAt] = useState<{
    [userId: string]: Date;
  }>({});

  useEffect(() => {
    if (chat == null) {
      return;
    }
    const unsubscribe = firestore()
      .collection(Collections.CHATS)
      .doc(chat.id)
      .onSnapshot(snapshot => {
        if (snapshot.metadata.hasPendingWrites) {
          return;
        }
        const chatData = snapshot.data() ?? {};
        const userToMessageReadTimestap = chatData.userToMessageReadAt as {
          [userId: string]: FirebaseFirestoreTypes.Timestamp;
        };
        const userToMessageReadDate = _.mapValues(
          userToMessageReadTimestap,
          updateMessageReadTimestap => updateMessageReadTimestap.toDate(),
        );
        setUserToMessageReadAt(userToMessageReadDate);
      });

    return () => {
      unsubscribe();
    };
  }, [chat]);

  const sendImageMessage = useCallback(
    async (filepath: string, user: User) => {
      setSending(true);
      try {
        if (chat == null) {
          throw new Error('Undefined chat');
        }

        if (user == null) {
          throw new Error('Undefined user');
        }

        const originalFilename = _.last(filepath.split('/'));
        if (originalFilename == null) {
          throw new Error('Undefined filename');
        }

        // originalfilename : aaa.png
        const fileExt = originalFilename.split('.');
        // 같은 사진일 경우 이름이 겹쳐서 오류가 날 수 있기 때문에 이름에 timestamp를 추가해줌
        const filename = `${Date.now()}.${fileExt}`;
        const storagePath = `chat/${chat.id}/${filename}`;
        await storage().ref(storagePath).putFile(filepath);
        const url = await storage().ref(storagePath).getDownloadURL();

        const doc = await firestore()
          .collection(Collections.CHATS)
          .doc(chat.id)
          .collection(Collections.MESSAGES)
          .add({
            imageUrl: url,
            user: user,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });

        addNewMessage([
          {
            id: doc.id,
            text: null,
            imageUrl: url,
            user: user,
            createdAt: new Date(),
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [addNewMessage, chat],
  );

  return {
    chat,
    loadingChat,
    messages,
    sending,
    sendMessage,
    loadingMessages,
    updateMessageReadAt,
    userToMessageReadAt,
    sendImageMessage,
  };
};

export default useChat;
