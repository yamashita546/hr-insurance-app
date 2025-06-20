/**
 * Import function triggers from their respective submodules:
 *
 * import { onCall } from "firebase-functions/v2/https";
 * import { onDocumentWritten } from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest, onCall} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
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

/**
 * 従業員の異動予定を毎日チェックし、
 * 予定日を過ぎていれば自動で異動処理を実行するスケジュール化された関数
 */
export const applyScheduledTransfers = onSchedule(
  {
    schedule: "every day 01:00",
    timeZone: "Asia/Tokyo",
  },
  async (event) => {
    logger.info("applyScheduledTransfers started", {event});
    const db = admin.firestore();
    const today = new Date().toISOString().slice(0, 10);

    const snapshot = await db.collection("employees")
      .where("transferPlan", "!=", null)
      .get();

    if (snapshot.empty) {
      logger.info("No employees with transfer plans found.");
      return;
    }

    const batch = db.batch();

    snapshot.forEach((doc) => {
      const employee = doc.data();
      if (employee.transferPlan && employee.transferPlan.transferDate <= today) {
        logger.info(`Processing transfer for employeeId: ${employee.employeeId}`);

        // 従業員情報を更新
        const employeeRef = db.collection("employees").doc(doc.id);
        batch.update(employeeRef, {
          officeId: employee.transferPlan.targetOfficeId,
          officeName: employee.transferPlan.targetOfficeName,
          transferPlan: admin.firestore.FieldValue.delete(),
        });

        // 異動履歴を追加
        const historyRef = db.collection("employeeTransferHistories").doc();
        const historyData = {
          employeeId: employee.employeeId,
          fromOfficeId: employee.officeId,
          fromOfficeName: employee.officeName,
          toOfficeId: employee.transferPlan.targetOfficeId,
          toOfficeName: employee.transferPlan.targetOfficeName,
          transferDate: employee.transferPlan.transferDate,
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          cancelled: false,
        };
        batch.set(historyRef, historyData);
      }
    });

    await batch.commit();
    logger.info("applyScheduledTransfers finished successfully.");
    return;
  }
);

