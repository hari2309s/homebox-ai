/** Remembers an invite link across the sign-up → confirm-email round trip (see /auth/confirm). */
export const PENDING_JOIN_COOKIE = "homebox_pending_join";

/** Only our own invite pages qualify, so the cookie can never redirect anywhere else. */
export const JOIN_PATH = /^\/join\/[0-9a-f-]{36}$/i;
