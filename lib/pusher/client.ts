import Pusher from 'pusher-js';

export const pusherClient = new Pusher('763996', {
  cluster: 'mt1',
  forceTLS: true,
  authEndpoint: '/api/pusher/auth', // Enable client-side events
});
