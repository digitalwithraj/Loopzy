# Loopzy Security Specification & Test-Driven Development (TDD) Plan

## 1. Data Invariants
To maintain a mathematically secure, zero-trust state for Loopzy, we enforce the following invariants across the four Collections (`profiles`, `habits`, `habit_logs`, `reminders`):

1. **Profile Ownership**: A user profile belongs exclusively to the authenticated user whose `request.auth.uid` matches the document ID. No user may read, write, or modify another user's private profile.
2. **Privilege Isolation**: A user cannot self-assign `isPremium: true` in their profile schema during registration or profile update. Subscription states are system-generated invariants and can only be set via administrative triggers.
3. **Habit Attachment**: Every Habit document must possess a valid metadata schema where the `userId` matches the verified `request.auth.uid`. No user can manipulate, create, edit, or delete another user's habits.
4. **Log Atomicity**: A HabitLog represents a completion check-in. The `userId` must equal the caller (`request.auth.uid`), and the log's parent Habit must actually belong to the same caller. Optional notes are strictly capped at 200 characters.
5. **Temporal Integrity**: All timestamp fields (`createdAt`, `updatedAt`) must be verified on-chain using `request.time` to prevent client clock manipulation.
6. **Alarm Safety**: Reminders must share the owner ID of the active caller, preventing cross-user scheduling/snooping.

---

## 2. The "Dirty Dozen" Malicious Payloads
The following payloads are explicitly crafted to violate identity bounding, skip state safety, inject arbitrary fields, or bypass schema limits. Security rules must mathematically reject every single one of these:

### [PII ISOLATION & SECURITY SNOOP]
#### Payload 1: Unauthorized Read of Target Person's Private Profile
* **Target Operation**: `get` on `/profiles/victim-uid-123`
* **Caller Auth**: `uid: "attacker-456", email: "hacker@evil.com", email_verified: true`
* **Result**: `Permission Denied` (Requires `request.auth.uid == "victim-uid-123"`)

#### Payload 2: Hostile Takeover of Another Profile's Settings
* **Target Operation**: `update` on `/profiles/victim-uid-123`
* **Payload**:
  ```json
  {
    "username": "HackedByAdversary",
    "avatar": "av-star"
  }
  ```
* **Caller Auth**: `uid: "attacker-456", email: "hacker@evil.com", email_verified: true`
* **Result**: `Permission Denied` (User ID mismatch)

### [PRIVILEGE ESCALATION & BILLING BYPASS]
#### Payload 3: Self-Upgrading to Premium Status
* **Target Operation**: `create` or `update` on `/profiles/my-own-uid-456`
* **Payload**:
  ```json
  {
    "id": "my-own-uid-456",
    "username": "AnarchistUser",
    "avatar": "av-calm",
    "timezone": "UTC",
    "onboardingCompleted": true,
    "isPremium": true, // <--- Hostile Field Injection
    "createdAt": "2026-05-28T11:27:03Z"
  }
  ```
* **Caller Auth**: `uid: "my-own-uid-456", email: "user@normie.com", email_verified: true`
* **Result**: `Permission Denied` (Rules must prevent caller from setting `isPremium` to true)

#### Payload 4: Resource Exhaustion / Denial of Wallet via Giant Profile Input
* **Target Operation**: `create` on `/profiles/my-own-uid-456`
* **Payload**:
  ```json
  {
    "id": "my-own-uid-456",
    "username": "A".repeat(5000), // <--- Massive String Injection
    "avatar": "av-calm",
    "timezone": "UTC",
    "onboardingCompleted": true,
    "isPremium": false,
    "createdAt": "2026-05-28T11:27:03Z"
  }
  ```
* **Caller Auth**: `uid: "my-own-uid-456", email: "user@normie.com", email_verified: true`
* **Result**: `Permission Denied` (String bounds constraint violated)

