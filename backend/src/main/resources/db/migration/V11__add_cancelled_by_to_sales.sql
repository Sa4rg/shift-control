ALTER TABLE sales
ADD COLUMN cancelled_by UUID REFERENCES users(id);