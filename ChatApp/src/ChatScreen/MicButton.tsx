import React, { useCallback, useRef, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import AudioRecorderPlayer, {
  AVEncodingOption,
  AudioEncoderAndroidType,
} from 'react-native-audio-recorder-player';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../modules/Colors';

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: Colors.BLACK,
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: {
    color: Colors.BLACK,
    fontSize: 32,
  },
  stopIcon: {
    color: Colors.BLACK,
    fontSize: 32,
  },
});

interface MicButtonProps {
  onRecorded: (path: string) => void;
}

const MicButton = ({ onRecorded }: MicButtonProps) => {
  const [recording, setRecording] = useState(false);
  const audioRecorderPlayerRef = useRef(new AudioRecorderPlayer());
  const startRecord = useCallback(async () => {
    // android permission
    if (Platform.OS === 'android') {
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);

      const granted =
        grants[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        grants[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
          PermissionsAndroid.RESULTS.GRANTED;

      if (!granted) {
        return;
      }
    }
    //녹음실행
    await audioRecorderPlayerRef.current.startRecorder(undefined, {
      //   android와 ios 오디오타입 통일
      AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
      AVFormatIDKeyIOS: AVEncodingOption.aac,
    });
    audioRecorderPlayerRef.current.addRecordBackListener(() => {});
    setRecording(true);
  }, []);

  const stopRecord = useCallback(async () => {
    const uri = await audioRecorderPlayerRef.current.stopRecorder();
    audioRecorderPlayerRef.current.removeRecordBackListener();
    setRecording(false);
    // 어디에 저장되었는지 알기위해
    onRecorded(uri);
  }, [onRecorded]);

  if (recording) {
    return (
      <TouchableOpacity style={styles.button} onPress={stopRecord}>
        <Icon name="stop" style={styles.stopIcon} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.button} onPress={startRecord}>
      <Icon name="mic" style={styles.micIcon} />
    </TouchableOpacity>
  );
};

export default MicButton;
