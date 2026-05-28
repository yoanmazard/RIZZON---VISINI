-- Une seule simulation individuelle (hors scénario) par lot
create unique index if not exists simulations_individual_property_unique
  on public.simulations (property_id)
  where scenario_id is null;
