# Bug Report: Payment Delay & Missing Real-Time Notifications

**Project**: IELTS Hybrid Learning Platform  
**Reported**: 2026-05-30  
**Status**: ✅ Fixed

---

## 🐛 Bug 1: 8-Second Delay on Booking Payment

### Affected File

**`server/src/models/MarketplaceRequest.ts`**

### Why It Was Not Working

The `afterCreate` and `afterUpdate` Sequelize model hooks used `async/await` when publishing events to Kafka:

```typescript
// ❌ BEFORE — Broken
afterCreate: async (request) => {
    try {
        await queueService.publish(...); // blocks the entire DB transaction!
    } catch (err) {
        console.error(err);
    }
}
```

**Root Cause:**  
Sequelize runs `afterCreate`/`afterUpdate` hooks **inside** the active database transaction. When the hook `await`s the Kafka publish call, it holds the transaction open until Kafka responds.

On **cold start** (when Kafka's TCP connection hasn't been established yet), Kafka takes **~8 seconds** to connect. During those 8 seconds:
- The database transaction is locked and cannot commit.
- The HTTP response to the student is blocked.
- The student sees a loading spinner for ~8 seconds before the booking confirms.

This is a classic "blocking I/O inside a DB hook" anti-pattern.

### Solution

Remove `async/await` and convert to **fire-and-forget** using `.then().catch()`:

```typescript
// ✅ AFTER — Fixed
afterCreate: (request) => {
    // Fire-and-forget: NEVER await Kafka inside a Sequelize hook.
    // Awaiting blocks the DB transaction until Kafka connects (~8s cold start).
    queueService.publish(...)
        .then(() => console.log("✅ Published to Kafka"))
        .catch((err) => console.error('[Hook] afterCreate error', err));
}
```

**Why this works:**  
The hook fires the Kafka publish promise and immediately returns. The DB transaction commits instantly, the HTTP response goes back to the student in milliseconds, and Kafka processes the event in the background. If Kafka fails, the `.catch()` logs the error without crashing the transaction.

---

## 🐛 Bug 2: Notification Page Does Not Receive Updates After Booking

This bug has **two separate layers** that must both be fixed for real-time notifications to work.

### Background: The Architecture

The platform has **two separate Node.js processes**:

| Process | Role | Has Socket.io? |
|---------|------|---------------|
| `server.ts` (Express API) | Handles HTTP requests | ✅ Yes |
| `consumer.ts` (Kafka Worker) | Processes Kafka events, writes notifications to DB | ❌ No |

When a student books a session:
1. `reservationController` → calls `payForReservation()` → Kafka publishes `MARKETPLACE_REQUEST_CREATED`
2. `consumer.ts` picks up the event → writes a notification row to PostgreSQL DB
3. **Problem:** the consumer has no Socket.io instance, so it cannot push to the frontend
4. The frontend notification page only fetches once on mount → it never sees the new row

---

### Layer 1 — Backend: Emit Socket Event from API Process

#### Affected Files

- **`server/src/controllers/reservationController.ts`** — Student pays for a booking
- **`server/src/controllers/teacherController.ts`** — Teacher processes a withdrawal

#### Why It Was Not Working

After `payForReservation()` succeeded, the controller simply returned a JSON response. It never emitted any Socket.io event, so the frontend had no way to know a new notification had been created.

```typescript
// ❌ BEFORE — No socket emit
const result = await this.reservationService.payForReservation(payload);
res.status(200).json({ success: true, marketplaceRequestId: result.id });
```

The consumer process eventually writes the notification to DB, but since it runs in a **separate process** with no socket access, it cannot push updates to the browser.

#### Solution

After the payment/withdrawal succeeds in the API process (which **does** have `io`), emit a `new_notification` socket event to the affected users' rooms:

**`reservationController.ts`**
```typescript
// ✅ AFTER — Emit to both student and teacher rooms
const result = await this.reservationService.payForReservation(payload);

const io = req.app.get('io');
if (io && result.teacherId) {
    io.to(studentId).emit('new_notification');
    io.to(result.teacherId).emit('new_notification');
}

res.status(200).json({ success: true, marketplaceRequestId: result.id });
```

**`teacherController.ts`**
```typescript
// ✅ AFTER — Emit to teacher room after withdrawal
const newBalance = await this.teacherService.withdraw(payload);

const io = req.app.get('io');
if (io) {
    io.to(teacherId).emit('new_notification');
}

res.json({ success: true, newBalance });
```

**Why the 1.5s delay before refetching:**  
The socket event fires immediately after the API responds, but the Kafka consumer may take a few hundred milliseconds to write the notification row to DB. The frontend waits 1.5 seconds after receiving the socket event before fetching, to ensure the notification is already in the database when the request arrives.

