import { useCallback, useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import _ from 'lodash';

import { Chat, Collections, User } from '../types';

// userIds를 받아서 규칙에 따라 lodash를 사용하여 정렬해주는 함수
const getChatKey = (userIds: string[]) => {
  // userId값을 오름차순으로 정렬하는 것
  return _.orderBy(userIds, userId => userId, 'asc');
};

// 사용자가 포함된 채팅방이 있다면 불러오고, 없다면 새로생성
const useChat = (userIds: string[]) => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);

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

  return {
    chat,
    loadingChat,
  };
};

export default useChat;
