/**
 * Mahfil Heritage - Cloud Functions
 * 
 * To deploy these functions:
 * 1. Install Firebase CLI: `npm install -g firebase-tools`
 * 2. Login: `firebase login`
 * 3. Initialize functions: `firebase init functions`
 * 4. Replace `functions/index.js` with this code.
 * 5. Deploy: `firebase deploy --only functions`
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Feature 12: Cloud Functions (Auto Welcome & Bonus)
exports.onUserSignUp = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  const email = user.email;
  const displayName = user.displayName || "Valued Guest";

  // 1. Add 'New User Bonus' to Firestore
  const bonusAmount = 500; // Rs. 500
  try {
    await admin.firestore().collection('users').doc(uid).set({
      loyaltyPoints: admin.firestore.FieldValue.increment(bonusAmount),
      welcomeBonusClaimed: true,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`Successfully added welcome bonus to user ${uid}`);

    // 2. Log Welcome Event
    await admin.firestore().collection('notifications').add({
      userId: uid,
      title: "Assalamu Alaikum!",
      message: `Welcome to the Mahfil family, ${displayName}. A gift of Rs. ${bonusAmount} has been added to your loyalty balance.`,
      type: "welcome",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

  } catch (error) {
    console.error("Error in onUserSignUp function:", error);
  }
});

// Feature 23: Automated Daily Backups
exports.scheduledFirestoreExport = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const client = new admin.firestore.v1.FirestoreAdminClient();
    const databaseName = client.databasePath(process.env.GCP_PROJECT, '(default)');
    const bucket = `gs://${process.env.GCP_PROJECT}-backups`;

    try {
      await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: bucket,
        collectionIds: [] // Export all
      });
      console.log(`Backup triggered for ${databaseName} to ${bucket}`);
    } catch (err) {
      console.error('Backup failed:', err);
    }
  });

// Feature 21: Global Push Notification Trigger
exports.sendGlobalNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.email !== 'usamakhn694@gmail.com') {
    throw new functions.https.HttpsError('unauthenticated', 'Admin access required');
  }

  const { title, message } = data;
  const tokens = [];
  const usersSnapshot = await admin.firestore().collection('users').where('fcmToken', '!=', null).get();
  
  usersSnapshot.forEach(doc => tokens.push(doc.data().fcmToken));

  if (tokens.length > 0) {
    const payload = {
      notification: { title, body: message }
    };
    await admin.messaging().sendToDevice(tokens, payload);
    return { success: true, count: tokens.length };
  }
  return { success: false, message: "No active tokens found" };
});
