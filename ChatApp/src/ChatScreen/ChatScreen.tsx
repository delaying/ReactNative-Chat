import React, { useCallback, useContext, useMemo, useState } from 'react';
import Screen from '../components/Screen';
import { RouteProp, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { RootStackParamList } from '../types';
import useChat from './useChat';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Colors from '../modules/Colors';
import AuthContext from '../components/AuthContext';
import Message from './Message';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatContainer: {
    flex: 1,
    padding: 20,
  },
  membersSection: {},
  membersTitleText: {
    fontSize: 16,
    color: Colors.BLACK,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  userProfile: {
    width: 34,
    height: 34,
    borderRadius: 34 / 2,
    backgroundColor: Colors.BLACK,
    borderWidth: 1,
    borderColor: Colors.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userProfileText: {
    color: Colors.WHITE,
  },
  messageList: {
    flex: 1,
    marginVertical: 15, //margin top & bottom 같이줄수있음.
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInputContainder: {
    flex: 1,
    marginRight: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.BLACK,
    overflow: 'hidden',
    padding: 10,
    minHeight: 50, //내용이 많아지면 크기가 커짐
    justifyContent: 'center',
  },
  textInput: {
    paddingTop: 0, //ios와 android의 textinput 크기가 다른점 해결
    paddingBottom: 0,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.BLACK,
    width: 50,
    height: 50,
    borderRadius: 50 / 2,
  },
  sendIcon: {
    color: Colors.WHITE,
    fontSize: 18,
  },
  messageSeparator: {
    height: 8,
  },
});

const disabledSendButtonStyle = [
  styles.sendButton,
  {
    backgroundColor: Colors.GRAY,
  },
  ,
];

const ChatScreen = () => {
  // navigate로 넘겨준 파라미터를 받아오기
  const { params } = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const { other, userIds } = params;
  const { loadingChat, chat, sendMessage, messages, loadingMessages } =
    useChat(userIds);
  const [text, setText] = useState('');
  const sendDisabled = useMemo(() => text.length === 0, [text]);
  const { user: me } = useContext(AuthContext);
  const loading = loadingChat || loadingMessages;

  const onChangeText = useCallback((newText: string) => {
    setText(newText);
  }, []);

  const onPressSendButton = useCallback(() => {
    //send text
    if (me != null) {
      sendMessage(text, me);
      setText('');
    }
  }, [me, sendMessage, text]);

  const renderChat = useCallback(() => {
    if (chat == null) {
      return null;
    }
    return (
      <View style={styles.chatContainer}>
        <View style={styles.membersSection}>
          <Text style={styles.membersTitleText}>대화상대</Text>
          <FlatList
            data={chat.users}
            renderItem={({ item: user }) => (
              <View style={styles.userProfile}>
                <Text style={styles.userProfileText}>{user.name[0]}</Text>
              </View>
            )}
            horizontal //가로정렬
          />
        </View>
        <FlatList
          inverted //스크롤을 윗방향으로 할 수 있음.
          style={styles.messageList}
          data={messages}
          renderItem={({ item: message }) => {
            return (
              <Message
                name={message.user.name}
                text={message.text}
                createdAt={message.createdAt}
                isOtherMessage={message.user.userId !== me?.userId}
              />
            );
          }}
          ItemSeparatorComponent={() => (
            <View style={styles.messageSeparator} />
          )}
        />
        <View style={styles.inputContainer}>
          <View style={styles.textInputContainder}>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={onChangeText}
              multiline //줄바꿈가능
            />
          </View>
          <TouchableOpacity
            style={sendDisabled ? disabledSendButtonStyle : styles.sendButton}
            disabled={sendDisabled}
            onPress={onPressSendButton}>
            <Icon name="send" style={styles.sendIcon} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [
    chat,
    onChangeText,
    text,
    sendDisabled,
    onPressSendButton,
    messages,
    me?.userId,
  ]);

  return (
    <Screen title={other.name}>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator />
          </View>
        ) : (
          renderChat()
        )}
      </View>
    </Screen>
  );
};

export default ChatScreen;
