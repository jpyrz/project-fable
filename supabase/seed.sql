insert into public.species(id,name,tagline,asset_key) values
('mossling','Mossling','Gentle garden dreamers','pets/mossling'),('lumipup','Lumipup','Bright-hearted stargazers','pets/lumipup'),('cloudkip','Cloudkip','Bouncy sky wanderers','pets/cloudkip'),('pebblit','Pebblit','Brave little treasure hunters','pets/pebblit') on conflict do nothing;

insert into public.palettes(id,species_id,name,color)
select s.id || '-' || p.n,s.id,case p.n when 1 then 'Meadow' when 2 then 'Sunset' else 'Tidepool' end,case p.n when 1 then '#91c96b' when 2 then '#f3a46f' else '#8fc8c7' end from public.species s cross join (values(1),(2),(3)) p(n) on conflict do nothing;

with seed as (select generate_series(1,120) n), names as (select array['Sunberry Tart','Moonmilk Tea','Clover Biscuit','Cloudfluff Bun','Honeydrop Apple','Sparkle Soap','Petal Brush','Giggle Ball','Storybook','Willow Twig','Star Thread','River Pearl','Glow Shard','Soft Moss','Brass Button','Sun Hat','Moon Crown','Teal Bow','Explorer Scarf','Tiny Satchel','Star Wand','Garden Backdrop','Twilight Backdrop','River Backdrop','Lucky Acorn','Glass Firefly','Singing Shell','Tiny Teacup','Old Town Pin','Wishing Token']::text[] a), icons as (select array['🍓','🫖','🍪','🥐','🍎','🧼','🪮','🟣','📖','🪵','🧵','🫧','💠','🌱','🟡','👒','👑','🎀','🧣','👜','🪄','🌼','🌙','🏞️','🌰','🏮','🐚','☕','📍','🪙']::text[] a)
insert into public.item_definitions(id,name,category,rarity,base_price,icon,asset_key,description)
select 'item-'||n, names.a[((n-1)%30)+1] || case when n<=30 then '' when n<=60 then ' of Dawn' when n<=90 then ' of Clover' else ' of Starlight' end,
case when ((n-1)%30)+1<=5 then 'food'::public.item_category when ((n-1)%30)+1<=9 then 'care' when ((n-1)%30)+1<=15 then 'material' when ((n-1)%30)+1<=21 then 'accessory' when ((n-1)%30)+1<=24 then 'background' else 'collectible' end,
case when n<=30 then 'common'::public.item_rarity when n<=60 then 'uncommon' when n<=90 then 'rare' else 'mythic' end,24+((n-1)%15)*7+floor((n-1)/30)*55,icons.a[((n-1)%30)+1],'items/item-'||n,'A little treasure from Bramblewick.' from seed,names,icons on conflict do nothing;

insert into public.chat_channels(id,label,description) values('lobby','Lobby','A cozy place for all Keepers'),('trading','Trading','Share wishlists and market finds'),('help','Help','Ask the community for a hand'),('off-topic','Off-topic','Friendly conversation beyond the game') on conflict do nothing;
insert into public.daily_tasks(id,label,target,reward,reputation_reward) values('care','Care for your active pet',2,60,15),('play','Play an arcade game',1,80,15),('collect','Collect 2 items',2,100,15) on conflict do nothing;

insert into public.recipes(id,output_item_id,reputation_required) values('sun-hat','item-16',1),('moon-crown','item-17',2),('star-wand','item-21',2) on conflict do nothing;
insert into public.recipe_ingredients(recipe_id,item_id,quantity) values('sun-hat','item-10',2),('sun-hat','item-14',1),('moon-crown','item-11',2),('moon-crown','item-13',1),('star-wand','item-10',1),('star-wand','item-13',2) on conflict do nothing;
