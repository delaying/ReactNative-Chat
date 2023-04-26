import React, { useCallback, useContext, useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import Toast from 'react-native-toast-message';

import Screen from '../components/Screen';
import AuthContext from '../components/AuthContext';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Colors from '../modules/Colors';
import { Collections, RootStackParamList, User } from '../types';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ImageCropPicker from 'react-native-image-crop-picker';
import Profile from './Profile';
import UserPhoto from '../components/UserPhoto';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  sectionTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.BLACK,
  },
  userSectionContent: {
    backgroundColor: Colors.BLACK,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
  },
  myProfile: {
    flex: 1,
  },
  myNameText: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
  myEmailText: {
    marginTop: 4,
    color: Colors.WHITE,
    fontSize: 14,
  },
  logoutText: {
    color: Colors.WHITE,
    fontSize: 14,
  },
  userListSection: {
    flex: 1,
    marginTop: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userList: {
    flex: 1,
  },
  userListItem: {
    backgroundColor: Colors.LIGHT_GRAY,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  otherNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  otherEmailText: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.BLACK,
  },
  separator: {
    height: 10,
  },
  emptyText: {
    color: Colors.BLACK,
  },
  profile: {
    marginRight: 10,
  },
  userPhoto: {
    marginRight: 10,
  },
});

const HomeScreen = () => {
  const { user: me, updateProfileImage } = useContext(AuthContext);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const { navigate } =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // 홈스크린에 있을때만 push알림띄우기 위해 사용
  const isFocused = useIsFocused();

  //   로그아웃
  const onPressLogout = useCallback(() => {
    auth().signOut();
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const snapshot = await firestore().collection(Collections.USERS).get();
      // 자신을 제외한 저장된 사람들을 map함수로 불러주기
      setUsers(
        snapshot.docs
          .map(doc => doc.data() as User)
          .filter(u => u.userId !== me?.userId),
      );
    } finally {
      setLoadingUsers(false);
    }
  }, [me?.userId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onPressProfile = useCallback(async () => {
    const image = await ImageCropPicker.openPicker({
      cropping: true,
      cropperCircleOverlay: true, //원모양으로 사진이 잘림
    });
    console.log(image);
    await updateProfileImage(image.path);
  }, [updateProfileImage]);

  const renderLoading = useCallback(
    () => (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    ),
    [],
  );

  // 1. App : background 상태에 있는 경우
  useEffect(() => {
    // push를 눌렀을때 어떻게할지 설정
    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('remoteMessage', remoteMessage);
      // 컨솔결과 - remoteMessage {"collapseKey": "com.delaying.chatapp", "data": {"userIds": "[\"8N31b2AsRHXzCxJWLNTqMH4T6Ml2\",\"QhKVZoKYJBPo8cegl14YFtpJc0v1\"]"}, "from": "286777113696", "messageId": "0:1682517291089524%553b6927553b6927", "notification": {"android": {}, "body": "Ddddd: Hi", "title": "메시지가 도착했습니다."}, "sentTime": 1682517291079, "ttl": 2419200}

      const stringifiedUserIds = remoteMessage.data?.userIds;
      if (stringifiedUserIds != null) {
        // string으로 바꿨던걸 다시 parsing
        const userIds = JSON.parse(stringifiedUserIds) as string[];
        navigate('Chat', { userIds });
      }
    });

    // useEffect가 unmount될때 실행
    return () => {
      unsubscribe();
    };
  }, [navigate]);

  // 2. App : Quit 상태에 있는 경우
  useEffect(() => {
    // 이 effect가 실행될때 초기 notification정보를 가지고 활용할 수 있음
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        console.log('getInitialNotification', remoteMessage);
        const stringifiedUserIds = remoteMessage?.data?.userIds;
        if (stringifiedUserIds != null) {
          // string으로 바꿨던걸 다시 parsing
          const userIds = JSON.parse(stringifiedUserIds) as string[];
          navigate('Chat', { userIds });
        }
      });
  }, [navigate]);

  // 3. App: foreground일 경우 알림띄우기
  useEffect(() => {
    const unsubscribe = messaging().onMessage(remoteMessage => {
      console.log('onMessage', remoteMessage);
      const { notification } = remoteMessage;
      if (notification != null) {
        const { title, body } = notification;

        if (isFocused) {
          Toast.show({
            type: 'success',
            text1: title,
            text2: body,
            // 토스트 누르면 화면이동
            onPress: () => {
              const stringifiedUserIds = remoteMessage.data?.userIds;
              if (stringifiedUserIds != null) {
                // string으로 바꿨던걸 다시 parsing
                const userIds = JSON.parse(stringifiedUserIds) as string[];
                navigate('Chat', { userIds });
              }
            },
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [navigate, isFocused]);

  if (me == null) {
    return null;
  }

  return (
    <Screen title="홈">
      <View style={styles.container}>
        <View>
          <Text style={styles.sectionTitleText}>나의 정보</Text>
          <View style={styles.userSectionContent}>
            <Profile
              style={styles.profile}
              onPress={onPressProfile}
              imageUrl={me.profileUrl}
            />
            <View style={styles.myProfile}>
              <Text style={styles.myNameText}>{me?.name}</Text>
              <Text style={styles.myEmailText}>{me?.email}</Text>
            </View>
            <TouchableOpacity onPress={onPressLogout}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.userListSection}>
          {loadingUsers ? (
            renderLoading()
          ) : (
            <>
              <Text style={styles.sectionTitleText}>
                다른 사용자와 대화해보세요!
              </Text>
              <FlatList
                style={styles.userList}
                data={users}
                renderItem={({ item: user }) => (
                  <TouchableOpacity
                    style={styles.userListItem}
                    onPress={() => {
                      navigate('Chat', {
                        userIds: [me.userId, user.userId],
                      });
                    }}>
                    <UserPhoto
                      style={styles.userPhoto}
                      imageUrl={user.profileUrl}
                      name={user.name}
                    />
                    <View>
                      <Text style={styles.otherNameText}>{user.name}</Text>
                      <Text style={styles.otherEmailText}>{user.email}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                // 아이템 간의 간격조정
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                //배열이 비어있을때 보여주는 화면
                ListEmptyComponent={() => {
                  return (
                    <Text style={styles.emptyText}>사용자가 없습니다.</Text>
                  );
                }}
              />
            </>
          )}
        </View>
      </View>
    </Screen>
  );
};

export default HomeScreen;
