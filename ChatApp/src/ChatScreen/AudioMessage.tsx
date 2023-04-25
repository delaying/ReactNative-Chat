import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../modules/Colors';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
    color: Colors.WHITE,
  },
  timeText: {
    fontSize: 14,
    color: Colors.WHITE,
    minWidth: 48,
  },
});

const otherMessageStyles = {
  icon: [styles.icon, { color: Colors.BLACK }],
  timeText: [styles.timeText, { color: Colors.BLACK }],
};

interface AudioMessageProps {
  url: string;
  isOtherMessage?: boolean;
}

const AudioMessage = ({ url, isOtherMessage }: AudioMessageProps) => {
  const messageStyle = isOtherMessage ? otherMessageStyles : styles;
  const [playing, setPlaying] = useState(false);
  const [remainingTimeInMs, setRemainingTimeInMs] = useState(0);
  const audioPlayerRef = useRef(new AudioRecorderPlayer());

  const stopPlay = useCallback(async () => {
    await audioPlayerRef.current.stopPlayer();
    setPlaying(false);
    audioPlayerRef.current.removePlayBackListener();
  }, []);

  const startPlay = useCallback(async () => {
    // 오디오 재생시작
    await audioPlayerRef.current.startPlayer(url);
    setPlaying(true);
    audioPlayerRef.current.addPlayBackListener(e => {
      // 음성메시지의 남은시간 보여주기 (총 시간 - 현재시간)
      const timeInMs = e.duration - e.currentPosition;
      setRemainingTimeInMs(timeInMs);
      if (timeInMs === 0) {
        //남은 시간이 0이면 audio멈추기
        stopPlay();
      }
    });
  }, [url, stopPlay]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={playing ? stopPlay : startPlay}>
        <Icon
          name={playing ? 'stop' : 'play-arrow'}
          style={messageStyle.icon}
        />
      </TouchableOpacity>
      <Text style={messageStyle.timeText}>
        {audioPlayerRef.current.mmss(Math.floor(remainingTimeInMs / 1000))}
      </Text>
    </View>
  );
};

export default AudioMessage;
