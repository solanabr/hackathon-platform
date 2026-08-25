-- Placement holds the winner order (1, 2, 3, ...) set after Pitch Day. NULL
-- means "finalist, no placement yet"; it is read only by the results surface.
alter table teams add column placement smallint;
