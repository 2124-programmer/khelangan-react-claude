# Admin RBAC — Super-admin, Support & Read-only

> How admin sub-roles are implemented in Score-Adda. Every reference below is quoted from the codebase (backend `turfbook-backend`, frontend `turfbook-claudeAI`).

---

## 1. The big picture

There is **one** account role for staff: `ADMIN`. On top of that, every admin has a **sub-role** that decides *what they can do*:

| Sub-role | Can view | Can do soft moderation (suspend, verify, message, notes, resolve disputes) | Can ban / unban / delete | Can change other admins' sub-roles |
|---|---|---|---|---|
| **READ_ONLY** | ✅ everything | ❌ | ❌ | ❌ |
| **SUPPORT** | ✅ everything | ✅ | ❌ | ❌ |
| **SUPER_ADMIN** | ✅ everything | ✅ | ✅ | ✅ |

Two design rules make this safe and backward-compatible:

1. **Legacy admins keep full power.** An admin whose sub-role is `NULL` (i.e. every admin that existed before this feature) is treated as **SUPER_ADMIN**. No database migration was needed.
2. **Defense in depth.** The server both *hides* actions a sub-role can't perform (so the UI never shows them) **and** *rejects* them if attempted anyway (so a crafted API call still fails).

---

## 2. Where the sub-role lives — the data model

The sub-role is a column on the user, modeled as an enum.

`entity/UserEntity.java`:
```java
public enum AdminRole {
    SUPER_ADMIN, SUPPORT, READ_ONLY
}

/** Admin sub-role; NULL for non-admins and legacy admins (legacy NULL ⇒ treated as SUPER_ADMIN). */
@Enumerated(EnumType.STRING)
@Column(name = "admin_role", length = 20)
private AdminRole adminRole;
```

- Stored as a string in the `users.admin_role` column.
- `NULL` for players, owners, and pre-existing admins.

---

## 3. The brain — `AdminPermissionService`

All RBAC logic is centralized in one service (`service/AdminPermissionService.java`) so no screen or controller re-implements the rules.

### 3.1 Resolving the effective role

```java
public UserEntity.AdminRole roleOf(Long actorId) {
    if (actorId == null) return null;
    UserEntity actor = userRepository.findById(actorId).orElse(null);
    if (actor == null || actor.getRole() != UserEntity.Role.ADMIN) return null;   // not an admin
    return actor.getAdminRole() != null ? actor.getAdminRole()
                                        : UserEntity.AdminRole.SUPER_ADMIN;        // legacy NULL ⇒ SUPER_ADMIN
}
```

### 3.2 The capability checks

```java
private static final Set<String> HARD_ACTIONS = Set.of("BAN", "UNBAN", "DELETE");

public boolean canWrite(Long actorId) {            // SUPPORT or SUPER_ADMIN
    AdminRole r = roleOf(actorId);
    return r == AdminRole.SUPER_ADMIN || r == AdminRole.SUPPORT;
}

public boolean canModerateHard(Long actorId) {     // SUPER_ADMIN only
    return roleOf(actorId) == AdminRole.SUPER_ADMIN;
}
```

### 3.3 The two guards used by services

```java
/** Block READ_ONLY admins from any mutating action. */
public void requireWrite(Long actorId) {
    if (!canWrite(actorId))
        throw new ForbiddenException("Your admin role is read-only and cannot perform this action.");
}

/** Gate ban/delete (and admin-role assignment) to SUPER_ADMIN only. */
public void requireModerateHard(Long actorId) {
    if (!canModerateHard(actorId))
        throw new ForbiddenException("Only a super-admin can ban, delete, or change admin roles.");
}
```

So in practice:
- **READ_ONLY** fails `requireWrite` → blocked from *every* mutation.
- **SUPPORT** passes `requireWrite` but fails `requireModerateHard` → can do soft moderation, blocked from ban/delete.
- **SUPER_ADMIN** passes both.

---

## 4. How the UI knows what to show — `availableActions` + `filterActions`

Every admin "detail" resource (player, owner, venue, dispute) returns a server-computed list called **`availableActions`** — the actions valid *for that resource's current state* (e.g. you can only `UNBAN` a banned user). Before sending it, the service **filters it by the caller's sub-role**:

```java
public List<String> filterActions(List<String> actions) {
    if (actions == null || actions.isEmpty()) return actions;
    AdminRole r = roleOf(currentActorId());
    if (r == AdminRole.READ_ONLY) return List.of();                                  // sees no actions
    if (r == AdminRole.SUPPORT)
        return actions.stream().filter(a -> !HARD_ACTIONS.contains(a)).toList();      // no BAN/UNBAN/DELETE
    return actions;                                                                   // SUPER_ADMIN: unchanged
}
```

`currentActorId()` reads the logged-in admin from the JWT security context:
```java
public Long currentActorId() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) return up.getId();
    return null;
}
```

### The frontend just trusts `availableActions`

The app never checks the sub-role itself — it only renders the buttons the server allowed. Example from `screens/admin/PlayerDetailScreen.tsx`:

```ts
const canVerify  = d?.availableActions.includes('VERIFY');
const barActions = (d?.availableActions ?? []).filter((a) => BAR_ACTIONS[a]);
const orderedBar = BAR_ORDER.filter((a) => barActions.includes(a));
```

Result:
- A **READ_ONLY** admin gets `availableActions: []` → the action bar is empty (view-only).
- A **SUPPORT** admin sees Suspend/Reactivate/Verify/Message/etc. but **never** Ban/Unban/Delete.
- A **SUPER_ADMIN** sees the full set.

