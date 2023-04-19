import { useCallback, useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import _ from 'lodash';

import {
  Chat,
  Collections,
  FirestoreMessageData,
  Message,
  User,
} from '../types';

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
        setChat({
          id: doc.id,
          userIds: doc.data().userIds as string[],
          users: doc.data().users as User[],
        });
        return;
      }

      // userId에 userIds가 포함된 데이터만 가져오게됨.
      const usersSnapshot = await firestore()
        .collection(Collections.USERS)
        .where('userId', 'in', userIds)
        .get();
      const users = usersSnapshot.docs.map(doc => doc.data() as User);
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
        //   저장할 데이터
        const data: FirestoreMessageData = {
          text: text,
          user: user,
          createdAt: new Date(),
        };

        //   서브컬렉션 열어주어 저장하기
        const doc = await firestore()
          .collection(Collections.CHATS)
          .doc(chat.id)
          .collection(Collections.MESSAGES)
          .add(data);

        // 이전 메시지 + 새로운 메시지 업데이트
        setMessages(prevMessages =>
          prevMessages.concat([{ id: doc.id, ...data }]),
        );
      } finally {
        setSending(false);
      }
    },
    [chat?.id],
  );

  //  메시지 불러오기
  const loadMessages = useCallback(async (chatId: string) => {
    try {
      setLoadingMessages(true);
      const messagesSnapshot = await firestore()
        .collection(Collections.CHATS)
        .doc(chatId)
        .collection(Collections.MESSAGES)
        .orderBy('createAt', 'asc')
        .get();

      const ms = messagesSnapshot.docs.map<Message>(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          user: data.user,
          text: data.text,
          createdAt: data.createdAt.toDate(), //db의 date를 date타입으로 바꿔주기 위해 toDate()사용
        };
      });
      setMessages(ms);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (chat?.id != null) {
      loadMessages(chat.id);
    }
  }, [chat?.id, loadMessages]);

  return {
    chat,
    loadingChat,
    messages,
    sending,
    sendMessage,
    loadingMessages,
  };
};

export default useChat;
