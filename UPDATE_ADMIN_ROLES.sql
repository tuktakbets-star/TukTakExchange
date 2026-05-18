-- UPDATE ADMIN ROLES
-- This script ensures the hardcoded admin emails have the 'admin' role in the database.
-- Run this in the Supabase SQL Editor.

UPDATE users 
SET role = 'admin' 
WHERE email IN (
  'tuktakbets@gmail.com', 
  'shohagrana284650@gmail.com', 
  'shohagrana28465@gmail.com', 
  'shohagrana84650@gmail.com', 
  'shohagrana4650@gmail.com', 
  'shohagrana650@gmail.com', 
  'shohagrana60@gmail.com'
);

-- Also ensure RLS policies are correct and inclusive
DROP POLICY IF EXISTS "Public Select" ON transactions;
CREATE POLICY "Public Select" ON transactions FOR SELECT USING (true);

-- Ensure users can see themselves
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = uid OR EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin'));

-- Ensure admins can see ALL users
DROP POLICY IF EXISTS "Admins can view all profiles" ON users;
CREATE POLICY "Admins can view all profiles" ON users FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
);
