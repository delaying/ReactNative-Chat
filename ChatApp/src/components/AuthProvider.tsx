import React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Collections, User } from '../types';
import AuthContext from './AuthContext';
import _ from 'lodash';
import storage from '@react-native-firebase/storage';

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [processingSignup, setProcessingSignup] = useState(false);
  const [processingSignin, setProcessingSignin] = useState(false);

  useEffect(() => {
    //이 프로바이더가 마운트 될 때 사용자이벤트를 받음
    const unsubscribe = auth().onUserChanged(async fbUser => {
      console.log(fbUser);
      if (fbUser !== null) {
        //login
        setUser({
          userId: fbUser.uid,
          email: fbUser.email ?? '',
          name: fbUser.displayName ?? '',
          profileUrl: fbUser.photoURL ?? '',
        });
      } else {
        //logout
        setUser(null);
      }
      setInitialized(true);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  //   firebase등록 및 db저장
  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      setProcessingSignup(true);
      try {
        const { user: currentUser } =
          await auth().createUserWithEmailAndPassword(email, password);
        await currentUser.updateProfile({ displayName: name });
        await firestore()
          .collection(Collections.USERS)
          .doc(currentUser.uid)
          .set({
            userId: currentUser.uid,
            email,
            name,
          });
      } finally {
        setProcessingSignup(false);
      }
    },
    [],
  );

  const signin = useCallback(async (email: string, password: string) => {
    try {
      setProcessingSignin(true);
      auth().signInWithEmailAndPassword(email, password);
    } finally {
      setProcessingSignin(false);
    }
  }, []);

  const updateProfileImage = useCallback(
    async (filepath: string) => {
      // image upload
      if (user == null) {
        throw new Error('User is undefined');
      }

      const filename = _.last(filepath.split('/'));

      if (filename == null) {
        throw new Error('filename is undefined');
      }

      const storageFilepath = `users/${user.userId}/${filename}`;
      await storage().ref(storageFilepath).putFile(filepath);

      const url = await storage().ref(storageFilepath).getDownloadURL();
      await auth().currentUser?.updateProfile({ photoURL: url });
      // db에 profileurl저장
      await firestore().collection(Collections.USERS).doc(user.userId).update({
        profileUrl: url,
      });
      // 유저프로필에 이미지 등록
    },
    [user],
  );

  //provider
  const value = useMemo(() => {
    return {
      initialized,
      user,
      signup,
      processingSignup,
      signin,
      processingSignin,
      updateProfileImage,
    };
  }, [
    initialized,
    user,
    signup,
    processingSignup,
    signin,
    processingSignin,
    updateProfileImage,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
