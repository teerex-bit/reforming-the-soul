-- The hardened AI completion functions use pgcrypto's SHA-256 digest to bind
-- an authorized provider result without persisting the result itself.
grant usage on schema extensions to rts_privileged_owner;
