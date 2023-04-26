import { useCallback, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { RESULTS, requestNotifications } from 'react-native-permissions';
import messaging from '@react-native-firebase/messaging';
import AuthContext from '../components/AuthContext';

const usePushNotification = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const { user, addFcmToken } = useContext(AuthContext);

  // 마운트 되었을 때 FCM토큰 가져오기
  useEffect(() => {
    messaging()
      .getToken()
      .then(token => {
        setFcmToken(token);
      });
  }, []);

  //   토큰만료 여부확인
  useEffect(() => {
    const unsubscribe = messaging().onTokenRefresh(token => {
      setFcmToken(token);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user != null && fcmToken != null) {
      addFcmToken(fcmToken);
    }
  }, [addFcmToken, user, fcmToken]);

  const requestPermission = useCallback(async () => {
    const { status } = await requestNotifications([]);
    // permission이 수락되었을경우
    const enabled = status === RESULTS.GRANTED;
    console.log('enabled', enabled);

    if (!enabled) {
      Alert.alert('알림 권한을 허용해주세요.');
    }
  }, []);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);
};

export default usePushNotification;
