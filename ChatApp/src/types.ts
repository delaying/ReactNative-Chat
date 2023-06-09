export type RootStackParamList = {
  Signup: undefined;
  Signin: undefined;
  Home: undefined;
  Loading: undefined;
  //   스크린에 param을 넘겨야할땐 여기에 정의해야함
  Chat: {
    userIds: string[];
  };
};

export interface User {
  userId: string;
  email: string;
  name: string;
  profileUrl?: string;
}

export enum Collections {
  USERS = 'users',
  CHATS = 'chats',
  MESSAGES = 'messages',
}

export interface Chat {
  id: string;
  userIds: string[];
  users: User[];
}

export interface Message {
  id: string;
  user: User;
  text: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  createdAt: Date;
}

export interface FirestoreMessageData {
  text: string;
  user: User;
  createdAt: Date;
}