---

### Layer 2 — Frontend: Listen for Socket Events and Poll as Fallback

#### Affected Files

- **`client/src/pages/dashboard/StudentNotifications.tsx`**
- **`client/src/pages/teacher/TeacherNotifications.tsx`**

#### Why It Was Not Working

Both pages fetched notifications **only once** on mount via a single `useEffect`:

```typescript
// ❌ BEFORE — Fetches once, never updates
useEffect(() => {
    fetchNotifications();
}, [fetchNotifications]);
```

After the initial fetch, the component sat idle. Even if the server emitted a `new_notification` socket event, there was no listener to receive it. The student/teacher had to manually refresh the page to see new notifications.

#### Solution

Add two mechanisms to both pages:

1. **Socket.io listener** — connects to the server, joins the user's personal room, and refetches 1.5s after receiving a `new_notification` event.
2. **30-second polling fallback** — catches notifications from background processes (cron jobs, AI writing evaluations) that do not emit socket events.

```typescript
// ✅ AFTER — StudentNotifications.tsx & TeacherNotifications.tsx
import { io, Socket } from 'socket.io-client';

const socketRef = useRef<Socket | null>(null);

useEffect(() => {
    fetchNotifications(); // initial load

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
        if (user?.uid) socket.emit('join_user_room', user.uid);
    });

    // Real-time: triggered by API process after booking/withdrawal
    socket.on('new_notification', () => {
        setTimeout(fetchNotifications, 1500); // wait for consumer to write to DB
    });

    // Fallback: catches cron & AI evaluation notifications (no socket emit)
    const pollInterval = setInterval(fetchNotifications, 30_000);

    return () => {
        socket.disconnect();
        clearInterval(pollInterval);
    };
}, [fetchNotifications, user?.uid]);
```

---

## 🐛 Bug 3: Unit Test Fails After Socket.io Emit Was Added

### Affected File

**`server/src/controllers/__tests__/reservationController.test.ts`**

### Why It Was Not Working

After the socket emit was added to `payForReservation()`, the existing unit test started failing:

```
Expected: 200
Number of calls: 0
```

The test mock for `mockReq` did not include an `app` property:

```typescript
// ❌ BEFORE — mockReq has no app property
mockReq = {
  params: {},
  user: { uid: 'student123', email: 'student@test.com' } as any,
};
```

When the controller ran `req.app.get('io')`, it threw:

```
TypeError: Cannot read properties of undefined (reading 'get')
```

This error was silently caught by the `try/catch` block, which called `next(error)` instead of `res.status(200).json(...)`. The test then asserted `statusMock` was called with `200`, but it never was — hence 0 calls.

### Solution

Add a mock for `req.app.get` that returns `null`. The controller's guard `if (io && result.teacherId)` safely skips the emit, and execution continues to `res.status(200)` as expected:

```typescript
// ✅ AFTER — mockReq includes app.get mock
mockReq = {
  params: {},
  user: { uid: 'student123', email: 'student@test.com' } as any,
  // Mock req.app.get so the Socket.io emit guard (if (io && ...)) returns
  // null safely and doesn't throw "Cannot read properties of undefined".
  app: { get: jest.fn().mockReturnValue(null) } as any,
};
```

**Result:** All 4 tests in `reservationController.test.ts` pass. The `io` guard pattern is the correct defensive approach — controllers must always check `if (io)` before emitting so they degrade gracefully in test and CI environments where no Socket.io server is running.

---

## ✅ Summary of All Changes

| File | Bug | Change |
|------|-----|--------|
| `server/src/models/MarketplaceRequest.ts` | Payment 8s delay | Removed `await` from Kafka hooks → fire-and-forget |
| `server/src/controllers/reservationController.ts` | Missing notification | Emit `new_notification` socket event to student + teacher after payment |
| `server/src/controllers/teacherController.ts` | Missing notification | Emit `new_notification` socket event to teacher after withdrawal |
| `client/src/pages/dashboard/StudentNotifications.tsx` | Missing notification | Add socket listener + 30s polling fallback |
| `client/src/pages/teacher/TeacherNotifications.tsx` | Missing notification | Add socket listener + 30s polling fallback |
| `server/src/controllers/__tests__/reservationController.test.ts` | Broken unit test | Add `app: { get: jest.fn().mockReturnValue(null) }` to `mockReq` |

---

## 📐 Rule Going Forward

> **Any `createNotification()` call inside the API process MUST be paired with `io.to(userId).emit('new_notification')`.**  
> Notifications created by the **consumer process** or **cron jobs** are automatically caught by the 30-second polling fallback — no extra work needed for those.
