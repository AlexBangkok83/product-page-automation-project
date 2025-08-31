// Script to fix the JavaScript in product editor
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'views', 'admin-v2', 'product-editor.ejs');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the broken JavaScript section
const brokenJs = `            loadAvailableTemplates();\\n        });\\n        \\n        // Load template when selected\\n        function loadTemplate() {\\n            const selector = document.getElementById('template-selector');\\n            const templateId = selector.value;\\n            const preview = document.getElementById('template-preview');\\n            \\n            if (!templateId) {\\n                preview.classList.add('hidden');\\n                return;\\n            }\\n            \\n            // Show preview\\n            preview.classList.remove('hidden');\\n            document.getElementById('template-description').textContent = \\n                \`Template selected: \${selector.options[selector.selectedIndex].text}. Template configuration will be added here.\`;`;

const fixedJs = `            loadAvailableTemplates();
        });
        
        // Load template when selected
        function loadTemplate() {
            const selector = document.getElementById('template-selector');
            const templateId = selector.value;
            const preview = document.getElementById('template-preview');
            
            if (!templateId) {
                preview.classList.add('hidden');
                return;
            }
            
            // Show preview
            preview.classList.remove('hidden');
            document.getElementById('template-description').textContent = 
                \`Template selected: \${selector.options[selector.selectedIndex].text}. Template configuration will be added here.\`;
        }`;

if (content.includes(brokenJs)) {
    content = content.replace(brokenJs, fixedJs);
    fs.writeFileSync(filePath, content);
    console.log('JavaScript fixed successfully!');
} else {
    console.log('Could not find the broken JavaScript section to replace');
    console.log('Looking for loadAvailableTemplates patterns...');
    
    // Find and show what's actually in the file
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('loadAvailableTemplates')) {
            console.log(`Line ${i + 1}: ${lines[i]}`);
        }
    }
}