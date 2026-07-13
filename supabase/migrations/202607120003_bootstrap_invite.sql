-- One-time bootstrap invitation for the first hosted Project Fable account.
-- Only the SHA-256 digest is stored; the invitation is automatically consumed
-- when its account is created and expires after 30 days if unused.
insert into public.invite_codes (code_hash, label, expires_at)
values (
  'de1d4faa4e22e515efffe7375e6889585b12bdeb8bbbee8764445a2710a70edb',
  'Hosted bootstrap invite',
  now() + interval '30 days'
)
on conflict (code_hash) do nothing;
