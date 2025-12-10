// ============================================
// GRACEFUL SHUTDOWN & ERROR HANDLERS
// ============================================
const { getRedis } = require('../services/cache');

// Optional cleanup callback for WebSocket server
let wsCleanupCallback = null;

function setWebSocketCleanup(callback) {
    wsCleanupCallback = callback;
}

function setupGracefulShutdown(app, supabase, port, onServerReady) {
    let isShuttingDown = false;
    const activeConnections = new Set();

    // Bind to 0.0.0.0 explicitly for Railway/Docker
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`✅ Server running on 0.0.0.0:${port}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   Redis: ${getRedis() ? 'connected' : 'not configured'}`);
        
        // Call the onServerReady callback with the server instance
        if (onServerReady && typeof onServerReady === 'function') {
            onServerReady(server);
        }
    });

    server.on('connection', (connection) => {
        activeConnections.add(connection);
        connection.on('close', () => activeConnections.delete(connection));
    });

    async function gracefulShutdown(signal) {
        if (isShuttingDown) return;
        isShuttingDown = true;
        
        console.log(`\n⚠️ ${signal} received. Starting graceful shutdown...`);
        
        // Close WebSocket server first if configured
        if (wsCleanupCallback) {
            try {
                await wsCleanupCallback();
                console.log('✅ WebSocket server closed');
            } catch (err) {
                console.error('Error closing WebSocket server:', err.message);
            }
        }
        
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

module.exports = { setupGracefulShutdown, setWebSocketCleanup };
