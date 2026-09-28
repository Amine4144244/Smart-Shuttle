-- ============================================================
-- Smart Shuttle — Row Level Security Policies
-- Run this in Supabase SQL Editor after prisma db push
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drivers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "route_stops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pickup_points" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reservations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_pickups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waiting_list" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reservation_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tracking_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role from users table
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT role::TEXT FROM "users" WHERE "authId" = auth.uid()::TEXT LIMIT 1;
$$;

-- ============================================================
-- USERS
-- ============================================================
-- Everyone can read their own profile
CREATE POLICY "users_select_self" ON "users" FOR SELECT USING ("authId" = auth.uid()::TEXT);
-- SUPER_ADMIN can read all
CREATE POLICY "users_select_admin" ON "users" FOR SELECT USING (current_user_role() = 'SUPER_ADMIN');
-- SUPER_ADMIN can insert/update/delete
CREATE POLICY "users_insert_admin" ON "users" FOR INSERT WITH CHECK (current_user_role() = 'SUPER_ADMIN');
CREATE POLICY "users_update_admin" ON "users" FOR UPDATE USING (current_user_role() = 'SUPER_ADMIN');
CREATE POLICY "users_delete_admin" ON "users" FOR DELETE USING (current_user_role() = 'SUPER_ADMIN');
-- Users can update their own profile (except role)
CREATE POLICY "users_update_self" ON "users" FOR UPDATE USING ("authId" = auth.uid()::TEXT)
  WITH CHECK ("authId" = auth.uid()::TEXT AND role = (SELECT role FROM "users" WHERE "authId" = auth.uid()::TEXT));

