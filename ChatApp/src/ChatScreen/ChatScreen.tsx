import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Screen from '../components/Screen';
import { RouteProp, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { RootStackParamList } from '../types';
import useChat from './useChat';
import {
  ActivityIndicator,
  Alert,
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
import UserPhoto from '../components/UserPhoto';
import moment from 'moment';
import ImageCropPicker from 'react-native-image-crop-picker';
import MicButton from './MicButton';

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
  imageButton: {
    borderWidth: 1,
    borderColor: Colors.BLACK,
    width: 50,
    height: 50,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  imageIcon: {
    color: Colors.BLACK,
    fontSize: 32,
  },
  sendingContainer: {
    alignItems: 'flex-end',
    paddingTop: 10,
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
  const {
    loadingChat,
    chat,
    sendMessage,
    messages,
    loadingMessages,
    updateMessageReadAt,
    userToMessageReadAt,
    sendImageMessage,
    sending,
    sendAudioMessage,
  } = useChat(userIds);
  const [text, setText] = useState('');
  const sendDisabled = useMemo(() => text.length === 0, [text]);
  const { user: me } = useContext(AuthContext);
  const loading = loadingChat || loadingMessages;

  useEffect(() => {
    if (me != null && messages.length > 0) {
      updateMessageReadAt(me.userId);
    }
  }, [me, messages.length, updateMessageReadAt]);

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

  const onPressImageButton = useCallback(async () => {
    if (me != null) {
      const image = await ImageCropPicker.openPicker({ cropping: true });
      sendImageMessage(image.path, me);
    }
  }, [me, sendImageMessage]);

  const onRecorded = useCallback(
    (path: string) => {
      Alert.alert('녹음완료', '음성 메시지를 보낼까요?', [
        { text: '아니요' },
        {
          text: '네',
          onPress: () => {
            console.log(path);
            if (me != null) {
              sendAudioMessage(path, me);
            }
          },
        },
      ]);
    },
    [me, sendAudioMessage],
  );

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
              <UserPhoto
                size={34}
                style={styles.userProfile}
                name={user.name}
                nameStyle={styles.userProfileText}
                imageUrl={user.profileUrl}
              />
            )}
            horizontal //가로정렬
          />
        </View>
        <FlatList
          inverted //스크롤을 윗방향으로 할 수 있음.
          style={styles.messageList}
          data={messages}
          renderItem={({ item: message }) => {
            const user = chat.users.find(u => u.userId === message.user.userId);
            const unreadUsers = chat.users.filter(u => {
              const messageReadAt = userToMessageReadAt[u.userId] ?? null;

              if (messageReadAt == null) {
                return true;
              }
              return moment(messageReadAt).isBefore(message.createdAt);
            });
            const unreadCount = unreadUsers.length;

            const commonProps = {
              name: user?.name ?? '',
              createdAt: message.createdAt,
              isOtherMessage: message.user.userId !== me?.userId,
              userImageUrl: user?.profileUrl,
              unreadCount: unreadCount,
            };
            if (message.text != null) {
              return (
                <Message {...commonProps} message={{ text: message.text }} />
              );
            }
            if (message.imageUrl != null) {
              return (
                <Message {...commonProps} message={{ url: message.imageUrl }} />
              );
            }
            return null;
          }}
          ItemSeparatorComponent={() => (
            <View style={styles.messageSeparator} />
          )}
          // inverted flatlist라 header가 밑부분에 위치함
          ListHeaderComponent={() => {
            if (sending) {
              return (
                <View style={styles.sendingContainer}>
                  <ActivityIndicator />
                </View>
              );
            }
            return null;
          }}
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
          <TouchableOpacity
            style={styles.imageButton}
            onPress={onPressImageButton}>
            <Icon name="image" style={styles.imageIcon} />
          </TouchableOpacity>
          <View>
            <MicButton onRecorded={onRecorded} />
          </View>
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
    userToMessageReadAt,
    onPressImageButton,
    sending,
    onRecorded,
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
