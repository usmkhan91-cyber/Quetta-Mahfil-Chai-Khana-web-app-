/**
 * Feature 17: Biometric Auth (WebAuthn API)
 */
export async function registerBiometric(userId: string): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    console.warn("Biometric auth not supported in this browser");
    return false;
  }

  try {
    // This is a simplified WebAuthn flow for demo/integration
    // In production, you'd fetch a challenge from the server
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userID = new TextEncoder().encode(userId);

    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "Mahfil Heritage",
        id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
      },
      user: {
        id: userID,
        name: userId,
        displayName: userId,
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60000,
    };

    const credential = await navigator.credentials.create({ publicKey });
    return !!credential;
  } catch (err) {
    console.error("Biometric registration failed", err);
    return false;
  }
}

export async function authenticateBiometric(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [], // Allow any registered platform credential
      userVerification: "required",
      timeout: 60000,
    };

    const assertion = await navigator.credentials.get({ publicKey });
    return !!assertion;
  } catch (err) {
    console.error("Biometric authentication failed", err);
    return false;
  }
}