### [IDENTITY SPOOFING & RESOURCE POISONING]
#### Payload 5: Creating Habit with Fraudulent Owner Identity
* **Target Operation**: `create` on `/habits/fake-habit-id`
* **Payload**:
  ```json
  {
    "id": "fake-habit-id",
    "userId": "victim-uid-123", // <--- Identity Spoofing attempt
    "name": "Malicious Script Running",
    "description": "Nasty payload injection",
    "category": "Mind",
    "frequency": "daily",
    "frequencyDays": [0,1,2,3,4,5,6],
    "reminderTime": "08:00",
    "isArchived": false,
    "createdAt": "2026-05-28T11:27:03Z"
  }
  ```
* **Caller Auth**: `uid: "attacker-456", email: "hacker@evil.com", email_verified: true`
* **Result**: `Permission Denied` (Relational check `userId == request.auth.uid` fails)

#### Payload 6: Modifying Another User's Habit Config
* **Target Operation**: `update` on `/habits/victim-habit-789`
* **Payload**:
  ```json
  {
    "name": "Vandalized Habit Goal"
  }
  ```
* **Caller Auth**: `uid: "attacker-456", email: "hacker@evil.com", email_verified: true`
* **Result**: `Permission Denied` (Access control check fails)

#### Payload 7: Deleting Another User's Private Habit Logs
* **Target Operation**: `delete` on `/habits/victim-habit-789`
* **Caller Auth**: `uid: "attacker-456", email: "hacker@evil.com", email_verified: true`
* **Result**: `Permission Denied` (Owner mismatch)

#### Payload 8: Creating Habit with Invalid Category (Data Pollution)
* **Target Operation**: `create` on `/habits/my-habit-001`
* **Payload**:
  ```json
  {
    "id": "my-habit-001",
    "userId": "my-own-uid-456",
    "name": "Nurturing Mind",
    "description": "Nurture with standard categories",
    "category": "MALICIOUS_CATEGORY_INJECT", // <--- Schema Poisoning
    "frequency": "daily",
    "frequencyDays": [0,1,2,3,4,5,6],
    "reminderTime": "08:00",
    "isArchived": false,
    "createdAt": "2026-05-28T11:27:03Z"
  }
  ```
* **Caller Auth**: `uid: "my-own-uid-456", email: "user@normie.com", email_verified: true`
* **Result**: `Permission Denied` (Category enum constraint violated)

### [JOURNAL COMPROMISE & RECORD POISONING]
#### Payload 9: Writing Completion Log on Sibling User's Habit Trackers
* **Target Operation**: `create` on `/habit_logs/log-victim-habit-789-2026-05-28`
* **Payload**:
  ```json
  {
    "id": "log-victim-habit-789-2026-05-28",
    "userId": "attacker-456",
    "habitId": "victim-habit-789", // <--- Victim's habit ID
    "date": "2026-05-28",
    "completed": true,
    "note": "Hacked check-in!",
    "updatedAt": "2026-05-28T11:27:03Z"
  }
  ```
* **Caller Auth**: `uid: "attacker-456", email: "hacker@evil.com", email_verified: true`
* **Result**: `Permission Denied` (Derived sync: caller does not own target habit)

#### Payload 10: Writing Reflective Journal Exceeding Safety Bounds
* **Target Operation**: `create` on `/habit_logs/log-my-habit-222-2026-05-28`
* **Payload**:
  ```json
  {
    "id": "log-my-habit-222-2026-05-28",
    "userId": "my-own-uid-456",
    "habitId": "my-habit-222",
    "date": "2026-05-28",
    "completed": true,
    "note": "X".repeat(500), // <--- Massive String Exceeding 100 char limit
    "updatedAt": "2026-05-28T11:27:03Z"
  }
  ```
* **Caller Auth**: `uid: "my-own-uid-456", email: "user@normie.com", email_verified: true`
* **Result**: `Permission Denied` (Note size constraint violated)

