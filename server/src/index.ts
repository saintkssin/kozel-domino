import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import {
  ClientToServer, GameState, Player, DEFAULT_SETTINGS,
} from '@kozel/shared';
import {
  createRoom, getRoom, updateRoom, deleteRoom,
  sanitizeName, scheduleReconnect, consumeReconnectToken, initScores,
} from './rooms';
import {
  dealTiles, placeTile, hasAnyPlay, nextTurn, checkRoundEnd,
  checkMatchEnd, computeGoats, resolveFirstTurn, scoreKey, addScore,
} from './game';

const app = express();
const httpServer = createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const io = new Server<ClientToServer, any>(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.get('/health', (_, res) => res.json({ ok: true }));

// Serve built client in production
// __dirname = server/dist/server/src → ../../../.. = repo root
const clientDist = path.resolve(__dirname, '..', '..', '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  const idx = path.join(clientDist, 'index.html');
  res.sendFile(idx, err => { if (err) res.status(404).send('Not found'); });
});

// ── Socket handler ───────────────────────────────────────────────────────────

function broadcast(state: GameState) {
  // Strip hands before broadcasting — each player only gets their own
  const players = state.players;
  players.forEach(p => {
    const socketId = [...io.sockets.sockets.values()].find(
      s => (s as Socket & { playerId?: string }).playerId === p.id,
    )?.id;
    if (socketId) {
      const masked: GameState = {
        ...state,
        players: players.map(pl =>
          pl.id === p.id ? pl : { ...pl, handCount: pl.hand.length, hand: [] },
        ),
      };
      io.to(socketId).emit('room_state', { type: 'room_state', state: masked });
    }
  });
}

function err(socket: Socket, msg: string) {
  socket.emit('error', { type: 'error', message: msg });
}

