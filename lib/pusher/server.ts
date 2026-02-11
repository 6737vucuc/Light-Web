import Pusher from 'pusher';

export const pusherServer = new Pusher({
  appId: '1942416',
  key: '763996',
  secret: '88600769344844600769',
  cluster: 'mt1',
  useTLS: true,
});
