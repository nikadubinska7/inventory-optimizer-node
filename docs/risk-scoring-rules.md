# Risk Scoring Rules

Phase 5 uses simple, explainable MVP rules for stockout and overstock risk.

These rules are intentionally not advanced forecasting yet. They are a clear starting point so the app can turn imported inventory and demand data into daily risk signals.

## Stockout Risk

Stockout risk estimates whether a product/location may run out before replenishment can arrive.

The MVP rule uses:

- available inventory
- incoming inventory
- reserved inventory
- safety stock
- average daily demand
- product lead time
- a reorder buffer

Current assumptions:

- Default lead time: 14 days when the product does not provide one.
- Reorder buffer: 7 extra days.
- Reorder window: lead time plus reorder buffer.

Formula summary:

```text
available quantity = on hand quantity - reserved quantity
reorder window = lead time days + 7 buffer days
expected demand during reorder window = average daily demand x reorder window
projected shortage = expected demand + safety stock - available quantity - on order quantity
```

If projected shortage is high, stockout risk increases.

## Overstock Risk

Overstock risk estimates whether a product/location has more inventory than expected demand supports.

Current MVP assumption:

- Overstock coverage target: 60 days.

Formula summary:

```text
available quantity = on hand quantity - reserved quantity
target inventory = average daily demand x 60 days + safety stock
excess inventory = available quantity + on order quantity - target inventory
```

If excess inventory is high, overstock risk increases.

## Severity

Risk severity is based on the score.

```text
0-24.99 = low
25-49.99 = medium
50-79.99 = high
80-100 = critical
```

## Future Improvements

Later phases can make these assumptions configurable.

Useful future settings:

- Overstock coverage target by product category.
- Lead time by supplier or product.
- Different safety stock rules by location.
- Seasonal demand windows.
- Forecast demand instead of simple historical average demand.
