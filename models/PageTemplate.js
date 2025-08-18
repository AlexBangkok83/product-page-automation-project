const database = require('../database/db');

class PageTemplate {
    static async createTables() {
        // Create page templates table
        await database.run(`
            CREATE TABLE IF NOT EXISTS page_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_key TEXT UNIQUE NOT NULL,
                template_type TEXT NOT NULL DEFAULT 'legal',
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create page template translations table
        await database.run(`
            CREATE TABLE IF NOT EXISTS page_template_translations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                page_template_id INTEGER NOT NULL,
                language_code TEXT NOT NULL,
                title TEXT NOT NULL,
                slug TEXT NOT NULL,
                content TEXT NOT NULL,
                meta_title TEXT,
                meta_description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (page_template_id) REFERENCES page_templates (id) ON DELETE CASCADE,
                UNIQUE(page_template_id, language_code)
            )
        `);

        // Create indexes
        await database.run(`CREATE INDEX IF NOT EXISTS idx_page_templates_key ON page_templates(template_key)`);
        await database.run(`CREATE INDEX IF NOT EXISTS idx_translations_language ON page_template_translations(language_code)`);
        await database.run(`CREATE INDEX IF NOT EXISTS idx_translations_slug ON page_template_translations(slug)`);
    }

    static async create(templateData) {
        const result = await database.run(
            `INSERT INTO page_templates (template_key, template_type, is_active) VALUES (?, ?, ?)`,
            [templateData.template_key, templateData.template_type || 'legal', true]
        );
        
        return {
            id: result.id,
            template_key: templateData.template_key,
            template_type: templateData.template_type || 'legal',
            is_active: true
        };
    }

    static async findByKey(templateKey) {
        return await database.get(
            `SELECT * FROM page_templates WHERE template_key = ? AND is_active = 1`,
            [templateKey]
        );
    }

    static async getTranslatedContent(templateKey, languageCode = 'en') {
        // First try to get content in requested language
        let result = await database.get(`
            SELECT 
                pt.template_key,
                pt.template_type,
                ptt.language_code,
                ptt.title,
                ptt.slug,
                ptt.content,
                ptt.meta_title,
                ptt.meta_description
            FROM page_templates pt
            JOIN page_template_translations ptt ON pt.id = ptt.page_template_id
            WHERE pt.template_key = ? AND pt.is_active = 1 AND ptt.language_code = ?
        `, [templateKey, languageCode]);

        // Fallback to English if requested language not found
        if (!result && languageCode !== 'en') {
            result = await database.get(`
                SELECT 
                    pt.template_key,
                    pt.template_type,
                    ptt.language_code,
                    ptt.title,
                    ptt.slug,
                    ptt.content,
                    ptt.meta_title,
                    ptt.meta_description
                FROM page_templates pt
                JOIN page_template_translations ptt ON pt.id = ptt.page_template_id
                WHERE pt.template_key = ? AND pt.is_active = 1 AND ptt.language_code = 'en'
            `, [templateKey]);
        }

        if (!result) {
            throw new Error(`No translation found for template "${templateKey}" in language "${languageCode}"`);
        }

        return result;
    }

    static async getAllForLanguage(languageCode = 'en') {
        const results = await database.all(`
            SELECT 
                pt.template_key,
                pt.template_type,
                ptt.title,
                ptt.slug,
                CASE WHEN ptt.id IS NOT NULL THEN 1 ELSE 0 END as has_translation
            FROM page_templates pt
            LEFT JOIN page_template_translations ptt ON pt.id = ptt.page_template_id AND ptt.language_code = ?
            WHERE pt.is_active = 1
            ORDER BY pt.template_key
        `, [languageCode]);

        return results;
    }
}

class PageTemplateTranslation {
    static async create(templateId, translationData) {
        const result = await database.run(`
            INSERT INTO page_template_translations 
            (page_template_id, language_code, title, slug, content, meta_title, meta_description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            templateId,
            translationData.language_code,
            translationData.title,
            translationData.slug,
            translationData.content,
            translationData.meta_title,
            translationData.meta_description
        ]);

        return {
            id: result.id,
            page_template_id: templateId,
            ...translationData
        };
    }

    static async findOrCreate(templateId, languageCode, translationData) {
        // Check if translation exists
        const existing = await database.get(`
            SELECT * FROM page_template_translations 
            WHERE page_template_id = ? AND language_code = ?
        `, [templateId, languageCode]);

        if (existing) {
            // Update existing translation
            await database.run(`
                UPDATE page_template_translations 
                SET title = ?, slug = ?, content = ?, meta_title = ?, meta_description = ?, updated_at = CURRENT_TIMESTAMP
                WHERE page_template_id = ? AND language_code = ?
            `, [
                translationData.title,
                translationData.slug,
                translationData.content,
                translationData.meta_title,
                translationData.meta_description,
                templateId,
                languageCode
            ]);
            
            return { ...existing, ...translationData, created: false };
        } else {
            // Create new translation
            const result = await this.create(templateId, {
                language_code: languageCode,
                ...translationData
            });
            return { ...result, created: true };
        }
    }
}

module.exports = {
    PageTemplate,
    PageTemplateTranslation
};