const SCOPES = "https://www.googleapis.com/auth/drive.file";

interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  accessToken: string;
}

let currentUser: GoogleUser | null = null;
const listeners: Set<(user: GoogleUser | null) => void> = new Set();

export function getGoogleUser(): GoogleUser | null {
  return currentUser;
}

export function onAuthChange(cb: (user: GoogleUser | null) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyListeners() {
  listeners.forEach((cb) => cb(currentUser));
}

export async function initGoogleAuth(clientId: string): Promise<void> {
  if (typeof window === "undefined") return;

  // Load the Google Identity Services library
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => {
      (window as any).google?.accounts?.id?.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });
      resolve();
    };
    document.head.appendChild(script);
  });
}

function handleCredentialResponse(response: { credential: string }) {
  // Decode JWT token
  const payload = JSON.parse(atob(response.credential.split(".")[1]));
  currentUser = {
    name: payload.name,
    email: payload.email,
    picture: payload.picture,
    accessToken: response.credential,
  };
  notifyListeners();
}

export function signIn(): void {
  (window as any).google?.accounts?.id?.prompt();
}

export function signOut(): void {
  currentUser = null;
  notifyListeners();
  (window as any).google?.accounts?.id?.disableAutoSelect();
}
