const express = require('express');
const router = express.Router();
const db = require('../database/db');
const Store = require('../models/Store');

/**
 * GET /api/themes - Get all available themes
 */
router.get('/api/themes', async (req, res) => {
  try {
    const themes = await db.all('SELECT * FROM themes WHERE is_active = 1 ORDER BY is_default DESC, id ASC');
    
    const processedThemes = themes.map(theme => {
      let cssVariables = {};
      try {
        cssVariables = JSON.parse(theme.css_variables || '{}');
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse CSS variables for theme ${theme.id}:`, parseError.message);
        cssVariables = {};
      }
      
      return {
        id: theme.id,
        name: theme.name,
        description: theme.description,
        colors: cssVariables,
        is_default: Boolean(theme.is_default),
        preview_image: theme.preview_image
      };
    });

    res.json({
      success: true,
      themes: processedThemes
    });

  } catch (error) {
    console.error('❌ Error fetching themes:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch themes'
    });
  }
});

/**
 * GET /admin/themes - Admin theme management page
 */
router.get('/admin/themes', async (req, res) => {
  try {
    const themes = await db.all('SELECT * FROM themes ORDER BY is_default DESC, id ASC');
    
    res.render('admin/themes', {
      title: 'Theme Management',
      themes: themes.map(theme => {
        let colors = {};
        try {
          colors = JSON.parse(theme.css_variables || '{}');
        } catch (e) {
          colors = { primary: '#007cba', secondary: '#f8f9fa' };
        }
        return { ...theme, colors };
      })
    });

  } catch (error) {
    console.error('❌ Error loading themes page:', error.message);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load themes'
    });
  }
});

/**
 * POST /admin/store/:storeId/theme - Set theme for a store
 */
router.post('/admin/store/:storeId/theme', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { theme_id } = req.body;

    console.log(`🎨 Setting theme ${theme_id} for store ${storeId}`);

    // Validate theme exists
    const theme = await db.get('SELECT * FROM themes WHERE id = ? AND is_active = 1', [theme_id]);
    if (!theme) {
      return res.status(400).json({
        success: false,
        error: 'Invalid theme ID'
      });
    }

    // Find store by ID or UUID
    let store;
    if (storeId.match(/^\d+$/)) {
      store = await Store.findById(parseInt(storeId));
    } else {
      store = await Store.findByUuid(storeId);
    }

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    // Update store theme
    await store.update({ theme_id_new: theme_id });

    console.log(`✅ Updated store ${store.name} to use theme: ${theme.name}`);

    res.json({
      success: true,
      message: `Theme updated to ${theme.name}`,
      theme: {
        id: theme.id,
        name: theme.name,
        description: theme.description
      }
    });

  } catch (error) {
    console.error('❌ Error setting store theme:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to set theme'
    });
  }
});

/**
 * GET /admin/store/:storeId/theme - Get current theme for store
 */
router.get('/admin/store/:storeId/theme', async (req, res) => {
  try {
    const { storeId } = req.params;

    // Find store by ID or UUID
    let store;
    if (storeId.match(/^\d+$/)) {
      store = await Store.findById(parseInt(storeId));
    } else {
      store = await Store.findByUuid(storeId);
    }

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    let currentTheme = null;
    
    // Try to get theme from new system first
    if (store.theme_id_new) {
      currentTheme = await db.get('SELECT * FROM themes WHERE id = ? AND is_active = 1', [store.theme_id_new]);
    }

    // If no theme found, return legacy theme info
    if (!currentTheme) {
      currentTheme = {
        id: 'legacy',
        name: 'Legacy Theme',
        description: 'Using legacy theme system',
        css_variables: JSON.stringify({
          primary: store.primary_color || '#007cba',
          secondary: store.secondary_color || '#f8f9fa'
        }),
        is_default: false,
        is_active: true
      };
    }

    let colors = {};
    try {
      colors = JSON.parse(currentTheme.css_variables || '{}');
    } catch (e) {
      colors = { primary: '#007cba', secondary: '#f8f9fa' };
    }

    res.json({
      success: true,
      currentTheme: {
        id: currentTheme.id,
        name: currentTheme.name,
        description: currentTheme.description,
        colors: colors,
        is_default: Boolean(currentTheme.is_default)
      }
    });

  } catch (error) {
    console.error('❌ Error getting store theme:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get current theme'
    });
  }
});

/**
 * POST /api/themes - Create new theme (admin only)
 */
router.post('/api/themes', async (req, res) => {
  try {
    const { name, description, css_variables, is_default } = req.body;

    if (!name || !css_variables) {
      return res.status(400).json({
        success: false,
        error: 'Name and CSS variables are required'
      });
    }

    // Validate CSS variables is proper JSON
    try {
      JSON.parse(css_variables);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'CSS variables must be valid JSON'
      });
    }

    // If this is being set as default, unset other defaults
    if (is_default) {
      await db.run('UPDATE themes SET is_default = 0');
    }

    const result = await db.run(
      `INSERT INTO themes (name, description, css_variables, is_default, is_active) 
       VALUES (?, ?, ?, ?, 1)`,
      [name, description, css_variables, is_default ? 1 : 0]
    );

    const newTheme = await db.get('SELECT * FROM themes WHERE id = ?', [result.id]);

    console.log(`✅ Created new theme: ${name} (ID: ${result.id})`);

    res.json({
      success: true,
      message: `Theme "${name}" created successfully`,
      theme: newTheme
    });

  } catch (error) {
    console.error('❌ Error creating theme:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create theme'
    });
  }
});

/**
 * PUT /api/themes/:themeId - Update theme
 */
router.put('/api/themes/:themeId', async (req, res) => {
  try {
    const { themeId } = req.params;
    const { name, description, css_variables, is_default, is_active } = req.body;

    const theme = await db.get('SELECT * FROM themes WHERE id = ?', [themeId]);
    if (!theme) {
      return res.status(404).json({
        success: false,
        error: 'Theme not found'
      });
    }

    // Validate CSS variables if provided
    if (css_variables) {
      try {
        JSON.parse(css_variables);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: 'CSS variables must be valid JSON'
        });
      }
    }

    // If this is being set as default, unset other defaults
    if (is_default && !theme.is_default) {
      await db.run('UPDATE themes SET is_default = 0');
    }

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (css_variables !== undefined) {
      updateFields.push('css_variables = ?');
      updateValues.push(css_variables);
    }
    if (is_default !== undefined) {
      updateFields.push('is_default = ?');
      updateValues.push(is_default ? 1 : 0);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active ? 1 : 0);
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(themeId);

      await db.run(
        `UPDATE themes SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    const updatedTheme = await db.get('SELECT * FROM themes WHERE id = ?', [themeId]);

    console.log(`✅ Updated theme: ${updatedTheme.name} (ID: ${themeId})`);

    res.json({
      success: true,
      message: `Theme "${updatedTheme.name}" updated successfully`,
      theme: updatedTheme
    });

  } catch (error) {
    console.error('❌ Error updating theme:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update theme'
    });
  }
});

/**
 * DELETE /api/themes/:themeId - Delete theme
 */
router.delete('/api/themes/:themeId', async (req, res) => {
  try {
    const { themeId } = req.params;

    const theme = await db.get('SELECT * FROM themes WHERE id = ?', [themeId]);
    if (!theme) {
      return res.status(404).json({
        success: false,
        error: 'Theme not found'
      });
    }

    // Don't allow deletion of default theme
    if (theme.is_default) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the default theme'
      });
    }

    // Check if any stores are using this theme
    const storesUsingTheme = await db.all('SELECT id, name FROM stores WHERE theme_id_new = ?', [themeId]);
    if (storesUsingTheme.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete theme - it is currently used by ${storesUsingTheme.length} store(s)`,
        stores: storesUsingTheme
      });
    }

    await db.run('DELETE FROM themes WHERE id = ?', [themeId]);

    console.log(`✅ Deleted theme: ${theme.name} (ID: ${themeId})`);

    res.json({
      success: true,
      message: `Theme "${theme.name}" deleted successfully`
    });

  } catch (error) {
    console.error('❌ Error deleting theme:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete theme'
    });
  }
});

module.exports = router;