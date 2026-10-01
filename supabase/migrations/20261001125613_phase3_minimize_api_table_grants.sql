revoke all on table public.profiles, public.categories, public.listings, public.item_details,
  public.motorbike_details, public.service_details, public.listing_images,
  public.seller_public_profiles, public.favorites, public.reports,
  public.moderation_logs, public.support_tickets, public.activity_logs,
  public.notifications, public.seller_applications from public;

revoke all on table public.profiles, public.categories, public.listings, public.item_details,
  public.motorbike_details, public.service_details, public.listing_images,
  public.seller_public_profiles, public.favorites, public.reports,
  public.moderation_logs, public.support_tickets, public.activity_logs,
  public.notifications, public.seller_applications from anon, authenticated;

grant select on public.categories, public.listings, public.item_details,
  public.motorbike_details, public.service_details, public.listing_images,
  public.seller_public_profiles to anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.listings to authenticated;
grant select, insert, update, delete on public.item_details to authenticated;
grant select, insert, update, delete on public.motorbike_details to authenticated;
grant select, insert, update, delete on public.service_details to authenticated;
grant select, insert, update, delete on public.listing_images to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, insert, update on public.support_tickets to authenticated;
grant select, insert, delete, update on public.seller_applications to authenticated;
grant select, insert, update on public.seller_public_profiles to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.activity_logs, public.moderation_logs to authenticated;
