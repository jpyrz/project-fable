-- Open the Style Studio to every launch species and make wardrobe layers
-- consistently inventory-backed.

update public.item_definitions
set name='Sunny Day Hat',description='A cheerful sunhat with a coral ribbon, fitted in the Style Studio.'
where id='item-16';

insert into public.item_definitions(id,name,category,rarity,base_price,icon,asset_key,description)
values('item-121','Sunberry Tunic','accessory','uncommon',140,'🧥','items/item-121','A warm coral tunic tailored by the Bramblewick workshop.')
on conflict(id) do update set name=excluded.name,category=excluded.category,rarity=excluded.rarity,
  base_price=excluded.base_price,icon=excluded.icon,asset_key=excluded.asset_key,description=excluded.description,active=true;

insert into public.recipes(id,output_item_id,reputation_required,active)
values('sunberry-tunic','item-121',2,true)
on conflict(id) do update set output_item_id=excluded.output_item_id,reputation_required=excluded.reputation_required,active=true;

insert into public.recipe_ingredients(recipe_id,item_id,quantity) values
  ('sunberry-tunic','item-11',2),('sunberry-tunic','item-14',1)
on conflict(recipe_id,item_id) do update set quantity=excluded.quantity;

insert into public.customization_definitions(id,species_id,slot,label,description,icon,asset_key,layer_order,source_label,starter,reputation_required,item_id) values
  ('lumipup-marking-comet-dust','lumipup','marking','Comet Dust','A trail of tiny starlight freckles.','✨','pets/customization/lumipup/layers/marking-comet-dust.png',20,'Starter Salon style',true,null,null),
  ('lumipup-hair-nova-swoop','lumipup','hair','Nova Swoop','A bright curled forelock with a starry tip.','🌟','pets/customization/lumipup/layers/hair-nova-swoop.png',30,'Starter Salon style',true,null,null),
  ('lumipup-outfit-sunberry-tunic','lumipup','outfit','Sunberry Tunic','A fitted coral tunic tailored for a Lumipup.','🧵','pets/customization/lumipup/layers/outfit-sunberry-tunic.png',40,'Own Sunberry Tunic',false,null,'item-121'),
  ('lumipup-head-sunhat','lumipup','head','Sunny Day Hat','A sunny hat balanced between a Lumipup’s long ears.','👒','pets/customization/mossling/layers/head-sunny-day-hat.png',50,'Own Sunny Day Hat',false,null,'item-16'),
  ('cloudkip-marking-raindrop-blush','cloudkip','marking','Raindrop Blush','Cheery blue droplets scattered across the cheeks.','💧','pets/customization/cloudkip/layers/marking-raindrop-blush.png',20,'Starter Salon style',true,null,null),
  ('cloudkip-hair-storm-curl','cloudkip','hair','Storm Curl','A dramatic cloud curl swept over the brow.','🌩️','pets/customization/cloudkip/layers/hair-storm-curl.png',30,'Starter Salon style',true,null,null),
  ('cloudkip-outfit-sunberry-tunic','cloudkip','outfit','Sunberry Tunic','A fitted coral tunic tailored for a Cloudkip.','🧵','pets/customization/cloudkip/layers/outfit-sunberry-tunic.png',40,'Own Sunberry Tunic',false,null,'item-121'),
  ('cloudkip-head-sunhat','cloudkip','head','Sunny Day Hat','A sunny hat nestled between a Cloudkip’s puffs.','👒','pets/customization/mossling/layers/head-sunny-day-hat.png',50,'Own Sunny Day Hat',false,null,'item-16'),
  ('pebblit-marking-geode-freckles','pebblit','marking','Geode Freckles','Tiny golden crystal flecks across the cheeks.','💎','pets/customization/pebblit/layers/marking-geode-freckles.png',20,'Starter Salon style',true,null,null),
  ('pebblit-hair-crystal-crest','pebblit','hair','Crystal Crest','A proud row of polished crown crystals.','🔮','pets/customization/pebblit/layers/hair-crystal-crest.png',30,'Starter Salon style',true,null,null),
  ('pebblit-outfit-sunberry-tunic','pebblit','outfit','Sunberry Tunic','A fitted coral tunic tailored for a Pebblit.','🧵','pets/customization/pebblit/layers/outfit-sunberry-tunic.png',40,'Own Sunberry Tunic',false,null,'item-121'),
  ('pebblit-head-sunhat','pebblit','head','Sunny Day Hat','A sunny hat fitted between a Pebblit’s crystal ears.','👒','pets/customization/mossling/layers/head-sunny-day-hat.png',50,'Own Sunny Day Hat',false,null,'item-16')
on conflict(id) do update set species_id=excluded.species_id,slot=excluded.slot,label=excluded.label,
  description=excluded.description,icon=excluded.icon,asset_key=excluded.asset_key,layer_order=excluded.layer_order,
  source_label=excluded.source_label,starter=excluded.starter,reputation_required=excluded.reputation_required,
  item_id=excluded.item_id,active=true;

update public.customization_definitions
set source_label='Own Sunberry Tunic',reputation_required=null,item_id='item-121'
where id='mossling-outfit-sunberry-tunic';

-- Launch gift: players who had already earned the old reputation unlock keep it
-- as an owned wardrobe piece.
insert into public.inventory_stacks(owner_id,item_id,quantity)
select id,'item-121',1 from public.profiles where reputation_level>=2
on conflict(owner_id,item_id) do update set quantity=greatest(inventory_stacks.quantity,1),updated_at=now();

insert into public.collection_entries(owner_id,item_id)
select id,'item-121' from public.profiles where reputation_level>=2
on conflict do nothing;
