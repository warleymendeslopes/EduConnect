ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS save_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.content_saves (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id  uuid        NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_saves_unique UNIQUE (content_item_id, user_id)
);

CREATE INDEX IF NOT EXISTS content_saves_user_idx ON public.content_saves (user_id);

CREATE OR REPLACE FUNCTION public.update_content_save_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.content_items SET save_count = save_count + 1 WHERE id = NEW.content_item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.content_items SET save_count = GREATEST(save_count - 1, 0) WHERE id = OLD.content_item_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_content_saves_count ON public.content_saves;
CREATE TRIGGER tr_content_saves_count
  AFTER INSERT OR DELETE ON public.content_saves
  FOR EACH ROW EXECUTE FUNCTION public.update_content_save_count();