io.on('connection', (socket: Socket & { playerId?: string; roomId?: string }) => {
  socket.on('message', (msg: ClientToServer) => {
    switch (msg.type) {

      case 'create_room': {
        const state = createRoom(socket.id, msg.hostName, { ...DEFAULT_SETTINGS, ...msg.settings });
        socket.playerId = state.players[0].id;
        socket.roomId = state.roomId;
        socket.join(state.roomId);
        if (state.settings.mode === 'ffa') state.scores[socket.playerId] = 0;
        updateRoom(state);
        broadcast(state);
        break;
      }

      case 'join_room': {
        const state = getRoom(msg.roomId.toUpperCase());
        if (!state) return err(socket, 'Room not found');
        if (state.phase !== 'lobby') return err(socket, 'Game already started');
        if (state.players.length >= state.settings.playerCount) return err(socket, 'Room is full');

        const names = state.players.map(p => p.name);
        const name = sanitizeName(msg.name, names);
        const seat = state.players.length;
        const team = state.settings.mode === 'teams'
          ? (seat % 2 === 0 ? 'A' : 'B') as 'A' | 'B'
          : null;

        const player: Player = {
          id: socket.id, name, seat, team,
          hand: [], connected: true, ready: false, isHost: false,
        };
        state.players.push(player);
        if (state.settings.mode === 'ffa') state.scores[socket.id] = 0;

        socket.playerId = socket.id;
        socket.roomId = msg.roomId.toUpperCase();
        socket.join(socket.roomId);
        updateRoom(state);
        broadcast(state);
        break;
      }

      case 'set_name': {
        const state = socket.roomId ? getRoom(socket.roomId) : undefined;
        if (!state) return;
        const p = state.players.find(pl => pl.id === socket.playerId);
        if (!p) return;
        const others = state.players.filter(pl => pl.id !== p.id).map(pl => pl.name);
        p.name = sanitizeName(msg.name, others);
        updateRoom(state);
        broadcast(state);
        break;
      }

      case 'update_settings': {
        const state = socket.roomId ? getRoom(socket.roomId) : undefined;
        if (!state) return;
        const host = state.players.find(p => p.id === socket.playerId && p.isHost);
        if (!host || state.phase !== 'lobby') return err(socket, 'Not enough permissions');
        Object.assign(state.settings, msg.settings);
        // re-init scores if mode changed
        state.scores = initScores(state.settings);
        if (state.settings.mode === 'ffa')
          state.players.forEach(p => { state.scores[p.id] = 0; });
        // block teams mode for odd player count
        if (state.settings.playerCount === 3 && state.settings.mode === 'teams') {
          state.settings.mode = 'ffa';
        }
        updateRoom(state);
        broadcast(state);
        break;
      }

      case 'assign_team': {
        const state = socket.roomId ? getRoom(socket.roomId) : undefined;
        if (!state || state.settings.mode !== 'teams') return;
        const host = state.players.find(p => p.id === socket.playerId && p.isHost);
        if (!host) return err(socket, 'Only the host can change teams');
        const target = state.players.find(p => p.id === msg.playerId);
        if (target) { target.team = msg.team; updateRoom(state); broadcast(state); }
        break;
      }

      case 'assign_seat': {
        const state = socket.roomId ? getRoom(socket.roomId) : undefined;
        if (!state) return;
        const host = state.players.find(p => p.id === socket.playerId && p.isHost);
        if (!host) return err(socket, 'Only the host can change seats');
        const target = state.players.find(p => p.id === msg.playerId);
        const displaced = state.players.find(p => p.seat === msg.seat);
        if (target && displaced) {
          const tmp = target.seat; target.seat = msg.seat; displaced.seat = tmp;
          updateRoom(state); broadcast(state);
        }
        break;
      }

      case 'toggle_ready': {
        const state = socket.roomId ? getRoom(socket.roomId) : undefined;
        if (!state) return;
        const p = state.players.find(pl => pl.id === socket.playerId);
        if (p) { p.ready = !p.ready; updateRoom(state); broadcast(state); }
        break;
      }

      case 'start_game': {
        const state = socket.roomId ? getRoom(socket.roomId) : undefined;
        if (!state) return;
        const host = state.players.find(p => p.id === socket.playerId && p.isHost);
        if (!host) return err(socket, 'Only the host can start the game');
        if (state.players.length < state.settings.playerCount)
          return err(socket, 'Not all players connected');
        if (!state.players.every(p => p.ready))
          return err(socket, 'Not all players are ready');
        dealTiles(state);
        resolveFirstTurn(state);
        state.phase = 'playing';
        updateRoom(state);
        broadcast(state);
        break;
      }

      case 'play_tile': {
        const state = socket.roomId ? getRoom(socket.roomId) : undefined;
        if (!state || state.phase !== 'playing') return;
        const p = state.players.find(pl => pl.id === socket.playerId);
        if (!p || p.seat !== state.currentTurn) return err(socket, 'Not your turn');

        const result = placeTile(state, msg.tileId, msg.end);
        if (!result.ok) return err(socket, result.error!);

        const round = checkRoundEnd(state);
        if (round.ended) {
          if (checkMatchEnd(state)) {
            state.phase = 'matchEnd';
            state.goats = computeGoats(state);
            io.to(state.roomId).emit('match_end', {
              type: 'match_end', scores: state.scores, goats: state.goats,
            });
          } else {
            state.phase = 'roundEnd';
            state.roundWinner = round.winnerKey;
            state.roundWinReason = round.reason;
            io.to(state.roomId).emit('round_result', {
              type: 'round_result',
              winnerKey: round.winnerKey!, reason: round.reason!, scores: state.scores,
            });
          }
        } else {
          nextTurn(state);
        }

        updateRoom(state);
        broadcast(state);
        break;
      }

      case 'draw_from_bazaar': {
        const state = socket.roomId ? getRoom(socket.roomId) : undefined;
        if (!state || state.phase !== 'playing') return;
        const p = state.players.find(pl => pl.id === socket.playerId);
        if (!p || p.seat !== state.currentTurn) return err(socket, 'Not your turn');
        if (hasAnyPlay(p.hand, state.chain)) return err(socket, 'You have a valid play — boneyard unavailable');

        const idx = state.bazaar.findIndex(t => t.id === msg.tileId);
        if (idx === -1) return err(socket, 'Tile not in boneyard');
        const [drawn] = state.bazaar.splice(idx, 1);
        p.hand.push(drawn);
        // Turn stays on this player — they keep drawing until playable or bazaar empty, then pass
        updateRoom(state);
        broadcast(state);
        break;
      }

      case 'pass_turn': {
        const state = socket.roomId ? getRoom(socket.roomId) : undefined;
        if (!state || state.phase !== 'playing') return;
        const p = state.players.find(pl => pl.id === socket.playerId);
        if (!p || p.seat !== state.currentTurn) return err(socket, 'Not your turn');
        if (state.bazaar.length > 0) return err(socket, 'Boneyard is not empty — draw a tile');
        if (hasAnyPlay(p.hand, state.chain)) return err(socket, 'You have a valid play');
        nextTurn(state);
        const round = checkRoundEnd(state);
        if (round.ended) {
          if (checkMatchEnd(state)) {
            state.phase = 'matchEnd';
            state.goats = computeGoats(state);
            io.to(state.roomId).emit('match_end', {
              type: 'match_end', scores: state.scores, goats: state.goats,
            });
          } else {
            state.phase = 'roundEnd';
            state.roundWinner = round.winnerKey;
            state.roundWinReason = round.reason;
            io.to(state.roomId).emit('round_result', {
              type: 'round_result',
              winnerKey: round.winnerKey!, reason: round.reason!, scores: state.scores,
            });
          }
        }
        updateRoom(state);
        broadcast(state);
        break;
      }

      case 'leave_room': {
        if (!socket.roomId || !socket.playerId) return;
        const state = getRoom(socket.roomId);
        if (state) {
          state.players = state.players.filter(p => p.id !== socket.playerId);
          if (!state.players.length) { deleteRoom(socket.roomId); }
          else { updateRoom(state); broadcast(state); }
        }
        socket.leave(socket.roomId);
        socket.roomId = undefined;
        socket.playerId = undefined;
        break;
      }

      case 'start_next_round': {
        const state = socket.roomId ? getRoom(socket.roomId) : undefined;
        if (!state || state.phase !== 'roundEnd') return;
        const host = state.players.find(pl => pl.id === socket.playerId && pl.isHost);
        if (!host) return;
        dealTiles(state);
        resolveFirstTurn(state);
        state.phase = 'playing';
        state.roundWinner = undefined;
        state.roundWinReason = undefined;
        updateRoom(state);
        broadcast(state);
        break;
      }

      case 'restart_game': {
        const state = socket.roomId ? getRoom(socket.roomId) : undefined;
        if (!state) return;
        const host = state.players.find(p => p.id === socket.playerId && p.isHost);
        if (!host) return err(socket, 'Only the host can restart');
        state.phase = 'lobby';
        state.chain = [];
        state.bazaar = [];
        state.players.forEach(p => { p.hand = []; p.ready = false; });
        state.scores = initScores(state.settings);
        if (state.settings.mode === 'ffa') state.players.forEach(p => { state.scores[p.id] = 0; });
        state.roundWinner = undefined;
        state.roundWinReason = undefined;
        state.goats = undefined;
        state.currentTurn = 0;
        updateRoom(state);
        broadcast(state);
        break;
      }

      case 'reconnect': {
        const entry = consumeReconnectToken(msg.token);
        if (!entry) return err(socket, 'Session expired');
        const state = getRoom(entry.roomId);
        if (!state) return err(socket, 'Room no longer exists');
        const player = state.players.find(p => p.id === entry.playerId);
        if (!player) return err(socket, 'Player not found');
        socket.playerId = entry.playerId;
        socket.roomId = entry.roomId;
        player.connected = true;
        socket.join(entry.roomId);
        updateRoom(state);
        broadcast(state);
        break;
      }
    }
  });

  socket.on('disconnect', () => {
    if (!socket.roomId || !socket.playerId) return;
    const state = getRoom(socket.roomId);
    if (!state) return;
    const p = state.players.find(pl => pl.id === socket.playerId);
    if (!p) return;
    p.connected = false;
    updateRoom(state);
    broadcast(state);

    scheduleReconnect(socket.id, socket.roomId, socket.playerId, () => {
      const s = getRoom(socket.roomId!);
      if (!s) return;
      s.players = s.players.filter(pl => pl.id !== socket.playerId);
      if (!s.players.length) { deleteRoom(socket.roomId!); return; }
      updateRoom(s);
      broadcast(s);
    });
  });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, '0.0.0.0', () => console.log(`Kozel server listening on port ${PORT}`));
