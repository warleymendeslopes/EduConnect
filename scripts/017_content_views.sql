ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.content_view_events (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id  uuid        NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  user_id          uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_view_events_item_idx ON public.content_view_events (content_item_id);
CREATE INDEX IF NOT EXISTS content_view_events_user_idx ON public.content_view_events (user_id);

CREATE OR REPLACE FUNCTION public.update_content_view_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.content_items SET view_count = view_count + 1 WHERE id = NEW.content_item_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_content_view_events_count ON public.content_view_events;
CREATE TRIGGER tr_content_view_events_count
  AFTER INSERT ON public.content_view_events
  FOR EACH ROW EXECUTE FUNCTION public.update_content_view_count();
