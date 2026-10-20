-- Direct FPL password/session authentication is retired pending a supported
-- third-party authorization flow. Preserve non-secret audit and operation
-- history, but permanently remove encrypted session cookies.
DELETE FROM public.fpl_sessions;
DROP TABLE public.fpl_sessions;
