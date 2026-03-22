# Menu Import from CSV

This script imports menu categories and menu items from a CSV file into your Millet Home Foods POS system.

## Quick Start

```bash
node import-menu-from-csv.js menu-data.csv
```

## CSV Format

The script uses a **single combined CSV** format with the following columns:

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `category_name` | ✅ | Name of the category | "Starters" |
| `category_description` | | Category description | "Appetizers and snacks" |
| `category_display_order` | | Sort order (number) | 1 |
| `category_is_active` | | Category visibility | true/false |
| `item_name` | ✅ | Menu item name | "Samosa" |
| `item_description` | | Item description | "Crispy pastry with potatoes" |
| `item_price` | ✅ | Price in rupees | 80 |
| `item_is_vegetarian` | | Vegetarian flag | true/false |
| `item_is_available` | | Availability flag | true/false |
| `item_preparation_time` | | Prep time in minutes | 10 |
| `item_spice_level` | | Spice level | mild/medium/hot/extra_hot |
| `item_has_half_portion` | | Half portion option | true/false |
| `item_half_portion_cost` | | Half portion price | 50 |
| `item_image_url` | | Item image URL | https://... |
| `category_image_url` | | Category image URL | https://... |

## Example CSV

```csv
category_name,category_description,category_display_order,category_is_active,item_name,item_description,item_price,item_is_vegetarian,item_is_available,item_preparation_time,item_spice_level,item_has_half_portion,item_half_portion_cost,item_image_url,category_image_url
Starters,Appetizers and snacks,1,true,Samosa,Crispy pastry with spiced potatoes,80,true,true,10,mild,false,0,https://example.com/samosa.jpg,https://example.com/starters.jpg
Main Course,Main dishes,2,true,Butter Chicken,Creamy tomato curry,320,false,true,20,medium,false,0,https://example.com/butter-chicken.jpg,https://example.com/main-course.jpg
```

## Features

- **Smart Category Handling**: Creates categories if they don't exist, reuses existing ones
- **Image URLs**: Supports direct image URLs (no file upload needed)
- **Validation**: Validates required fields and data types
- **Error Reporting**: Shows detailed errors for failed rows
- **Summary Report**: Displays import statistics

## Spice Levels

Valid values for `item_spice_level`:
- `mild` (default)
- `medium`
- `hot`
- `extra_hot`

## Boolean Fields

Accepts the following values:
- `true`, `false`
- `yes`, `no`
- `1`, `0`

## Usage Notes

1. **Restaurant/Franchise/Location IDs**: The script attempts to auto-detect franchise and location IDs from your Firestore. If you need specific values, edit the script and update these lines:
   ```javascript
   const restaurantId = 'your-restaurant-id';
   // franchiseId and locationId are auto-fetched
   ```

2. **Duplicate Handling**: 
   - Categories with the same name are skipped (reused)
   - Menu items are always created (no duplicate check)

3. **Image URLs**: Use publicly accessible URLs or Firebase Storage URLs

## Sample Template

A sample template file `menu-import-template.csv` is included with example Indian restaurant menu items.

## Troubleshooting

**Error: "Missing category_name"**
- Ensure the `category_name` column exists and has values

**Error: "item_price must be greater than 0"**
- Check that price values are positive numbers

**Error: Firebase connection issues**
- Verify your Firebase configuration in the script matches your project
