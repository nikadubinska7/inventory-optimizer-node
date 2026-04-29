# CSV Import Templates

Phase 4 uses a flexible CSV mapping flow.

The app should store clean, normalized data in Supabase, but uploaded CSV files do not need to use exact database column names.

Recommended MVP flow:

1. User uploads a CSV file.
2. App reads the header row.
3. App automatically matches common English column names.
4. App shows a mapping preview before import.
5. User manually fixes any unrecognized or non-English columns.
6. App imports only after required fields are mapped.

The app should not ask users to include technical database columns in CSV files.

Do not include these columns in CSV templates:

- id
- user_id
- created_at
- updated_at

The app or database fills those automatically.

## Products

Products represent SKUs or items.

Required fields:

- sku
- name

Optional fields:

- category
- unit_cost
- price
- lead_time_days
- case_pack

Accepted column names:

| App field | Accepted CSV headers |
| --- | --- |
| sku | sku, SKU, item_sku, item code, item_code, product code, product_code |
| name | name, product name, product_name, item name, item_name, description |
| category | category, product category, product_category, department |
| unit_cost | unit cost, unit_cost, cost, item cost, item_cost |
| price | price, selling price, selling_price, retail price, retail_price |
| lead_time_days | lead time, lead_time, lead time days, lead_time_days |
| case_pack | case pack, case_pack, pack size, pack_size |

Example CSV:

```csv
Product Code,Product Name,Category,Unit Cost,Price,Lead Time Days,Case Pack
SKU-001,Black T-Shirt,Apparel,8.50,24.99,14,12
SKU-002,Blue Jeans,Apparel,22.00,79.99,21,6
```

## Locations

Locations represent warehouses, stores, or fulfillment nodes.

Required fields:

- name

Optional fields:

- location_type
- region
- city
- is_active

Accepted column names:

| App field | Accepted CSV headers |
| --- | --- |
| name | name, location name, location_name, warehouse, store, site |
| location_type | type, location type, location_type, site type, site_type |
| region | region, area, territory |
| city | city, town |
| is_active | active, is_active, enabled |

Example CSV:

```csv
Location Name,Location Type,Region,City,Active
Amsterdam Warehouse,warehouse,North,Amsterdam,true
Rotterdam Store,store,South,Rotterdam,true
```

## Inventory Snapshots

Inventory snapshots represent inventory position by product, location, and date.

Required fields:

- sku
- location_name
- snapshot_date
- on_hand_qty

Optional fields:

- on_order_qty
- reserved_qty
- safety_stock_qty
- notes

Accepted column names:

| App field | Accepted CSV headers |
| --- | --- |
| sku | sku, SKU, item_sku, item code, item_code, product code, product_code |
| location_name | location, location name, location_name, warehouse, store, site |
| snapshot_date | date, snapshot date, snapshot_date, inventory date, inventory_date |
| on_hand_qty | on hand, on_hand, on hand qty, on_hand_qty, inventory, quantity, qty |
| on_order_qty | on order, on_order, on order qty, on_order_qty, incoming |
| reserved_qty | reserved, reserved qty, reserved_qty, allocated |
| safety_stock_qty | safety stock, safety_stock, safety stock qty, safety_stock_qty |
| notes | notes, note, comments, comment |

Example CSV:

```csv
SKU,Location,Inventory Date,On Hand Qty,On Order Qty,Reserved Qty,Safety Stock Qty
SKU-001,Amsterdam Warehouse,2026-04-29,120,40,10,25
SKU-001,Rotterdam Store,2026-04-29,12,0,2,8
```

## Demand History

Demand history represents historical sales or forecast demand by product, location, and date.

Required fields:

- sku
- location_name
- demand_date
- demand_qty

Optional fields:

- demand_type
- notes

Accepted column names:

| App field | Accepted CSV headers |
| --- | --- |
| sku | sku, SKU, item_sku, item code, item_code, product code, product_code |
| location_name | location, location name, location_name, warehouse, store, site |
| demand_date | date, demand date, demand_date, sales date, sales_date, forecast date, forecast_date |
| demand_qty | demand, demand qty, demand_qty, sales, units sold, units_sold, quantity, qty, forecast |
| demand_type | demand type, demand_type, type |
| notes | notes, note, comments, comment |

Example CSV:

```csv
SKU,Location,Sales Date,Units Sold,Demand Type
SKU-001,Amsterdam Warehouse,2026-04-01,18,historical
SKU-001,Amsterdam Warehouse,2026-04-02,21,historical
```

## Manual Mapping Rule

If a CSV header is not recognized, the app should show it as unmapped.

This includes non-English column names.

The user should be able to manually choose the correct app field before import.

The app should not import rows until all required fields are mapped.

## Import Order

Import these files in this order:

1. products
2. locations
3. inventory_snapshots
4. demand_history

Inventory snapshots and demand history reference products and locations, so products and locations must exist first.
