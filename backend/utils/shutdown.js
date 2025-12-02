// ============================================
// GRACEFUL SHUTDOWN & ERROR HANDLERS
// ============================================
const { getRedis } = require('../services/cache');

function setupGracefulShutdown(app, supabase, port) {
    let isShuttingDown = false;
    const activeConnections = new Set();

    const server = app.listen(port, () => {
        console.log(`✅ Server running on port ${port}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   Redis: ${getRedis() ? 'connected' : 'not configured'}`);
    });

    server.on('connection', (connection) => {
        activeConnections.add(connection);
        connection.on('close', () => activeConnections.delete(connection));
    });

    async function gracefulShutdown(signal) {
        if (isShuttingDown) return;
        isShuttingDown = true;
        
        console.log(`\n⚠️ ${signal} received. Starting graceful shutdown...`);
        
        server.close(async (err) => {
            if (err) {
                console.error('Error during server close:', err);
                process.exit(1);
            }
            
            console.log('✅ HTTP server closed');
            
            const redis = getRedis();
            if (redis) {
                try {
                    if (redis._isIoRedis) {
                        await redis.quit();
                    }
                    console.log('✅ Redis connection closed');
                } catch (err) {
                    console.error('Error closing Redis:', err.message);
                }
            }
            
            console.log('✅ Graceful shutdown complete');
            process.exit(0);
        });
        
        setTimeout(() => {
            console.warn('⚠️ Forcing remaining connections closed');
            activeConnections.forEach((connection) => connection.destroy());
        }, 10000);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
        console.error('❌ UNCAUGHT EXCEPTION:', error);
        if (supabase) {
            supabase.from('system_logs').insert({
                service: 'backend',
                level: 'critical',
                message: 'Uncaught exception',
                error_stack: error.stack,
                metadata: { name: error.name, message: error.message }
            }).then(() => {}).catch(() => {});
        }
        setTimeout(() => process.exit(1), 1000);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
        if (supabase) {
            supabase.from('system_logs').insert({
                service: 'backend',
                level: 'error',
                message: 'Unhandled promise rejection',
                error_stack: reason instanceof Error ? reason.stack : String(reason),
                metadata: { type: 'unhandledRejection' }
            }).then(() => {}).catch(() => {});
        }
    });

    return server;
}

module.exports = { setupGracefulShutdown };
