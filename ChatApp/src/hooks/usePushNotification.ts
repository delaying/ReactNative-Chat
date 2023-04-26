import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { RESULTS, requestNotifications } from 'react-native-permissions';

const usePushNotification = () => {
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