#### Payload 11: Spoofing UpdatedAt to Freeze/Skip Relational Timestamps
* **Target Operation**: `create` on `/habit_logs/log-my-habit-222-2026-05-28`
* **Payload**:
  ```json
  {
    "id": "log-my-habit-222-2026-05-28",
    "userId": "my-own-uid-456",
    "habitId": "my-habit-222",
    "date": "2026-05-28",
    "completed": true,
    "note": "Sipped clean water.",
    "updatedAt": "1999-01-01T00:00:00Z" // <--- Clamped client-side timestamp spoofing
  }
  ```
* **Caller Auth**: `uid: "my-own-uid-456", email: "user@normie.com", email_verified: true`
* **Result**: `Permission Denied` (Required `incoming().updatedAt == request.time`)

#### Payload 12: Creating Alarm Reminder Scheduling Trap
* **Target Operation**: `create` on `/reminders/fake-alarm`
* **Payload**:
  ```json
  {
    "id": "fake-alarm",
    "userId": "victim-uid-123", // <--- Assign alarm to someone else
    "type": "daily",
    "time": "08:00",
    "days": [0,1,2,3,4,5,6],
    "active": true,
    "title": "Malicious notification spam"
  }
  ```
* **Caller Auth**: `uid: "attacker-456", email: "hacker@evil.com", email_verified: true`
* **Result**: `Permission Denied` (Identity bonding mismatch)

---

## 3. The Test Runner Structure
The rules-enforced behaviors are tested using the standard Firebase security unit testing client library:

```typescript
// firestore.rules.test.ts
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'brilliant-block-xrtgb',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Loopzy Security Hardening Tests', () => {
  test('Payload 1: Unowned Profile Access is Strictly Blocked', async () => {
    const attackerContext = testEnv.authenticatedContext('attacker-456');
    const db = attackerContext.firestore();
    const docRef = doc(db, 'profiles', 'victim-uid-123');
    await expect(getDoc(docRef)).rejects.toThrow();
  });

  test('Payload 3: Self-Upgrading to Premium Status is Blocked', async () => {
    const regularContext = testEnv.authenticatedContext('my-own-uid-456');
    const db = regularContext.firestore();
    const docRef = doc(db, 'profiles', 'my-own-uid-456');
    await expect(setDoc(docRef, {
      id: 'my-own-uid-456',
      username: 'AnarchistUser',
      avatar: 'av-calm',
      timezone: 'UTC',
      onboardingCompleted: true,
      isPremium: true, // Malicious field injection
      createdAt: new Date().toISOString()
    })).rejects.toThrow();
  });

  test('Payload 5: Creating Habit with Fraudulent Owner Identity is Blocked', async () => {
    const attackerContext = testEnv.authenticatedContext('attacker-456');
    const db = attackerContext.firestore();
    const docRef = doc(db, 'habits', 'fake-habit-id');
    await expect(setDoc(docRef, {
      id: 'fake-habit-id',
      userId: 'victim-uid-123',
      name: 'Malicious Script Running',
      description: 'Nasty payload injection',
      category: 'Mind',
      frequency: 'daily',
      frequencyDays: [0,1,2,3,4,5,6],
      reminderTime: '08:00',
      isArchived: false,
      createdAt: new Date().toISOString()
    })).rejects.toThrow();
  });

  test('Payload 9: Writing Completion Log on Sibling Habit Tracker is Blocked', async () => {
    const attackerContext = testEnv.authenticatedContext('attacker-456');
    const db = attackerContext.firestore();
    const docRef = doc(db, 'habit_logs', 'log-victim-habit-789-2026-05-28');
    await expect(setDoc(docRef, {
      id: 'log-victim-habit-789-2026-05-28',
      userId: 'attacker-456',
      habitId: 'victim-habit-789',
      date: '2026-05-28',
      completed: true,
      note: 'Hacked check-in!',
      updatedAt: new Date().toISOString()
    })).rejects.toThrow();
  });
});
```
