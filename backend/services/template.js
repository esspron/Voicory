// ============================================
// TEMPLATE SERVICE - Dynamic Variables Resolution
// ============================================

/**
 * Resolve {{variable}} placeholders in text using customer data
 */
function resolveTemplateVariables(text, context = {}) {
    if (!text || typeof text !== 'string') return text;
    
    const variables = {};
    
    // System variables
    if (context.enableSystemVariables !== false) {
        const now = new Date();
        const timezone = context.timezone || 'Asia/Kolkata';
        
        try {
            const formatter = new Intl.DateTimeFormat('en-US', { 
                timeZone: timezone, 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
            const dateFormatter = new Intl.DateTimeFormat('en-US', { 
                timeZone: timezone,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            variables.current_time = formatter.format(now);
            variables.current_date = dateFormatter.format(now);
        } catch (e) {
            variables.current_time = now.toLocaleTimeString();
            variables.current_date = now.toLocaleDateString();
        }
        
        if (context.assistantName) {
            variables.assistant_name = context.assistantName;
        }
    }
    
    // Customer variables
    if (context.customer) {
        const c = context.customer;
        variables.customer_name = c.name || '';
        variables.customer_phone = c.phone || c.phone_number || '';
        variables.customer_email = c.email || '';
        
        if (c.variables && typeof c.variables === 'object') {
            Object.entries(c.variables).forEach(([key, value]) => {
                variables[key] = value;
            });
        }
    }
    
    // Custom variables from assistant definition
    if (context.customVariables && Array.isArray(context.customVariables)) {
        context.customVariables.forEach(varDef => {
            if (varDef.name && varDef.placeholder && !variables[varDef.name]) {
                variables[varDef.name] = varDef.placeholder;
            }
        });
    }
    
    // Override with explicitly passed values
    if (context.variables && typeof context.variables === 'object') {
        Object.entries(context.variables).forEach(([key, value]) => {
            variables[key] = value;
        });
    }
    
    // Replace {{variable}} patterns
    const resolved = text.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (match, varName) => {
        const value = variables[varName.toLowerCase()];
        if (value !== undefined && value !== null && value !== '') {
            return String(value);
        }
        return `[${varName}]`;
    });
    
    return resolved;
}

module.exports = {
    resolveTemplateVariables
};
