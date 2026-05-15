import { api } from '../api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const subscribeToPush = async () => {
  try {
    // 1. Get Public Key from Server
    const keyRes = await api.get('/api/push/vapid-key');
    if (!keyRes.ok) throw new Error('Failed to get VAPID key');
    const { publicKey } = await keyRes.json();

    // 2. Check Service Worker
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported');
        return null;
    }

    const registration = await navigator.serviceWorker.ready;

    // 3. Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    // 4. Send to Server
    const subRes = await api.post('/api/push/subscribe', { subscription });
    if (!subRes.ok) throw new Error('Failed to send subscription to server');

    console.log('Successfully subscribed to Push Notifications');
    return true;
  } catch (error) {
    console.error('Push subscription error:', error);
    return false;
  }
};

export const checkPushPermission = () => {
    return Notification.permission;
};

export const requestPushPermission = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        return subscribeToPush();
    }
    return false;
};
