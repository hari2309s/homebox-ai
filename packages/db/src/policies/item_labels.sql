-- item_labels has no owner_id column; ownership is derived from the referenced item.
alter table "public"."item_labels" enable row level security;

create policy "item_labels_select_own" on "public"."item_labels"
  for select using (
    exists (
      select 1 from "public"."items"
      where "items"."id" = "item_labels"."item_id"
        and "items"."owner_id" = auth.uid()
    )
  );

create policy "item_labels_insert_own" on "public"."item_labels"
  for insert with check (
    exists (
      select 1 from "public"."items"
      where "items"."id" = "item_labels"."item_id"
        and "items"."owner_id" = auth.uid()
    )
    and exists (
      select 1 from "public"."labels"
      where "labels"."id" = "item_labels"."label_id"
        and "labels"."owner_id" = auth.uid()
    )
  );

create policy "item_labels_delete_own" on "public"."item_labels"
  for delete using (
    exists (
      select 1 from "public"."items"
      where "items"."id" = "item_labels"."item_id"
        and "items"."owner_id" = auth.uid()
    )
  );
