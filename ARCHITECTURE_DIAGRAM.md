# System Architecture & Admin Flow

## 1. Admin Interface Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN DASHBOARD                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SHOPIFY CONNECTIONS                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Connection 1  │  │   Connection 2  │  │   Connection 3  │  │
│  │ store1.shopify  │  │ store2.shopify  │  │ store3.shopify  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Click on connection
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              STORES (Generated Websites)                        │
│                    for selected Shopify                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │    Store A      │  │    Store B      │  │    Store C      │  │
│  │  (Elegant)      │  │  (Minimal)      │  │  (Corporate)    │  │
│  │  clipia.fi      │  │  deals.com      │  │  premium.co     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Click on store
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STORE SETTINGS                                │
│  ┌─────────────────┐                                            │
│  │     THEMES      │    ┌─────────────────────────────────────┐ │
│  │  • Elegant      │    │         PRODUCT TEMPLATES           │ │
│  │  • Minimal      │◄───┤  ┌─────────────────────────────────┐ │ │
│  │  • Corporate    │    │  │  Template 1: Standard Product   │ │ │
│  │  • Custom       │    │  │  • Product Images Gallery      │ │ │
│  └─────────────────┘    │  │  • Product Info                │ │ │
│                         │  │  • Add to Cart                 │ │ │
│  ┌─────────────────┐    │  │  • Related Products            │ │ │
│  │   ASSIGNMENTS   │    │  └─────────────────────────────────┘ │ │
│  │  Product A →    │    │  ┌─────────────────────────────────┐ │ │
│  │    Template 1   │    │  │  Template 2: Luxury Product    │ │ │
│  │  Product B →    │    │  │  • Hero Section                │ │ │
│  │    Template 2   │    │  │  • Product Gallery Slider     │ │ │
│  │  Default →      │    │  │  • Premium Info Layout        │ │ │
│  │    Template 1   │    │  │  • Social Proof               │ │ │
│  └─────────────────┘    │  └─────────────────────────────────┘ │ │
│                         └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          DATABASE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │    companies    │     │  shopify_stores │                    │
│  │─────────────────│     │─────────────────│                    │
│  │ id (PK)         │────▶│ id (PK)         │                    │
│  │ name            │     │ company_id (FK) │                    │
│  │ created_at      │     │ shop_domain     │                    │
│  └─────────────────┘     │ access_token    │                    │
│                          │ created_at      │                    │
│                          └─────────────────┘                    │
│                                    │                            │
│                                    ▼                            │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │     themes      │     │     stores      │                    │
│  │─────────────────│     │─────────────────│                    │
│  │ id (PK)         │◄────│ id (PK)         │                    │
│  │ name            │     │ shopify_id (FK) │                    │
│  │ layout_config   │     │ theme_id (FK)   │                    │
│  │ css_variables   │     │ name            │                    │
│  │ created_at      │     │ domain          │                    │
│  └─────────────────┘     │ deployment_url  │                    │
│                          │ created_at      │                    │
│                          └─────────────────┘                    │
│                                    │                            │
│                                    ▼                            │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │product_templates│     │template_assigns │                    │
│  │─────────────────│     │─────────────────│                    │
│  │ id (PK)         │◄────│ id (PK)         │                    │
│  │ name            │     │ store_id (FK)   │                    │
│  │ description     │     │ template_id(FK) │                    │
│  │ elements (JSON) │     │ product_handle  │                    │
│  │ is_default      │     │ assigned_at     │                    │
│  │ created_at      │     └─────────────────┘                    │
│  └─────────────────┘                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │   SHOPIFY API   │────▶│  PRODUCT SYNC   │                    │
│  │   (External)    │     │   (Scheduled)   │                    │
│  └─────────────────┘     └─────────────────┘                    │
│           │                        │                            │
│           ▼                        ▼                            │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │   ADMIN PANEL   │     │   LIVE STORES   │                    │
│  │  (Management)   │     │  (Public Sites) │                    │
│  │                 │     │                 │                    │
│  │ • Store Setup   │     │ • Product Pages │                    │
│  │ • Theme Config  │     │ • Template      │                    │
│  │ • Template Edit │     │   Rendering     │                    │
│  │ • Assignments   │     │ • Dynamic       │                    │
│  └─────────────────┘     │   Content       │                    │
│           │               └─────────────────┘                    │
│           │                        ▲                            │
│           └────────────────────────┘                            │
│              Configuration                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 3. User Journey Examples

### Example 1: E-commerce Business with Multiple Brands
```
Company: "Fashion Forward Ltd"
└── Shopify Store: "fashionforward.myshopify.com" (inventory source)
    ├── Store 1: "elegantfashion.com" → Theme: Luxury
    │   ├── Product: Dress A → Template: Luxury Product (Hero + Gallery + Social Proof)
    │   └── Product: Dress B → Template: Standard Product
    ├── Store 2: "casualwear.co" → Theme: Minimal  
    │   ├── Product: Dress A → Template: Simple Product (Basic info + Cart)
    │   └── Product: Dress B → Template: Simple Product
    └── Store 3: "outlet.fashion" → Theme: Deal-focused
        ├── Product: Dress A → Template: Sale Product (Discount badges + Urgency)
        └── Product: Dress B → Template: Sale Product
```

### Example 2: Product Template Assignment Flow
```
1. Admin selects Shopify Store Connection
2. Admin selects specific Store (e.g., "elegantfashion.com")
3. Admin goes to Product Template Assignments
4. Admin sees list of products from Shopify:
   - Dress A → Currently using "Default Template"
   - Dress B → Currently using "Luxury Template"  
   - Shoes C → Currently using "Default Template"
5. Admin assigns "Luxury Template" to Dress A
6. Live site automatically updates Dress A to use luxury layout
```

## 4. Current vs Future State

### Current State ✅
- Product Page Templates with configurable sections
- Template Library (create, edit, duplicate, delete)
- Shopify product import
- Store generation and deployment

### Missing Components ❌
- **Company management** (multi-tenant structure)
- **Theme system** (website layouts beyond product pages)
- **Store-Theme relationship** (assign themes to stores)  
- **Template assignments** (assign templates to specific products)
- **Default template fallbacks** (per store defaults)

### Next Steps
1. Create database schema for full hierarchy
2. Build Theme management system
3. Create Store-Theme assignment interface
4. Build Product-Template assignment interface
5. Implement template rendering logic in live stores