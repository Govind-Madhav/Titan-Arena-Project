# Extended Settings API Walkthrough

This document details the new backend endpoints implemented for the Extended Settings page.

## 1. Identity Management (`/auth`)

### Change Username
*   **Endpoint**: `POST /auth/change-username`
*   **Body**: `{ "newUsername": "ProGamer123" }`
*   **Rules**: 
    *   Limit: 1 change per account (tracked via `usernameChangeCount`).
    *   Validation: Min 3 chars, alphanumeric.

### Change Email
**Step 1: Initialize**
*   **Endpoint**: `POST /auth/change-email/init`
*   **Body**: `{ "newEmail": "new@example.com" }`
*   **Action**: Sends an OTP to the *new* email address.

**Step 2: Verify**
*   **Endpoint**: `POST /auth/change-email/verify`
*   **Body**: `{ "newEmail": "new@example.com", "otp": "123456", "password": "currentPassword" }`
*   **Action**: 
    1.  Verifies OTP and Current Password.
    2.  Updates email.
    3.  **Security**: Revokes **ALL OTHER** active sessions (force logout on other devices).

### Account Deactivation (Soft)
*   **Endpoint**: `POST /auth/deactivate`
*   **Body**: `{ "password": "currentPassword" }`
*   **Action**:
    *   Sets `deactivatedAt`.
    *   Freezes Wallet (`status = 'FROZEN'`).
    *   Revokes **ALL** sessions (Logs out immediately).
*   **Reactivation**: Simply log in again. The system auto-detects `deactivatedAt`, clears it, unfreezes the wallet, and logs "Account Reactivated".

### Account Deletion (Hard)
*   **Endpoint**: `POST /auth/delete`
*   **Body**: `{ "password": "currentPassword", "confirmation": "DELETE PERMANENTLY" }`
*   **Rules**:
    *   **Financial Gate**: Fails if Wallet Balance > 0 or Locked Funds > 0.
*   **Action**:
    *   **Anonymization**: Replaces Email/Username with `deleted_UUID`. Clears Bio, Avatar, Name.
    *   **Irreversible**: Account cannot be recovered.
    *   Revokes all sessions.

## 2. Session Management (`/auth`)

### Get Active Sessions
*   **Endpoint**: `GET /auth/sessions`
*   **Response**: List of active sessions with IP, User Agent, Created At.

### Revoke Session
*   **Endpoint**: `DELETE /auth/sessions/:sessionId`
*   **Action**: Invalidates the specific refresh token.

## 3. Privacy & Blocking (`/user`)

### Block User
*   **Endpoint**: `POST /user/block`
*   **Body**: `{ "blockedId": "uuid-of-user-to-block" }`
*   **Logic**: One-directional block.

### Unblock User
*   **Endpoint**: `POST /user/unblock`
*   **Body**: `{ "blockedId": "uuid-of-user-to-unblock" }`

### Get Blocked List
*   **Endpoint**: `GET /user/blocked`

## 4. Wallet & Billing (`/wallet`)

### Update Billing Address
*   **Endpoint**: `PUT /wallet/billing`
*   **Body**: 
    ```json
    {
        "billingAddress": {
            "street": "123 Gaming St",
            "city": "Tech City",
            "country": "India",
            "zip": "123456"
        },
        "invoiceEmail": "billing@example.com"
    }
    ```
*   **Storage**: `billingAddress` is stored as a JSON object in the database for flexibility.

## Security Features Implemented
1.  **Session Tracking**: Login and Refresh flows now capture `ipAddress` and `userAgent`.
2.  **Strict Logic**: Deletion prevented if funds exist.
3.  **Fail-Safe**: Deactivated users are blocked from refreshing tokens but allowed to Login (to reactivate).
4.  **Rate Limiting**: Applied to sensitive routes (`change-email`, `delete`, `deactivate`).
