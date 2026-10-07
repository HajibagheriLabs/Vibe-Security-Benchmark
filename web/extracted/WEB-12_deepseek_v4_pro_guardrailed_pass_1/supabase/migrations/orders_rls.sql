-- supabase/migrations/orders_rls.sql
-- Security: RLS policies for orders and order_items tables

-- Orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- Users can only see their own orders
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (auth.uid() = userId);

-- Users can only create orders for themselves
CREATE POLICY "Users can create own orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = userId);

-- Users can only update their own orders
CREATE POLICY "Users can update own orders"
ON orders FOR UPDATE
USING (auth.uid() = userId)
WITH CHECK (auth.uid() = userId);

-- No DELETE policy = users cannot delete orders

-- Order items table
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;

-- Users can view items for their own orders
CREATE POLICY "Users can view own order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.orderId
    AND orders.userId = auth.uid()
  )
);

-- Users can create items for their own orders
CREATE POLICY "Users can create own order items"
ON order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.orderId
    AND orders.userId = auth.uid()
  )
);

-- No UPDATE or DELETE policies = users cannot modify order items