# Company Profile System - Shopify Store Management

## Overview

The Company Profile system allows users to manage multiple Shopify store connections in one centralized location, streamlining the store creation process by eliminating the need to manually enter Shopify credentials each time.

## Features

### 🏢 Company Profile Management
- **Centralized Dashboard**: Manage all Shopify store connections from one location
- **Store Nicknames**: Assign friendly names to easily identify different stores
- **Connection Status**: Real-time validation of Shopify connections
- **Bulk Management**: View, edit, activate/deactivate, and delete stores in bulk

### 🔄 Enhanced Site Setup Integration
- **Dropdown Selection**: Choose from saved Shopify stores during site creation
- **Automatic Credential Population**: No need to re-enter domain and access tokens
- **Add New Option**: Still allows adding new Shopify stores on-the-fly
- **Automatic Saving**: New stores added during setup are saved to company profile

### 🔐 Security & Validation
- **Connection Testing**: Validate Shopify credentials before saving
- **Secure Storage**: Access tokens are encrypted and securely stored
- **Real-time Validation**: Periodic health checks of stored connections
- **Error Handling**: Clear error messages for failed connections

## Database Schema

### New Table: `company_shopify_stores`

```sql
CREATE TABLE company_shopify_stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  shopify_domain TEXT NOT NULL,
  shopify_access_token TEXT NOT NULL,
  shopify_shop_name TEXT,
  shopify_email TEXT,
  shopify_currency TEXT,
  shopify_timezone TEXT,
  
  -- Connection status
  is_active BOOLEAN DEFAULT 1,
  connection_status TEXT DEFAULT 'pending', -- pending, connected, failed
  last_validated_at DATETIME,
  validation_error TEXT,
  
  -- Metadata
  product_count INTEGER DEFAULT 0,
  last_sync_at DATETIME,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(shopify_domain)
);
```

## API Endpoints

### Company Shopify Stores Management

#### GET `/api/company-shopify-stores`
Get all company Shopify stores with optional filtering.

**Query Parameters:**
- `activeOnly=true` - Filter to only active stores

**Response:**
```json
{
  "success": true,
  "stores": [
    {
      "id": 1,
      "uuid": "store-uuid",
      "nickname": "Main Store",
      "shopify_domain": "mystore.myshopify.com",
      "connection_status": "connected",
      "product_count": 150,
      "is_connected": true,
      "display_name": "Main Store (mystore.myshopify.com)"
    }
  ],
  "summary": {
    "total": 1,
    "connected": 1,
    "failed": 0,
    "pending": 0,
    "active": 1
  }
}
```

#### POST `/api/company-shopify-stores`
Create a new company Shopify store.

**Request Body:**
```json
{
  "nickname": "My Store",
  "shopifyDomain": "mystore.myshopify.com",
  "accessToken": "shpat_xxxxxxxxxxxxx"
}
```

#### PUT `/api/company-shopify-stores/:uuid`
Update an existing company Shopify store.

#### DELETE `/api/company-shopify-stores/:uuid`
Delete a company Shopify store.

#### POST `/api/company-shopify-stores/:uuid/test-connection`
Test the connection for a specific store.

#### PATCH `/api/company-shopify-stores/:uuid/toggle-status`
Toggle the active/inactive status of a store.

## User Interface

### Company Profile Page (`/admin/company-profile`)

#### Header Section
- Company profile title and description
- Quick navigation back to dashboard
- Statistics overview (total, connected, pending, failed stores)

#### Shopify Stores Management
- **Add Store Button**: Modal for adding new Shopify connections
- **Store Cards**: Visual representation of each store with:
  - Store nickname and domain
  - Connection status badge
  - Store metadata (shop name, products, currency)
  - Action buttons (Test, Edit, Activate/Deactivate, Delete)

#### Store Management Modal
- **Form Fields**:
  - Store Nickname (required)
  - Shopify Domain (required)
  - Access Token (required)
- **Connection Testing**: Real-time validation with feedback
- **Help Section**: Instructions for obtaining Shopify access tokens

### Enhanced Site Setup Integration

#### Step 2: Shopify Integration
- **Saved Stores Dropdown**: Select from existing company Shopify stores
- **Selected Store Info**: Display details of chosen store
- **Manual Entry Option**: "Add New Shopify Store" for first-time setup
- **Company Profile Link**: Quick access to manage stores

## Implementation Details

### Backend Components

#### Models
- **`CompanyShopifyStore.js`**: Main model for managing company Shopify stores
  - CRUD operations
  - Connection validation
  - Security methods

#### Routes
- **API Routes**: Extended `/routes/api.js` with company Shopify store endpoints
- **Web Routes**: Added `/admin/company-profile` route in `/routes/index.js`

#### Database
- **Schema Updates**: Added new table in `/database/db.js`
- **Migrations**: Automatic table creation on server start

