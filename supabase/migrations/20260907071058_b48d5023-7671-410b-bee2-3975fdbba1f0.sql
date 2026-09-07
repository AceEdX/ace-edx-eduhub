ALTER TABLE public.webinars ALTER COLUMN certificate SET DEFAULT true;
ALTER TABLE public.courses ALTER COLUMN certificate SET DEFAULT true;
UPDATE public.webinars SET certificate = true WHERE certificate = false;
UPDATE public.courses SET certificate = true WHERE certificate = false;