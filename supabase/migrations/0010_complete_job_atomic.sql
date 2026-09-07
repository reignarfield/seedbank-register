-- Completing a job used to be three separate writes from the browser: mark
-- the job done, roll the customer's last-service date, insert the invoice.
-- A dropped connection between any two of them - a driveway with one bar -
-- left a completed job with no invoice and a due date that had already
-- moved on, with nothing to retry. Moving it into one database function makes
-- it all-or-nothing: either every part lands or none of it does.
--
-- Vocabulary stays out of the database. The invoice description is passed in
-- from the app (which knows whether this trade calls it a "clean" or a "job")
-- rather than assumed here, so the same function serves any business.
-- Additive only - safe on a live project.

create or replace function public.complete_job(
  p_job_id uuid,
  p_price numeric default null,        -- overrides the job's price if given
  p_paid_now boolean default false,    -- cash/card on the spot -> invoice raised as paid
  p_description text default null,     -- invoice line; falls back to the job's notes
  p_due_days integer default 14        -- invoice terms
)
returns public.jobs
language plpgsql
security invoker                       -- runs as the signed-in user, so RLS still applies
set search_path = ''
as $$
declare
  v_job   public.jobs;
  v_price numeric;
begin
  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then
    raise exception 'job % not found', p_job_id;
  end if;

  -- A price entered at completion wins; otherwise whatever the job carried.
  -- Zero or negative means "no price" - no invoice will be raised.
  v_price := coalesce(p_price, v_job.price);
  if v_price is not null and v_price <= 0 then
    v_price := null;
  end if;

  update public.jobs
     set status       = 'completed',
         completed_at = now(),
         price        = coalesce(v_price, price)
   where id = p_job_id
   returning * into v_job;

  update public.customers
     set last_service_date = v_job.scheduled_date
   where id = v_job.customer_id;

  if v_price is not null then
    insert into public.invoices
      (customer_id, job_id, description, amount, status, issued_date, due_date, paid_date)
    values (
      v_job.customer_id,
      v_job.id,
      coalesce(nullif(p_description, ''), nullif(v_job.notes, ''), 'Job - ' || v_job.scheduled_date::text),
      v_price,
      case when p_paid_now then 'paid' else 'unpaid' end,
      current_date,
      current_date + p_due_days,
      case when p_paid_now then current_date else null end
    );
  end if;

  return v_job;
end;
$$;

grant execute on function public.complete_job(uuid, numeric, boolean, text, integer) to authenticated;
