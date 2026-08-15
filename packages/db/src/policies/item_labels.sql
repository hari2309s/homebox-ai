-- item_labels has no owner_id column; ownership is derived from the referenced item.
alter table "public"."item_labels" enable row level security;

create policy "item_labels_select_own" on "public"."item_labels"
  for select using (
    exists (
      select 1 from "public"."items"
      where "items"."id" = "item_labels"."item_id"
        and public.has_shared_access("items"."owner_id")
    )
  );

create policy "item_labels_insert_own" on "public"."item_labels"
  for insert with check (
    exists (
      select 1 from "public"."items"
      where "items"."id" = "item_labels"."item_id"
        and public.has_shared_access("items"."owner_id")
    )
    and exists (
      select 1 from "public"."labels"
      where "labels"."id" = "item_labels"."label_id"
        and public.has_shared_access("labels"."owner_id")
    )
  );

create policy "item_labels_delete_own" on "public"."item_labels"
  for delete using (
    exists (
      select 1 from "public"."items"
      where "items"."id" = "item_labels"."item_id"
        and public.has_shared_access("items"."owner_id")
    )
  );
