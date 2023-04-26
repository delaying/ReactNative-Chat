import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();

// chat문서의 message collection의 정해진 내용을 트래킹하는 코드
export const onMessageCreated = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    // 목적: 새로운 메시지가 생기면, 해당 채팅방에 있는 사용자에게 푸시 메시지 보내주는 것
    // 1. 어디로 메시지를 보내야하는가? - 채팅방의 사용자 정보 불러오기
    const chatId = context.params.chatId;

    const chatSnapshot = await getFirestore()
      .collection("chats")
      .doc(chatId)
      .get();
    const chat = chatSnapshot.data();

    if (chat == null) {
      return;
    }

    const message = snap.data();
    const senderId = message.user.userId;

    // 본인에게는 메시지를 보내지않도록 처리
    const userIds = (chat.userIds as string[]).filter(
      (userId) => userId != senderId
    );
    const usersSnapshot = await getFirestore()
      .collection("users")
      .where("userId", "in", userIds)
      .get();

    const usersFcmTokens = usersSnapshot.docs.map(
      (doc) => doc.data().fcmTokens as string[]
    );

    // 위의 [[a,b],[c,d]]이와 같은 배열을  => [a,b,c,d]로 배열 형태 만들기
    const fcmTokens = usersFcmTokens.reduce((alltokens, tokens) => {
      return alltokens.concat(tokens);
    }, []);

    // 2. 메시지 보내기
    // title : notification의 윗부분
    // body : 텍스트, 오디오, 이미지에 따라 다르게 출력

    // 익명함수 바로 호출하는 방법
    const messageText = (() => {
      if (message.text != null) {
        return message.text as string;
      }
      if (message.imageUrl != null) {
        return "사진";
      }
      if (message.audioUrl != null) {
        return "음성메시지";
      }
      return "지원하지 않는 메시지 형식입니다.";
    })();

    const senderName = message.user.name;
    // 여러명에게 메시지를 보낼때
    await getMessaging().sendMulticast({
      notification: {
        title: "메시지가 도착했습니다.",
        body: `${senderName}: ${messageText}`,
      },
      //   push message가 도착했을 때, 바로 메시지가 온 채팅방으로 이동하기 위해 data작성
      data: {
        // 항상 string형태여야하므로 처리
        userIds: JSON.stringify(chat.userIds),
      },
      //   어디로 보낼지
      tokens: fcmTokens,
    });

    console.log("done");
  });
