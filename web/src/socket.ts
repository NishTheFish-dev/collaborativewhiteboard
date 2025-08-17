import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(url: string) {
  if (!socket) {
    socket = io(url, {
      transports: ['websocket'],
    });
  }
  return socket;
}
