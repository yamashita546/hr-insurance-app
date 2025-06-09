/**
 * Import function triggers from their respective submodules:
 *
 * import { onCall } from "firebase-functions/v2/https";
 * import { onDocumentWritten } from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest, onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

admin.initializeApp();

export const createUserByAdmin = onCall(async (request) => {
  try {
    const {email, password, displayName, companyKey, userId,
      role, initialPassword} = request.data;

    // 既存ユーザーの重複チェック
    try {
      const userList = await admin.auth().getUserByEmail(email);
      if (userList) {
        throw new functions.https.HttpsError("already-exists",
          "このメールアドレスは既に登録されています");
      }
    } catch (e: any) {
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        typeof (e as { code: unknown }).code === "string"
      ) {
        const errorCode = (e as { code: string }).code;
        if (errorCode !== "auth/user-not-found") {
          const message =
            (e as { message?: string }).message ??
            "ユーザー確認中にエラーが発生しました";
          throw new functions.https.HttpsError("internal", message);
        }
      } else if (e instanceof functions.https.HttpsError) {
        throw e;
      } else {
        throw new functions.https.HttpsError("internal",
          "ユーザー確認中に不明なエラーが発生しました");
      }
    }

    // Firebase Authにユーザー作成
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      disabled: false,
    });

    // Firestoreにユーザー情報を保存
    const db = admin.firestore();
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      userId: userId ?? "",
      email: email ?? "",
      displayName: displayName ?? "",
      companyKey: companyKey ?? "",
      role: role ?? "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: null,
      isRegistered: false,
      isGoogleLinked: false,
      isActive: true,
      initialPassword: initialPassword ?? "",
    });

    return {uid: userRecord.uid};
  } catch (e: any) {
    console.error("createUserByAdmin error:", e);
    if (e instanceof functions.https.HttpsError) {
      throw e;
    }
    throw new functions.https.HttpsError("internal", e?.message ||
        "INTERNAL ERROR");
  }
});

export const updateUserByAdmin = onCall(async (request) => {
  const {uid, email, password, displayName} = request.data;

  // Firebase Authのユーザー情報を更新
  const updateObj: Partial<admin.auth.UpdateRequest> = {};
  if (email) updateObj.email = email;
  if (password) updateObj.password = password;
  if (displayName) updateObj.displayName = displayName;

  if (Object.keys(updateObj).length > 0) {
    await admin.auth().updateUser(uid, updateObj);
  }

  // Firestoreのusersコレクションも更新
  const db = admin.firestore();
  const updateFirestore: {
      email?: string;
      displayName?: string;
      updatedAt: admin.firestore.FieldValue;
    } = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
  if (email) updateFirestore.email = email;
  if (displayName) updateFirestore.displayName = displayName;

  await db.collection("users").doc(uid).update(updateFirestore);

  return {success: true};
});