This is why the gating is consistent everywhere: the *same* `filterActions` runs on Players, Owners, Venues, and Disputes.

---

## 5. Where the guards are wired in

`requireWrite` / `requireModerateHard` / `filterActions` are applied across the admin services (confirmed in code):

| Service | What it gates |
|---|---|
| `AdminPlayerServiceImpl` | `requireWrite` on suspend/reactivate/verify/force-logout/reset-password/message; `requireModerateHard` on **ban/delete**; `filterActions` on the player's `availableActions` |
| `AdminOwnerServiceImpl` | same pattern for owners (incl. the ban/delete moderation cascade) |
| `AdminDisputeServiceImpl` | `requireWrite` on assign/message/request-info/add-note/resolve/dismiss/reopen; `filterActions` on dispute actions |
| `VenueServiceImpl` | `requireWrite` on venue status changes (approve/reject/send-back/unlist/relist); `filterActions` on venue `availableActions` |
| `UserServiceImpl` | `requireModerateHard` on **assigning admin sub-roles** |

So every mutation path is double-protected: the button is hidden (via `filterActions`) **and** the operation is rejected server-side (via `requireWrite`/`requireModerateHard`) if called directly.

---

## 6. Assigning a sub-role (super-admin only)

There is one endpoint to grant/change another admin's sub-role.

**`PATCH /api/v1/admin/users/{id}/admin-role`** — `controller/UserController.java`:
```java
@PatchMapping("/api/v1/admin/users/{id}/admin-role")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<MessageResponse> setAdminRole(
        @PathVariable Long id, @Valid @RequestBody SetAdminRoleRequest request) {
    UserPrincipal principal = getPrincipal();
    return ResponseEntity.ok(userService.setAdminRole(principal.getId(), id, request));
}
```

Request body (`dto/SetAdminRoleRequest.java`): `{ "adminRole": "SUPPORT" }` (one of `SUPER_ADMIN`, `SUPPORT`, `READ_ONLY`).

The service enforces the real rules (`service/impl/UserServiceImpl.java`):
```java
public MessageResponse setAdminRole(Long actorId, Long targetUserId, SetAdminRoleRequest request) {
    adminPermissionService.requireModerateHard(actorId);                 // SUPER_ADMIN only
    AdminRole role = AdminRole.valueOf(request.getAdminRole().trim().toUpperCase()); // else 400
    UserEntity target = getEntityById(targetUserId);
    if (target.getRole() != Role.ADMIN)                                  // else 409
        throw new ConflictException("Admin sub-roles apply only to ADMIN users.");
    target.setAdminRole(role);
    target.setTokenVersion(target.getTokenVersion() + 1);               // re-issue JWT → takes effect immediately
    userRepository.save(target);
    return /* "Admin role updated to <role>." */;
}
```

Key points:
- **Only a SUPER_ADMIN** can call it (`requireModerateHard`). Note the `@PreAuthorize("hasRole('ADMIN')")` only checks the *account* role; the *sub-role* gate is the `requireModerateHard` line.
- The target **must already be an ADMIN** (sub-roles don't apply to players/owners).
- Bumping `tokenVersion` invalidates the target admin's existing JWTs, so the new permissions apply on their next request rather than waiting for the old token to expire.
- Invalid values → `400`; non-admin target → `409`.

---

## 7. End-to-end example: a SUPPORT admin opens a player

1. SUPPORT admin opens `PlayerDetail` → `GET /api/v1/admin/players/{id}`.
2. `AdminPlayerServiceImpl` computes state-valid actions, e.g. `["SUSPEND","BAN","DELETE","MESSAGE","VERIFY"]`, then calls `filterActions(...)`.
3. `filterActions` sees the caller is SUPPORT → strips `HARD_ACTIONS` → returns `["SUSPEND","MESSAGE","VERIFY"]`.
4. The app renders only those buttons (Ban/Delete never appear).
5. If the SUPPORT admin somehow POSTs to the ban endpoint anyway, `requireModerateHard(actorId)` throws **403 Forbidden** — "Only a super-admin can ban, delete, or change admin roles."

For a READ_ONLY admin, step 3 returns `[]` → no action bar at all, and any mutation attempt hits `requireWrite` → 403.

---

## 8. Quick reference

| Concept | Location |
|---|---|
| `AdminRole` enum + `admin_role` column | `entity/UserEntity.java` |
| All RBAC logic | `service/AdminPermissionService.java` |
| `HARD_ACTIONS = {BAN, UNBAN, DELETE}` | `AdminPermissionService` |
| Legacy `NULL ⇒ SUPER_ADMIN` rule | `AdminPermissionService.roleOf(...)` |
| Guards: `requireWrite`, `requireModerateHard` | `AdminPermissionService` |
| UI filter: `filterActions(...)` | `AdminPermissionService` (used in all admin services) |
| Assign sub-role endpoint | `PATCH /api/v1/admin/users/{id}/admin-role` (`controller/UserController.java`) |
| Assign logic + token bump | `service/impl/UserServiceImpl.setAdminRole(...)` |
| Frontend consumes `availableActions` | e.g. `screens/admin/PlayerDetailScreen.tsx` (also Owner/Venue/Dispute detail screens) |

> **Note:** Because all current admins have `admin_role = NULL`, they behave as SUPER_ADMIN today. SUPPORT / READ_ONLY only take effect once a super-admin assigns them via the endpoint above.