### Frontend Components

#### Views
- **`company-profile.ejs`**: Complete management interface
- **Enhanced `site-setup.ejs`**: Integrated dropdown selection

#### JavaScript Classes
- **`CompanyProfileManager`**: Handles all company profile interactions
- **Enhanced `SiteSetupWizard`**: Integrated with saved stores functionality

#### Styling
- **Modern UI Design**: Professional, intuitive interface
- **Responsive Layout**: Works on all screen sizes
- **Status Indicators**: Visual connection status representation
- **Loading States**: Professional feedback for all actions

## Security Considerations

### Access Token Protection
- Tokens are stored securely in the database
- API responses exclude sensitive access token data (`toSafeJSON()` method)
- Frontend never displays actual access tokens

### Connection Validation
- Real Shopify API validation before storing credentials
- Periodic health checks to ensure connections remain valid
- Clear error messaging for failed connections

### Input Validation
- Server-side validation for all inputs
- Domain format validation
- Access token format checking
- SQL injection prevention through parameterized queries

## Usage Workflow

### Setting Up Company Profile

1. **Access Company Profile**
   - Navigate to `/admin/company-profile` from dashboard
   - Click "Company Profile" in navigation menu

2. **Add Shopify Stores**
   - Click "Add Shopify Store" button
   - Enter store nickname, domain, and access token
   - Test connection to validate credentials
   - Save store to company profile

3. **Manage Existing Stores**
   - View all stores in card layout
   - Test connections periodically
   - Edit store details as needed
   - Activate/deactivate stores
   - Delete obsolete connections

### Using Saved Stores in Site Setup

1. **Start Site Setup**
   - Navigate to `/admin/site-setup`
   - Complete Step 1 (Basic Information)

2. **Select Shopify Store (Step 2)**
   - Choose from saved stores dropdown, OR
   - Select "Add New Shopify Store" for manual entry
   - View selected store information
   - Continue to next steps

3. **Automatic Integration**
   - Selected store credentials are automatically used
   - New stores added during setup are saved to company profile
   - No need to re-enter credentials for future stores

## Testing

### Automated Tests
Run the test script to verify functionality:

```bash
node test-company-profile.js
```

### Manual Testing Checklist

#### Company Profile Page
- [ ] Page loads without errors
- [ ] Statistics display correctly
- [ ] Add store modal opens and functions
- [ ] Connection testing works
- [ ] Store cards display properly
- [ ] Edit functionality works
- [ ] Delete confirmation works
- [ ] Status toggle works

#### Site Setup Integration
- [ ] Saved stores dropdown populates
- [ ] Store selection shows details
- [ ] Manual entry option works
- [ ] Form submission includes correct data
- [ ] New stores are saved to company profile

#### API Endpoints
- [ ] GET `/api/company-shopify-stores` returns data
- [ ] POST creates new stores
- [ ] PUT updates existing stores
- [ ] DELETE removes stores
- [ ] Connection testing endpoint works
- [ ] Status toggle endpoint works

## Troubleshooting

### Common Issues

#### Stores Not Loading
- Check database connection
- Verify table creation
- Check server logs for errors

#### Connection Tests Failing
- Verify Shopify credentials
- Check network connectivity
- Ensure Shopify API permissions

#### Form Not Submitting
- Check JavaScript console for errors
- Verify all required fields are filled
- Check network requests in browser dev tools

### Error Messages

#### "Domain conflict" Error
- Another store with the same domain already exists
- Use a different domain or update existing store

#### "Connection failed" Error
- Invalid Shopify credentials
- Network connectivity issues
- Shopify API rate limiting

#### "Missing required fields" Error
- Ensure all required form fields are completed
- Check field validation

## Future Enhancements

### Planned Features
- **Bulk Import**: CSV import for multiple stores
- **Store Templates**: Reusable store configurations
- **Advanced Analytics**: Store performance metrics
- **Team Management**: Multi-user company profiles
- **API Integration**: Webhook support for real-time updates

### Performance Optimizations
- **Caching**: Redis caching for frequently accessed data
- **Pagination**: Large store list pagination
- **Background Jobs**: Asynchronous connection validation
- **Database Indexing**: Optimized queries for large datasets

## Support

For questions or issues related to the Company Profile system:

1. Check the troubleshooting section above
2. Review server logs for error details
3. Test API endpoints individually
4. Verify database schema and data

## Changelog

### Version 1.0.0 (Initial Release)
- ✅ Company profile management page
- ✅ Shopify store CRUD operations
- ✅ Connection validation and testing
- ✅ Enhanced site setup integration
- ✅ Secure credential storage
- ✅ Modern, responsive UI design
- ✅ Comprehensive API endpoints
- ✅ Database schema and migrations
- ✅ Error handling and validation
- ✅ Professional documentation