-- ============================================================
-- DRIVERS
-- ============================================================
CREATE POLICY "drivers_select_self" ON "drivers" FOR SELECT USING ("userId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT));
CREATE POLICY "drivers_select_admin" ON "drivers" FOR SELECT USING (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "drivers_insert_admin" ON "drivers" FOR INSERT WITH CHECK (current_user_role() = 'SUPER_ADMIN');
CREATE POLICY "drivers_update_admin" ON "drivers" FOR UPDATE USING (current_user_role() = 'SUPER_ADMIN');
CREATE POLICY "drivers_update_self" ON "drivers" FOR UPDATE USING ("userId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT));
CREATE POLICY "drivers_delete_admin" ON "drivers" FOR DELETE USING (current_user_role() = 'SUPER_ADMIN');

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE POLICY "vehicles_select_all" ON "vehicles" FOR SELECT USING (true);
CREATE POLICY "vehicles_insert_admin" ON "vehicles" FOR INSERT WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "vehicles_update_admin" ON "vehicles" FOR UPDATE USING (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "vehicles_delete_admin" ON "vehicles" FOR DELETE USING (current_user_role() = 'SUPER_ADMIN');

-- ============================================================
-- EVENTS
-- ============================================================
CREATE POLICY "events_select_all" ON "events" FOR SELECT USING (true);
CREATE POLICY "events_insert_admin" ON "events" FOR INSERT WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "events_update_admin" ON "events" FOR UPDATE USING (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "events_delete_admin" ON "events" FOR DELETE USING (current_user_role() = 'SUPER_ADMIN');

-- ============================================================
-- ROUTES & ROUTE_STOPS
-- ============================================================
CREATE POLICY "routes_select_all" ON "routes" FOR SELECT USING (true);
CREATE POLICY "routes_insert_admin" ON "routes" FOR INSERT WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "routes_update_admin" ON "routes" FOR UPDATE USING (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "routes_delete_admin" ON "routes" FOR DELETE USING (current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "stops_select_all" ON "route_stops" FOR SELECT USING (true);
CREATE POLICY "stops_insert_admin" ON "route_stops" FOR INSERT WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "stops_update_admin" ON "route_stops" FOR UPDATE USING (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "stops_delete_admin" ON "route_stops" FOR DELETE USING (current_user_role() = 'SUPER_ADMIN');

-- ============================================================
-- PICKUP_POINTS
-- ============================================================
CREATE POLICY "pickup_select_all" ON "pickup_points" FOR SELECT USING (true);
CREATE POLICY "pickup_insert_admin" ON "pickup_points" FOR INSERT WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "pickup_update_admin" ON "pickup_points" FOR UPDATE USING (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "pickup_delete_admin" ON "pickup_points" FOR DELETE USING (current_user_role() = 'SUPER_ADMIN');

-- ============================================================
-- RESERVATIONS
-- ============================================================
CREATE POLICY "reservations_select_self" ON "reservations" FOR SELECT USING (
  "participantId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT)
  OR current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER', 'DRIVER')
);
CREATE POLICY "reservations_insert_self" ON "reservations" FOR INSERT WITH CHECK (
  "participantId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT)
  OR current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER')
);
CREATE POLICY "reservations_update_admin" ON "reservations" FOR UPDATE USING (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER', 'DRIVER'));
CREATE POLICY "reservations_delete_admin" ON "reservations" FOR DELETE USING (current_user_role() = 'SUPER_ADMIN');

-- ============================================================
-- TRIPS
-- ============================================================
CREATE POLICY "trips_select_all" ON "trips" FOR SELECT USING (true);
CREATE POLICY "trips_insert_admin" ON "trips" FOR INSERT WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "trips_update_driver" ON "trips" FOR UPDATE USING (
  "driverId" IN (SELECT id FROM "drivers" WHERE "userId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT))
  OR current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER')
);
CREATE POLICY "trips_delete_admin" ON "trips" FOR DELETE USING (current_user_role() = 'SUPER_ADMIN');

-- ============================================================
-- TRACKING_LOGS
-- ============================================================
CREATE POLICY "tracking_insert_driver" ON "tracking_logs" FOR INSERT WITH CHECK (
  "tripId" IN (SELECT id FROM "trips" WHERE "driverId" IN (SELECT id FROM "drivers" WHERE "userId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT)))
);
CREATE POLICY "tracking_select_all" ON "tracking_logs" FOR SELECT USING (true);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "notifications_select_self" ON "notifications" FOR SELECT USING (
  "userId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT)
);
CREATE POLICY "notifications_update_self" ON "notifications" FOR UPDATE USING (
  "userId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT)
);
CREATE POLICY "notifications_delete_self" ON "notifications" FOR DELETE USING (
  "userId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT)
);

-- ============================================================
-- CHAT_MESSAGES
-- ============================================================
CREATE POLICY "messages_select_self" ON "chat_messages" FOR SELECT USING (
  "senderId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT)
  OR "receiverId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT)
);
CREATE POLICY "messages_insert_self" ON "chat_messages" FOR INSERT WITH CHECK (
  "senderId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT)
);

-- ============================================================
-- ACTIVITY_LOGS
-- ============================================================
CREATE POLICY "activity_select_admin" ON "activity_logs" FOR SELECT USING (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "activity_insert_system" ON "activity_logs" FOR INSERT WITH CHECK (true);

-- ============================================================
-- SHARED_PICKUPS & WAITING_LIST
-- ============================================================
CREATE POLICY "shared_select_all" ON "shared_pickups" FOR SELECT USING (true);
CREATE POLICY "shared_insert_admin" ON "shared_pickups" FOR INSERT WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "shared_update_admin" ON "shared_pickups" FOR UPDATE USING (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));
CREATE POLICY "shared_delete_admin" ON "shared_pickups" FOR DELETE USING (current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "waiting_select_self" ON "waiting_list" FOR SELECT USING (
  "participantId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT)
  OR current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER')
);
CREATE POLICY "waiting_insert_self" ON "waiting_list" FOR INSERT WITH CHECK (
  "participantId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT)
);
CREATE POLICY "waiting_update_admin" ON "waiting_list" FOR UPDATE USING (current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER'));

-- ============================================================
-- RESERVATION STATUS HISTORY
-- ============================================================
CREATE POLICY "history_select_self" ON "reservation_status_history" FOR SELECT USING (
  "reservationId" IN (SELECT id FROM "reservations" WHERE "participantId" IN (SELECT id FROM "users" WHERE "authId" = auth.uid()::TEXT))
  OR current_user_role() IN ('SUPER_ADMIN', 'ORGANIZER', 'DRIVER')
);
CREATE POLICY "history_insert_system" ON "reservation_status_history" FOR INSERT WITH CHECK (true);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users ("authId", email, "firstName", "lastName", role)
  VALUES (
    NEW.id::TEXT,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public."Role", 'EMPLOYEE')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
