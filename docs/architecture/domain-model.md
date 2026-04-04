# Domain Model

```mermaid
classDiagram

  class User {
    +Int id
    +String email
    +String password
    +String firstName
    +String lastName
    +Boolean isActive
    +DateTime createdAt
    +DateTime updatedAt
  }

  class Portfolio {
    +Int id
    +String name
    +String? description
    +Int userId
    +DateTime createdAt
    +DateTime updatedAt
  }

  class Holding {
    +Int id
    +Int portfolioId
    +Int instrumentId
    +Int platformId
    +DateTime createdAt
    +DateTime updatedAt
    -- computed at query time --
    ~Decimal avgCost
    ~Decimal quantity
    ~Decimal unrealizedPnl
    ~Decimal allocationPct
  }

  class Instrument {
    +Int id
    +String symbol
    +String name
    +String? exchange
    +String? country
    +Int instrumentClassId
    +DateTime createdAt
    +DateTime updatedAt
  }

  class InstrumentClass {
    +Int id
    +String name
    +DateTime createdAt
    +DateTime updatedAt
  }

  class Platform {
    +Int id
    +String name
    +PlatformType type
    +DateTime createdAt
    +DateTime updatedAt
  }

  class Operation {
    +Int id
    +Int holdingId
    +OperationType type
    +Decimal quantity
    +Decimal price
    +Decimal fees
    +DateTime date
    +String? notes
    +DateTime createdAt
    +DateTime updatedAt
  }

  class PriceSnapshot {
    +Int id
    +Int instrumentId
    +Date date
    +Decimal closePrice
    +DateTime createdAt
  }

  class PlatformType {
    <<enumeration>>
    BROKER
    EXCHANGE
    BANK
  }

  class OperationType {
    <<enumeration>>
    BUY
    SELL
    DIVIDEND
    FEE
  }

  User "1" --> "0..*" Portfolio : owns
  Portfolio "1" --> "0..*" Holding : contains
  Holding "0..*" --> "1" Instrument : tracks
  Holding "0..*" --> "1" Platform : held on
  Holding "1" --> "0..*" Operation : has
  Instrument "0..*" --> "1" InstrumentClass : classified as
  Instrument "1" --> "0..*" PriceSnapshot : has
  Platform --> PlatformType : type
  Operation --> OperationType : type
```

## Notes

- All monetary values are in **USD**. Non-US instruments are tracked via their ADR listing.
- `Holding` has no stored computed fields. `avgCost`, `quantity`, `unrealizedPnl`, and
  `allocationPct` are always derived from `Operation` rows at query time.
- `PriceSnapshot` stores one closing price per instrument per day. Used for the portfolio
  performance chart. Populated by a background job or manual import — never derived from operations.
- `Operation.fees` captures broker commissions separately from `price`, so cost basis
  calculations can include or exclude fees depending on the context.
