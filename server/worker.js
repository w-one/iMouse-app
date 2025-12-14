/* ========================================
   iMouse 2.0 - robotjs Worker
   ======================================== */

const { parentPort, workerData, isMainThread } = require('worker_threads');
const robot = require('robotjs');

const useParentPort = !isMainThread && parentPort;
const config = useParentPort
  ? workerData || {}
  : (() => {
      try {
        return JSON.parse(process.env.IMOUSE_WORKER_DATA || '{}');
      } catch {
        return {};
      }
    })();

const state = {
  screenSize: null,
  cursorPos: null,
  isDragging: false,
  moveBuffer: { dx: 0, dy: 0 },
  hasPendingMove: false,
  moveInterval: null,
  syncInterval: null
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clampDelta = (value) => {
  const max = config.cursor?.maxDelta || 120;
  return clamp(value, -max, max);
};

const messenger = {
  send(message) {
    if (useParentPort && parentPort) {
      parentPort.postMessage(message);
    } else if (process.send) {
      process.send(message);
    }
  },
  onMessage(handler) {
    if (useParentPort && parentPort) {
      parentPort.on('message', handler);
    } else {
      process.on('message', handler);
    }
  }
};

function safeRun(label, fn) {
  try {
    fn();
  } catch (err) {
    messenger.send({ type: 'workerError', label, message: err.message });
    if (label === 'moveMouse' || label === 'getMousePos') {
      syncCursor();
    }
  }
}

function init() {
  safeRun('init', () => {
    robot.setMouseDelay(1);
    state.screenSize = robot.getScreenSize();
    state.cursorPos = robot.getMousePos();
  });

  state.moveInterval = setInterval(processMoveBuffer, 8);
  state.syncInterval = setInterval(syncCursor, 1500);

  messenger.send({
    type: 'ready',
    screen: state.screenSize
  });
}

function enqueueMove(dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
  const threshold = 0.05;
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    return;
  }

  state.moveBuffer.dx += dx;
  state.moveBuffer.dy += dy;
  state.hasPendingMove = true;
}

function processMoveBuffer() {
  if (!state.hasPendingMove) return;

  const dx = state.moveBuffer.dx;
  const dy = state.moveBuffer.dy;
  state.moveBuffer = { dx: 0, dy: 0 };
  state.hasPendingMove = false;

  const threshold = 0.05;
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

  if (!state.cursorPos) {
    try {
      state.cursorPos = robot.getMousePos();
    } catch {
      return;
    }
  }

  const speed = config.cursor?.speedMultiplier || 1.0;
  const limitedDx = clampDelta(dx);
  const limitedDy = clampDelta(dy);

  state.cursorPos.x += limitedDx * speed;
  state.cursorPos.y += limitedDy * speed;

  if (state.screenSize) {
    state.cursorPos.x = clamp(state.cursorPos.x, 0, state.screenSize.width - 1);
    state.cursorPos.y = clamp(state.cursorPos.y, 0, state.screenSize.height - 1);
  }

  const targetX = Math.round(state.cursorPos.x);
  const targetY = Math.round(state.cursorPos.y);

  safeRun('moveMouse', () => robot.moveMouse(targetX, targetY));
}

function syncCursor() {
  safeRun('getMousePos', () => {
    state.cursorPos = robot.getMousePos();
  });
}

function handleGesture(gesture) {
  switch (gesture) {
    case 'missionControl':
      safeRun('gestureMissionControl', () => robot.keyTap('up', ['control']));
      break;
    case 'appExpose':
      safeRun('gestureAppExpose', () => robot.keyTap('down', ['control']));
      break;
    case 'desktopLeft':
      safeRun('gestureDesktopLeft', () => robot.keyTap('left', ['control']));
      break;
    case 'desktopRight':
      safeRun('gestureDesktopRight', () => robot.keyTap('right', ['control']));
      break;
    case 'showDesktop':
      safeRun('gestureShowDesktop', () => robot.keyTap('f11'));
      break;
    case 'browserBack':
      safeRun('gestureBrowserBack', () => robot.keyTap('[', ['command']));
      break;
    case 'browserForward':
      safeRun('gestureBrowserForward', () => robot.keyTap(']', ['command']));
      break;
    default:
      messenger.send({ type: 'workerWarn', message: `Unknown gesture: ${gesture}` });
  }
}

messenger.onMessage((message) => {
  const { type, payload = {} } = message || {};

  switch (type) {
    case 'move':
      enqueueMove(payload.dx, payload.dy);
      break;
    case 'click':
      safeRun('click', () => robot.mouseClick());
      break;
    case 'rightClick':
      safeRun('rightClick', () => robot.mouseClick('right'));
      break;
    case 'scroll': {
      const dx = clampDelta(Number(payload.dx) || 0);
      const dy = clampDelta(Number(payload.dy) || 0);
      safeRun('scroll', () => {
        if (Math.abs(dy) > Math.abs(dx)) {
          robot.scrollMouse(0, Math.round(dy));
        } else {
          robot.scrollMouse(Math.round(dx), 0);
        }
      });
      break;
    }
    case 'zoom':
      safeRun('zoom', () => {
        if ((Number(payload.delta) || 0) > 0) {
          robot.keyTap('=', ['command']);
        } else {
          robot.keyTap('-', ['command']);
        }
      });
      break;
    case 'dragStart':
      if (state.isDragging) break;
      safeRun('dragStart', () => robot.mouseToggle('down'));
      state.isDragging = true;
      break;
    case 'dragEnd':
      if (!state.isDragging) break;
      safeRun('dragEnd', () => robot.mouseToggle('up'));
      state.isDragging = false;
      break;
    case 'gesture':
      handleGesture(payload.gesture);
      break;
    case 'sync':
      syncCursor();
      break;
    default:
      messenger.send({ type: 'workerWarn', message: `Unknown command: ${type}` });
  }
});

init();
