revoke all on table app_private.admin_users from anon, authenticated;

revoke all on table public.favorites from anon;
revoke all on table public.notifications from anon;
revoke all on table public.seller_applications from anon;
revoke all on table public.seller_public_profiles from anon;
revoke all on table public.support_tickets from anon;

revoke all on table public.activity_logs from authenticated;
revoke all on table public.moderation_logs from authenticated;

grant select on public.categories to anon, authenticated;
grant select on public.listings to anon, authenticated;
grant select on public.item_details to anon, authenticated;
grant select on public.motorbike_details to anon, authenticated;
grant select on public.service_details to anon, authenticated;
grant select on public.listing_images to anon, authenticated;
grant select on public.seller_public_profiles to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.listings to authenticated;
grant select, insert, update, delete on public.item_details to authenticated;
grant select, insert, update, delete on public.motorbike_details to authenticated;
grant select, insert, update, delete on public.service_details to authenticated;
grant select, insert, update, delete on public.listing_images to authenticated;

grant select, insert, delete on public.favorites to authenticated;
grant select, insert on public.reports to authenticated;
grant update on public.reports to authenticated;
grant select, insert on public.support_tickets to authenticated;
grant update on public.support_tickets to authenticated;
grant select, insert, delete on public.seller_applications to authenticated;
grant update on public.seller_applications to authenticated;
grant select, insert, update on public.seller_public_profiles to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.activity_logs, public.moderation_logs to authenticated;
