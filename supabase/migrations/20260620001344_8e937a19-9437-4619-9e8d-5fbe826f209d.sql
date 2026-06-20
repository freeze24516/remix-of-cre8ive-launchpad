
CREATE OR REPLACE FUNCTION public.on_review_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE reviewer_name TEXT;
BEGIN
  SELECT display_name INTO reviewer_name FROM public.profiles WHERE id = NEW.reviewer_id;
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (
    NEW.reviewee_id,
    'review',
    'New ' || NEW.rating::text || '★ review',
    coalesce(reviewer_name, 'Someone') || ' left you a review',
    '/dashboard/profile'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_review_insert ON public.reviews;
CREATE TRIGGER trg_on_review_insert
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.on_review_insert();
